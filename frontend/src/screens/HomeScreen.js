/**
 * Home / Dashboard Screen - Post Login
 *
 * Features:
 * - Header with dark map background, app name, subtitle
 * - Main booking card with From/To inputs (city autocomplete), swap icon, date selector
 * - Quick action cards (My Bookings, Offers)
 * - Offer banner with coupon code
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { busAPI } from '../services/api';
import api from '../services/api';
import { searchCities } from '../data/cities';

const { width } = Dimensions.get('window');

// ─── SVG Icons ─────────────────────────────────────────────────────────────────

const BusIcon = ({ color = '#666' }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24">
    <Path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill={color} />
  </Svg>
);

const SwapIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24">
    <Path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" fill="#4A90E2" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24">
    <Path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" fill="#4A90E2" />
  </Svg>
);

const BookingIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 24 24">
    <Path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54zM9 8h2v8H9zm4 0h2v8h-2z" fill="#4A90E2" />
  </Svg>
);

const OfferIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 24 24">
    <Path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill="#4A90E2" />
  </Svg>
);

const PercentIcon = () => (
  <Svg width="38" height="38" viewBox="0 0 24 24">
    <Circle cx="6.5" cy="6.5" r="2.5" fill="#4A90E2" />
    <Circle cx="17.5" cy="17.5" r="2.5" fill="#4A90E2" />
    <Path d="M19 5L5 19" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const LocationPin = ({ color = '#2C5F6F' }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={color} />
  </Svg>
);

const FlagNepal = () => (
  <Text style={{ fontSize: 14 }}>🇳🇵</Text>
);

const FlagIndia = () => (
  <Text style={{ fontSize: 14 }}>🇮🇳</Text>
);

// ─── City Suggestion Dropdown ───────────────────────────────────────────────────

const CityDropdown = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.dropdown}>
      {suggestions.map((city, index) => (
        <TouchableOpacity
          key={`${city.name}-${city.country}-${index}`}
          style={[
            styles.dropdownItem,
            index < suggestions.length - 1 && styles.dropdownItemBorder,
          ]}
          onPress={() => onSelect(city)}
          activeOpacity={0.7}
        >
          <LocationPin color="#2C5F6F" />
          <View style={styles.dropdownTextContainer}>
            <Text style={styles.dropdownCityName}>{city.name}</Text>
            <Text style={styles.dropdownStateName}>{city.state}, {city.country}</Text>
          </View>
          {city.country === 'Nepal' ? <FlagNepal /> : <FlagIndia />}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(new Date());
  const [isSearching, setIsSearching] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);

  const [latestOffer, setLatestOffer] = useState(null);

  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    const fetchLatestOffer = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const response = await api.getOffers(token);
        if (response.success) {
          const list = Array.isArray(response.data)
            ? response.data
            : response.data?.offers;
          if (Array.isArray(list) && list.length > 0) {
            setLatestOffer(list[0]);
          }
        }
      } catch (_) {
        // Banner simply won't show if fetch fails
      }
    };
    fetchLatestOffer();
  }, []);

  // ── City search handlers ──────────────────────────────────────────────────

  const handleFromChange = useCallback((text) => {
    setFrom(text);
    if (text.trim().length > 0) {
      setFromSuggestions(searchCities(text, 5));
    } else {
      setFromSuggestions([]);
    }
  }, []);

  const handleToChange = useCallback((text) => {
    setTo(text);
    if (text.trim().length > 0) {
      setToSuggestions(searchCities(text, 5));
    } else {
      setToSuggestions([]);
    }
  }, []);

  const selectFromCity = useCallback((city) => {
    setFrom(city.name);
    setFromSuggestions([]);
    setFromFocused(false);
    Keyboard.dismiss();
  }, []);

  const selectToCity = useCallback((city) => {
    setTo(city.name);
    setToSuggestions([]);
    setToFocused(false);
    Keyboard.dismiss();
  }, []);

  const dismissAll = useCallback(() => {
    setFromSuggestions([]);
    setToSuggestions([]);
    setFromFocused(false);
    setToFocused(false);
    Keyboard.dismiss();
  }, []);

  // ── Date helpers ──────────────────────────────────────────────────────────

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const formatDisplayDate = (d) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatDateForAPI = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ── Search handler ────────────────────────────────────────────────────────

  const handleSearch = async () => {
    dismissAll();

    if (!from || !to) {
      Alert.alert('Missing Information', 'Please select both departure and destination locations.');
      return;
    }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      Alert.alert('Invalid Route', 'Departure and destination cannot be the same.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    if (selected < today) {
      Alert.alert('Invalid Date', 'Please select a future date.');
      return;
    }

    setIsSearching(true);
    try {
      const searchData = {
        startLocation: from.trim(),
        endLocation: to.trim(),
        date: formatDateForAPI(date),
      };

      const response = await busAPI.searchBuses(searchData);

      if (response.success) {
        navigation.navigate('BusSearchResults', {
          from,
          to,
          date: formatDisplayDate(date),
          searchData,
          busData: response.data,
        });
      } else {
        Alert.alert('Search Failed', response.error || 'Unable to search buses. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
    setFromSuggestions([]);
    setToSuggestions([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={dismissAll}
        >
            {/* Header */}
            <ImageBackground
              source={require('../../assets/landing-background.jpg')}
              style={styles.header}
              resizeMode="cover"
            >
              <View style={styles.headerOverlay} />
              <SafeAreaView edges={['top']} style={styles.headerContent}>
                <View style={styles.headerRow}>
                  <View style={styles.logoCircle}>
                    <Image
                      source={require('../../assets/logo.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text
                      style={styles.appName}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      GO GANTABYA
                    </Text>
                    <Text style={styles.appSubtitle}>Best and cheapest</Text>
                  </View>
                </View>
              </SafeAreaView>
            </ImageBackground>

            {/* Booking Card */}
            <View style={styles.bookingCard}>
              <Text style={styles.bookingTitle}>Book Your Journey</Text>
              <Text style={styles.bookingSubtitle}>Find and book bus tickets across World.</Text>

              {/* Inputs + Swap container */}
              <View style={{ position: 'relative', zIndex: 30 }}>
                {/* From Input */}
                <View
                  style={[
                    styles.inputContainer,
                    fromFocused && styles.inputContainerFocused,
                  ]}
                >
                  <BusIcon color="#2C5F6F" />
                  <TextInput
                    ref={fromRef}
                    style={styles.input}
                    placeholder="From"
                    placeholderTextColor="#9CA3AF"
                    value={from}
                    onChangeText={handleFromChange}
                    onFocus={() => setFromFocused(true)}
                    returnKeyType="next"
                    onSubmitEditing={() => toRef.current?.focus()}
                  />
                  {from.length > 0 && (
                    <TouchableOpacity
                      onPress={() => { setFrom(''); setFromSuggestions([]); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* From dropdown */}
                {fromFocused && fromSuggestions.length > 0 && (
                  <CityDropdown suggestions={fromSuggestions} onSelect={selectFromCity} />
                )}

                {/* To Input */}
                <View
                  style={[
                    styles.inputContainer,
                    toFocused && styles.inputContainerFocused,
                    { marginTop: fromFocused && fromSuggestions.length > 0 ? 0 : 0 },
                  ]}
                >
                  <BusIcon color="#2C5F6F" />
                  <TextInput
                    ref={toRef}
                    style={styles.input}
                    placeholder="To"
                    placeholderTextColor="#9CA3AF"
                    value={to}
                    onChangeText={handleToChange}
                    onFocus={() => setToFocused(true)}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  {to.length > 0 && (
                    <TouchableOpacity
                      onPress={() => { setTo(''); setToSuggestions([]); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* To dropdown */}
                {toFocused && toSuggestions.length > 0 && (
                  <CityDropdown suggestions={toSuggestions} onSelect={selectToCity} />
                )}

                {/* Swap Button – only shown when no dropdown is open */}
                {!(fromFocused && fromSuggestions.length > 0) &&
                  !(toFocused && toSuggestions.length > 0) && (
                    <TouchableOpacity
                      style={styles.swapButton}
                      onPress={handleSwap}
                      activeOpacity={0.7}
                    >
                      <SwapIcon />
                    </TouchableOpacity>
                  )}
              </View>

              {/* Date Selector */}
              <TouchableOpacity
                style={styles.dateContainer}
                activeOpacity={0.7}
                onPress={() => { dismissAll(); setShowDatePicker(true); }}
              >
                <CalendarIcon />
                <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}

              {/* Search Button */}
              <TouchableOpacity
                style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
                onPress={handleSearch}
                activeOpacity={0.85}
                disabled={isSearching}
              >
                {isSearching ? (
                  <View style={styles.searchButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.searchButtonText}>Searching...</Text>
                  </View>
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Action Cards */}
            <View style={styles.quickActionsContainer}>
              <View style={styles.quickActionWrapper}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => navigation.navigate('Bookings')}
                  activeOpacity={0.7}
                >
                  <BookingIcon />
                </TouchableOpacity>
                <Text style={styles.quickActionLabel}>My{'\n'}Bookings</Text>
              </View>

              <View style={styles.quickActionWrapper}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => navigation.navigate('Offers')}
                  activeOpacity={0.7}
                >
                  <OfferIcon />
                </TouchableOpacity>
                <Text style={styles.quickActionLabel}>Offers</Text>
              </View>
            </View>

            {/* Latest Offer Banner — dynamic from API */}
            {latestOffer && (
              <TouchableOpacity
                style={styles.offerBanner}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Offers')}
              >
                <View style={styles.offerContent}>
                  <Text style={styles.offerTitle}>
                    {latestOffer.discountType === 'PERCENTAGE'
                      ? `${latestOffer.discountValue}% OFF`
                      : `₹${latestOffer.discountValue} OFF`}
                  </Text>
                  <Text style={styles.offerSubtitle} numberOfLines={1}>
                    {latestOffer.description || 'Special offer available'}
                  </Text>
                  <View style={styles.couponContainer}>
                    <Text style={styles.couponLabel}>Use Code: </Text>
                    <Text style={styles.couponCode}>{latestOffer.code}</Text>
                  </View>
                </View>
                <View style={styles.offerIconContainer}>
                  <PercentIcon />
                </View>
              </TouchableOpacity>
            )}
        </ScrollView>
      </View>
    </>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },

  // Header
  header: {
    height: 160,
    width,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },

  // Scroll
  mainContent: { flex: 1 },
  scrollContent: { paddingBottom: 90 },

  // Booking card
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 18,
    marginTop: -25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    overflow: 'visible',
  },
  bookingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  bookingSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 10,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 7,
    height: 46,
  },
  inputContainerFocused: {
    borderColor: '#2C5F6F',
    backgroundColor: '#F0F9FF',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },

  // City Dropdown
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    marginBottom: 7,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  dropdownCityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dropdownStateName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },

  // Swap Button
  swapButton: {
    position: 'absolute',
    right: 8,
    top: 32,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },

  // Date
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 10,
    height: 46,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  addReturnText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Search Button
  searchButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonDisabled: {
    backgroundColor: '#87CEEB',
    opacity: 0.8,
  },
  searchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 14,
    zIndex: 1,
  },
  quickActionWrapper: {
    alignItems: 'center',
    maxWidth: 72,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Offer Banner
  offerBanner: {
    backgroundColor: '#E6F3F8',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    zIndex: 1,
  },
  offerContent: { flex: 1 },
  offerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C5F6F',
    marginBottom: 3,
  },
  offerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  couponCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C5F6F',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offerIconContainer: {
    marginLeft: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '12deg' }],
  },
});

export default HomeScreen;
