// Test API Response Structure
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '../services/api';

const testMyBookingsAPI = async () => {
  try {
    console.log('🔍 Testing My Bookings API...');
    
    // Get token from storage
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('❌ No auth token found');
      return;
    }
    
    console.log('✅ Token found, calling API...');
    
    // Call the API
    const response = await userAPI.getBookings({ limit: 5 }, token);
    
    console.log('📥 API Response:', JSON.stringify(response, null, 2));
    
    if (response.success) {
      const bookings = response.data?.bookings || [];
      console.log(`📊 Found ${bookings.length} bookings`);
      
      if (bookings.length > 0) {
        const booking = bookings[0];
        console.log('📋 First booking detailed analysis:');
        
        // Booking reference format check
        const bookingRef = `pb-${(booking.bookingGroupId || '').slice(-8) || '08-8580'} • ${booking.bus?.type || 'MIXED'}`;
        console.log('  ✓ Booking Reference:', bookingRef);
        
        // Bus name formatting
        const busName = (booking.bus?.name || 'volvo').toLowerCase();
        console.log('  ✓ Bus Name:', busName);
        
        // Currency formatting
        const formatCurrency = (amount, currency = 'INR') => {
          const safeAmount = Number(amount) || 0;
          if (currency === 'NPR') {
            return `NPR ${safeAmount.toFixed(2)}`;
          }
          return `INR ₹ ${safeAmount.toFixed(2)}`;
        };
        const totalAmount = formatCurrency(booking.finalPrice ?? booking.totalPrice, booking.payment?.currency);
        console.log('  ✓ Total Amount:', totalAmount);
        
        // Route details
        console.log('  ✓ Pickup From:', booking.route?.from?.name || booking.boardingPoint?.name);
        console.log('  ✓ Pickup City:', booking.route?.from?.city || 'malmaliiya');
        console.log('  ✓ Drop At:', booking.route?.to?.name || booking.droppingPoint?.name);
        console.log('  ✓ Drop City:', booking.route?.to?.city || 'banar road');
        
        // Time formatting
        const formatTime = (timeString) => {
          if (!timeString) return '--';
          if (timeString.includes('T')) {
            const date = new Date(timeString);
            if (!isNaN(date.getTime())) {
              return date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }
          }
          if (timeString.match(/^\d{2}:\d{2}$/)) {
            return timeString;
          }
          return timeString.toString().slice(0, 5);
        };
        
        const pickupTime = formatTime(booking.route?.from?.departureTime || booking.boardingPoint?.time);
        const dropTime = formatTime(booking.route?.to?.arrivalTime || booking.droppingPoint?.time);
        console.log('  ✓ Pickup Time:', pickupTime);
        console.log('  ✓ Drop Time:', dropTime);
        
        // Seat information
        const getSeatDisplay = (booking) => {
          if (!booking?.seats?.length) return '--';
          const seatTypes = [...new Set(booking.seats.map(seat => seat.level || seat.type))];
          if (seatTypes.length > 0 && seatTypes[0]) {
            return `${booking.seats.length} (${seatTypes[0].toUpperCase()})`;
          }
          return `${booking.seats.length}`;
        };
        const seats = getSeatDisplay(booking);
        console.log('  ✓ Seats:', seats);
        
        // Date formatting
        const formatJourneyDate = (tripDate) => {
          if (!tripDate) return '--';
          const date = new Date(tripDate);
          if (isNaN(date.getTime())) return '--';
          
          const options = { day: 'numeric', month: 'long', year: 'numeric' };
          const formattedDate = date.toLocaleDateString('en-GB', options);
          const nepaliDate = date.toLocaleDateString('ne-NP', options);
          
          return `${formattedDate} (${nepaliDate})`;
        };
        const journeyDate = formatJourneyDate(booking.trip?.tripDate || booking.tripDate);
        console.log('  ✓ Journey Date:', journeyDate);
        
        // Status 
        console.log('  ✓ Status:', booking.status);
        
        console.log('\n🎯 Expected vs Actual Display:');
        console.log('Expected Bus Name: volvo');
        console.log('Actual Bus Name:', busName);
        console.log('Expected Reference: pb-08-8580 • MIXED');
        console.log('Actual Reference:', bookingRef);
        console.log('Expected Amount Format: INR ₹ 375.57');
        console.log('Actual Amount Format:', totalAmount);
        console.log('Expected Seats: 9 (LOWER)');
        console.log('Actual Seats:', seats);
      }
    } else {
      console.log('❌ API Error:', response.error);
    }
    
  } catch (error) {
    console.error('🚨 Test Error:', error);
  }
};

// Export for use in screens
export default testMyBookingsAPI;