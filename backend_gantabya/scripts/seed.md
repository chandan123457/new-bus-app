# Database Seed Guide

This document explains how to use the `seed.ts` script to populate your database with test data.

## What Gets Seeded

### 1. Users

| Role  | Email            | Password | Description                    |
|-------|------------------|----------|--------------------------------|
| Admin | admin@gmail.com  | admin    | Bus operator with full access  |
| User  | user@gmail.com   | user     | Regular customer account       |

### 2. Bus Configuration

| Field       | Value                           |
|-------------|--------------------------------|
| Name        | Gantabya Deluxe Night Express  |
| Number      | NP-01-GA-1234                  |
| Type        | MIXED (Seaters + Sleepers)     |
| Layout      | TWO_TWO (2+2 configuration)    |
| Total Seats | 56 seats                       |

### 3. Route (Multi-Day Overnight Journey)

```
Kathmandu ──► Mugling ──► Pokhara ──► Lumbini ──► Bhairahawa
  Day 1         Day 1       Day 2       Day 2        Day 2
 20:00         23:30       04:00       08:00        10:00
```

| Stop       | Arrival | Departure | Day | Distance | Lower Seater | Lower Sleeper | Upper Sleeper |
|------------|---------|-----------|-----|----------|--------------|---------------|---------------|
| Kathmandu  | -       | 20:00     | 1   | 0 km     | NPR 0        | NPR 0         | NPR 0         |
| Mugling    | 23:30   | 00:00     | 1   | 110 km   | NPR 400      | NPR 600       | NPR 500       |
| Pokhara    | 04:00   | 04:30     | 2   | 200 km   | NPR 800      | NPR 1,200     | NPR 1,000     |
| Lumbini    | 08:00   | 08:30     | 2   | 350 km   | NPR 1,200    | NPR 1,800     | NPR 1,500     |
| Bhairahawa | 10:00   | -         | 2   | 400 km   | NPR 1,500    | NPR 2,200     | NPR 1,800     |

### 4. Seat Layout

**Lower Deck:**
- 24 Seater seats (rows 2-7, 2+2 configuration)
- 8 Horizontal sleeper berths (rows 8-11)

**Upper Deck:**
- 12 Horizontal sleeper berths (rows 0-5)
- 12 Vertical couple sleeper seats (rows 6-11) - These show boy+girl icon

### 5. Amenities
- WiFi ✓
- Charging ports ✓
- AC ✓
- Restroom ✓
- Blanket ✓
- Water bottle ✓
- TV ✓

### 6. Trips
- Creates trips for **next 7 days** automatically

### 7. Discount Offers

| Code      | Type       | Value | Min Order  | Max Discount |
|-----------|------------|-------|------------|--------------|
| WELCOME10 | Percentage | 10%   | NPR 500    | NPR 200      |
| FLAT100   | Fixed      | NPR 100 | NPR 1,000 | -            |

---

## How to Run

### Prerequisites

1. Make sure you're in the backend directory:
   ```bash
   cd backend_gantabya
   ```

2. Ensure your `.env` file has the correct `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://..."
   ```

3. Install dependencies (if not already):
   ```bash
   npm install
   ```

### Method 1: Using ts-node (Recommended)

```bash
npx ts-node scripts/seed.ts
```

### Method 2: Using tsx (Faster)

```bash
npx tsx scripts/seed.ts
```

---

## Expected Output

```
🌱 Starting database seed...

👤 Creating users...
  ✅ Admin created: admin@gmail.com
  ✅ User created: user@gmail.com

🚌 Creating bus...
  ✅ Bus created: Gantabya Deluxe Night Express (NP-01-GA-1234)

🎁 Creating bus amenities...
  ✅ Amenities configured

🛣️  Creating route with stops...
  ✅ Stop 1: Kathmandu (Day 1)
  ✅ Stop 2: Mugling (Day 1)
  ✅ Stop 3: Pokhara (Day 2)
  ✅ Stop 4: Lumbini (Day 2)
  ✅ Stop 5: Bhairahawa (Day 2)

💺 Creating seat layout...
  ✅ Created 56 seats total
     - Lower deck: 32 seats (seaters + sleepers)
     - Upper deck: 24 seats (all sleepers)
     - Couple seats (vertical): 12

🎫 Creating sample trips...
  ✅ Created trips for next 7 days

🎁 Creating sample discount offer...
  ✅ Created discount offers: WELCOME10, FLAT100

==================================================
🎉 SEED COMPLETED SUCCESSFULLY!
==================================================
```

---

## Re-Running the Seed

The seed script uses `upsert` for users and offers, so they won't duplicate.
However, it **deletes and recreates** the bus each time to ensure clean seat layouts.

To fully reset and re-seed:

```bash
# Option 1: Just re-run the seed
npx ts-node scripts/seed.ts

# Option 2: Reset entire database first (CAUTION: Deletes all data!)
npx prisma migrate reset
npx ts-node scripts/seed.ts
```

---

## Troubleshooting

### Error: Cannot find module 'bcrypt'
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

### Error: Cannot find module '@prisma/client'
```bash
npx prisma generate
```

### Error: Unique constraint violation
The bus number `NP-01-GA-1234` already exists. The script now handles this by deleting existing data first.

---

## Testing After Seed

### Admin Login
1. Go to `/admin/signin`
2. Email: `admin@gmail.com`
3. Password: `admin`

### User Login
1. Go to `/signin`
2. Email: `user@gmail.com`
3. Password: `user`

### Test Booking Flow
1. Login as user
2. Search: Kathmandu → Pokhara
3. Select any date in next 7 days
4. Select seats (notice couple seats with boy+girl icon)
5. Apply coupon: `WELCOME10` for 10% off
6. Complete booking

### Test Admin Features
1. Login as admin
2. Go to Routes → See multi-day route with Day 1/Day 2 indicators
3. Go to Seat Layout → See couple seat icons on vertical sleepers
4. Go to Offline Booking → Book a ticket for cash customer
