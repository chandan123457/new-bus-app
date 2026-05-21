import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const NPR_TO_INR_RATE = 0.625;
const convertNprToInr = (nprAmount) => Number((Number(nprAmount || 0) * NPR_TO_INR_RATE).toFixed(2));

const SeatSelectionDuplicate = ({ navigation, route }) => {
  const { busData } = route.params;
  const priceNpr = Number(busData?.priceNpr ?? busData?.price ?? busData?.tripData?.fare ?? busData?.tripData?.price ?? 0);
  const priceInr = convertNprToInr(priceNpr);

  // State for deck selection
  const [selectedDeck, setSelectedDeck] = useState('Lower');

  // Initialize seat states: 'available', 'selected', 'booked'
  // Only 4 rows (A-D) for Lower/Upper deck
  const [seatStates, setSeatStates] = useState({
    A1: 'available', A2: 'available', A3: 'booked', A4: 'available',
    B1: 'available', B2: 'selected', B3: 'available', B4: 'booked',
    C1: 'booked', C2: 'available', C3: 'available', C4: 'available',
    D1: 'available', D2: 'available', D3: 'selected', D4: 'available',
  });

  const handleSeatPress = (seatId) => {
    if (seatStates[seatId] === 'booked') return; // Can't select booked seats
    
    setSeatStates(prev => ({
      ...prev,
      [seatId]: prev[seatId] === 'selected' ? 'available' : 'selected'
    }));
  };

  const getSeatStyle = (state) => {
    switch(state) {
      case 'selected':
        return { backgroundColor: '#0EA5A5' }; // Teal/cyan - reference exact
      case 'booked':
        return { backgroundColor: '#1A3838' }; // Dark navy - reference exact
      default:
        return { backgroundColor: '#CEE5E5' }; // Light pale cyan/gray - reference exact
    }
  };

  const getSeatTextStyle = (state) => {
    return state === 'available' 
      ? { color: '#2C2C2C' } 
      : { color: '#FFFFFF' };
  };

  const getSeatHeightStyle = (row) => {
    // Rows B, C, D get increased height; Row A stays normal
    return row === 'A' ? {} : { height: 90 };
  };

  const renderSeat = (seatId, state, row) => (
    <TouchableOpacity
      key={seatId}
      style={[styles.seat, getSeatStyle(state), getSeatHeightStyle(row)]}
      onPress={() => handleSeatPress(seatId)}
      disabled={state === 'booked'}
      activeOpacity={0.7}
    >
      <Text style={[styles.seatText, getSeatTextStyle(state)]}>
        {seatId}
      </Text>
    </TouchableOpacity>
  );

  const renderSeatRow = (row) => {
    const seats = ['1', '2', '3', '4'];
    return (
      <View key={row} style={styles.seatRow}>
        <View style={styles.seatGroup}>
          {renderSeat(`${row}1`, seatStates[`${row}1`], row)}
          {renderSeat(`${row}2`, seatStates[`${row}2`], row)}
        </View>
        <View style={styles.aisle} />
        <View style={styles.seatGroup}>
          {renderSeat(`${row}3`, seatStates[`${row}3`], row)}
          {renderSeat(`${row}4`, seatStates[`${row}4`], row)}
        </View>
      </View>
    );
  };

  const selectedSeats = Object.keys(seatStates).filter(
    key => seatStates[key] === 'selected'
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar hidden />
      
      {/* Top 25% - Background Image with Header (Full-bleed from top) */}
      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.topSection}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        {/* SafeArea only for header content */}
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
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
              <Text style={styles.routeText}>
                {busData.from} To {busData.to}
              </Text>
              <Text style={styles.dateText}>{busData.date}</Text>
            </View>
            
            <View style={styles.headerPlaceholder} />
          </View>
        </SafeAreaView>
      </ImageBackground>

        {/* Scrollable Content - Overlapping the image */}
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Bus Info Card - Floating over background image */}
          <View style={styles.busInfoCardWrapper}>
          <View style={styles.busInfoCard}>
            <View style={styles.busInfoRow}>
              <View style={styles.busInfoLeft}>
                <Text style={styles.busTimeText}>
                  {busData.departureTime} – {busData.arrivalTime}
                </Text>
                <Text style={styles.busOperatorText}>{busData.operator}</Text>
                <Text style={styles.busTypeText}>{busData.type}</Text>
              </View>
              <View style={styles.busInfoRight}>
                <View style={styles.ratingContainer}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingText}>{busData.rating}</Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceText}>NPR {priceNpr.toFixed(2)}</Text>
                  <Text style={styles.priceSubText}>(₹ {priceInr.toFixed(2)})</Text>
                </View>
                <Text style={styles.durationText}>{busData.duration}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Lower/Upper Deck Selector - Replaces Legend */}
        <View style={styles.deckSelectorContainer}>
          <View style={styles.deckSelector}>
            <TouchableOpacity
              style={[
                styles.deckTab,
                selectedDeck === 'Lower' && styles.deckTabActive
              ]}
              onPress={() => setSelectedDeck('Lower')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.deckTabText,
                  selectedDeck === 'Lower' && styles.deckTabTextActive
                ]}
              >
                Lower
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deckTab,
                selectedDeck === 'Upper' && styles.deckTabActive
              ]}
              onPress={() => setSelectedDeck('Upper')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.deckTabText,
                  selectedDeck === 'Upper' && styles.deckTabTextActive
                ]}
              >
                Upper
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seat Layout - Direct on white background */}
        <View style={styles.seatLayoutContainer}>
          {/* Seats Grid with Lower Deck Watermark */}
          <View style={styles.seatsGrid}>
            {/* Lower Deck Watermark Text - Behind Seats */}
            <Text style={styles.deckWatermark}>Lower Deck</Text>
            
            {/* Steering Wheel / Driver Icon - Centered between A3 and A4 */}
            <View style={styles.steeringIconWrapper}>
              <MaterialCommunityIcons 
                name="steering" 
                size={28} 
                color="#374151" 
                style={styles.steeringIcon} 
              />
            </View>
            
            {/* Seats */}
            {['A', 'B', 'C', 'D'].map(row => renderSeatRow(row))}
          </View>
        </View>

        {/* Bottom spacing for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button - Direct on white background */}
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.8}
          onPress={() => {
            // Navigate to passenger information screen
            console.log('Selected seats:', selectedSeats);
            console.log('Selected deck:', selectedDeck);
            navigation.navigate('PassengerInformation', {
              busData: busData,
              selectedSeats: selectedSeats,
            });
          }}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Very light off-white background
  },
  topSection: {
    height: SCREEN_HEIGHT * 0.25, // 25% of screen height for background image
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(43, 99, 110, 0.85)',
  },
  scrollContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15, // Start scrollable area at 15% to create overlap
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
    backgroundColor: 'transparent',
  },
  busInfoCardWrapper: {
    paddingTop: 0,
    marginTop: 0,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
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
  routeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 2,
  },

  // Bus Info Card Styles
  busInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busInfoLeft: {
    flex: 1,
  },
  busTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  busOperatorText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  busTypeText: {
    fontSize: 13,
    color: '#7A7A7A',
  },
  busInfoRight: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starIcon: {
    fontSize: 14,
    marginRight: 3,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  priceBlock: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5B7EFF',
  },
  priceSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  durationText: {
    fontSize: 12,
    color: '#7A7A7A',
  },

  // Deck Selector Styles (Replaces Legend)
  deckSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  deckSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  deckTab: {
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  deckTabActive: {
    backgroundColor: '#2D9B9B',
  },
  deckTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7A7A',
  },
  deckTabTextActive: {
    color: '#FFFFFF',
  },

  // Seat Layout Styles
  seatLayoutContainer: {
    marginHorizontal: 24,
    marginBottom: 0,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    position: 'relative',
  },
  steeringIconWrapper: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: 44, // Positions icon centered between A3 and A4 (half layout width + half right group + half gap)
    zIndex: 10,
  },
  steeringIcon: {
    // Flat icon only, no background, no circle
  },
  seatsGrid: {
    alignItems: 'center',
    position: 'relative',
    paddingTop: 48,
  },
  deckWatermark: {
    position: 'absolute',
    fontSize: 12,
    color: '#C8D6D6',
    opacity: 0.28,
    fontWeight: '300',
    letterSpacing: 2.5,
    transform: [{ rotate: '90deg' }],
    // Centered exactly in the aisle between seat blocks
    left: '50%',
    top: '50%',
    marginLeft: -35,
    marginTop: -50,
    zIndex: 0,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7, // Tight vertical spacing - reference match
  },
  seatGroup: {
    flexDirection: 'row',
    gap: 7, // Tight horizontal spacing between seats in same group
  },
  aisle: {
    width: 26, // Aisle width - reference match
  },
  seat: {
    width: 41,
    height: 50, // Updated base height for row A
    borderRadius: 9, // Rounded rectangle - reference match
    justifyContent: 'center',
    alignItems: 'center',
    // No borders, no shadows, clean design
  },
  seatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3F4B4B',
  },

  // Bottom Button Styles
  buttonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAFAFA', // Match screen background
    paddingHorizontal: 16,
    paddingVertical: 16,
    // No card or container behind button
  },
  continueButton: {
    backgroundColor: '#3B82F6', // Blue background
    borderRadius: 25, // Pill-shaped
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // No shadows for flat design
  },
  continueButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: '700', // Bold
    letterSpacing: 0.5,
  },
});

export default SeatSelectionDuplicate;
