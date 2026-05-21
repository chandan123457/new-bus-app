import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BoardingPointsScreen = ({ navigation, route }) => {
  console.log('=== BOARDINGPOINTS RECEIVED DATA DEBUG ===');
  console.log('Full route.params:', JSON.stringify(route.params, null, 2));
  console.log('==========================================');
  
  const { busInfo, selectedSeats = [], busData } = route.params || {};

  const normalizeSeat = (seat) => {
    if (!seat) return seat;
    const deck = (seat.deck || seat.level || 'LOWER').toString().toUpperCase();
    const seatNumber = seat.seatNumber || seat.number || seat.seat_no || seat.id;
    return { ...seat, deck, seatNumber };
  };

  const [actualSelectedSeats, setActualSelectedSeats] = useState(() =>
    (selectedSeats || []).map(normalizeSeat)
  );
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState(null);
  const [selectedDroppingPoint, setSelectedDroppingPoint] = useState(null);

  console.log('BoardingPointsScreen extracted data:', {
    busInfo: !!busInfo,
    selectedSeatsCount: actualSelectedSeats.length,
    selectedSeats: actualSelectedSeats,
    busData: !!busData,
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

  // Check if selectedSeats is empty
  if (!actualSelectedSeats || actualSelectedSeats.length === 0) {
    console.error('No selected seats found in BoardingPointsScreen!');
  }

  console.log('Current actualSelectedSeats:', actualSelectedSeats);

  // Use actual boarding and dropping points from API data
  const apiBoardingPoints = busInfo?.route?.boardingPoints || [];
  const apiDroppingPoints = busInfo?.route?.droppingPoints || [];
  
  console.log('API boarding points:', apiBoardingPoints);
  console.log('API dropping points:', apiDroppingPoints);
  
  // Fallback to hardcoded data if API data is not available
  const fallbackBoardingPoints = [
    { id: '1', name: 'Central Bus Station', time: '06:00 AM', landmark: 'Near City Mall' },
    { id: '2', name: 'Metro Station Gate 3', time: '06:15 AM', landmark: 'Exit Gate 3' },
    { id: '3', name: 'Airport Terminal', time: '06:30 AM', landmark: 'Departure Gate' },
  ];

  const fallbackDroppingPoints = [
    { id: '1', name: 'Downtown Terminal', time: '02:00 PM', landmark: 'Main Terminal' },
    { id: '2', name: 'Shopping Complex', time: '02:15 PM', landmark: 'Near Food Court' },
    { id: '3', name: 'Railway Station', time: '02:30 PM', landmark: 'Platform Entry' },
  ];

  // Use API data if available, otherwise fallback to hardcoded data
  const boardingPoints = apiBoardingPoints.length > 0 ? apiBoardingPoints : fallbackBoardingPoints;
  const droppingPoints = apiDroppingPoints.length > 0 ? apiDroppingPoints : fallbackDroppingPoints;

  const handleContinue = () => {
    if (!selectedBoardingPoint || !selectedDroppingPoint) {
      Alert.alert('Selection Required', 'Please select both boarding and dropping points');
      return;
    }

    // Validate selectedSeats before proceeding
    if (!actualSelectedSeats || actualSelectedSeats.length === 0) {
      console.error('No selected seats found, cannot proceed');
      Alert.alert(
        'Seat Selection Error',
        'No seat information found. Please go back and select seats again.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    console.log('=== BOARDINGPOINTS NAVIGATION DEBUG ===');
    console.log('selectedSeats before navigation:', actualSelectedSeats);
    console.log('busInfo exists:', !!busInfo);
    console.log('busData exists:', !!busData);
    console.log('boardingPoint:', selectedBoardingPoint);
    console.log('droppingPoint:', selectedDroppingPoint);
    console.log('Navigation params being passed:', {
      busInfo: !!busInfo,
      selectedSeats: actualSelectedSeats,
      busData: !!busData,
      boardingPoint: selectedBoardingPoint,
      droppingPoint: selectedDroppingPoint,
    });
    console.log('==========================================');

    navigation.navigate('PassengerInformation', {
      busInfo,
      selectedSeats: actualSelectedSeats,
      busData,
      boardingPoint: selectedBoardingPoint,
      droppingPoint: selectedDroppingPoint,
    });
  };

  const renderPointCard = (point, isSelected, onSelect, type) => {
    // Defensive check for point data
    if (!point || !point.id) {
      console.warn('Invalid point data:', point);
      return null;
    }

    return (
      <TouchableOpacity
        key={point.id}
        style={[
          styles.pointCard,
          isSelected && styles.selectedPointCard
        ]}
        onPress={() => onSelect(point)}
        activeOpacity={0.8}
      >
        <View style={styles.pointInfo}>
          <Text style={[
            styles.pointName,
            isSelected && styles.selectedText
          ]}>
            {point.name || 'Unknown Location'}
          </Text>
          <Text style={[
            styles.pointTime,
            isSelected && styles.selectedSubText
          ]}>
            {point.time || 'Time TBD'}
          </Text>
          <Text style={[
            styles.pointLandmark,
            isSelected && styles.selectedSubText
          ]}>
            {point.landmark || point.address || 'No landmark available'}
          </Text>
        </View>
        <View style={[
          styles.selectionCircle,
          isSelected && styles.selectedCircle
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar hidden />
      
      {/* Top Section - Background Image with Header */}
      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.topSection}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Boarding & Dropping Points</Text>
              <Text style={styles.headerSubtitle}>
                {busData?.operator || 'Bus Service'} • {actualSelectedSeats.length} seat{actualSelectedSeats.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Boarding Points Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker-up" size={24} color="#2D9B9B" />
              <Text style={styles.sectionTitle}>Select Boarding Point</Text>
            </View>
            
            {boardingPoints.length > 0 ? (
              boardingPoints
                .filter(point => point && point.id) // Filter out invalid points
                .map(point => 
                  renderPointCard(
                    point,
                    selectedBoardingPoint?.id === point.id,
                    setSelectedBoardingPoint,
                    'boarding'
                  )
                )
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No boarding points available</Text>
              </View>
            )}
          </View>

          {/* Dropping Points Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker-down" size={24} color="#E74C3C" />
              <Text style={styles.sectionTitle}>Select Dropping Point</Text>
            </View>
            
            {droppingPoints.length > 0 ? (
              droppingPoints
                .filter(point => point && point.id) // Filter out invalid points  
                .map(point => 
                  renderPointCard(
                    point,
                    selectedDroppingPoint?.id === point.id,
                    setSelectedDroppingPoint,
                    'dropping'
                  )
                )
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No dropping points available</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedBoardingPoint || !selectedDroppingPoint) && styles.disabledButton
            ]}
            onPress={handleContinue}
            disabled={!selectedBoardingPoint || !selectedDroppingPoint}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.continueButtonText,
              (!selectedBoardingPoint || !selectedDroppingPoint) && styles.disabledButtonText
            ]}>
              Continue to Passenger Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topSection: {
    height: SCREEN_HEIGHT * 0.25,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.80)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginLeft: 10,
  },
  pointCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPointCard: {
    borderColor: '#2D9B9B',
    backgroundColor: '#F0FFFE',
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  pointTime: {
    fontSize: 14,
    color: '#2D9B9B',
    fontWeight: '500',
    marginBottom: 2,
  },
  pointLandmark: {
    fontSize: 12,
    color: '#666666',
  },
  selectedText: {
    color: '#2D9B9B',
  },
  selectedSubText: {
    color: '#2D9B9B',
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedCircle: {
    backgroundColor: '#2D9B9B',
    borderColor: '#2D9B9B',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButton: {
    backgroundColor: '#2D9B9B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2D9B9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    shadowColor: 'transparent',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#999999',
  },
});

export default BoardingPointsScreen;