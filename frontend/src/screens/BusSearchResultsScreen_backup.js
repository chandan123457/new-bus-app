/**
 * Bus Search Results Screen - Pixel Perfect Match
 * Exact implementation as per specifications
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { busAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// Prices are stored in NPR in DB; INR is derived for display.
const NPR_TO_INR_RATE = 0.625;
const convertNprToInr = (nprAmount) => Number((Number(nprAmount || 0) * NPR_TO_INR_RATE).toFixed(2));

const BusSearchResultsScreen = ({ navigation, route }) => {
  const [selectedTab, setSelectedTab] = useState('Fastest');
  const [busData, setBusData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get route params or use defaults
  const from = route?.params?.from || 'Jaipur';
  const to = route?.params?.to || 'Jodhpur';
  const date = route?.params?.date || '27 Sept 2025';
  const apiData = route?.params?.busData;
  const searchData = route?.params?.searchData;

  // Process API data into display format
  const processApiData = (apiResponse) => {
    console.log('Processing API response:', apiResponse);
    
    if (!apiResponse) {
      console.log('No API response data');
      return [];
    }
    
    if (!apiResponse.trips || !Array.isArray(apiResponse.trips)) {
      console.log('No trips array in API response');
      return [];
    }
    
    if (apiResponse.trips.length === 0) {
      console.log('Empty trips array - no buses found');
      return [];
    }

    const formatDurationMinutes = (minutes) => {
      const totalMinutes = Number(minutes);
      if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '0h 0m';
      const hours = Math.floor(totalMinutes / 60);
      const mins = Math.floor(totalMinutes % 60);
      return `${hours}h ${mins}m`;
    };

    const amenitiesToList = (amenitiesObj) => {
      if (!amenitiesObj || typeof amenitiesObj !== 'object') return [];
      const list = [];
      if (amenitiesObj.hasWifi) list.push('WiFi');
      if (amenitiesObj.hasAC) list.push('AC');
      if (amenitiesObj.hasCharging) list.push('Charging');
      if (amenitiesObj.hasRestroom) list.push('Restroom');
      return list;
    };

    return apiResponse.trips.map((trip, index) => {
      console.log('Processing trip:', trip);

      // Backend shape (from /user/showbus) already contains fromStop/toStop, busName/busNumber, fare, duration (minutes).
      const fromStop = trip?.fromStop || null;
      const toStop = trip?.toStop || null;

      const basePriceNpr = Number(trip?.fare) || 0;
      const basePriceInr = convertNprToInr(basePriceNpr);

      const busName = trip?.busName || 'Bus Operator';
      const busNumber = trip?.busNumber || '';
      const busType = trip?.busType || 'A/C Sleeper (2+1)';

      const departureTime = fromStop?.departureTime || '';
      const arrivalTime = toStop?.arrivalTime || '';

      const durationText = typeof trip?.duration === 'number' ? formatDurationMinutes(trip.duration) : '0h 0m';
      const rating = Number(trip?.rating) || 4.0;
      const amenities = Array.isArray(trip?.amenities)
        ? trip.amenities
        : amenitiesToList(trip?.amenities) || ['WiFi', 'AC', 'Charging'];

      return {
        id: trip.tripId || `trip_${index}`,
        operator: busName,
        busType: busType,
        departureTime,
        arrivalTime,
        duration: durationText,
        // Keep `price` for backwards compatibility; it is NPR.
        price: basePriceNpr,
        priceNpr: basePriceNpr,
        priceInr: basePriceInr,
        rating,
        amenities,
        availableSeats: Number(trip?.availableSeats) || 0,
        busNumber,
        tag: index === 0 ? 'Fastest' : index === 1 ? 'Cheapest' : null,
        tripData: trip, // Store original trip data for booking
        tripId: trip.tripId, // Store tripId directly for easy access
      };
    }).filter(trip => trip !== null); // Filter out any null entries
  };

  React.useEffect(() => {
    console.log('BusSearchResultsScreen useEffect - API Data:', apiData);
    console.log('Search Data:', searchData);
    console.log('Route params:', { from, to, date });
    
    setLoading(false); // Ensure loading is false
    
    if (apiData) {
      try {
        const processedData = processApiData(apiData);
        console.log('Processed Data:', processedData);
        
        setBusData(processedData);
        
        if (processedData.length === 0) {
          console.log('No buses found - API returned empty results');
        } else {
          console.log(`Found ${processedData.length} buses`);
        }
      } catch (error) {
        console.error('Error processing API data:', error);
        setBusData([]);
      }
    } else {
      console.log('No API data provided - showing empty state');
      setBusData([]);
    }
  }, [apiData, searchData, from, to, date]);

  const getDisplayData = () => {
    if (busData.length === 0) {
      return [];
    }

    // Sort based on selected tab
    let sortedData = [...busData];
    switch (selectedTab) {
      case 'Fastest':
        sortedData.sort((a, b) => {
          const aDuration = parseFloat(a.duration) || 999;
          const bDuration = parseFloat(b.duration) || 999;
          return aDuration - bDuration;
        });
        break;
      case 'Cheapest':
        sortedData.sort((a, b) => (a.priceNpr || a.price || 0) - (b.priceNpr || b.price || 0));
        break;
      case 'Departure':
        sortedData.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        break;
      default:
        // Keep original order
        break;
    }
    return sortedData;
  };

  // Helper function to format time to 12-hour format
  const formatTime = (time) => {
    if (!time) return '00:00 AM';
    
    // Handle both 'HH:mm' and 'HH:mm:ss' formats
    const [hours, minutes] = time.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return time;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = String(minutes).padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChange = () => {
    console.log('Change search criteria');
    navigation.goBack(); // Navigate back to HomeScreen to modify search
  };

  const handleTabPress = (tab) => {
    setSelectedTab(tab);
  };

  const handleBusCardPress = (bus) => {
    console.log('🚌 === BUS CARD PRESS DEBUG START ===');
    console.log('🚌 Full bus object:', JSON.stringify(bus, null, 2));
    console.log('🚌 Bus ID:', bus.id);
    console.log('🚌 Bus tripId direct:', bus.tripId);
    console.log('🚌 Trip data available:', bus.tripData);
    console.log('🚌 Trip data type:', typeof bus.tripData);
    
    if (bus.tripData) {
      console.log('🚌 Trip data keys:', Object.keys(bus.tripData));
      console.log('🚌 Trip data tripId:', bus.tripData.tripId);
      console.log('🚌 Trip data id:', bus.tripData.id);
    }
    
    console.log('🚌 Search data available:', searchData);
    
    // Extract trip data from the bus object
    const tripData = bus.tripData || {};
    const tripRoute = tripData.route || {};
    const stops = Array.isArray(tripRoute.stops) ? tripRoute.stops : [];
    
    // Try multiple ways to get the tripId
    let tripId = tripData.tripId || tripData.id || bus.id || bus.tripId;
    console.log('🚌 Extracted tripId:', tripId);
    
    // Find the from and to stops based on search criteria
    const startLocation = searchData?.startLocation || from || '';
    const endLocation = searchData?.endLocation || to || '';
    
    console.log('🚌 Looking for stops:', { startLocation, endLocation });
    console.log('🚌 Available stops:', stops);
    
    // Also try to get stop IDs directly from tripData if available
    let fromStopId = tripData.fromStop?.id;
    let toStopId = tripData.toStop?.id;
    
    // If not available in tripData, try to find from stops array
    if (!fromStopId || !toStopId) {
      const fromStop = stops.find(stop => 
        stop?.location && typeof stop.location === 'string' && 
        stop.location.toLowerCase().includes(startLocation.toLowerCase())
      );
      
      const toStop = stops.find(stop => 
        stop?.location && typeof stop.location === 'string' &&
        stop.location.toLowerCase().includes(endLocation.toLowerCase())
      );
      
      fromStopId = fromStopId || fromStop?.id;
      toStopId = toStopId || toStop?.id;
    }
    
    console.log('🚌 Final navigation data:', {
      tripId: tripId,
      fromStopId: fromStopId,
      toStopId: toStopId,
      tripData: tripData
    });
    
    navigation.navigate('SeatSelection', {
      busData: {
        from: from,
        to: to,
        date: date,
        operator: bus.operator,
        type: bus.busType,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        rating: bus.rating,
        price: bus.priceNpr ?? bus.price,
        priceNpr: bus.priceNpr ?? bus.price,
        priceInr: bus.priceInr ?? convertNprToInr(bus.priceNpr ?? bus.price),
        duration: bus.duration || '8 Hours',
        // Essential data for API calls
        tripId: tripId,
        fromStopId: fromStopId,
        toStopId: toStopId,
        tripData: tripData, // Full trip data for reference
      },
      // Also pass search context
      searchData: searchData,
      fromStop: tripData.fromStop,
      toStop: tripData.toStop,
    });
  };

  const renderBusCard = ({ item }) => (
    <TouchableOpacity
      style={styles.busCard}
      onPress={() => handleBusCardPress(item)}
      activeOpacity={0.8}
    >
      {/* Card Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.operatorInfo}>
          <View style={styles.operatorLogo}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.operatorLogoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.operatorDetails}>
            <Text style={styles.operatorName}>{item.operator}</Text>
            <Text style={styles.busMeta} numberOfLines={1}>
              {item.busType}{item.busNumber ? ` • ${item.busNumber}` : ''}
            </Text>
          </View>
        </View>

        {item.tag && (
          <View style={[
            styles.tagContainer,
            item.tag === 'Fastest' ? styles.tagFastest : styles.tagCheapest
          ]}>
            <Text style={[
              styles.tagText,
              item.tag === 'Fastest' ? styles.tagTextFastest : styles.tagTextCheapest
            ]}>
              {item.tag}
            </Text>
          </View>
        )}
      </View>

      {/* Journey Timeline Row */}
      <View style={styles.journeyRow}>
        <View style={styles.journeyPointLeft}>
          <Text style={styles.journeyTime}>{formatTime(item.departureTime)}</Text>
          <Text style={styles.journeyCity} numberOfLines={1}>{from}</Text>
        </View>

        <View style={styles.journeyLine}>
          <View style={styles.dottedLineContainer}>
            <View style={styles.dottedLine} />
            <View style={styles.busIconContainer}>
              <Text style={styles.busIcon}>🚌</Text>
            </View>
          </View>
        </View>

        <View style={styles.journeyPointRight}>
          <Text style={styles.journeyTimeRight}>{formatTime(item.arrivalTime)}</Text>
          <Text style={styles.journeyCityRight} numberOfLines={1}>{to}</Text>
        </View>
      </View>

      {/* Divider Line */}
      <View style={styles.dividerLine} />

      {/* Bottom Metadata Row */}
      <View style={styles.metadataRow}>
        {/* Left: Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.rating}>{item.rating}</Text>
        </View>

        {/* Center: Passenger Count */}
        <View style={styles.seatsContainer}>
          <Text style={styles.seatIcon}>👤</Text>
          <Text style={styles.seats}>{item.availableSeats || item.seatsAvailable || 0}</Text>
        </View>

        {/* Right: Price (NPR stored; INR derived) */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>NPR {Number(item.priceNpr ?? item.price ?? 0).toFixed(2)}</Text>
          <Text style={styles.priceInr}>(₹ {Number(item.priceInr ?? convertNprToInr(item.priceNpr ?? item.price ?? 0)).toFixed(2)})</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar hidden />

      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Semi-transparent teal/blue overlay (~75% opacity) */}
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Top Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerRoute}>
                {from} To {to}
              </Text>
              <Text style={styles.headerDate}>{date}</Text>
            </View>

            <TouchableOpacity
              style={styles.changeButton}
              onPress={handleChange}
              activeOpacity={0.7}
            >
              <Text style={styles.changeText}>CHG</Text>
            </TouchableOpacity>
          </View>

          {/* Breadcrumb/Route Info */}
          <View style={styles.breadcrumbContainer}>
            <Text style={styles.breadcrumbText}>{from} → {to}</Text>
          </View>

          {/* Main Content Area - Bus Cards */}
          <View style={styles.mainCard}>
            <FlatList
              data={getDisplayData()}
              renderItem={renderBusCard}
              keyExtractor={(item) => item.id}
              style={styles.busList}
              contentContainerStyle={styles.busListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateTitle}>No Buses Found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    We couldn't find any buses for the selected route and date. Please try modifying your search.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={handleChange}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyStateButtonText}>Change Search</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: width,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.80)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerRoute: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerDate: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  changeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  breadcrumbContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop: 4,
  },
  breadcrumbText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  mainCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -25,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  busList: {
    flex: 1,
  },
  busListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 99,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  operatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  operatorLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  operatorLogoImage: {
    width: 24,
    height: 24,
  },
  operatorDetails: {
    flex: 1,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  busMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tagContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  tagFastest: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  tagCheapest: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tagTextFastest: {
    color: '#047857',
  },
  tagTextCheapest: {
    color: '#1D4ED8',
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  journeyPointLeft: {
    alignItems: 'flex-start',
    flex: 1,
  },
  journeyPointRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  journeyTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  journeyTimeRight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  journeyCity: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  journeyCityRight: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  journeyLine: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dottedLineContainer: {
    width: '100%',
    height: 1,
    position: 'relative',
    alignItems: 'center',
  },
  dottedLine: {
    width: '100%',
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  busIconContainer: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  busIcon: {
    fontSize: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginTop: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  starIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    marginRight: 4,
  },
  rating: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seatIcon: {
    fontSize: 12,
  },
  seats: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  priceInr: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default BusSearchResultsScreen;

          {/* Main Content Area - Bus Cards */}
          <FlatList
            data={getDisplayData()}
            renderItem={renderBusCard}
            keyExtractor={(item) => item.id}
            style={styles.busList}
            contentContainerStyle={styles.busListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No buses available
                </Text>
                <Text style={styles.emptySubText}>
                  No buses found from {from} to {to} on {date}.{"\n"}Please try a different route or date.
                </Text>
              </View>
            )}
          />
        </SafeAreaView>
      </ImageBackground>
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: width,
    height: height,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.80)',
  },

  safeArea: {
    flex: 1,
  },

  // Header Bar ~60-70px height
  header: {
    height: 70,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '400',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRoute: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  headerDate: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },

  changeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  changeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Breadcrumb/Stops
  breadcrumbContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },

  breadcrumbText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Filter Tabs - spacing from breadcrumb
  tabsScrollView: {
    maxHeight: 60,
    backgroundColor: 'transparent',
    marginTop: 8,
  },

  tabsContainer: {
    paddingHorizontal: 16,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: 135,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  tabSelected: {
    backgroundColor: '#5B7EFF',
    shadowColor: '#5B7EFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },

  tabText: {
    color: '#4A4A4A',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  tabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },

  tabBadgeText: {
    color: '#4A4A4A',
    fontSize: 11,
    fontWeight: '500',
  },

  tabTiming: {
    color: '#4A4A4A',
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 5,
  },

  tabTimingSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Main Content Area
  busList: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray/off-white background
    marginTop: 16,
  },

  busListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },

  // Bus Card Component
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Card Header Row
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  operatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  operatorLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  operatorLogoImage: {
    width: 28,
    height: 28,
  },

  operatorDetails: {
    flex: 1,
  },

  operatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  busType: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },

  busMeta: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },

  tagContainer: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  tagFastest: {
    backgroundColor: '#E3F2FF',
  },

  tagCheapest: {
    backgroundColor: '#E8F5E9',
  },

  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },

  tagTextFastest: {
    color: '#2196F3',
  },

  tagTextCheapest: {
    color: '#4CAF50',
  },

  // Journey Timeline Row
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  journeyPoint: {
    flexShrink: 0,
    minWidth: 80,
    maxWidth: 100,
  },

  journeyPointLeft: {
    flexShrink: 0,
    minWidth: 80,
    maxWidth: 100,
    alignItems: 'flex-start',
  },

  journeyPointRight: {
    flexShrink: 0,
    minWidth: 80,
    maxWidth: 100,
    alignItems: 'flex-end',
  },

  journeyTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  journeyTimeRight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'right',
  },

  journeyCity: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
    flexWrap: 'nowrap',
  },

  journeyCityRight: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
    flexWrap: 'nowrap',
    textAlign: 'right',
  },

  journeyLine: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },

  dottedLineContainer: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dottedLine: {
    width: '100%',
    height: 1,
    borderStyle: 'dotted',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },

  busIconContainer: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    top: -11.5,
  },

  busIcon: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },

  // Divider Line
  dividerLine: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginBottom: 12,
  },

  // Bottom Metadata Row
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  // Left: Rating Container (33.333% width)
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '33.333%',
    justifyContent: 'flex-start',
  },

  starIcon: {
    color: '#FFB800',
    fontSize: 14,
    marginRight: 4,
  },

  rating: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },

  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '33.333%',
  },

  seatIcon: {
    fontSize: 14,
    marginRight: 4,
    color: '#5B7EFF',
  },

  seats: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },

  priceContainer: {
    width: '33.333%',
    alignItems: 'flex-end',
  },

  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'right',
  },

  priceInr: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'right',
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Test mode indicator styles
  testModeIndicator: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },

  testModeText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default BusSearchResultsScreen;
