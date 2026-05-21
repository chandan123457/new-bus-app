import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NPR_TO_INR_RATE = 0.625;
const convertNprToInr = (nprAmount) => Number((Number(nprAmount || 0) * NPR_TO_INR_RATE).toFixed(2));

const PassengerInformation = ({ navigation, route }) => {
  console.log('=== PASSENGERINFO RECEIVED DATA DEBUG ===');
  console.log('Full route.params:', JSON.stringify(route.params, null, 2));
  console.log('==========================================');
  
  const {
    busData,
    selectedSeats = [],
    busInfo,
    boardingPoint,
    droppingPoint
  } = route.params || {};

  const normalizeSeat = (seat) => {
    if (!seat) return seat;
    const deck = (seat.deck || seat.level || 'LOWER').toString().toUpperCase();
    const seatNumber = seat.seatNumber || seat.number || seat.seat_no || seat.id;
    return { ...seat, deck, seatNumber };
  };

  const [actualSelectedSeats, setActualSelectedSeats] = useState(() =>
    (selectedSeats || []).map(normalizeSeat)
  );

  console.log('PassengerInformation extracted data:', {
    busData: !!busData,
    selectedSeatsCount: actualSelectedSeats.length,
    selectedSeats: actualSelectedSeats,
    busInfo: !!busInfo,
    boardingPoint: !!boardingPoint,
    droppingPoint: !!droppingPoint,
  });

  // Try to recover selectedSeats from AsyncStorage if empty
  useEffect(() => {
    if (!actualSelectedSeats || actualSelectedSeats.length === 0) {
      console.log('Attempting to recover selectedSeats from AsyncStorage...');
      AsyncStorage.getItem('selectedSeatsBackup')
        .then(backupData => {
          if (backupData) {
            const parsedSeats = JSON.parse(backupData);
            const normalizedSeats = (parsedSeats || []).map(normalizeSeat);
            console.log('Recovered seats from AsyncStorage:', normalizedSeats);
            setActualSelectedSeats(normalizedSeats);
          } else {
            console.log('No backup seats found in AsyncStorage');
          }
        })
        .catch(err => console.warn('Failed to recover seats from AsyncStorage:', err));
    }
  }, []);

  // Check if selectedSeats is empty and handle the error
  if (!actualSelectedSeats || actualSelectedSeats.length === 0) {
    console.error('No selected seats found in PassengerInformation!');
    // Navigate back to seat selection
    React.useEffect(() => {
      Alert.alert(
        'No Seats Selected',
        'No seat information found. Please select seats again.',
        [
          {
            text: 'Go Back to Seat Selection',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }, []);
  }

  // Passenger information state - initialize with safe defaults based on selected seats
  const [passengers, setPassengers] = useState(() => {
    // Initialize with default passenger objects to prevent undefined errors
    if (actualSelectedSeats && actualSelectedSeats.length > 0) {
      return actualSelectedSeats.map((seat, index) => ({
        name: '',
        age: '',
        gender: 'Male',
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        phone: '',
      }));
    }
    return [];
  });

  // Update passengers when actualSelectedSeats changes (e.g., from AsyncStorage recovery)
  useEffect(() => {
    if (actualSelectedSeats && actualSelectedSeats.length > 0) {
      // Only update if passengers array length doesn't match seats
      if (passengers.length !== actualSelectedSeats.length) {
        const initialPassengers = actualSelectedSeats.map((seat, index) => ({
          name: passengers[index]?.name || '', // Preserve existing data if available
          age: passengers[index]?.age || '',
          gender: passengers[index]?.gender || 'Male',
          seatId: seat.id,
          seatNumber: seat.seatNumber,
          phone: passengers[index]?.phone || '',
        }));
        setPassengers(initialPassengers);
        console.log('Passengers updated for seat changes:', initialPassengers);
      }
    }
  }, [actualSelectedSeats]);

  console.log('Current passengers:', passengers);
  console.log('Current actualSelectedSeats:', actualSelectedSeats);
  console.log('Passengers length:', passengers.length);
  console.log('ActualSelectedSeats length:', actualSelectedSeats.length);

  // Add safety check for rendering - only render if arrays are in sync
  const shouldRenderPassengerForms = passengers.length > 0 && passengers.length === actualSelectedSeats.length;

  const seatLines = (actualSelectedSeats || [])
    .map((seat) => {
      const seatNumber = seat?.seatNumber || '';
      if (!seatNumber) return null;
      return `${seatNumber} (${seat?.deck || 'LOWER'})`;
    })
    .filter(Boolean);

  const roundToTwo = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

  const getCumulativePriceForSeat = (stop, seat) => {
    if (!stop || !seat) return 0;

    const level = String(seat.level || seat.deck || '').toUpperCase();
    const type = String(seat.type || '').toUpperCase();

    if (level === 'LOWER' && type === 'SEATER') {
      return Number(stop.lowerSeaterPrice ?? stop.priceFromOrigin ?? 0);
    }
    if (level === 'LOWER' && type === 'SLEEPER') {
      return Number(stop.lowerSleeperPrice ?? stop.priceFromOrigin ?? 0);
    }
    if (level === 'UPPER' && type === 'SLEEPER') {
      return Number(stop.upperSleeperPrice ?? stop.priceFromOrigin ?? 0);
    }
    // Upper SEATER pricing: use priceFromOrigin (matches backend logic)
    if (level === 'UPPER' && type === 'SEATER') {
      return Number(stop.priceFromOrigin ?? 0);
    }

    return Number(stop.priceFromOrigin ?? 0);
  };

  const computeTotalFareNpr = () => {
    const fromStop = busInfo?.route?.fromStop;
    const toStop = busInfo?.route?.toStop;

    // Prefer per-seat prices computed during Seat Selection (keeps pricing consistent across screens).
    if (Array.isArray(actualSelectedSeats) && actualSelectedSeats.length > 0) {
      const seatPriceSum = actualSelectedSeats.reduce((sum, seat) => {
        const seatPrice = Number(seat?.priceNpr);
        return sum + (Number.isFinite(seatPrice) ? seatPrice : 0);
      }, 0);
      if (seatPriceSum > 0 || actualSelectedSeats.some(s => Number(s?.priceNpr) === 0)) {
        return roundToTwo(seatPriceSum);
      }
    }

    // Prefer seat-type segment pricing (matches backend prepareBookingDetails)
    if (fromStop && toStop && Array.isArray(actualSelectedSeats) && actualSelectedSeats.length > 0) {
      const total = actualSelectedSeats.reduce((sum, seat) => {
        const fromPrice = getCumulativePriceForSeat(fromStop, seat);
        const toPrice = getCumulativePriceForSeat(toStop, seat);

        const seatSpecificFare = Math.abs(Number(toPrice) - Number(fromPrice));
        const fallbackFare = Math.abs(
          Number(toStop.priceFromOrigin ?? 0) - Number(fromStop.priceFromOrigin ?? 0)
        );

        const fare = Number.isFinite(seatSpecificFare) && seatSpecificFare > 0 ? seatSpecificFare : fallbackFare;
        const normalizedFare = Number.isFinite(fare) ? fare : 0;
        return sum + normalizedFare;
      }, 0);

      return roundToTwo(total);
    }

    // Fallback: seatCount × perSeatFare
    const perSeatFareNpr = Number(busData?.priceNpr ?? busData?.price ?? busData?.tripData?.fare ?? busData?.tripData?.price ?? 0);
    const seatCount = Array.isArray(actualSelectedSeats) ? actualSelectedSeats.length : 0;
    return roundToTwo(seatCount * perSeatFareNpr);
  };

  const totalFareNpr = computeTotalFareNpr();
  const totalFareInr = convertNprToInr(totalFareNpr);

  const seatsSelectedText = seatLines.length === 0 
    ? 'No seats selected'
    : seatLines.length === 1
    ? `Seat: ${seatLines[0]}`
    : `Seats:\n${seatLines.join('\n')}`;

  const updatePassenger = (index, field, value) => {
    // Safety check to ensure passenger exists at index
    if (!passengers[index]) {
      console.warn(`Attempted to update passenger at index ${index}, but passenger doesn't exist`);
      return;
    }
    
    const updatedPassengers = [...passengers];
    updatedPassengers[index][field] = value;
    setPassengers(updatedPassengers);
  };

  const handleProceed = () => {
    // Validate all passenger information
    
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      
      if (!passenger.name.trim()) {
        alert(`Please enter name for Passenger ${i + 1}`);
        return;
      }
      
      if (!passenger.age || isNaN(passenger.age) || passenger.age < 1 || passenger.age > 120) {
        alert(`Please enter valid age for Passenger ${i + 1} (1-120)`);
        return;
      }
    }
    
    // Ensure passengers have seatId
    const passengersWithSeatId = passengers.map((passenger, index) => ({
      ...passenger,
      age: parseInt(passenger.age),
      gender: passenger.gender.toUpperCase(),
      seatId: passenger.seatId || actualSelectedSeats[index]?.id,
    }));

    console.log('=== PASSENGERINFO NAVIGATION DEBUG ===');
    console.log('Validated passengers:', passengersWithSeatId);
    console.log('Selected seats with IDs:', actualSelectedSeats.map(seat => ({ id: seat.id, number: seat.seatNumber })));
    console.log('Navigation params being passed:', {
      busData: !!busData,
      selectedSeats: actualSelectedSeats,
      passengers: passengersWithSeatId,
      busInfo: !!busInfo,
      boardingPoint: !!boardingPoint,
      droppingPoint: !!droppingPoint,
    });
    console.log('==========================================');
    
    // Navigate to payment screen
    navigation.navigate('Payment', {
      busData: busData,
      selectedSeats: actualSelectedSeats,
      passengers: passengersWithSeatId,
      busInfo: busInfo,
      boardingPoint: boardingPoint,
      droppingPoint: droppingPoint,
      // Use a backend-aligned total so Payment and Confirm Booking always match.
      backendTotalFareNpr: totalFareNpr,
      totalFareNpr: totalFareNpr,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Top Background Image Section */}
      <View style={styles.topImageSection}>
        <ImageBackground
          source={require('../../assets/landing-background.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />

          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <Text style={styles.operatorName}>{busData.operator}</Text>
                <Text style={styles.busDetails}>
                  {busData.type} | {busData.departureTime}
                </Text>
                <Text style={styles.seatsSelected}>{seatsSelectedText}</Text>
                <Text style={styles.totalFareText}>
                  Total: NPR {Number(totalFareNpr).toFixed(2)} (₹ {Number(totalFareInr).toFixed(2)})
                </Text>
              </View>
              
              <View style={styles.headerPlaceholder} />
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>

      {/* Scrollable Content Area - Positioned to overlap image */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Passenger Information Card - Overlapping the image */}
        <View style={styles.cardOverlapping}>
          <Text style={styles.cardTitle}>Passenger Information</Text>
          
          {shouldRenderPassengerForms ? (
            actualSelectedSeats.map((seat, index) => {
              // Safety check: ensure passenger exists at this index
              if (!passengers[index]) {
                console.warn(`Passenger at index ${index} not found, skipping render`);
                return null;
              }
              
              return (
              <View key={index} style={styles.passengerSection}>
                <Text style={styles.passengerLabel}>
                  Passenger {index + 1} - Seat {seat.seatNumber || `Seat ${index + 1}`}
                </Text>
              
              {/* Full Name Input */}
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={passengers[index]?.name || ''}
                onChangeText={(text) => updatePassenger(index, 'name', text)}
              />
              
              {/* Email Input */}
              <TextInput
                style={styles.input}
                placeholder="Email Address (Required)"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                value={passengers[index]?.email || ''}
                onChangeText={(text) => updatePassenger(index, 'email', text)}
              />
              
              {/* Age and Gender Row */}
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, styles.ageInput]}
                  placeholder="Age"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={passengers[index]?.age || ''}
                  onChangeText={(text) => updatePassenger(index, 'age', text)}
                />
                
                {/* Gender Selection */}
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={styles.radioButton}
                    onPress={() => updatePassenger(index, 'gender', 'Male')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioCircle}>
                      {passengers[index]?.gender === 'Male' && (
                        <View style={styles.radioCircleFilled} />
                      )}
                    </View>
                    <Text style={styles.radioText}>Male</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.radioButton}
                    onPress={() => updatePassenger(index, 'gender', 'Female')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioCircle}>
                      {passengers[index]?.gender === 'Female' && (
                        <View style={styles.radioCircleFilled} />
                      )}
                    </View>
                    <Text style={styles.radioText}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            );
            })
          ) : (
            <Text style={styles.loadingText}>Loading passenger forms...</Text>
          )}
        </View>

        {/* Bottom spacing for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={styles.proceedButton}
          activeOpacity={0.8}
          onPress={handleProceed}
        >
          <Text style={styles.proceedButtonText}>Proceed to Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Top Image Section
  topImageSection: {
    height: SCREEN_HEIGHT * 0.25,
    width: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(43, 99, 110, 0.85)', // Overlay with 85% opacity
  },
  safeHeader: {
    flex: 1,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  operatorName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  busDetails: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    marginTop: 3,
  },
  seatsSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 18,
    minHeight: 18,
  },

  totalFareText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Scroll View - Positioned absolutely to overlap image
  scrollView: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18, // Starts before image ends (at 80% of image height)
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Overlapping Card Style for Passenger Information
  cardOverlapping: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Regular Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center', // Centered title
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },

  // Passenger Section
  passengerSection: {
    marginBottom: 20,
  },
  passengerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  // Input Styles - Clean, no borders
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
    marginBottom: 0,
  },

  // Gender Selection
  genderContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  radioText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },

  // Proceed Button - No card behind it
  buttonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  proceedButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 25,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default PassengerInformation;
