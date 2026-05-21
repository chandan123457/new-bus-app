import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';
import { userAPI } from '../services/api';
import testMyBookingsAPI from '../utils/testAPI';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const tabs = ['All Bookings', 'Upcoming', 'Past'];

const STATUS_META = {
  CONFIRMED: { label: 'CONFIRMED', bg: '#DCFCE7', color: '#166534' },
  PENDING: { label: 'PENDING', bg: '#FEF3C7', color: '#92400E' },
  CANCELLED: { label: 'CANCELLED', bg: '#FEE2E2', color: '#B91C1C' },
  REFUNDED: { label: 'REFUNDED', bg: '#DBEAFE', color: '#1D4ED8' },
  COMPLETED: { label: 'COMPLETED', bg: '#E0E7FF', color: '#3730A3' },
};

// Date formatting utilities
const formatJourneyDate = (tripDate) => {
  if (!tripDate) return '--';
  const date = new Date(tripDate);
  if (isNaN(date.getTime())) return '--';
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
};

const formatBookingDate = (bookedAt) => {
  if (!bookedAt) return '--';
  const date = new Date(bookedAt);
  if (isNaN(date.getTime())) return '--';
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-GB', options);
  return `Booked on ${formattedDate}`;
};

const formatTime = (timeString) => {
  if (!timeString) return '--';
  
  // Handle various time formats
  if (timeString.includes('T')) {
    // ISO datetime format
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  }
  
  // Handle HH:mm format
  if (timeString.match(/^\d{2}:\d{2}$/)) {
    return timeString;
  }
  
  // Handle other time formats
  return timeString.toString().slice(0, 5);
};

const formatCurrency = (amount, currency = 'INR') => {
  const safeAmount = Number(amount) || 0;
  if (currency === 'NPR') {
    return `NPR ${safeAmount.toFixed(2)}`;
  }
  return `INR ₹ ${safeAmount.toFixed(2)}`;
};

const getSeatDisplay = (booking) => {
  if (!booking?.seats?.length) return '--';
  
  const seatNumbers = booking.seats.map(seat => seat.seatNumber).join(', ');
  const seatTypes = [...new Set(booking.seats.map(seat => seat.level || seat.type))];
  
  if (seatTypes.length > 0 && seatTypes[0]) {
    return `${booking.seats.length} (${seatTypes[0].toUpperCase()})`;
  }
  
  return `${booking.seats.length}`;
};

const getStatusMeta = (booking) => {
  if (!booking) return STATUS_META.CONFIRMED;
  const status = booking.status?.toUpperCase();
  return STATUS_META[status] || STATUS_META.CONFIRMED;
};

const BookingsScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('All Bookings');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setBookings([]);
        setError('Please sign in to view your bookings.');
        return;
      }

      // Run API test for debugging
      if (__DEV__ && !silent) {
        console.log('🔍 Running API structure test...');
        await testMyBookingsAPI();
      }

      const response = await userAPI.getBookings({ limit: 100 }, token);

      if (response.success) {
        setBookings(response.data?.bookings || []);
      } else {
        setError(response.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Bookings fetch error:', err);
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings({ silent: true });
    setRefreshing(false);
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    
    if (selectedTab === 'All Bookings') {
      return bookings;
    } else if (selectedTab === 'Upcoming') {
      return bookings.filter(booking => {
        if (['CANCELLED', 'REFUNDED'].includes(booking.status)) return false;
        if (booking.trip?.tripStatus === 'COMPLETED') return false;
        
        const tripDate = new Date(booking.trip?.tripDate || booking.tripDate);
        return tripDate >= now;
      });
    } else { // Past
      return bookings.filter(booking => {
        if (['CANCELLED', 'REFUNDED'].includes(booking.status)) return true;
        if (booking.trip?.tripStatus === 'COMPLETED') return true;
        
        const tripDate = new Date(booking.trip?.tripDate || booking.tripDate);
        return tripDate < now;
      });
    }
  }, [bookings, selectedTab]);

  const handleDownloadTicket = useCallback(async (booking) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Not Signed In', 'Please sign in to download tickets.');
        return;
      }

      setDownloadingId(booking.bookingGroupId);
      const downloadUrl = `${API_BASE_URL}${API_ENDPOINTS.DOWNLOAD_TICKET(booking.bookingGroupId)}`;
      const filename = `ticket_${booking.bookingGroupId}_${Date.now()}.pdf`;

      console.log('Starting ticket download:', downloadUrl);

      // Web platform: use browser download
      const isBrowserRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';
      if (Platform.OS === 'web' || isBrowserRuntime) {
        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Download failed with HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);

        Alert.alert('Success', 'Ticket downloaded successfully!');
        return;
      }

      // Native: download to cache, then save via Storage Access Framework or Share Sheet
      const tempUri = `${FileSystem.cacheDirectory}${filename}`;
      console.log('Downloading to temp:', tempUri);

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, tempUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!downloadResult?.uri || downloadResult.status >= 400) {
        throw new Error(`Download failed with HTTP ${downloadResult?.status || 'unknown'}`);
      }

      // Android: prompt user to pick a folder using SAF (saves to real Downloads)
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              filename,
              'application/pdf'
            );

            await FileSystem.writeAsStringAsync(newFileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            Alert.alert(
              'Ticket Saved ✅',
              'Saved to the folder you selected. Open File Manager and check that folder to view the PDF.',
              [
                {
                  text: 'Open / Share',
                  onPress: async () => {
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(newFileUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Open Ticket',
                      });
                    }
                  },
                },
                { text: 'Done' },
              ]
            );
            return;
          }
        } catch (safError) {
          console.warn('SAF failed, falling back to Share Sheet:', safError);
        }
      }

      // Fallback (iOS or if SAF was denied/cancelled): Share Sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Share Ticket',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'Download Complete',
          'Ticket downloaded to app cache, but no app is available to open/share it. Please install a PDF viewer.',
          [{ text: 'OK' }]
        );
      }

    } catch (err) {
      console.error('Download ticket error:', err);
      Alert.alert(
        'Download Failed',
        err.message || 'Could not download ticket. Please try again.'
      );
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const renderErrorBanner = () => {
    if (!error) return null;
    const isAuthError = error.toLowerCase().includes('sign in');
    return (
      <View style={styles.errorBanner}>
        <MaterialIcons name="error" size={18} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.errorAction}
          onPress={() => {
            if (isAuthError) {
              navigation.navigate('SignIn');
            } else {
              loadBookings();
            }
          }}
        >
          <Text style={styles.errorActionText}>{isAuthError ? 'Sign In' : 'Retry'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={80} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No bookings found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedTab === 'Upcoming' 
          ? 'You have no upcoming trips' 
          : selectedTab === 'Past'
          ? 'No past bookings to show'
          : 'You have not made any bookings yet'}
      </Text>
    </View>
  );

  const renderBookingCard = ({ item: booking }) => {
    const statusMeta = getStatusMeta(booking);
    const seats = getSeatDisplay(booking);
    const journeyDate = formatJourneyDate(booking.trip?.tripDate || booking.tripDate);
    const bookingDate = formatBookingDate(booking.bookedAt);
    const pickupTime = formatTime(booking.boardingPoint?.time || booking.route?.from?.departureTime);
    const dropTime = formatTime(booking.droppingPoint?.time || booking.route?.to?.arrivalTime);
    const totalAmount = formatCurrency(booking.finalPrice ?? booking.totalPrice, booking.payment?.currency);
    const bookingRef = `pb-${(booking.bookingGroupId || '').slice(-8) || '08-8580'} • ${booking.bus?.type || 'MIXED'}`;

    const pickupName = booking.boardingPoint?.name || booking.route?.from?.name || '--';
    const pickupDetail = booking.boardingPoint?.landmark || booking.route?.from?.city || '';
    const dropName = booking.droppingPoint?.name || booking.route?.to?.name || '--';
    const dropDetail = booking.droppingPoint?.landmark || booking.route?.to?.city || '';

    return (
      <View style={styles.bookingCard}>
        {/* Header with bus name and status */}
        <View style={styles.cardHeader}>
          <View style={styles.leftHeader}>
            <Text style={styles.busName}>{(booking.bus?.name || 'volvo').toLowerCase()}</Text>
            <Text style={styles.bookingReference}>{bookingRef}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        {/* Route section */}
        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.locationRow}>
              <MaterialIcons name="radio-button-checked" size={12} color="#10B981" />
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Pickup From</Text>
                <Text style={styles.locationName}>
                  {pickupName}
                  {pickupDetail ? ` (${pickupDetail})` : ''}
                </Text>
                <Text style={styles.locationTime}>{pickupTime}</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={12} color="#EF4444" />
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Drop At</Text>
                <Text style={styles.locationName}>
                  {dropName}
                  {dropDetail ? ` (${dropDetail})` : ''}
                </Text>
                <Text style={styles.locationTime}>{dropTime}</Text>
              </View>
            </View>
          </View>

          <View style={styles.routeRight}>
            <View style={styles.infoItem}>
              <MaterialIcons name="event" size={16} color="#6366F1" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Journey Date</Text>
                <Text style={styles.infoValue}>{journeyDate}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="airline-seat-recline-normal" size={16} color="#6366F1" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Seats</Text>
                <Text style={styles.infoValue}>{seats}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="account-balance-wallet" size={16} color="#6366F1" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>{totalAmount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Booking date */}
        <Text style={styles.bookingDate}>{bookingDate}</Text>

        {/* Download button */}
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={() => handleDownloadTicket(booking)}
          disabled={downloadingId === booking.bookingGroupId}
        >
          {downloadingId === booking.bookingGroupId ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <MaterialIcons name="download" size={16} color="#6366F1" />
          )}
          <Text style={styles.downloadButtonText}>Download Ticket</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Header */}
      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay} />
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>View and manage your bus tickets</Text>
        </SafeAreaView>
      </ImageBackground>

      {/* Main Content Card */}
      <View style={styles.mainCard}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderErrorBanner()}

        {/* Content */}
        <View style={styles.content}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <FlatList
              data={filteredBookings}
              keyExtractor={(item) => item.bookingGroupId}
              renderItem={renderBookingCard}
              contentContainerStyle={
                filteredBookings.length === 0 ? styles.emptyListContent : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  colors={['#6366F1']} 
                />
              }
              ListEmptyComponent={!loading ? renderEmptyState : null}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },
  header: {
    height: 160,
    width: SCREEN_WIDTH,
    paddingBottom: 20,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 95, 111, 0.80)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mainCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 18,
    marginTop: -25,
    paddingTop: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#6366F1',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  leftHeader: {
    flex: 1,
  },
  busName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  bookingReference: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  busType: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeSection: {
    flexDirection: 'row',
    padding: 16,
  },
  routeLeft: {
    flex: 1,
    marginRight: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  locationDetails: {
    marginLeft: 8,
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  locationTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  routeLine: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 6,
    marginVertical: 8,
  },
  routeRight: {
    width: 120,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  bookingDate: {
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 0,
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  downloadButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 14,
  },
  errorAction: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  errorActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default BookingsScreen;
