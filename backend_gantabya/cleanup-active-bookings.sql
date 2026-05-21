-- ============================================
-- CLEANUP SCRIPT: Delete all active bookings
-- WARNING: This will permanently delete booking data!
-- ============================================

-- Run this with: psql -d your_database_name -f cleanup-active-bookings.sql
-- Or connect to your database and run these commands

BEGIN;

-- 1. Delete all Passengers (depends on Booking)
DELETE FROM "Passenger";

-- 2. Delete all Bookings (depends on BookingGroup)
DELETE FROM "Booking";

-- 3. Delete all Payments (depends on BookingGroup)
DELETE FROM "Payment";

-- 4. Delete all SeatHolds (temporary seat reservations)
DELETE FROM "SeatHold";

-- 5. Delete all BookingGroups (this is what references Stops)
DELETE FROM "BookingGroup";

-- 6. Optionally delete all Trips (uncomment if needed)
-- DELETE FROM "Trip";

COMMIT;

-- Verify cleanup
SELECT 'BookingGroups remaining:' as info, COUNT(*) as count FROM "BookingGroup"
UNION ALL
SELECT 'Bookings remaining:', COUNT(*) FROM "Booking"
UNION ALL
SELECT 'Payments remaining:', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'SeatHolds remaining:', COUNT(*) FROM "SeatHold";
