/**
 * API Configuration
 * Base URL and API endpoints configuration
 * 
 * IMPORTANT FOR MOBILE TESTING:
 * - localhost won't work on mobile devices
 * - Use your computer's local IP address instead
 * - Find your IP: 
 *   - Mac/Linux: run `ifconfig` or `ip addr`
 *   - Windows: run `ipconfig`
 *   - Look for IPv4 address (e.g., 192.168.1.100)
 * - Example: 'http://192.168.1.100:3000'
 * - Make sure phone and computer are on the same WiFi network
 */

// Backend URL configuration
// Prefer environment-provided URL so production builds do not hit a dev LAN IP.
// Falls back to previous local IP for dev if not provided.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.gogantabya.com';



// Log API URL in development for debugging
if (__DEV__) {
  console.log('🔗 API Base URL:', API_BASE_URL);
  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    console.warn('API base URL is using fallback local IP. Set EXPO_PUBLIC_API_BASE_URL for builds.');
  }
  console.log('💡 Network troubleshooting:');
  console.log('   - Ensure backend server is running');
  console.log('   - Check IP address matches your current network IP');
  console.log('   - Mobile device must be on same WiFi network');
}

export const API_ENDPOINTS = {
  // User endpoints
  SIGNUP: '/user/signup',
  SIGNIN: '/user/signin',
  VERIFY_EMAIL: '/user/verifyEmail',
  FORGOT_PASSWORD: '/user/forgot-password',
  RESET_PASSWORD: '/user/reset-password',
  
  // Booking endpoints
  SHOW_BUS: '/user/showbus',
  BUS_INFO: '/user/showbusinfo',
  MY_BOOKINGS: '/user/mybookings',
  BOOKING_DETAILS: (groupId) => `/user/bookingdetails/${groupId}`,
  CANCEL_TICKET: '/user/cancelticket',
  DOWNLOAD_TICKET: (groupId) => `/user/booking/download-ticket/${groupId}`,
  
  // Payment endpoints
  PAYMENT_INITIATE: '/user/payments/initiate',
  PAYMENT_VERIFY: '/user/payments/verify',
  PAYMENT_CONFIRM: '/user/payments/confirm',
  
  // Coupon endpoints
  APPLY_COUPON: '/user/booking/apply-coupon',
  TRIP_COUPONS: '/user/trip', // :tripId/coupons
  
  // Notification endpoints
  NOTIFICATIONS: '/user/notifications',
  NOTIFICATIONS_UNREAD_COUNT: '/user/notifications/unread-count',
  NOTIFICATION_READ: '/user/notifications', // :id/read (PATCH)
  NOTIFICATION_READ_ALL: '/user/notifications/read-all', // (PATCH)
  
  // Other endpoints
  PROFILE: '/user/profile',
  OFFERS: '/user/offers',
  TRIP_SEATS: '/user/trip', // :tripId/seats
  SEAT_AVAILABILITY: (tripId) => `/user/seats/availability/${tripId}`,
};

export default API_BASE_URL;
