import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { busAPI } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_HORIZONTAL_PADDING = 10;
const GRID_VERTICAL_PADDING = 10;
const MIN_SEAT_SIZE = 42;
const MAX_SEAT_SIZE = 78;
const BACKEND_ENFORCED_SEAT_LIMIT = 6;

const NPR_TO_INR_RATE = 0.625;
const convertNprToInr = (nprAmount) => Number((Number(nprAmount || 0) * NPR_TO_INR_RATE).toFixed(2));

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return null;
  const [hours, minutes] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const formatMinutesToDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatTimeLabel = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return '--';
  const [hours, minutes] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return timeValue;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

const SeatSelectionScreen = ({ navigation, route }) => {
  const { busData } = route.params;
  const priceNpr = Number(busData?.priceNpr ?? busData?.price ?? busData?.tripData?.fare ?? busData?.tripData?.price ?? 0);
  const priceInr = convertNprToInr(priceNpr);

  const [activeDeck, setActiveDeck] = useState('LOWER');
  const [seatGridWidth, setSeatGridWidth] = useState(0);
  
  // States for API data
  const [isLoading, setIsLoading] = useState(true);
  const [busInfo, setBusInfo] = useState(null);
  
  // Initialize empty seat states - will be populated from API
  const [seatStates, setSeatStates] = useState({});
  const [seatMapping, setSeatMapping] = useState({}); // Maps seat number to seat object with ID
  
  // Re-fetch whenever these inputs change (e.g. when user searches a different date
  // and navigates back to an existing SeatSelection screen instance).
  const routeTripId = busData?.tripId || route.params?.tripId;
  const routeFromStopId = busData?.fromStopId || route.params?.fromStopId || route.params?.fromStop?.id;
  const routeToStopId = busData?.toStopId || route.params?.toStopId || route.params?.toStop?.id;
  
  const fetchSeatData = async () => {
    try {
      setIsLoading(true);
      
      console.log('🪑 Starting seat data fetch...');
      console.log('🪑 Available busData:', busData);
      console.log('🪑 Available route params:', route.params);
      
      // Get auth token (not required for this endpoint, but keep if available)
      const token = (await AsyncStorage.getItem('authToken')) || (await AsyncStorage.getItem('token'));
      
      // Extract trip and stop IDs with proper fallbacks and validation
      let tripId = busData?.tripId || route.params?.tripId;
      let fromStopId = busData?.fromStopId || route.params?.fromStopId || route.params?.fromStop?.id;
      let toStopId = busData?.toStopId || route.params?.toStopId || route.params?.toStop?.id;
      
      console.log('🪑 Initial extracted IDs:', { tripId, fromStopId, toStopId });
      
      // If still missing data, try to extract from tripData
      if (!tripId || !fromStopId || !toStopId) {
        console.log('🪑 Missing some IDs, trying to extract from tripData...');
        
        const tripData = busData?.tripData || route.params?.busData?.tripData;
        const searchData = route.params?.searchData;
        
        console.log('🪑 Available tripData:', tripData);
        console.log('🪑 Available searchData:', searchData);
        
        if (tripData) {
          // Try multiple ways to get tripId - prioritize tripId field from API response
          tripId = tripId || tripData.tripId || tripData.id;
          
          // Try to get stop IDs directly from tripData first
          if (tripData.fromStop && tripData.toStop) {
            fromStopId = fromStopId || tripData.fromStop.id;
            toStopId = toStopId || tripData.toStop.id;
            console.log('🪑 Got stop IDs from tripData directly:', { fromStopId, toStopId });
          } else {
            // Try to find stop IDs from trip route data
            const tripRoute = tripData.route || {};
            const stops = Array.isArray(tripRoute.stops) ? tripRoute.stops : [];
            
            if (stops.length > 0 && searchData) {
              const startLocation = searchData.startLocation || busData?.from || '';
              const endLocation = searchData.endLocation || busData?.to || '';
              
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
              
              console.log('🪑 Found stops from route data:', { 
                fromStop: fromStop,
                toStop: toStop,
                fromStopId: fromStopId, 
                toStopId: toStopId 
              });
            }
          }
        }
      }
      
      console.log('🪑 Final extracted IDs:', { tripId, fromStopId, toStopId });
      
      if (!tripId) {
        throw new Error('Trip ID is missing. Please try selecting the bus again.');
      }
      
      if (!fromStopId) {
        throw new Error('Starting stop information is missing. Please go back and search again.');
      }
      
      if (!toStopId) {
        throw new Error('Destination stop information is missing. Please go back and search again.');
      }
      
      console.log('Final API call parameters:', { tripId, fromStopId, toStopId });
      
      const response = await busAPI.getBusInfo(tripId, fromStopId, toStopId, token);
      
      if (response.success) {
        setBusInfo(response.data);

        const availabilityResponse = await busAPI.getSeatAvailability(
          tripId,
          response.data?.route?.fromStop?.stopIndex,
          response.data?.route?.toStop?.stopIndex,
          response.data?.route?.isReturnTrip ?? false,
          token
        );

        const availabilityMap = {};
        if (availabilityResponse.success && Array.isArray(availabilityResponse.data?.seats)) {
          availabilityResponse.data.seats.forEach((availabilityItem) => {
            availabilityMap[availabilityItem.seatId] = availabilityItem;
          });
        }
        
        // Transform API seat data to current component format
        const newSeatStates = {};
        const newSeatMapping = {};
        
        // Process lower deck seats
        if (response.data.seats?.lowerDeck) {
          response.data.seats.lowerDeck.forEach(seat => {
            const seatId = seat.id; // Use seat ID as unique key
            const deck = (seat.level || seat.deck || 'LOWER').toUpperCase();
            const availabilityState = availabilityMap[seatId];
            newSeatStates[seatId] = availabilityState?.isBooked
              ? 'booked'
              : availabilityState?.isHeld && !availabilityState?.isHeldByCurrentUser
                ? 'held'
                : seat.isAvailable
                  ? 'available'
                  : 'booked';
            newSeatMapping[seatId] = {
              id: seat.id,
              seatNumber: seat.seatNumber,
              type: seat.type,
              level: seat.level,
              deck,
              row: seat.row,
              column: seat.column,
              rowSpan: seat.rowSpan,
              columnSpan: seat.columnSpan,
              isAvailable: seat.isAvailable
            };
          });
        }
        
        // Process upper deck seats if available
        if (response.data.seats?.upperDeck) {
          response.data.seats.upperDeck.forEach(seat => {
            const seatId = seat.id; // Use seat ID as unique key
            const deck = (seat.level || seat.deck || 'UPPER').toUpperCase();
            const availabilityState = availabilityMap[seatId];
            newSeatStates[seatId] = availabilityState?.isBooked
              ? 'booked'
              : availabilityState?.isHeld && !availabilityState?.isHeldByCurrentUser
                ? 'held'
                : seat.isAvailable
                  ? 'available'
                  : 'booked';
            newSeatMapping[seatId] = {
              id: seat.id,
              seatNumber: seat.seatNumber,
              type: seat.type,
              level: seat.level,
              deck,
              row: seat.row,
              column: seat.column,
              rowSpan: seat.rowSpan,
              columnSpan: seat.columnSpan,
              isAvailable: seat.isAvailable
            };
          });
        }
        
        setSeatStates(newSeatStates);
        setSeatMapping(newSeatMapping);
        console.log('🎯 Seat states loaded:', newSeatStates);
        console.log('🎯 Seat mapping loaded:', newSeatMapping);
        console.log('🎯 Available seats count:', response.data.seats?.availableCount || 0);
        console.log('🎯 Backend seat numbers:', Object.keys(newSeatStates));
        console.log('🎯 Backend lower deck seats:', response.data.seats?.lowerDeck || []);
        console.log('🎯 Backend upper deck seats:', response.data.seats?.upperDeck || []);
        
      } else {
        throw new Error(response.error || 'Failed to fetch seat data from server');
      }
      
    } catch (error) {
      console.error('Error fetching seat data:', error);
      
      Alert.alert(
        'Error Loading Seats',
        error.message + '\n\nWould you like to try again?',
        [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: fetchSeatData }
        ]
      );
      
    } finally {
      setIsLoading(false);
    }
  };

  // Always refresh seat availability when the screen is focused. This ensures:
  // - changing travel date (new tripId) shows correct booked/available seats
  // - coming back after another user books seats refreshes current availability
  useFocusEffect(
    useCallback(() => {
      fetchSeatData();
      return () => {};
    }, [routeTripId, routeFromStopId, routeToStopId])
  );

  const handleSeatPress = (seatId) => {
    if (seatStates[seatId] === 'booked' || seatStates[seatId] === 'held') return; // Can't select unavailable seats

    const currentSelectedCount = Object.values(seatStates).filter((seatState) => seatState === 'selected').length;
    if (seatStates[seatId] !== 'selected' && currentSelectedCount >= BACKEND_ENFORCED_SEAT_LIMIT) {
      Alert.alert('Seat Limit Reached', `You can select up to ${BACKEND_ENFORCED_SEAT_LIMIT} seats.`);
      return;
    }
    
    setSeatStates(prev => ({
      ...prev,
      [seatId]: prev[seatId] === 'selected' ? 'available' : 'selected'
    }));
  };

  const resetSelectedSeats = () => {
    setSeatStates((prev) => Object.keys(prev).reduce((nextState, seatId) => {
      nextState[seatId] = prev[seatId] === 'selected' ? 'available' : prev[seatId];
      return nextState;
    }, {}));
  };

  const getSeatStyle = (state) => {
    switch(state) {
      case 'selected':
        return {
          backgroundColor: '#E2F3F1',
          borderColor: '#2D9B9B',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 3,
        };
      case 'booked':
        return {
          backgroundColor: '#ECECEC',
          borderColor: '#D8D8D8',
          shadowOpacity: 0.04,
        };
      case 'held':
        return {
          backgroundColor: '#FEF3C7',
          borderColor: '#F59E0B',
          shadowOpacity: 0.04,
        };
      default:
        return {
          backgroundColor: '#F5F5F5',
          borderColor: '#DCDCDC',
        };
    }
  };

  const getSeatTextStyle = (state) => {
    switch (state) {
      case 'selected':
        return { color: '#1F6E6E' };
      case 'booked':
        return { color: '#9CA3AF' };
      case 'held':
        return { color: '#B45309' };
      default:
        return { color: '#4B5563' };
    }
  };

  const getSeatLayoutMeta = (seat) => {
    const rowSpan = Math.max(1, Number(seat?.rowSpan || 1));
    const columnSpan = Math.max(1, Number(seat?.columnSpan || 1));
    const backendSeatType = String(seat?.seatType || seat?.berthType || seat?.layoutType || '').toUpperCase();
    const explicitCoupleFlag = seat?.isCouple === true || backendSeatType === 'COUPLE';
    const explicitNormalFlag = seat?.isCouple === false || backendSeatType === 'NORMAL';
    const isVertical = rowSpan > columnSpan;
    const isHorizontal = columnSpan > rowSpan;
    const isCouple = explicitCoupleFlag || (!explicitNormalFlag && isVertical);

    return {
      rowSpan,
      columnSpan,
      isCouple,
      isVertical: explicitCoupleFlag ? true : isVertical,
      isHorizontal,
    };
  };

  const getJourneySeatPricing = () => {
    const fromStop = busInfo?.route?.fromStop;
    const toStop = busInfo?.route?.toStop;
    if (!fromStop || !toStop) {
      return {
        lowerSeater: 0,
        lowerSleeper: 0,
        upperSleeper: 0,
      };
    }

    return {
      lowerSeater: Math.abs(Number(toStop.lowerSeaterPrice || 0) - Number(fromStop.lowerSeaterPrice || 0)),
      lowerSleeper: Math.abs(Number(toStop.lowerSleeperPrice || 0) - Number(fromStop.lowerSleeperPrice || 0)),
      upperSleeper: Math.abs(Number(toStop.upperSleeperPrice || 0) - Number(fromStop.upperSleeperPrice || 0)),
      upperSeater: Math.abs(Number(toStop.priceFromOrigin || 0) - Number(fromStop.priceFromOrigin || 0)),
    };
  };

  const getSeatPriceNpr = (seat) => {
    const pricing = getJourneySeatPricing();
    const level = String(seat?.level || seat?.deck || '').toUpperCase();
    const type = String(seat?.type || '').toUpperCase();

    // Upper SEATER pricing: use priceFromOrigin (matches backend logic)
    if (level === 'UPPER' && type === 'SEATER') return Number(pricing.upperSeater || 0);

    if (level === 'LOWER' && type === 'SEATER') return Number(pricing.lowerSeater || 0);
    if (level === 'LOWER' && type === 'SLEEPER') return Number(pricing.lowerSleeper || 0);
    if (level === 'UPPER' && type === 'SLEEPER') return Number(pricing.upperSleeper || 0);

    // Fallback: keep it safe and non-breaking.
    return 0;
  };

  const getJourneyDurationText = () => {
    const departureMinutes = parseTimeToMinutes(busInfo?.route?.fromStop?.departureTime);
    const arrivalMinutes = parseTimeToMinutes(busInfo?.route?.toStop?.arrivalTime);

    if (departureMinutes === null || arrivalMinutes === null) {
      return busData?.duration || '--';
    }

    const adjustedArrivalMinutes = arrivalMinutes < departureMinutes
      ? arrivalMinutes + (24 * 60)
      : arrivalMinutes;

    return formatMinutesToDuration(adjustedArrivalMinutes - departureMinutes) || busData?.duration || '--';
  };

  const getSeatSelectionLimitMessage = () => {
    const backendMessage =
      busInfo?.seatSelectionLimitMessage ||
      busInfo?.seatLimitMessage ||
      busInfo?.route?.seatSelectionLimitMessage ||
      busInfo?.seats?.seatSelectionLimitMessage;

    if (backendMessage) {
      return backendMessage;
    }

    return `You can select up to ${BACKEND_ENFORCED_SEAT_LIMIT} seats.`;
  };

  const getDepartureStopLabel = () =>
    busInfo?.route?.fromStop?.name ||
    busInfo?.route?.fromStop?.city ||
    busData?.from ||
    'Departure';

  const getArrivalStopLabel = () =>
    busInfo?.route?.toStop?.name ||
    busInfo?.route?.toStop?.city ||
    busData?.to ||
    'Arrival';

  const renderRouteOverview = () => {
    const routePath = Array.isArray(busInfo?.route?.path) ? busInfo.route.path : [];
    if (routePath.length === 0) return null;

    const journeyDirection = busInfo?.route?.isReturnTrip ? 'Return Trip' : 'Forward Trip';
    const routeSummary = `${busInfo?.route?.fromStop?.city || busData?.from || ''} → ${busInfo?.route?.toStop?.city || busData?.to || ''}`;

    return (
      <View style={styles.routeOverviewCard}>
        <Text style={styles.routeOverviewTitle}>Route Overview</Text>
        <View style={styles.routeOverviewMetaRow}>
          <View>
            <Text style={styles.routeOverviewLabel}>Journey Direction</Text>
            <Text style={styles.routeOverviewDirection}>{journeyDirection}</Text>
          </View>
          <Text style={styles.routeOverviewSummary}>{routeSummary}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.routeStopsRow}
        >
          {routePath.map((stop, index) => {
            const stopTime = busInfo?.route?.isReturnTrip
              ? (stop.returnDepartureTime || stop.returnArrivalTime || stop.departureTime || stop.arrivalTime)
              : (stop.departureTime || stop.arrivalTime || stop.returnDepartureTime || stop.returnArrivalTime);
            const isStartOrEnd = index === 0 || index === routePath.length - 1;

            return (
              <View key={stop.id || `${stop.name}-${index}`} style={styles.routeStopCluster}>
                <View style={[styles.routeStopCard, isStartOrEnd && styles.routeStopCardActive]}>
                  <Text
                    style={[styles.routeStopName, isStartOrEnd && styles.routeStopNameActive]}
                    numberOfLines={1}
                  >
                    {stop.city || stop.name}
                  </Text>
                  <Text style={[styles.routeStopTime, isStartOrEnd && styles.routeStopTimeActive]}>
                    {formatTimeLabel(stopTime)}
                  </Text>
                </View>
                {index !== routePath.length - 1 && (
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color="#8B5CF6"
                    style={styles.routeStopArrow}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSeatBox = (seat, seatSize, gridMetrics) => {
    const state = seatStates[seat.id] || (seat.isAvailable ? 'available' : 'booked');
    const seatType = String(seat.type || '').toUpperCase();
    const { rowSpan, columnSpan, isCouple, isVertical } = getSeatLayoutMeta(seat);
    const isSleeper = seatType === 'SLEEPER';
    const iconName = isSleeper ? 'bed' : 'seat';
    const iconSize = isSleeper ? 14 : 13;
    const iconColor = getSeatTextStyle(state).color;
    const isDisabled = state === 'booked' || state === 'held';
    const row = Math.max(0, Number(seat?.row || 0) - gridMetrics.minRow);
    const column = Math.max(0, Number(seat?.column || 0) - gridMetrics.minColumn);
    const cardWidth = seatSize * columnSpan + GRID_GAP * (columnSpan - 1);
    const cardHeight = seatSize * rowSpan + GRID_GAP * (rowSpan - 1);
    const left = column * (seatSize + GRID_GAP);
    const top = row * (seatSize + GRID_GAP);

    return (
      <TouchableOpacity
        key={seat.id}
        style={[
          styles.seatBox,
          {
            width: cardWidth,
            height: cardHeight,
            left,
            top,
          },
          getSeatStyle(state),
          isSleeper ? styles.seatBoxSleeper : styles.seatBoxSeater,
          isVertical && styles.seatBoxVertical,
        ]}
        onPress={() => handleSeatPress(seat.id)}
        disabled={isDisabled}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />
        <Text style={[styles.seatNumberText, getSeatTextStyle(state)]}>
          {seat.seatNumber}
        </Text>
        {isCouple && (
          <View style={styles.coupleIconRow}>
            <MaterialCommunityIcons
              name="human-male"
              size={9}
              color={isDisabled ? '#9CA3AF' : '#3B82F6'}
            />
            <MaterialCommunityIcons
              name="human-female"
              size={9}
              color={isDisabled ? '#9CA3AF' : '#EC4899'}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSeatMap = () => {
    if (!busInfo?.seats) {
      return (
        <View style={styles.seatMapEmpty}>
          <Text style={styles.seatMapEmptyText}>Loading seats...</Text>
        </View>
      );
    }

    const deckSeats = activeDeck === 'UPPER'
      ? (busInfo.seats.upperDeck || [])
      : (busInfo.seats.lowerDeck || []);

    if (!deckSeats || deckSeats.length === 0) {
      return (
        <View style={styles.seatMapEmpty}>
          <Text style={styles.seatMapEmptyText}>No seats available</Text>
        </View>
      );
    }

    const fallbackGridWidth = SCREEN_WIDTH - 32;
    const viewportWidth = Math.max(1, seatGridWidth || fallbackGridWidth);
    const minRow = deckSeats.reduce((currentMin, seat) => Math.min(currentMin, Number(seat?.row || 0)), Infinity);
    const minColumn = deckSeats.reduce((currentMin, seat) => Math.min(currentMin, Number(seat?.column || 0)), Infinity);
    const safeMinRow = Number.isFinite(minRow) ? minRow : 0;
    const safeMinColumn = Number.isFinite(minColumn) ? minColumn : 0;
    const requiredColumns = deckSeats.reduce((maxColumns, seat) => {
      const normalizedColumn = Math.max(0, Number(seat?.column || 0) - safeMinColumn);
      const { columnSpan } = getSeatLayoutMeta(seat);
      return Math.max(maxColumns, normalizedColumn + columnSpan);
    }, 0);
    const requiredRows = deckSeats.reduce((maxRows, seat) => {
      const normalizedRow = Math.max(0, Number(seat?.row || 0) - safeMinRow);
      const { rowSpan } = getSeatLayoutMeta(seat);
      return Math.max(maxRows, normalizedRow + rowSpan);
    }, 0);
    const safeColumnCount = Math.max(1, requiredColumns);
    const availableGridWidth = Math.max(
      1,
      viewportWidth - GRID_HORIZONTAL_PADDING * 2
    );
    const fittedSeatSize = Math.floor(
      (availableGridWidth - GRID_GAP * (safeColumnCount - 1)) / safeColumnCount
    );
    const seatSize = Math.max(
      MIN_SEAT_SIZE,
      Math.min(MAX_SEAT_SIZE, fittedSeatSize)
    );
    const gridContentWidth =
      safeColumnCount * seatSize + Math.max(0, safeColumnCount - 1) * GRID_GAP;
    const mapWidth = gridContentWidth + GRID_HORIZONTAL_PADDING * 2;
    const mapHeight =
      Math.max(1, requiredRows) * seatSize +
      Math.max(0, Math.max(1, requiredRows) - 1) * GRID_GAP +
      GRID_VERTICAL_PADDING * 2;
    const cardWidth = Math.max(viewportWidth, mapWidth);
    const shouldScrollHorizontally = cardWidth > viewportWidth;
    const gridMetrics = {
      minRow: safeMinRow,
      minColumn: safeMinColumn,
    };

    const seatMapCard = (
      <View style={styles.seatBusCard}>
        {/* FRONT + DRIVER row — inside the card boundary */}
        <View style={styles.seatMapHeaderRow}>
          <View style={styles.frontBox}>
            <Text style={styles.frontText}>← FRONT →</Text>
          </View>
          <View style={styles.driverBox}>
            <MaterialCommunityIcons name="steering" size={18} color="#A16207" />
            <Text style={styles.driverText}>DRIVER</Text>
          </View>
        </View>

        {/* Separator */}
        <View style={styles.busDivider} />

        {/* Data-driven seat grid based on admin layout */}
        <View
          style={[styles.seatMapGrid, { height: mapHeight, width: mapWidth }]}
        >
          {deckSeats
            .slice()
            .sort((a, b) => {
              const rowDiff = Number(a?.row || 0) - Number(b?.row || 0);
              if (rowDiff !== 0) return rowDiff;
              return Number(a?.column || 0) - Number(b?.column || 0);
            })
            .map((seat) => renderSeatBox(seat, seatSize, gridMetrics))}
        </View>

        <View style={styles.busDivider} />
        <View style={styles.seatMapFooter}>
          <View style={styles.backBox}>
            <Text style={styles.backText}>BACK</Text>
          </View>
        </View>
      </View>
    );

    return (
      <View
        style={styles.seatMapViewport}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (Math.abs(width - seatGridWidth) > 1) {
            setSeatGridWidth(width);
          }
        }}
      >
        {shouldScrollHorizontally ? (
          <ScrollView
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seatMapScrollerContent}
          >
            <View style={{ width: cardWidth }}>{seatMapCard}</View>
          </ScrollView>
        ) : (
          seatMapCard
        )}
      </View>
    );
  };

  // Show loading indicator while fetching data
  if (isLoading) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2D9B9B" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Loading seat information...
        </Text>
      </View>
    );
  }

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
                {getDepartureStopLabel()} To {getArrivalStopLabel()}
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
              <View style={styles.busTimeBlock}>
                <Text style={styles.busTimeText}>
                  {busInfo?.route?.fromStop?.departureTime || busData.departureTime}
                </Text>
                <Text style={styles.busStopName} numberOfLines={2}>
                  {getDepartureStopLabel()}
                </Text>
              </View>

              <View style={styles.busInfoMiddle}>
                <View style={styles.busInfoCenterMeta}>
                  <Text style={styles.journeyTimeLabel}>Journey Time</Text>
                  <Text style={styles.journeyTimeValue}>{getJourneyDurationText()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.resetSelectionButton}
                  onPress={resetSelectedSeats}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="refresh" size={15} color="#6366F1" />
                  <Text style={styles.resetSelectionText}>Reset</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.busTimeBlock, styles.busTimeBlockRight]}>
                <Text style={styles.busTimeText}>
                  {busInfo?.route?.toStop?.arrivalTime || busData.arrivalTime}
                </Text>
                <Text style={[styles.busStopName, styles.busStopNameRight]} numberOfLines={2}>
                  {getArrivalStopLabel()}
                </Text>
              </View>
            </View>

            <View style={styles.busInfoDetailsRow}>
              <View style={styles.busInfoLeft}>
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
                <Text style={styles.durationText}>Route Fare Summary</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seat Status Legend - Direct on white background */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#F5F5F5', borderColor: '#DCDCDC' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#E2F3F1', borderColor: '#2D9B9B' }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#ECECEC', borderColor: '#D8D8D8' }]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Held</Text>
          </View>
        </View>

        {/* Deck Tabs */}
        <View style={styles.deckTabsRow}>
          <TouchableOpacity
            style={[styles.deckTab, activeDeck === 'LOWER' && styles.deckTabActive]}
            onPress={() => setActiveDeck('LOWER')}
            activeOpacity={0.8}
          >
            <Text style={[styles.deckTabText, activeDeck === 'LOWER' && styles.deckTabTextActive]}>Lower Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deckTab, styles.deckTabLast, activeDeck === 'UPPER' && styles.deckTabActive]}
            onPress={() => setActiveDeck('UPPER')}
            activeOpacity={0.8}
          >
            <Text style={[styles.deckTabText, activeDeck === 'UPPER' && styles.deckTabTextActive]}>Upper Deck</Text>
          </TouchableOpacity>
        </View>

        {/* Seat Pricing */}
        <View style={styles.seatPricingCard}>
          <Text style={styles.seatPricingTitle}>Seat Pricing</Text>
          {(() => {
            const pricing = getJourneySeatPricing();
            return (
              <View style={styles.seatPricingRow}>
                <View style={styles.seatPricingCol}>
                  <Text style={styles.seatPricingLabel}>Lower Seater</Text>
                  <Text style={styles.seatPricingValue}>NPR {pricing.lowerSeater.toFixed(2)} (₹{convertNprToInr(pricing.lowerSeater).toFixed(2)})</Text>
                </View>
                <View style={styles.seatPricingCol}>
                  <Text style={styles.seatPricingLabel}>Lower Sleeper</Text>
                  <Text style={styles.seatPricingValue}>NPR {pricing.lowerSleeper.toFixed(2)} (₹{convertNprToInr(pricing.lowerSleeper).toFixed(2)})</Text>
                </View>
                <View style={styles.seatPricingCol}>
                  <Text style={styles.seatPricingLabel}>Upper Sleeper</Text>
                  <Text style={styles.seatPricingValue}>NPR {pricing.upperSleeper.toFixed(2)} (₹{convertNprToInr(pricing.upperSleeper).toFixed(2)})</Text>
                </View>
              </View>
            );
          })()}
        </View>

        {renderRouteOverview()}

        <View style={styles.seatHelperCard}>
          <View style={styles.seatHelperRow}>
            <Text style={styles.seatHelperTitle}>Seat Booking</Text>
            <Text style={styles.seatHelperCount}>
              {Object.values(seatStates).filter((seatState) => seatState === 'selected').length} selected
            </Text>
          </View>
          <Text style={styles.seatHelperMessage}>{getSeatSelectionLimitMessage()}</Text>
        </View>

        {/* Seat Layout */}
        <View style={styles.seatLayoutContainer}>
          {renderSeatMap()}
        </View>

        {/* Bottom spacing for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button - Direct on white background */}
      <View style={styles.buttonWrapper}>
        {(() => {
          const selectedSeatCount = Object.keys(seatStates).filter(key => seatStates[key] === 'selected').length;
          const isDisabled = selectedSeatCount === 0;
          
          return (
            <TouchableOpacity
              style={[styles.continueButton, isDisabled && styles.continueButtonDisabled]}
              activeOpacity={isDisabled ? 1 : 0.8}
              disabled={isDisabled}
              onPress={() => {
                // Navigate to boarding points with API data
                const selectedSeatIds = Object.keys(seatStates).filter(key => seatStates[key] === 'selected');
                const selectedSeatObjects = selectedSeatIds
                  .map(seatId => {
                    const seat = seatMapping[seatId];
                    if (!seat) return null;
                    const priceNpr = getSeatPriceNpr(seat);
                    return {
                      ...seat,
                      priceNpr,
                    };
                  })
                  .filter(Boolean);
                
                console.log('🎯 Selected seat IDs:', selectedSeatIds);
                console.log('🎯 Selected seat objects:', selectedSeatObjects);
                console.log('🎯 Seat mapping keys:', Object.keys(seatMapping));
                console.log('🎯 Seat states:', seatStates);
                
                // Validate selection before navigation
                if (selectedSeatObjects.length === 0) {
                  console.error('❌ No valid seat objects found for selection');
                  Alert.alert('No Seats Selected', 'Please select at least one seat before continuing.');
                  return;
                }

                // Ensure seat objects have required properties
                const invalidSeats = selectedSeatObjects.filter(seat => !seat || !seat.id);
                if (invalidSeats.length > 0) {
                  console.error('❌ Invalid seat objects found:', invalidSeats);
                  Alert.alert('Seat Selection Error', 'Some seat data is invalid. Please try selecting seats again.');
                  return;
                }
                
                console.log('✅ Navigating to BoardingPoints with valid seats:', selectedSeatObjects.length);
                
                navigation.navigate('BoardingPoints', {
                  busData,
                  selectedSeats: selectedSeatObjects, // Contains full seat objects with IDs
                  busInfo: busInfo,
                  boardingPoints: busInfo?.route?.boardingPoints || [],
                  droppingPoints: busInfo?.route?.droppingPoints || [],
                });
              }}
            >
              <Text style={[styles.continueButtonText, isDisabled && styles.continueButtonTextDisabled]}>
                Continue Booking
              </Text>
            </TouchableOpacity>
          );
        })()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    top: SCREEN_HEIGHT * 0.12, // Lift content slightly so seat card/back stays visible
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busInfoMetaBar: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busInfoDetailsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  busTimeBlock: {
    flex: 1,
  },
  busTimeBlockRight: {
    alignItems: 'flex-end',
  },
  busInfoMiddle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  busInfoCenterMeta: {
    alignItems: 'center',
    marginBottom: 10,
  },
  busInfoLeft: {
    flex: 1,
  },
  busTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 6,
  },
  busStopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 18,
  },
  busStopNameRight: {
    textAlign: 'right',
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
    marginLeft: 12,
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
  resetSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  resetSelectionText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
  },
  journeyTimeInline: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  journeyTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  journeyTimeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },

  // Legend Styles
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  legendBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    marginRight: 6,
    flexShrink: 0,
  },
  legendText: {
    fontSize: 12,
    color: '#4A4A4A',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Seat Layout Styles
  seatLayoutContainer: {
    marginHorizontal: 16,
    marginBottom: 0,
  },
  seatMapViewport: {
    width: '100%',
  },
  seatMapScrollerContent: {
    paddingBottom: 2,
  },

  deckTabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  deckTab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deckTabLast: {
    marginRight: 0,
  },
  deckTabActive: {
    backgroundColor: '#5B7EFF',
  },
  deckTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  deckTabTextActive: {
    color: '#FFFFFF',
  },

  seatPricingCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#EEF2FF',
    padding: 12,
    marginBottom: 14,
  },
  seatPricingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  seatPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seatPricingCol: {
    flex: 1,
    marginRight: 10,
  },
  seatPricingLabel: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  seatPricingValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  routeOverviewCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
  },
  routeOverviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  routeOverviewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  routeOverviewLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 3,
  },
  routeOverviewDirection: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  routeOverviewSummary: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  routeStopsRow: {
    paddingRight: 12,
    alignItems: 'center',
  },
  routeStopCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStopCard: {
    minWidth: 88,
    maxWidth: 112,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  routeStopCardActive: {
    backgroundColor: '#6D28D9',
  },
  routeStopName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  routeStopNameActive: {
    color: '#FFFFFF',
  },
  routeStopTime: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  routeStopTimeActive: {
    color: 'rgba(255,255,255,0.96)',
  },
  routeStopArrow: {
    marginHorizontal: 10,
  },
  seatHelperCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  seatHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  seatHelperTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  seatHelperCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  seatHelperMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  // Unified bus card — wraps header + divider + seat grid
  seatBusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  seatMapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  busDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  frontBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  frontText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.3,
  },
  driverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFBEB',
  },
  driverText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  seatMapGrid: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#FBFBFB',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 0,
  },
  seatMapFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backBox: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#D1D5DB',
    paddingVertical: 10,
    alignItems: 'center',
  },
  backText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
  },
  seatBox: {
    position: 'absolute',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  seatBoxSeater: {
    borderRadius: 8,
  },
  seatBoxSleeper: {
    borderRadius: 9,
  },
  seatBoxVertical: {
    paddingVertical: 8,
  },
  seatNumberText: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 11,
  },
  coupleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 1,
  },
  seatMapEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  seatMapEmptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // Bottom Button Styles
  buttonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  continueButton: {
    backgroundColor: '#5B7EFF',
    borderRadius: 18,
    height: 40,
    paddingHorizontal: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#5B7EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: 'transparent',
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  continueButtonTextDisabled: {
    color: '#E5E7EB',
  },
});

export default SeatSelectionScreen;
