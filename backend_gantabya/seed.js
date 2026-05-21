/**
 * Database Seed Script
 *
 * This script seeds the database with test data including:
 * - Admin user (admin@gmail.com / admin)
 * - Regular user (user@gmail.com / user)
 * - A bus with complete configuration
 * - Route with stops, timings, and multi-day support
 * - Seat layout with seaters and sleepers (including couple seats)
 * - Amenities
 * - Sample trip for today
 * - Sample discount offer
 *
 * Run with: npx ts-node seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...\n');
    // ==================== 1. CREATE USERS ====================
    console.log('👤 Creating users...');
    const adminPassword = await bcrypt.hash('admin', 10);
    const userPassword = await bcrypt.hash('user', 10);
    // Admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {},
        create: {
            email: 'admin@gmail.com',
            name: 'Admin User',
            password: adminPassword,
            role: 'ADMIN',
            verified: true,
            adminVerified: true,
            adminVerificationAt: new Date(),
            phone: '9841000001',
            busServiceName: 'Gantabya Express',
        },
    });
    console.log(`  ✅ Admin created: ${admin.email}`);
    // Regular user
    const user = await prisma.user.upsert({
        where: { email: 'user@gmail.com' },
        update: {},
        create: {
            email: 'user@gmail.com',
            name: 'Test User',
            password: userPassword,
            role: 'USER',
            verified: true,
            phone: '9841000002',
        },
    });
    console.log(`  ✅ User created: ${user.email}`);
    // ==================== 2. CREATE BUS ====================
    console.log('\n🚌 Creating bus...');
    // Delete existing bus with same number if exists (for clean re-seed)
    await prisma.bus.deleteMany({
        where: { busNumber: 'NP-01-GA-1234' },
    });
    const bus = await prisma.bus.create({
        data: {
            adminId: admin.id,
            busNumber: 'NP-01-GA-1234',
            name: 'Gantabya Deluxe Night Express',
            type: 'MIXED', // Has both seaters and sleepers
            layoutType: 'TWO_TWO',
            gridRows: 12,
            gridColumns: 4,
            totalSeats: 0, // Will be updated after creating seats
        },
    });
    console.log(`  ✅ Bus created: ${bus.name} (${bus.busNumber})`);
    // ==================== 3. CREATE AMENITIES ====================
    console.log('\n🎁 Creating bus amenities...');
    await prisma.busAmenities.create({
        data: {
            busId: bus.id,
            hasWifi: true,
            hasCharging: true,
            hasAC: true,
            hasRestroom: true,
            hasBlanket: true,
            hasWaterBottle: true,
            hasSnacks: false,
            hasTV: true,
            description: 'Luxury overnight bus with all modern amenities for comfortable travel.',
        },
    });
    console.log('  ✅ Amenities configured');
    // ==================== 4. CREATE ROUTE (STOPS) ====================
    console.log('\n🛣️  Creating route with stops...');
    // Night bus route: Kathmandu → Pokhara → Lumbini → Bhairahawa
    // Departs at night, arrives next day
    const stopsData = [
        {
            name: 'Kathmandu Bus Park',
            city: 'Kathmandu',
            state: 'Bagmati',
            stopIndex: 0,
            arrivalTime: null, // First stop - no arrival
            departureTime: '20:00', // 8 PM departure
            dayOffset: 0, // Same day (Day 1)
            returnArrivalTime: null,
            returnDepartureTime: '06:00', // Return trip departs at 6 AM
            returnDayOffset: 0,
            distanceFromOrigin: 0,
            lowerSeaterPrice: 0,
            lowerSleeperPrice: 0,
            upperSleeperPrice: 0,
            boardingPoints: [
                { name: 'New Bus Park Gate 5', time: '19:30', landmark: 'Near Ticket Counter', address: 'Gongabu, Kathmandu' },
                { name: 'Kalanki Chowk', time: '20:15', landmark: 'Opposite Petrol Pump', address: 'Kalanki, Kathmandu' },
            ],
        },
        {
            name: 'Mugling Rest Stop',
            city: 'Mugling',
            state: 'Gandaki',
            stopIndex: 1,
            arrivalTime: '23:30', // 11:30 PM
            departureTime: '00:00', // 12:00 AM (midnight)
            dayOffset: 0, // Still Day 1 (before midnight)
            returnArrivalTime: '02:30',
            returnDepartureTime: '03:00',
            returnDayOffset: 0,
            distanceFromOrigin: 110,
            lowerSeaterPrice: 400,
            lowerSleeperPrice: 600,
            upperSleeperPrice: 500,
            boardingPoints: [
                { name: 'Mugling Bus Station', time: '23:30', landmark: 'Main Bus Stand', address: 'Mugling, Chitwan' },
            ],
        },
        {
            name: 'Pokhara Tourist Bus Stand',
            city: 'Pokhara',
            state: 'Gandaki',
            stopIndex: 2,
            arrivalTime: '04:00', // 4 AM next day
            departureTime: '04:30',
            dayOffset: 1, // NEXT DAY (Day 2)
            returnArrivalTime: '20:30',
            returnDepartureTime: '21:00',
            returnDayOffset: 0,
            distanceFromOrigin: 200,
            lowerSeaterPrice: 800,
            lowerSleeperPrice: 1200,
            upperSleeperPrice: 1000,
            boardingPoints: [
                { name: 'Tourist Bus Park', time: '04:00', landmark: 'Near Lakeside', address: 'Prithvi Chowk, Pokhara' },
            ],
        },
        {
            name: 'Lumbini Bus Station',
            city: 'Lumbini',
            state: 'Lumbini',
            stopIndex: 3,
            arrivalTime: '08:00', // 8 AM
            departureTime: '08:30',
            dayOffset: 1, // Day 2
            returnArrivalTime: '16:00',
            returnDepartureTime: '16:30',
            returnDayOffset: 0,
            distanceFromOrigin: 350,
            lowerSeaterPrice: 1200,
            lowerSleeperPrice: 1800,
            upperSleeperPrice: 1500,
            boardingPoints: [
                { name: 'Lumbini Main Gate', time: '08:00', landmark: 'Near Maya Devi Temple', address: 'Lumbini, Rupandehi' },
            ],
        },
        {
            name: 'Bhairahawa Bus Terminal',
            city: 'Bhairahawa',
            state: 'Lumbini',
            stopIndex: 4,
            arrivalTime: '10:00', // 10 AM - Final destination
            departureTime: null, // Last stop - no departure
            dayOffset: 1, // Day 2
            returnArrivalTime: '14:00',
            returnDepartureTime: null,
            returnDayOffset: 0,
            distanceFromOrigin: 400,
            lowerSeaterPrice: 1500,
            lowerSleeperPrice: 2200,
            upperSleeperPrice: 1800,
            boardingPoints: [
                { name: 'Bhairahawa Bus Park', time: '10:00', landmark: 'Main Terminal', address: 'Siddharthanagar, Bhairahawa' },
            ],
        },
    ];
    for (const stopData of stopsData) {
        const { boardingPoints, ...stop } = stopData;
        const createdStop = await prisma.stop.create({
            data: {
                busId: bus.id,
                ...stop,
                boardingPoints: {
                    create: boardingPoints.map((bp, idx) => ({
                        type: 'BOARDING',
                        name: bp.name,
                        time: bp.time,
                        landmark: bp.landmark,
                        address: bp.address,
                        pointOrder: idx,
                    })),
                },
            },
        });
        console.log(`  ✅ Stop ${stopData.stopIndex + 1}: ${stopData.city} (Day ${stopData.dayOffset + 1})`);
    }
    // ==================== 5. CREATE SEAT LAYOUT ====================
    console.log('\n💺 Creating seat layout...');
    const seatsData = [];
    // LOWER DECK LAYOUT
    // Row 0-1: Driver area (no seats)
    // Row 2-7: Seater seats (2+2 configuration)
    // Row 8-11: Lower sleeper berths (horizontal sleepers spanning 2 columns)
    // Seater seats (rows 2-7, columns 0-3)
    let seatNum = 1;
    for (let row = 2; row <= 7; row++) {
        for (let col = 0; col <= 3; col++) {
            // Skip aisle (no physical aisle in grid, but we have 4 columns: 0,1 left side | 2,3 right side)
            seatsData.push({
                seatNumber: `L${seatNum}`,
                row,
                column: col,
                rowSpan: 1,
                columnSpan: 1,
                type: 'SEATER',
                level: 'LOWER',
            });
            seatNum++;
        }
    }
    // Lower sleeper berths (rows 8-11, horizontal 2-column sleepers)
    // Left side sleepers (columns 0-1)
    for (let row = 8; row <= 11; row++) {
        seatsData.push({
            seatNumber: `L${seatNum}`,
            row,
            column: 0,
            rowSpan: 1,
            columnSpan: 2, // Horizontal sleeper
            type: 'SLEEPER',
            level: 'LOWER',
        });
        seatNum++;
    }
    // Right side sleepers (columns 2-3)
    for (let row = 8; row <= 11; row++) {
        seatsData.push({
            seatNumber: `L${seatNum}`,
            row,
            column: 2,
            rowSpan: 1,
            columnSpan: 2, // Horizontal sleeper
            type: 'SLEEPER',
            level: 'LOWER',
        });
        seatNum++;
    }
    // UPPER DECK LAYOUT
    // All sleeper berths
    // Mix of horizontal sleepers and vertical couple sleepers
    seatNum = 1;
    // Upper deck: rows 0-11
    // Rows 0-5: Horizontal sleepers (2-column span)
    for (let row = 0; row <= 5; row++) {
        // Left side
        seatsData.push({
            seatNumber: `U${seatNum}`,
            row,
            column: 0,
            rowSpan: 1,
            columnSpan: 2,
            type: 'SLEEPER',
            level: 'UPPER',
        });
        seatNum++;
        // Right side
        seatsData.push({
            seatNumber: `U${seatNum}`,
            row,
            column: 2,
            rowSpan: 1,
            columnSpan: 2,
            type: 'SLEEPER',
            level: 'UPPER',
        });
        seatNum++;
    }
    // Rows 6-11: Vertical couple sleepers (2-row span) - 3 pairs on each side
    // Left side couple seats
    for (let row = 6; row <= 10; row += 2) {
        seatsData.push({
            seatNumber: `U${seatNum}`,
            row,
            column: 0,
            rowSpan: 2, // Vertical sleeper (couple seat)
            columnSpan: 1,
            type: 'SLEEPER',
            level: 'UPPER',
        });
        seatNum++;
        seatsData.push({
            seatNumber: `U${seatNum}`,
            row,
            column: 1,
            rowSpan: 2, // Vertical sleeper (couple seat)
            columnSpan: 1,
            type: 'SLEEPER',
            level: 'UPPER',
        });
        seatNum++;
    }
    // Right side couple seats
    for (let row = 6; row <= 10; row += 2) {
        seatsData.push({
            seatNumber: `U${seatNum}`,
            row,
            column: 2,
            rowSpan: 2, // Vertical sleeper (couple seat)
            columnSpan: 1,
            type: 'SLEEPER',
            level: 'UPPER',
        });
        seatNum++;
        seatsData.push({
            seatNumber: `U${seatNum}`,
            row,
            column: 3,
            rowSpan: 2, // Vertical sleeper (couple seat)
            columnSpan: 1,
            type: 'SLEEPER',
            level: 'UPPER',
        });
        seatNum++;
    }
    // Create all seats
    for (const seat of seatsData) {
        await prisma.seat.create({
            data: {
                busId: bus.id,
                ...seat,
                isActive: true,
            },
        });
    }
    // Update total seats count
    await prisma.bus.update({
        where: { id: bus.id },
        data: { totalSeats: seatsData.length },
    });
    const lowerSeats = seatsData.filter(s => s.level === 'LOWER').length;
    const upperSeats = seatsData.filter(s => s.level === 'UPPER').length;
    const coupleSeatCount = seatsData.filter(s => s.rowSpan === 2).length;
    console.log(`  ✅ Created ${seatsData.length} seats total`);
    console.log(`     - Lower deck: ${lowerSeats} seats (seaters + sleepers)`);
    console.log(`     - Upper deck: ${upperSeats} seats (all sleepers)`);
    console.log(`     - Couple seats (vertical): ${coupleSeatCount}`);
    // ==================== 6. CREATE TRIPS ====================
    console.log('\n🎫 Creating sample trips...');
    // Create trips for today and next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
        const tripDate = new Date(today);
        tripDate.setDate(tripDate.getDate() + i);
        await prisma.trip.upsert({
            where: {
                busId_tripDate: {
                    busId: bus.id,
                    tripDate: tripDate,
                },
            },
            update: {},
            create: {
                busId: bus.id,
                tripDate: tripDate,
                status: 'SCHEDULED',
            },
        });
    }
    console.log(`  ✅ Created trips for next 7 days`);
    // ==================== 7. CREATE SAMPLE OFFER ====================
    console.log('\n🎁 Creating sample discount offer...');
    await prisma.offer.upsert({
        where: { code: 'WELCOME10' },
        update: {},
        create: {
            code: 'WELCOME10',
            description: 'Welcome offer - Get 10% off on your first booking',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minBookingAmount: 500,
            maxDiscount: 200,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year
            usageLimit: 100,
            isActive: true,
            applicableBuses: [], // All buses
            createdBy: admin.id,
            creatorRole: 'ADMIN',
        },
    });
    await prisma.offer.upsert({
        where: { code: 'FLAT100' },
        update: {},
        create: {
            code: 'FLAT100',
            description: 'Flat NPR 100 off on bookings above NPR 1000',
            discountType: 'FIXED_AMOUNT',
            discountValue: 100,
            minBookingAmount: 1000,
            maxDiscount: null,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            usageLimit: null, // Unlimited
            isActive: true,
            applicableBuses: [],
            createdBy: admin.id,
            creatorRole: 'ADMIN',
        },
    });
    console.log('  ✅ Created discount offers: WELCOME10, FLAT100');
    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📋 Summary:');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ USERS                                           │');
    console.log('│ ├─ Admin: admin@gmail.com / admin               │');
    console.log('│ └─ User:  user@gmail.com / user                 │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│ BUS                                             │');
    console.log(`│ ├─ Name: ${bus.name.substring(0, 35).padEnd(35)}│`);
    console.log(`│ ├─ Number: ${bus.busNumber.padEnd(33)}│`);
    console.log(`│ ├─ Type: MIXED (Seaters + Sleepers)             │`);
    console.log(`│ └─ Total Seats: ${seatsData.length.toString().padEnd(28)}│`);
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│ ROUTE: Kathmandu → Bhairahawa (Overnight)       │');
    console.log('│ ├─ Kathmandu (20:00 Day 1)                      │');
    console.log('│ ├─ Mugling (23:30 Day 1)                        │');
    console.log('│ ├─ Pokhara (04:00 Day 2) ← Next Day             │');
    console.log('│ ├─ Lumbini (08:00 Day 2)                        │');
    console.log('│ └─ Bhairahawa (10:00 Day 2)                     │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│ OFFERS                                          │');
    console.log('│ ├─ WELCOME10: 10% off (max NPR 200)             │');
    console.log('│ └─ FLAT100: NPR 100 off on orders > 1000        │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log('\n✨ You can now test the application!\n');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map