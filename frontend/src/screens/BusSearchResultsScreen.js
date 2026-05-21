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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { busAPI } from '../services/api';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Prices are stored in NPR in DB; INR is derived for display.
const NPR_TO_INR_RATE = 0.625;
const convertNprToInr = (nprAmount) => Number((Number(nprAmount || 0) * NPR_TO_INR_RATE).toFixed(2));

const getAmenityMeta = (label) => {
  switch (label) {
    case 'WiFi':
      return { lib: 'ion', name: 'wifi', color: COLORS.primary, text: 'WiFi' };
    case 'AC':
      return { lib: 'ion', name: 'snow', color: COLORS.primary, text: 'AC' };
    case 'Charging':
      return { lib: 'ion', name: 'flash', color: COLORS.warning, text: 'Charging' };
    case 'Restroom':
      return { lib: 'mci', name: 'toilet', color: COLORS.primary, text: 'Restroom' };
    case 'Blanket':
      // MaterialCommunityIcons does not include a "blanket" glyph in this Expo build.
      // Use a valid, closest semantic icon to avoid rendering as "?".
      return { lib: 'mci', name: 'bed', color: COLORS.primary, text: 'Blanket' };
    case 'Water Bottle':
      return { lib: 'mci', name: 'water', color: COLORS.primary, text: 'Water' };
    case 'Snacks':
      return { lib: 'mci', name: 'food', color: COLORS.primary, text: 'Snacks' };
    case 'TV':
      return { lib: 'mci', name: 'television', color: COLORS.primary, text: 'TV' };
    default:
      return { lib: 'ion', name: 'information-circle', color: COLORS.primary, text: label };
  }
};

const BusSearchResultsScreen = ({ navigation, route }) => {
  const [selectedTab, setSelectedTab] = useState('Fastest');
  const [busData, setBusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState({
    busType: 'ALL',
    sortBy: 'price',
    sortOrder: 'asc',
  });

  // Get route params or use defaults
  const from = route?.params?.from || 'Jaipur';
  const to = route?.params?.to || 'Jodhpur';
  const date = route?.params?.date || '27 Sept 2025';
  const apiData = route?.params?.busData;
  const searchData = route?.params?.searchData;

  const buildFilterPayload = (base, currentFilters) => {
    const payload = { ...base };

    if (currentFilters.busType && currentFilters.busType !== 'ALL') {
      payload.busType = currentFilters.busType;
    }

    // Sort (screenshot shows only "Price: Low to High")
    if (currentFilters.sortBy) {
      payload.sortBy = currentFilters.sortBy;
      payload.sortOrder = currentFilters.sortOrder || 'asc';
    }

    return payload;
  };

  const fetchWithFilters = async (nextFilters = filters) => {
    if (!searchData) {
      Alert.alert('Search Required', 'Please start a search from the home screen.');
      return;
    }

    // Keep UI state in sync before hitting API so controls reflect choice
    setFilters(nextFilters);

    setLoading(true);
    try {
      const payload = buildFilterPayload(searchData, nextFilters);
      const response = await busAPI.searchBuses(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch buses');
      }

      const processed = processApiData(response.data);
      setBusData(processed);
    } catch (error) {
      console.error('Filter fetch error:', error);
      Alert.alert('Filter Error', error.message || 'Unable to apply filters.');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const cleared = {
      busType: 'ALL',
      sortBy: 'price',
      sortOrder: 'asc',
    };
    fetchWithFilters(cleared);
  };

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
      if (amenitiesObj.hasBlanket) list.push('Blanket');
      if (amenitiesObj.hasWaterBottle) list.push('Water Bottle');
      if (amenitiesObj.hasSnacks) list.push('Snacks');
      if (amenitiesObj.hasTV) list.push('TV');
      return list;
    };

    return apiResponse.trips.map((trip, index) => {
      console.log('Processing trip:', trip);

      // Backend shape (from /user/showbus) already contains fromStop/toStop, busName/busNumber, fare, duration (minutes).
      const fromStop = trip?.fromStop || null;
      const toStop = trip?.toStop || null;

      // Use seat-specific prices; fall back to deprecated fare field
      const basePriceNpr = Number(
        trip?.lowerSeaterPrice || trip?.lowerSleeperPrice || trip?.upperSleeperPrice || trip?.fare
      ) || 0;
      const basePriceInr = convertNprToInr(basePriceNpr);

      const busName = trip?.busName || 'Bus Operator';
      const busNumber = trip?.busNumber || '';
      const busType = trip?.busType || 'A/C Sleeper (2+1)';
      const busImage = trip?.busImage || trip?.busPhoto || trip?.busLogo || trip?.imageUrl || null;

      const departureTime = fromStop?.departureTime || '';
      const arrivalTime = toStop?.arrivalTime || '';

      const durationText = typeof trip?.duration === 'number' ? formatDurationMinutes(trip.duration) : '0h 0m';
      const rating = Number(trip?.rating) || 4.0;
      const amenities = Array.isArray(trip?.amenities)
        ? trip.amenities
        : amenitiesToList(trip?.amenities);

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
        image: busImage,
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

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
              source={item.image ? { uri: item.image } : require('../../assets/logo.png')}
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

      {Array.isArray(item.amenities) && item.amenities.length > 0 ? (
        <View style={styles.amenitiesRow}>
          {item.amenities.map((label) => {
            const meta = getAmenityMeta(label);
            return (
              <View key={label} style={styles.amenityPill}>
                {meta.lib === 'mci' ? (
                  <MaterialCommunityIcons
                    name={meta.name}
                    size={14}
                    color={meta.color}
                    style={styles.amenityIcon}
                  />
                ) : (
                  <Ionicons
                    name={meta.name}
                    size={14}
                    color={meta.color}
                    style={styles.amenityIcon}
                  />
                )}
                <Text style={styles.amenityText}>{meta.text}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
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
              <Text style={styles.headerRoute} numberOfLines={2}>
                {from} → {to}
              </Text>
              <Text style={styles.headerDate}>{date}</Text>
            </View>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFiltersVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.filterButtonText}>Filters & Sort</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterBar}>
            <Text style={styles.filterBarText}>Active filters: {filters.busType !== 'ALL' ? filters.busType : 'None'}
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetFilters}
              activeOpacity={0.75}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content Area - Bus Cards */}
          <View style={styles.mainCard}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#2D9B9B" />
                <Text style={styles.loadingOverlayText}>Applying filters...</Text>
              </View>
            )}
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

          <Modal
            visible={filtersVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setFiltersVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filters & Sort</Text>
                  <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionLabel}>Bus Type</Text>
                  <View style={styles.chipRow}>
                    {[
                      { key: 'ALL', label: 'Any' },
                      { key: 'SEATER', label: 'Seater' },
                      { key: 'SLEEPER', label: 'Sleeper' },
                      { key: 'MIXED', label: 'Mixed' },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.chip,
                          filters.busType === type.key && styles.chipSelected,
                        ]}
                        onPress={() => updateFilter('busType', type.key)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            filters.busType === type.key && styles.chipTextSelected,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>Sort By</Text>
                  <TouchableOpacity
                    style={styles.sortDropdown}
                    activeOpacity={0.8}
                    onPress={() => {
                      // Screenshot shows only this option
                      updateFilter('sortBy', 'price');
                      updateFilter('sortOrder', 'asc');
                    }}
                  >
                    <Text style={styles.sortDropdownText}>Price: Low to High</Text>
                  </TouchableOpacity>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      resetFilters();
                      setFiltersVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      fetchWithFilters({ ...filters });
                      setFiltersVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    resetFilters();
                    setFiltersVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.clearAllText}>Clear All Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
    minHeight: 60,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  headerRoute: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  headerDate: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  headerRightSpacer: {
    width: 40,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  filterBarText: {
    fontSize: 13,
    color: '#475569',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
  },
  resetButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  mainCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  loadingOverlayText: {
    marginTop: 8,
    color: '#0F172A',
    fontWeight: '600',
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
    marginBottom: 12,
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
    padding: 12,
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
    marginTop: 1,
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
    marginTop: 2,
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
    marginTop: 1,
  },
  journeyCityRight: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
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
    marginTop: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
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
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  amenityIcon: {
    marginRight: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalClose: {
    fontSize: 20,
    color: '#0F172A',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#0EA5E9',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  sortDropdown: {
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  sortDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  clearAllText: {
    textAlign: 'center',
    marginTop: 14,
    color: '#1D4ED8',
    fontWeight: '600',
  },
});

export default BusSearchResultsScreen;