import { prisma } from "../index.js";
import { HoldStatus } from "@prisma/client";

// Configuration
const HOLD_DURATION_MINUTES = 5;

/**
 * Get the hold duration in minutes
 */
export function getHoldDurationMinutes(): number {
  return HOLD_DURATION_MINUTES;
}

/**
 * Calculate the expiry time for a new hold
 */
function getHoldExpiryTime(): Date {
  return new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);
}

/**
 * Calculate remaining seconds for a hold
 */
function getRemainingSeconds(expiresAt: Date): number {
  const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}

export interface HoldResult {
  success: boolean;
  error?: string;
  unavailableSeats?: string[];
  shouldReload?: boolean;
  expiresAt?: Date;
  remainingSeconds?: number;
}

export interface HoldVerificationResult {
  valid: boolean;
  error?: string;
  holdExpired?: boolean;
}

export interface SeatAvailabilityInfo {
  seatId: string;
  isBooked: boolean;
  isHeld: boolean;
  isHeldByCurrentUser: boolean;
  holdExpiresAt?: Date;
}

export interface HoldStatusResult {
  hasActiveHold: boolean;
  heldSeatIds: string[];
  expiresAt?: Date;
  remainingSeconds?: number;
}

/**
 * Hold seats for a user on a specific trip
 */
export async function holdSeats(
  userId: string,
  tripId: string,
  seatIds: string[],
  fromStopIndex: number,
  toStopIndex: number,
  isReturnTrip: boolean
): Promise<HoldResult> {
  try {
    const now = new Date();
    const expiresAt = getHoldExpiryTime();

    // First, clean up any expired holds
    await prisma.seatHold.updateMany({
      where: {
        holdExpiresAt: { lt: now },
        status: HoldStatus.HELD,
      },
      data: {
        status: HoldStatus.EXPIRED,
      },
    });

    // Release any existing holds by this user for this trip
    await prisma.seatHold.updateMany({
      where: {
        userId,
        tripId,
        status: HoldStatus.HELD,
      },
      data: {
        status: HoldStatus.RELEASED,
      },
    });

    // Check for existing active holds or bookings on these seats
    const existingHolds = await prisma.seatHold.findMany({
      where: {
        tripId,
        seatId: { in: seatIds },
        status: HoldStatus.HELD,
        holdExpiresAt: { gt: now },
        // Check for overlapping segments
        OR: [
          {
            isReturnTrip,
            fromStopIndex: { lte: toStopIndex },
            toStopIndex: { gte: fromStopIndex },
          },
        ],
      },
    });

    // Check for existing bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        tripId,
        seatId: { in: seatIds },
        status: "CONFIRMED",
      },
    });

    const unavailableFromHolds = existingHolds
      .filter((h) => h.userId !== userId)
      .map((h) => h.seatId);
    const unavailableFromBookings = existingBookings.map((b) => b.seatId);
    const unavailableSeats = [
      ...new Set([...unavailableFromHolds, ...unavailableFromBookings]),
    ];

    if (unavailableSeats.length > 0) {
      return {
        success: false,
        error: "Some seats are no longer available",
        unavailableSeats,
        shouldReload: true,
      };
    }

    // Create new holds for all requested seats
    await prisma.seatHold.createMany({
      data: seatIds.map((seatId) => ({
        tripId,
        seatId,
        userId,
        fromStopIndex,
        toStopIndex,
        isReturnTrip,
        holdExpiresAt: expiresAt,
        status: HoldStatus.HELD,
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      expiresAt,
      remainingSeconds: getRemainingSeconds(expiresAt),
    };
  } catch (error: any) {
    console.error("Error holding seats:", error);

    // Handle unique constraint violation - seats were taken
    if (error.code === "P2002") {
      return {
        success: false,
        error: "Some seats were just taken by another user",
        shouldReload: true,
      };
    }

    throw error;
  }
}

/**
 * Release held seats for a user on a specific trip
 */
export async function releaseHold(
  userId: string,
  tripId: string
): Promise<void> {
  await prisma.seatHold.updateMany({
    where: {
      userId,
      tripId,
      status: HoldStatus.HELD,
    },
    data: {
      status: HoldStatus.RELEASED,
    },
  });
}

/**
 * Get seat availability for a trip including hold information
 */
export async function getSeatAvailability(
  tripId: string,
  fromStopIndex: number,
  toStopIndex: number,
  isReturnTrip: boolean,
  currentUserId?: string
): Promise<SeatAvailabilityInfo[]> {
  const now = new Date();

  // Get all seats for this trip
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: {
        include: {
          seats: true,
        },
      },
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const seatIds = trip.bus.seats.map((s) => s.id);

  // Get active holds for overlapping segments
  const activeHolds = await prisma.seatHold.findMany({
    where: {
      tripId,
      seatId: { in: seatIds },
      status: HoldStatus.HELD,
      holdExpiresAt: { gt: now },
      isReturnTrip,
      fromStopIndex: { lte: toStopIndex },
      toStopIndex: { gte: fromStopIndex },
    },
  });

  // Get confirmed bookings for overlapping segments
  const bookings = await prisma.booking.findMany({
    where: {
      tripId,
      seatId: { in: seatIds },
      status: "CONFIRMED",
    },
  });

  const holdMap = new Map(activeHolds.map((h) => [h.seatId, h]));
  const bookedSeatIds = new Set(bookings.map((b) => b.seatId));

  return trip.bus.seats.map((seat) => {
    const hold = holdMap.get(seat.id);
    const isBooked = bookedSeatIds.has(seat.id);
    const isHeld = !!hold;
    const isHeldByCurrentUser = hold?.userId === currentUserId;

    const result: SeatAvailabilityInfo = {
      seatId: seat.id,
      isBooked,
      isHeld: isHeld && !isHeldByCurrentUser,
      isHeldByCurrentUser,
    };
    if (hold?.holdExpiresAt) {
      result.holdExpiresAt = hold.holdExpiresAt;
    }
    return result;
  });
}

/**
 * Check hold status for a user on a specific trip
 */
export async function checkHoldStatus(
  userId: string,
  tripId: string
): Promise<HoldStatusResult> {
  const now = new Date();

  const activeHolds = await prisma.seatHold.findMany({
    where: {
      userId,
      tripId,
      status: HoldStatus.HELD,
      holdExpiresAt: { gt: now },
    },
  });

  if (activeHolds.length === 0) {
    return {
      hasActiveHold: false,
      heldSeatIds: [],
    };
  }

  const firstHold = activeHolds[0]!;
  const expiresAt = firstHold.holdExpiresAt;

  if (!expiresAt) {
    return {
      hasActiveHold: true,
      heldSeatIds: activeHolds.map((h) => h.seatId),
    };
  }

  return {
    hasActiveHold: true,
    heldSeatIds: activeHolds.map((h) => h.seatId),
    expiresAt,
    remainingSeconds: getRemainingSeconds(expiresAt),
  };
}

/**
 * Verify that a user has valid holds for payment processing
 */
export async function verifyHoldForPayment(
  userId: string,
  tripId: string,
  seatIds: string[]
): Promise<HoldVerificationResult> {
  const now = new Date();

  const activeHolds = await prisma.seatHold.findMany({
    where: {
      userId,
      tripId,
      seatId: { in: seatIds },
      status: HoldStatus.HELD,
      holdExpiresAt: { gt: now },
    },
  });

  const heldSeatIds = new Set(activeHolds.map((h) => h.seatId));
  const missingSeats = seatIds.filter((id) => !heldSeatIds.has(id));

  if (missingSeats.length > 0) {
    return {
      valid: false,
      error: `Hold expired or not found for seats: ${missingSeats.join(", ")}`,
      holdExpired: true,
    };
  }

  return { valid: true };
}

/**
 * Convert held seats to booking status (after successful payment)
 */
export async function convertHoldToBooking(
  userId: string,
  tripId: string,
  seatIds: string[]
): Promise<void> {
  await prisma.seatHold.updateMany({
    where: {
      userId,
      tripId,
      seatId: { in: seatIds },
      status: HoldStatus.HELD,
    },
    data: {
      status: HoldStatus.CONVERTED,
    },
  });
}
