# GoGantabya - Admin & SuperAdmin Access Guide

## 🔐 Default Credentials

### SuperAdmin
**Username:** `$Admin82SecureGantabya`  
**Password:** `$SecureGantabya247`

**Note:** SuperAdmin account is automatically created when you run the seed script.

### Admin
**No default admin account exists.**  
Admins must sign up through the admin signup flow:
1. Visit admin signup page
2. Register with email and password
3. Verify email with OTP
4. Wait for SuperAdmin approval
5. Once approved, can login

**Test Admin (if you ran setup script):**
- Email: `admin@test.com`
- Password: `admin123`
- **Important:** Must manually set role to 'ADMIN' in database

---

## 🌐 Routes & URLs

### Backend API Base
```
http://localhost:3000
```

### Backend Endpoints

#### SuperAdmin Routes
- `POST /superadmin/signin` - SuperAdmin login
- `GET /superadmin/dashboard` - Dashboard stats
- `GET /superadmin/admins` - List all admins
- `PUT /superadmin/admin/:adminId/verify` - Approve admin
- `DELETE /superadmin/admin/:adminId` - Delete admin
- `GET /superadmin/offers` - Manage global offers

#### Admin Routes
- `POST /admin/signup` - Admin registration (Step 1)
- `POST /admin/verifyEmail` - Email verification with OTP (Step 2)
- `POST /admin/signin` - Admin login
- `GET /admin/dashboard` - Admin dashboard
- `POST /admin/createbus` - Create new bus
- `GET /admin/buses` - List admin's buses
- `POST /admin/createtrip` - Create trip
- `GET /admin/trips` - List trips
- `POST /admin/booking/offline` - **NEW: Offline booking**
- `GET /admin/bookings/date-report` - Booking reports
- `POST /admin/offers` - Create offers
- ... (many more)

#### User Routes
- `POST /user/signup` - User registration
- `POST /user/signin` - User login
- `GET /user/showbus` - Search buses
- `POST /user/payments/initiate` - Start booking
- ... (many more)

---

### Frontend URLs

#### SuperAdmin Pages
- **Login:** `http://localhost:5173/superadmin`
- **Dashboard:** `http://localhost:5173/superadmin/dashboard`
- **Offers Management:** `http://localhost:5173/superadmin/offers`
- **Admin Profile:** `http://localhost:5173/superadmin/admin/:adminId`

#### Admin Pages
- **Signup:** `http://localhost:5173/admin/signup`
- **Email Verification:** `http://localhost:5173/admin/verify-email`
- **Login:** `http://localhost:5173/admin/signin`
- **Dashboard:** `http://localhost:5173/admin/dashboard`
- **Offline Booking:** `http://localhost:5173/admin/offline-booking` ✨ **NEW**
- **Bus Management:** `http://localhost:5173/admin/buses`
- **Routes & Stops:** `http://localhost:5173/admin/routes`
- **Trip Management:** `http://localhost:5173/admin/trips`
- **Booking Report:** `http://localhost:5173/admin/bookings-report`
- **Offers & Coupons:** `http://localhost:5173/admin/offers`
- **Amenities:** `http://localhost:5173/admin/amenities`

#### User Pages
- **Home:** `http://localhost:5173/`
- **Signup:** `http://localhost:5173/signup`
- **Login:** `http://localhost:5173/signin`
- **Search Results:** `http://localhost:5173/search`
- **My Bookings:** `http://localhost:5173/my-bookings`
- **Profile:** `http://localhost:5173/profile`

---

## 🚀 Setup Scripts

### 1. Database Seed (Create SuperAdmin)
```bash
cd backend_gantabya
npx prisma db seed
```

**Output:**
```
✅ Super Admin created:
   Username: $Admin82SecureGantabya
   Password: $SecureGantabya247
```

### 2. Setup Test Users (Optional)
```bash
cd backend_gantabya
./setup-test-users.sh
```

This creates:
- Regular user: `user@test.com` / `user123`
- Admin user: `admin@test.com` / `admin123` (requires manual role update)

### 3. Manual Admin Setup (Required for test admin)

After running `setup-test-users.sh`, connect to your database and run:

```sql
-- Set admin role
UPDATE "User" SET role='ADMIN' WHERE email='admin@test.com';

-- Verify admin (optional - or use SuperAdmin to approve)
UPDATE "User" SET "adminVerified"=true WHERE email='admin@test.com';
```

---

## 📝 Admin Signup Flow

### For New Admins:

**Step 1: Signup**
- Navigate to `/admin/signup`
- Fill in:
  - Name
  - Email
  - Password
  - Bus Service Name
- Submit form
- Receive OTP via email

**Step 2: Email Verification**
- Redirected to `/admin/verify-email`
- Enter 6-digit OTP
- Account created with status: "Pending Verification"

**Step 3: Wait for SuperAdmin Approval**
- Redirected to `/admin/verification-pending`
- SuperAdmin must approve your account
- You'll receive email when approved

**Step 4: Login**
- After approval, go to `/admin/signin`
- Login with your email/password
- Access admin dashboard

---

## 🔑 Authentication Headers

### For API Testing (Postman/cURL)

**After Login:**
```bash
# Admin endpoints
curl -X GET http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# SuperAdmin endpoints
curl -X GET http://localhost:3000/superadmin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Cookie-based (if using browser):**
- Token stored in `adminToken` or `token` cookie
- Automatically sent with requests

---

## 🧪 Quick Test

### 1. Start Backend
```bash
cd backend_gantabya
npm start
```

### 2. Start Frontend
```bash
cd gantabya_front
npm run dev
```

### 3. Login as SuperAdmin
- Visit: `http://localhost:5173/superadmin`
- Username: `$Admin82SecureGantabya`
- Password: `$SecureGantabya247`

### 4. Create/Approve Admin
- From SuperAdmin dashboard
- Approve pending admin accounts
- Or create test admin using setup script + SQL

### 5. Test Offline Booking
- Login as admin
- Visit: `http://localhost:5173/admin/offline-booking`
- See placeholder page (UI under development)
- API ready at: `POST /admin/booking/offline`

---

## 📌 Important Notes

1. **SuperAdmin** is created automatically via seed script
2. **Admins** must go through signup → verification → approval flow
3. **Email verification** requires SMTP configuration in `.env`
4. **Admin approval** must be done by SuperAdmin
5. **Offline booking** requires admin to be logged in and have buses/trips created

---

## 🛠️ Environment Variables

Make sure your `.env` file has:

```env
# Database
DATABASE_URL="your-postgres-url"

# Secrets
adminSecret="your-admin-secret"
userSecret="your-user-secret"
superAdminSecret="your-superadmin-secret"

# Email (for OTP)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"

# Payment Gateways
RAZORPAY_KEY_ID="..."
RAZORPAY_KEY_SECRET="..."
ESEWA_MERCHANT_ID="..."
ESEWA_SECRET_KEY="..."
```

---

## 📞 Support

If you encounter issues:
1. Check that backend is running on port 3000
2. Check that frontend is running on port 5173 (or your configured port)
3. Verify database connection
4. Check browser console for errors
5. Check backend logs for API errors
