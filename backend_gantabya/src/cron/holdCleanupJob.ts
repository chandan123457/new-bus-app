import { PrismaClient, HoldStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Cleanup interval in milliseconds (run every minute)
const CLEANUP_INTERVAL_MS = 60 * 1000;

/**
 * Clean up expired seat holds
 * This runs periodically to mark expired holds as EXPIRED
 */
async function cleanupExpiredHolds(): Promise<void> {
  try {
    const now = new Date();

    const result = await prisma.seatHold.updateMany({
      where: {
        status: HoldStatus.HELD,
        holdExpiresAt: { lt: now },
      },
      data: {
        status: HoldStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} expired seat hold(s)`);
    }
  } catch (error) {
    console.error("❌ Error cleaning up expired holds:", error);
  }
}

/**
 * Start the periodic hold cleanup job
 */
export function startHoldCleanupJob(): void {
  console.log("🚀 Starting seat hold cleanup job (runs every minute)");

  // Run immediately on startup
  cleanupExpiredHolds();

  // Then run periodically
  setInterval(cleanupExpiredHolds, CLEANUP_INTERVAL_MS);
}

/**
 * Manually trigger a cleanup (useful for testing)
 */
export async function triggerCleanup(): Promise<number> {
  const now = new Date();

  const result = await prisma.seatHold.updateMany({
    where: {
      status: HoldStatus.HELD,
      holdExpiresAt: { lt: now },
    },
    data: {
      status: HoldStatus.EXPIRED,
    },
  });

  return result.count;
}
