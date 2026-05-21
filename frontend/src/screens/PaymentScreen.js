import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import api from '../services/api';
import CryptoJS from 'crypto-js';

// Import RazorpayCheckout safely - wrap in try-catch to prevent iOS crash
let RazorpayCheckout = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.log('Razorpay module not available:', e.message);
}

// Prices are stored in NPR in DB; INR is derived for display.
const NPR_TO_INR_RATE = 0.625;
const convertNprToInr = (nprAmount) => Number((Number(nprAmount || 0) * NPR_TO_INR_RATE).toFixed(2));

const roundToTwo = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const PaymentScreen = ({ navigation, route }) => {
  const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
  const [userEmail, setUserEmail] = useState('');

  const getTripIdForRequests = () =>
    busData?.tripId || busData?.tripData?.tripId || busData?.tripData?.id || null;

  const getCachedUserEmail = async () => {
    try {
      const cachedUser = await AsyncStorage.getItem('userData');
      if (!cachedUser) return null;
      const parsed = JSON.parse(cachedUser);
      return typeof parsed?.email === 'string' ? parsed.email : null;
    } catch {
      return null;
    }
  };

  const getEmailStatusNote = async () => {
    const email = await getCachedUserEmail();
    if (!email) return '';
    const normalized = email.trim().toLowerCase();
    if (normalized.endsWith('@gmail.com')) {
      return `\n\nTicket will be emailed to: ${email}`;
    }
    return `\n\nTicket will be emailed to your registered email: ${email}`;
  };

  const confirmBookingForPayment = async (paymentId, token) => {
    const confirmResponse = await api.confirmPayment({ paymentId }, token);
    if (!confirmResponse?.success) {
      throw new Error(confirmResponse?.error || 'Booking confirmation failed');
    }

    const data = confirmResponse.data;
    if (!data || !isNonEmptyString(data.bookingGroupId)) {
      throw new Error('Booking confirmation returned an unexpected response');
    }

    return data;
  };

  // Demo Razorpay configuration - Using the same secret as backend
  const DEMO_RAZORPAY_KEY_SECRET = 'lVO33r15GL7bZyt92KjSvO41';

  // Generate Razorpay signature for demo purposes
  const generateRazorpaySignature = (orderId, paymentId, secret) => {
    const payload = `${orderId}|${paymentId}`;
    const signature = CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
    console.log('🔐 Signature generation:', {
      orderId,
      paymentId,
      payload,
      secret: secret.substring(0, 8) + '...',
      signature
    });
    return signature;
  };

  // Open Razorpay checkout - REAL PAYMENTS ONLY
  const openRazorpayCheckout = async (paymentData, token) => {
    console.log('🏁 Starting REAL Razorpay checkout (no simulation)...');
    
    // Check if running in Expo Go (safe check for production builds)
    const isExpoGo = Constants?.executionEnvironment === 'storeClient';
    console.log('📱 Environment check:', {
      executionEnvironment: Constants?.executionEnvironment,
      isExpoGo,
      platform: Platform.OS
    });
    
    if (isExpoGo) {
      Alert.alert(
        'Real Payments Not Available in Expo Go', 
        'You are currently running in Expo Go which doesn\'t support native payment modules.\n\nTo process REAL payments, you need:\n\n1. Build a development build: "expo dev-build"\n2. Install on a physical device\n3. Or use a production build\n\nSimulated payments are disabled as requested.',
        [{ text: 'Understood', style: 'default' }]
      );
      return;
    }

    try {
      // Check if RazorpayCheckout is available
      console.log('🔍 Checking Razorpay availability:', {
        RazorpayCheckout: !!RazorpayCheckout,
        type: typeof RazorpayCheckout,
        hasOpen: RazorpayCheckout && typeof RazorpayCheckout.open === 'function',
        isFunction: typeof RazorpayCheckout?.open
      });

      if (!RazorpayCheckout) {
        console.error('❌ RazorpayCheckout is null - package not available');
        Alert.alert(
          'Payment Module Not Available',
          'The Razorpay payment module is not properly installed or linked. Please ensure:\n\n1. react-native-razorpay is installed\n2. App is built as development/production build\n3. Native modules are properly linked\n\nSimulated payments are disabled as requested.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (typeof RazorpayCheckout.open !== 'function') {
        console.error('❌ RazorpayCheckout.open is not a function:', typeof RazorpayCheckout.open);
        Alert.alert(
          'Payment Module Incomplete',
          'The Razorpay SDK is not properly initialized. Real payment processing is not available.\n\nSimulated payments are disabled as requested.',
          [{ text: 'OK' }]
        );
        return;
      }

      const options = {
        description: `Bus Booking - ${busData?.operator || 'Bus Service'}`,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: paymentData.currency || 'INR',
        key: paymentData.razorpayKeyId,
        amount: Math.round(paymentData.amount * 100),
        order_id: paymentData.orderId,
        name: 'Bus Booking',
        prefill: {
          email: primaryPassenger?.email || '',
          contact: primaryPassenger?.phone || '',
          name: primaryPassenger?.name || ''
        },
        theme: { color: '#2B636E' }
      };

      console.log('🚀 Opening native Razorpay checkout with options:', {
        ...options,
        amount: options.amount / 100,
        key: options.key.substring(0, 8) + '...'
      });

      const data = await RazorpayCheckout.open(options);
      console.log('✅ REAL Razorpay payment success:', data);

      await verifyRazorpayPayment(data, paymentData, token);

    } catch (error) {
      console.error('💥 Razorpay checkout error:', error);
      
      // Handle specific Razorpay errors without fallbacks
      if (error.code && RazorpayCheckout) {
        switch (error.code) {
          case RazorpayCheckout.PAYMENT_CANCELLED:
            Alert.alert('Payment Cancelled', 'You have cancelled the payment.');
            break;
          case RazorpayCheckout.NETWORK_ERROR:
            Alert.alert('Network Error', 'Please check your internet connection and try again.');
            break;
          default:
            Alert.alert('Payment Failed', error.description || 'Payment could not be processed.');
        }
      } else {
        // For other errors, show error without fallback
        Alert.alert(
          'Payment Processing Error',
          `Real payment could not be processed: ${error.message}\n\nSimulated payments are disabled as requested.`,
          [{ text: 'OK' }]
        );
      }
    }
  };
  console.log('=== PAYMENT RECEIVED DATA DEBUG ===');
  console.log('Full route.params:', JSON.stringify(route.params, null, 2));
  console.log('==========================================');
  
  const { busData, selectedSeats = [], passengers = [] } = route.params;

  const normalizeSeat = (seat) => {
    if (!seat) return seat;
    const deck = (seat.deck || seat.level || 'LOWER').toString().toUpperCase();
    const seatNumber = seat.seatNumber || seat.number || seat.seat_no || seat.id;
    return { ...seat, deck, seatNumber };
  };

  useEffect(() => {
    getCachedUserEmail().then((email) => setUserEmail(email || ''));
  }, []);

  const primaryPassenger = {
    ...(passengers?.[0] || {}),
    email: passengers?.[0]?.email || userEmail,
    phone: passengers?.[0]?.phone || '',
  };
  const boardingPoint = route.params?.boardingPoint || busData?.boardingPoint || busData?.tripData?.fromStop?.boardingPoints?.[0];
  const droppingPoint = route.params?.droppingPoint || busData?.droppingPoint || busData?.tripData?.toStop?.boardingPoints?.[0];

  const getPointLabel = (point, fallback) =>
    point?.name || point?.locationName || point?.location || point?.address || point?.stopName || fallback;

  const getPointTime = (point) => point?.time || point?.departureTime || point?.arrivalTime || '';

  // State for actual selected seats with fallback recovery
  const [actualSelectedSeats, setActualSelectedSeats] = useState(() =>
    (selectedSeats || []).map(normalizeSeat)
  );

  console.log('PaymentScreen received params:', {
    busData: !!busData,
    selectedSeatsCount: actualSelectedSeats.length,
    passengersCount: passengers.length,
    selectedSeats: actualSelectedSeats,
    passengers: passengers,
    boardingPoint: !!boardingPoint,
    droppingPoint: !!droppingPoint,
  });

  // Try to recover selectedSeats from AsyncStorage if empty
  useEffect(() => {
    if (!actualSelectedSeats || actualSelectedSeats.length === 0) {
      console.log('PaymentScreen: Attempting to recover selectedSeats from AsyncStorage...');
      AsyncStorage.getItem('selectedSeatsBackup')
        .then(backupData => {
          if (backupData) {
            const parsedSeats = JSON.parse(backupData);
            const normalizedSeats = (parsedSeats || []).map(normalizeSeat);
            console.log('PaymentScreen: Recovered seats from AsyncStorage:', normalizedSeats);
            setActualSelectedSeats(normalizedSeats);
          } else {
            console.log('PaymentScreen: No backup seats found in AsyncStorage');
            // If no backup and no seats, show error
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
          }
        })
        .catch(err => console.warn('PaymentScreen: Failed to recover seats from AsyncStorage:', err));
    }
  }, []);

  // Calculate fare - align UI with the selected trip's price (prefer backend-provided total if available)
  // NOTE: the actual amount charged is determined by backend `/user/payments/initiate`.
  const seatCount = actualSelectedSeats.length;
  const perSeatFareNpr = Number(busData?.priceNpr ?? busData?.price ?? busData?.tripData?.fare ?? busData?.tripData?.price ?? 0);
  const perSeatFareInr = convertNprToInr(perSeatFareNpr);

  const getSeatFareNpr = (seat) => {
    // Prefer per-seat price computed in Seat Selection.
    const explicitSeatPrice = Number(seat?.priceNpr);
    if (Number.isFinite(explicitSeatPrice)) return explicitSeatPrice;

    const fromStop = route.params?.busInfo?.route?.fromStop;
    const toStop = route.params?.busInfo?.route?.toStop;
    if (!fromStop || !toStop) return 0;

    const level = String(seat?.level || seat?.deck || '').toUpperCase();
    const type = String(seat?.type || '').toUpperCase();

    // Upper deck seater seats: use priceFromOrigin (matches backend logic)
    if (level === 'UPPER' && type === 'SEATER') {
      return Math.abs(Number(toStop.priceFromOrigin || 0) - Number(fromStop.priceFromOrigin || 0));
    }

    if (level === 'LOWER' && type === 'SEATER') {
      return Math.abs(Number(toStop.lowerSeaterPrice || 0) - Number(fromStop.lowerSeaterPrice || 0));
    }
    if (level === 'LOWER' && type === 'SLEEPER') {
      return Math.abs(Number(toStop.lowerSleeperPrice || 0) - Number(fromStop.lowerSleeperPrice || 0));
    }
    if (level === 'UPPER' && type === 'SLEEPER') {
      return Math.abs(Number(toStop.upperSleeperPrice || 0) - Number(fromStop.upperSleeperPrice || 0));
    }

    return 0;
  };

  const seatLineItems = actualSelectedSeats.map((seat, index) => {
    const seatLabel = seat?.seatNumber ? `Seat ${seat.seatNumber}` : `Seat ${index + 1}`;
    const deckLabel = (seat?.deck || seat?.level || 'LOWER').toString().toUpperCase();
    const typeLabel = (seat?.type || 'SEATER').toString().toUpperCase();
    const fareNpr = getSeatFareNpr(seat);
    return { seatLabel, deckLabel, typeLabel, fareNpr };
  });

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

  const computeSeatTypeTotalNpr = () => {
    const fromStop = route.params?.busInfo?.route?.fromStop;
    const toStop = route.params?.busInfo?.route?.toStop;

    if (!fromStop || !toStop || !Array.isArray(actualSelectedSeats) || actualSelectedSeats.length === 0) {
      return 0;
    }

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
  };

  // If the backend already sent a total fare for the selected seats, prefer it; otherwise compute locally.
  const backendTotalNpr = Number(
    route.params?.backendTotalFareNpr ??
    route.params?.totalFareNpr ??
    route.params?.totalAmountNpr ??
    busData?.totalFareNpr ??
    busData?.totalAmountNpr ??
    busData?.totalFare ??
    busData?.totalPrice ??
    0
  );

  const computedSeatsTotalNpr = roundToTwo(
    seatLineItems.reduce((sum, item) => sum + (Number.isFinite(Number(item.fareNpr)) ? Number(item.fareNpr) : 0), 0)
  );

  const computedBaseFareNpr = computedSeatsTotalNpr > 0 || seatLineItems.length > 0
    ? computedSeatsTotalNpr
    : (seatCount > 0 ? seatCount * perSeatFareNpr : 0);

  const baseFareNpr = backendTotalNpr > 0 ? backendTotalNpr : computedBaseFareNpr;
  const baseFareInr = convertNprToInr(baseFareNpr);

  const gst = 0;
  const serviceFee = 0;
  const originalAmount = baseFareNpr;

  // Payment method state - Only Razorpay and eSewa
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(originalAmount);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [currentPaymentId, setCurrentPaymentId] = useState('');
  const [authToken, setAuthToken] = useState('');
  // Backend-calculated amounts (source of truth)
  const [backendAmountNpr, setBackendAmountNpr] = useState(null);
  const [backendAmountInr, setBackendAmountInr] = useState(null);
  // Used by eSewa flow for debugging/progress messages.
  const [, setDebugMessage] = useState(null);
  const [showWebView, setShowWebView] = useState({ 
    visible: false, 
    html: '', 
    uri: null,
    paymentData: null, 
    token: null,
    error: null
  });
  
  const paymentMethods = [
    { id: 'RAZORPAY', label: 'Razorpay' },
    { id: 'ESEWA', label: 'eSewa' },
  ];

  // Total amount calculation - use backend amounts if available (source of truth), otherwise show estimates
  const displayAmountNpr = backendAmountNpr !== null ? backendAmountNpr : (isCouponApplied ? finalAmount : originalAmount);
  const displayAmountInr = backendAmountInr !== null ? backendAmountInr : convertNprToInr(displayAmountNpr);
  const totalAmountNpr = displayAmountNpr;
  const totalAmountInr = displayAmountInr;
  const couponDiscountInr = convertNprToInr(couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please sign in to apply coupon');
        return;
      }

      const tripId = getTripIdForRequests();
      if (!tripId) {
        Alert.alert('Error', 'Trip ID is missing. Please go back and try again.');
        return;
      }

      // Backend requires a positive totalAmount. Prefer computed seat total, fallback to originalAmount.
      const safeTotalAmount = (() => {
        const computed = Number(computedBaseFareNpr);
        if (Number.isFinite(computed) && computed > 0) return computed;
        const original = Number(originalAmount);
        if (Number.isFinite(original) && original > 0) return original;
        return 0;
      })();

      if (!safeTotalAmount || safeTotalAmount <= 0) {
        Alert.alert('Error', 'Unable to determine booking amount. Please go back and try again.');
        return;
      }

      const response = await api.applyCoupon({
        code: couponCode.trim(),
        tripId,
        totalAmount: safeTotalAmount,
      }, token);

      if (response.success) {
        // Coupon applied successfully
        setCouponDiscount(response.data.discountAmount);
        setFinalAmount(response.data.finalAmount);
        setIsCouponApplied(true);
        setAppliedCouponCode(couponCode.trim());
        Alert.alert('Success', 'Coupon applied successfully!');
      } else {
        throw new Error(response.error || 'Failed to apply coupon');
      }
    } catch (error) {
      console.error('Coupon application error:', error);
      Alert.alert(
        'Coupon Error',
        error.message || 'Failed to apply coupon. Please try again.'
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setIsCouponApplied(false);
    setCouponDiscount(0);
    setFinalAmount(originalAmount);
    setCouponCode('');
    setAppliedCouponCode('');
  };

  const handlePayment = async () => {
    if (paymentLoading) return;

    console.log('Processing payment...');
    console.log('Payment method:', selectedPaymentMethod);
    console.log('Amount (NPR):', totalAmountNpr);
    console.log('Applied coupon:', appliedCouponCode);

    setPaymentLoading(true);

    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please sign in to continue payment');
        return;
      }

      setAuthToken(token);

      // If user typed a coupon but didn't tap "Apply", apply it now before payment.
      let couponCodeToSend = appliedCouponCode;
      const typedCoupon = couponCode.trim();
      if (!couponCodeToSend && typedCoupon) {
        const tripId = getTripIdForRequests();
        if (!tripId) {
          Alert.alert('Error', 'Trip ID is missing. Please go back and try again.');
          return;
        }

        const safeTotalAmount = (() => {
          const computed = Number(computedBaseFareNpr);
          if (Number.isFinite(computed) && computed > 0) return computed;
          const original = Number(originalAmount);
          if (Number.isFinite(original) && original > 0) return original;
          return 0;
        })();

        if (!safeTotalAmount || safeTotalAmount <= 0) {
          Alert.alert('Error', 'Unable to determine booking amount. Please go back and try again.');
          return;
        }

        setCouponLoading(true);
        const couponResp = await api.applyCoupon(
          {
            code: typedCoupon,
            tripId,
            totalAmount: safeTotalAmount,
          },
          token
        );
        setCouponLoading(false);

        if (!couponResp?.success) {
          Alert.alert('Coupon Error', couponResp?.error || 'Failed to apply coupon');
          return;
        }

        const discountAmount = Number(couponResp?.data?.discountAmount) || 0;
        const finalAmt =
          Number.isFinite(Number(couponResp?.data?.finalAmount))
            ? Number(couponResp.data.finalAmount)
            : Math.max(0, originalAmount - discountAmount);

        setCouponDiscount(discountAmount);
        setFinalAmount(finalAmt);
        setIsCouponApplied(true);
        setAppliedCouponCode(typedCoupon);
        couponCodeToSend = typedCoupon;
      }

      const fallbackEmail = userEmail || (await getCachedUserEmail()) || '';
      if (!fallbackEmail) {
        Alert.alert('Email Required', 'Please add an email in your profile to complete the booking.');
        return;
      }

      // Get actual data from route params 
      const actualSeatIds = actualSelectedSeats?.map(seat => seat.id).filter(Boolean) || [];
      
      // Use the passenger data that already has seatId and validation
      const actualPassengers = passengers?.map((passenger) => ({
        seatId: passenger.seatId,
        name: passenger.name,
        age: passenger.age,
        gender: passenger.gender,
        phone: passenger.phone || '',
        email: passenger.email || fallbackEmail,
      })) || [];

      console.log('Extracted seat IDs:', actualSeatIds);
      console.log('Processed passengers:', actualPassengers);

      // Extract boarding and dropping points (do NOT use dummy IDs)
      const actualBoardingPointId =
        route.params?.boardingPoint?.id ||
        route.params?.busInfo?.route?.fromStop?.boardingPoints?.[0]?.id ||
        busData.tripData?.fromStop?.boardingPoints?.[0]?.id;

      const actualDroppingPointId =
        route.params?.droppingPoint?.id ||
        route.params?.busInfo?.route?.toStop?.boardingPoints?.[0]?.id ||
        busData.tripData?.toStop?.boardingPoints?.[0]?.id;

      const paymentData = {
        tripId: getTripIdForRequests(),
        fromStopId: route.params?.busInfo?.route?.fromStop?.id || busData.fromStopId || busData.tripData?.fromStop?.id,
        toStopId: route.params?.busInfo?.route?.toStop?.id || busData.toStopId || busData.tripData?.toStop?.id,
        seatIds: actualSeatIds,
        passengers: actualPassengers,
        paymentMethod: selectedPaymentMethod,
        boardingPointId: actualBoardingPointId,
        droppingPointId: actualDroppingPointId,
        ...(couponCodeToSend && { couponCode: couponCodeToSend }),
      };

      console.log('Initiating payment with data:', paymentData);
      console.log('Payment data validation:', {
        tripId: paymentData.tripId,
        fromStopId: paymentData.fromStopId,
        toStopId: paymentData.toStopId,
        seatIdsLength: paymentData.seatIds.length,
        passengersLength: paymentData.passengers.length,
        paymentMethod: paymentData.paymentMethod,
        boardingPointId: paymentData.boardingPointId,
        droppingPointId: paymentData.droppingPointId,
        hasCouponCode: !!paymentData.couponCode,
      });

      // Validate required fields before sending
      if (!paymentData.tripId) {
        throw new Error('Trip ID is missing');
      }
      if (!paymentData.fromStopId) {
        throw new Error('From Stop ID is missing');
      }
      if (!paymentData.toStopId) {
        throw new Error('To Stop ID is missing');
      }
      if (!paymentData.boardingPointId) {
        throw new Error('Boarding point is missing');
      }
      if (!paymentData.droppingPointId) {
        throw new Error('Dropping point is missing');
      }
      if (!paymentData.seatIds.length || paymentData.seatIds.some(id => !id)) {
        throw new Error('Valid seat IDs are missing. Please go back and select seats again.');
      }
      if (!paymentData.passengers.length) {
        throw new Error('Passengers data is missing');
      }
      if (paymentData.passengers.some(p => !p.seatId || !p.name)) {
        throw new Error('Some passenger information is incomplete (missing seat ID or name)');
      }

      // Initiate payment with backend
      const response = await api.initiatePayment(paymentData, token);

      if (!response.success) {
        let errorMessage = response.error || 'Failed to initiate payment';
        
        // Add validation error details if available
        if (response.validationErrors) {
          const validationDetails = response.validationErrors.map(err => err.message || err.path?.join('.') || 'Unknown error').join('\\n');
          errorMessage += '\\n\\nValidation errors:\\n' + validationDetails;
        }
        
        throw new Error(errorMessage);
      }

      const paymentResult = response.data;
      console.log('Payment initiation response:', paymentResult);

      setCurrentPaymentId(paymentResult.paymentId);

      // Store backend-calculated amounts (source of truth)
      if (selectedPaymentMethod === 'RAZORPAY') {
        // Backend returns amount in INR for Razorpay
        const backendInr = Number(paymentResult.amount);
        const backendNpr = backendInr / NPR_TO_INR_RATE; // Convert back to NPR
        setBackendAmountInr(backendInr);
        setBackendAmountNpr(backendNpr);
        console.log('Backend amounts (Razorpay):', { backendInr, backendNpr });
        
        // Open actual Razorpay checkout
        await openRazorpayCheckout(paymentResult, token);
      } else if (selectedPaymentMethod === 'ESEWA') {
        // Backend returns amount in NPR for eSewa
        const backendNpr = Number(paymentResult.amount);
        const backendInr = backendNpr * NPR_TO_INR_RATE;
        setBackendAmountNpr(backendNpr);
        setBackendAmountInr(backendInr);
        console.log('Backend amounts (eSewa):', { backendNpr, backendInr });
        
        // Handle eSewa payment
        await handleEsewaPayment(paymentResult, token);
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to process payment. Please try again.'
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // WebView-based Razorpay integration (fallback for Expo)
  const openRazorpayWebView = async (paymentData, token) => {
    console.log('🌐 WebView Razorpay fallback triggered');
    
    Alert.alert(
      'Payment Method Notice',
      'Native Razorpay checkout is not available in this environment (Expo Go). Would you like to proceed with a simulated payment for testing?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => setPaymentLoading(false)
        },
        {
          text: 'Simulate Payment',
          onPress: () => {
            console.log('📱 User chose to simulate payment in Expo environment');
            simulateSuccessfulPayment(paymentData, token);
          }
        },
        {
          text: 'Learn More',
          onPress: () => {
            Alert.alert(
              'About Payment Integration',
              'In development:\n• Expo Go: Simulated payments\n• Production build: Real Razorpay\n\nFor real payments, create a production build of this app.',
              [{ text: 'OK', onPress: () => simulateSuccessfulPayment(paymentData, token) }]
            );
          }
        }
      ]
    );
  };

  // Verify actual Razorpay payment response
  const verifyRazorpayPayment = async (razorpayResponse, paymentData, token) => {
    try {
      console.log('🔍 Verifying actual Razorpay payment response:', razorpayResponse);

      // Prepare verification data using actual Razorpay response
      const verificationData = {
        paymentId: paymentData.paymentId,
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
        razorpaySignature: razorpayResponse.razorpay_signature,
      };

      console.log('📤 Sending payment verification data:', {
        ...verificationData,
        razorpaySignature: verificationData.razorpaySignature.substring(0, 16) + '...'
      });

      const verificationResponse = await api.verifyPayment(verificationData, token);
      
      console.log('📋 Payment verification response:', verificationResponse);
      
      if (verificationResponse.success) {
        const confirmed = await confirmBookingForPayment(paymentData.paymentId, token);
        const emailNote = await getEmailStatusNote();

        // Redirect automatically to Home after payment success
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        setTimeout(() => {
          Alert.alert(
            'Payment Successful! ✅',
            `Your booking has been confirmed!\n\nBooking Group ID: ${confirmed.bookingGroupId}${emailNote}`,
            [{ text: 'OK' }]
          );
        }, 300);
      } else {
        throw new Error(verificationResponse.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('💥 Payment verification error:', error.message);
      console.error('📍 Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // More specific error messaging
      let errorMessage = 'Payment verification failed. Please contact support.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.errorMessage || 'Payment verification failed due to invalid data.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please sign in again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Payment not found. Please try again.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Payment Verification Failed', errorMessage);
    }
  };

  const simulateSuccessfulPayment = async (paymentData, token) => {
    try {
      // Generate realistic payment ID for demo
      const demoPaymentId = 'demo_payment_' + Date.now();
      
      // Generate proper signature using the same logic as backend
      const generatedSignature = generateRazorpaySignature(
        paymentData.orderId, 
        demoPaymentId, 
        DEMO_RAZORPAY_KEY_SECRET
      );

      // Generate more realistic mock data for demo purposes
      const mockRazorpayResponse = {
        razorpay_order_id: paymentData.orderId,
        razorpay_payment_id: demoPaymentId,
        razorpay_signature: generatedSignature, // Now using properly generated signature
      };

      console.log('🎯 Mock Razorpay Response:', mockRazorpayResponse);
      console.log('🔐 Generated signature for payload:', `${paymentData.orderId}|${demoPaymentId}`);

      // Verify payment with backend
      const verificationData = {
        paymentId: paymentData.paymentId,
        razorpayOrderId: mockRazorpayResponse.razorpay_order_id,
        razorpayPaymentId: mockRazorpayResponse.razorpay_payment_id,
        razorpaySignature: mockRazorpayResponse.razorpay_signature,
      };

      console.log('🔍 Payment verification data being sent:', {
        ...verificationData,
        razorpaySignature: verificationData.razorpaySignature.substring(0, 16) + '...'
      });

      const verificationResponse = await api.verifyPayment(verificationData, token);
      
      console.log('📋 Payment verification response:', verificationResponse);
      
      if (verificationResponse.success) {
        const confirmed = await confirmBookingForPayment(paymentData.paymentId, token);
        const emailNote = await getEmailStatusNote();

        // Redirect automatically to Home after payment success
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        setTimeout(() => {
          Alert.alert(
            'Payment Successful! ✅',
            `Your booking has been confirmed!\n\nBooking Group ID: ${confirmed.bookingGroupId}${emailNote}`,
            [{ text: 'OK' }]
          );
        }, 300);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('💥 Payment simulation error:', error.message);
      console.error('📍 Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // More specific error messaging
      let errorMessage = 'Payment verification failed. Please contact support.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.errorMessage || 'Payment verification failed due to invalid data.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please sign in again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Payment not found. Please try again.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Payment Verification Failed', errorMessage);
    }
  };

  const handleEsewaPayment = async (paymentData, token) => {
    try {
      console.log('🔵 Starting eSewa payment with data:', JSON.stringify(paymentData, null, 2));
      setDebugMessage(`Starting eSewa...\nPayment ID: ${paymentData.paymentId}\nAmount: ${paymentData.amount}`);
      
      // Check if we have the form data from backend
      if (!paymentData.form || !paymentData.form.formUrl || !paymentData.form.params) {
        const errorMsg = `eSewa form data incomplete!\n\nReceived: ${JSON.stringify(paymentData, null, 2)}`;
        console.error('❌', errorMsg);
        setDebugMessage(errorMsg);
        Alert.alert('Payment Error', 'eSewa form data incomplete from server');
        setPaymentLoading(false);
        return;
      }

      const { formUrl, params } = paymentData.form;
      const esewaFormUrl = formUrl;
      const successUrl = params.success_url;
      const failureUrl = params.failure_url;
      
      setDebugMessage(`Form URL: ${esewaFormUrl}\nAmount: ${params.total_amount}\nProduct: ${params.product_code}\nSignature: ${params.signature ? 'OK' : 'MISSING!'}`);
      
      console.log('🔵 eSewa params (from backend config):', {
        formUrl: esewaFormUrl,
        amount: params.amount,
        total_amount: params.total_amount,
        transaction_uuid: params.transaction_uuid,
        product_code: params.product_code,
        success_url: successUrl,
        failure_url: failureUrl,
        signature: params.signature ? 'SET' : 'MISSING',
      });
      
      // Create HTML form for eSewa payment
      const esewaFormHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>eSewa Payment</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              display: flex; 
              flex-direction: column;
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #60BB46 0%, #4a9438 100%);
            }
            .container {
              text-align: center;
              color: white;
              max-width: 100%;
            }
            .spinner {
              border: 4px solid rgba(255,255,255,0.3);
              border-top: 4px solid white;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 { margin: 0 0 10px 0; font-size: 20px; }
            p { margin: 5px 0; font-size: 14px; opacity: 0.9; }

            .error-box {
              background: #ff4444;
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
              max-width: 350px;
            }
            .manual-btn {
              background: white;
              color: #60BB46;
              border: none;
              padding: 12px 24px;
              border-radius: 25px;
              font-size: 16px;
              font-weight: bold;
              margin-top: 20px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner" id="spinner"></div>
            <h2>Redirecting to eSewa...</h2>
            <p>Amount: NPR ${params.total_amount}</p>
            <p>Transaction: ${params.transaction_uuid}</p>
            
            <div id="error-container" style="display:none;" class="error-box">
              <p id="error-message"></p>
            </div>
            
            <button class="manual-btn" onclick="document.getElementById('esewaForm').submit();">
              Click here if not redirected
            </button>
          </div>
          
          <form id="esewaForm" action="${esewaFormUrl}" method="POST" style="display:none;">
            <input type="hidden" name="amount" value="${params.amount || ''}" />
            <input type="hidden" name="tax_amount" value="${params.tax_amount || '0'}" />
            <input type="hidden" name="total_amount" value="${params.total_amount || ''}" />
            <input type="hidden" name="transaction_uuid" value="${params.transaction_uuid || ''}" />
            <input type="hidden" name="product_code" value="${params.product_code || ''}" />
            <input type="hidden" name="product_service_charge" value="${params.product_service_charge || '0'}" />
            <input type="hidden" name="product_delivery_charge" value="${params.product_delivery_charge || '0'}" />
            <input type="hidden" name="success_url" value="${successUrl || ''}" />
            <input type="hidden" name="failure_url" value="${failureUrl || ''}" />
            <input type="hidden" name="signed_field_names" value="${params.signed_field_names || ''}" />
            <input type="hidden" name="signature" value="${params.signature || ''}" />
          </form>
          
          <script>
            try {
              console.log('eSewa form submitting...');
              setTimeout(function() {
                document.getElementById('esewaForm').submit();
              }, 1500);
            } catch(e) {
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('error-container').style.display = 'block';
              document.getElementById('error-message').innerText = 'Form submit error: ' + e.message;
            }
          </script>
        </body>
        </html>
      `;

      // Clear debug message when WebView opens
      setDebugMessage(null);
      
      // Show WebView with eSewa form
      setShowWebView({
        visible: true,
        html: esewaFormHtml,
        uri: null,
        paymentData: paymentData,
        token: token,
        error: null
      });

    } catch (error) {
      console.error('❌ eSewa payment error:', error);
      setDebugMessage(`eSewa Init Error:\n${error.message}\n\nStack: ${error.stack}`);
      Alert.alert('Payment Error', error.message || 'Failed to initialize eSewa payment');
      setPaymentLoading(false);
    }
  };

  // Handle eSewa callback URL interception - returns false to prevent loading
  const handleEsewaUrlIntercept = (request) => {
    const { url } = request;
    console.log('🔵 WebView URL intercept:', url);
    setDebugMessage(`Intercepted: ${url.substring(0, 100)}...`);

    const configuredSuccessUrl = showWebView.paymentData?.form?.params?.success_url;
    const configuredFailureUrl = showWebView.paymentData?.form?.params?.failure_url;

    // Check for success URL
    if (
      url.startsWith('esewa://payment/success/') ||
      (configuredSuccessUrl && url.startsWith(configuredSuccessUrl))
    ) {
      console.log('✅ eSewa SUCCESS intercepted!');
      handleEsewaSuccess(url);
      return false; // Don't load this URL
    }

    // Check for failure URL
    if (
      url.startsWith('esewa://payment/failure/') ||
      (configuredFailureUrl && url.startsWith(configuredFailureUrl))
    ) {
      console.log('❌ eSewa FAILURE intercepted!');
      handleEsewaFailure(url);
      return false; // Don't load this URL
    }

    // Allow all other URLs (eSewa pages, etc.)
    return true;
  };

  // Handle successful eSewa payment
  const handleEsewaSuccess = async (url) => {
    setDebugMessage(`Processing success: ${url}`);
    
    try {
      // Extract payment ID from URL (works for custom scheme and https URLs)
      let paymentIdFromUrl = url.split('/').pop()?.split('?')[0];
      try {
        const urlObj = new URL(url.replace('esewa://', 'https://esewa-callback/'));
        paymentIdFromUrl = urlObj.searchParams.get('paymentId') || paymentIdFromUrl;
      } catch (parseError) {
        console.log('URL parse warning:', parseError.message);
      }
      console.log('🔵 Payment ID:', paymentIdFromUrl);

      // Try to get eSewa data from URL query params
      let esewaRefId = null;
      let transactionCode = null;

      try {
        // eSewa appends ?data=base64encoded to the URL
        const dataMatch = url.match(/[?&]data=([^&]+)/);
        if (dataMatch) {
          const decodedData = JSON.parse(atob(dataMatch[1]));
          console.log('🔵 eSewa response data:', decodedData);
          esewaRefId = decodedData.transaction_code || decodedData.refId || decodedData.transaction_uuid;
          transactionCode = decodedData.transaction_code;
          setDebugMessage(`eSewa Ref: ${esewaRefId}, Code: ${transactionCode}`);
        }
      } catch (decodeError) {
        console.log('🔵 Could not decode eSewa data:', decodeError);
        setDebugMessage(`Decode error: ${decodeError.message}`);
      }

      // Keep WebView open during verification
      setDebugMessage('Verifying payment with backend...');

      // Verify payment with backend
      const verificationData = {
        paymentId: showWebView.paymentData?.paymentId || paymentIdFromUrl,
        esewaRefId: esewaRefId || paymentIdFromUrl,
      };

      console.log('🔵 Verifying payment:', verificationData);
      const verificationResponse = await api.verifyPayment(verificationData, showWebView.token);
      console.log('🔵 Verification response:', verificationResponse);

      if (verificationResponse.success) {
        try {
          const paymentIdToConfirm = showWebView.paymentData?.paymentId || paymentIdFromUrl;
          const confirmed = await confirmBookingForPayment(paymentIdToConfirm, showWebView.token);
          const emailNote = await getEmailStatusNote();

          // Close WebView after confirmation
                setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
          setPaymentLoading(false);
          setDebugMessage(null);

          // Redirect automatically to Home after payment success
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          setTimeout(() => {
            Alert.alert(
              'Payment Successful! ✅',
              `Your booking has been confirmed!\n\nBooking Group ID: ${confirmed.bookingGroupId}${emailNote}`,
              [{ text: 'OK' }]
            );
          }, 300);
          return;
        } catch (confirmError) {
          console.error('❌ Booking confirmation failed after eSewa verification:', confirmError);

          // Close WebView even if confirm fails
                  setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
          setPaymentLoading(false);
          setDebugMessage(`Confirmation failed: ${confirmError.message}`);

          Alert.alert(
            'Booking Confirmation Failed',
            confirmError.message || 'Payment verified but booking confirmation failed. Please contact support.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Close WebView after verification
                setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
      setPaymentLoading(false);

      // Verification failed - show error, don't navigate to bookings
      setDebugMessage(`Verification failed: ${JSON.stringify(verificationResponse)}`);
      Alert.alert(
        'Verification Failed',
        verificationResponse.error || 'Payment verification failed. Please contact support.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error handling success:', error);
      setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
      setPaymentLoading(false);
      setDebugMessage(`Error: ${error.message}\n\nStack: ${error.stack}`);
      Alert.alert('Error', `Payment error: ${error.message}`, [{ text: 'OK' }]);
    }
  };

  // Handle failed eSewa payment
  const handleEsewaFailure = (url) => {
    console.log('❌ eSewa payment failed:', url);
    let paymentId = null;
    try {
      const urlObj = new URL(url.replace('esewa://', 'https://esewa-callback/'));
      paymentId = urlObj.searchParams.get('paymentId');
    } catch (parseError) {
      // ignore
    }
    setDebugMessage(`Payment Failed for ${paymentId || 'unknown'}:\n${url}`);
    setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
    setPaymentLoading(false);
    Alert.alert('Payment Failed', 'Your eSewa payment was not completed. Please try again.', [{ text: 'OK' }]);
  };

  // Handle eSewa WebView navigation state change (backup handler)
  const handleEsewaWebViewNavigation = async (navState) => {
    const { url, loading, title } = navState;
    console.log('🔵 eSewa WebView navigation:', { url, loading, title });

    // Backup check for success (in case intercept doesn't catch it)
    if (url && (url.includes('esewa://payment/success') || url.includes('/payment/esewa/success'))) {
      console.log('✅ eSewa payment success detected at URL:', url);
      handleEsewaSuccess(url);
      return;
    }
    
    // Backup check for failure
    if (url && (url.includes('esewa://payment/failure') || url.includes('/payment/esewa/failure'))) {
      console.log('❌ eSewa payment failed at URL:', url);
      handleEsewaFailure(url);
      return;
    }

    // Log eSewa page loads for debugging
    if (url && url.includes('esewa.com')) {
      console.log('🔵 On eSewa page:', url);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <Text style={styles.seatCountText}>{seatCount} seat{seatCount > 1 ? 's' : ''}</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Seat Card */}
        <View style={styles.seatCard}>
          {seatLineItems.length > 0 ? (
            seatLineItems.map((item, index) => (
              <View
                key={`seat-item-${index}`}
                style={[
                  styles.seatLineItemRow,
                  index === seatLineItems.length - 1 && styles.seatLineItemRowLast,
                ]}
              >
                <View style={styles.seatLineItemLeft}>
                  <Text style={styles.seatNumberText}>{item.seatLabel}</Text>
                  <Text style={styles.seatTypeText}>{item.deckLabel} • {item.typeLabel}</Text>
                </View>
                <Text style={styles.seatPriceText}>₹{Number(convertNprToInr(item.fareNpr)).toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.seatNumberText}>No seats selected</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Boarding Point */}
        <View style={styles.pointContainer}>
          <Text style={styles.pointLabel}>BOARDING POINT</Text>
          <Text style={styles.pointName}>{getPointLabel(boardingPoint, 'Not selected')}</Text>
          <Text style={styles.pointTime}>{getPointTime(boardingPoint)}</Text>
        </View>

        {/* Dropping Point */}
        <View style={styles.pointContainer}>
          <Text style={styles.pointLabel}>DROPPING POINT</Text>
          <Text style={styles.pointName}>{getPointLabel(droppingPoint, 'Not selected')}</Text>
          <Text style={styles.pointTime}>{getPointTime(droppingPoint)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Subtotal */}
        <View style={styles.rowBetween}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>₹{Number(totalAmountInr).toFixed(2)}</Text>
        </View>

        {/* Total */}
        <View style={styles.rowBetween}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            NPR {Number(totalAmountNpr).toFixed(2)} (₹{Number(totalAmountInr).toFixed(2)})
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethodCard,
              selectedPaymentMethod === method.id && styles.paymentMethodCardSelected
            ]}
            onPress={() => setSelectedPaymentMethod(method.id)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodLeft}>
              <Ionicons 
                name={method.id === 'RAZORPAY' ? 'card-outline' : 'wallet-outline'} 
                size={24} 
                color={selectedPaymentMethod === method.id ? '#4F46E5' : '#6B7280'} 
              />
              <Text style={[
                styles.paymentMethodName,
                selectedPaymentMethod === method.id && styles.paymentMethodNameSelected
              ]}>
                {method.label}
              </Text>
            </View>
            <Text style={[
              styles.paymentMethodAmount,
              selectedPaymentMethod === method.id && styles.paymentMethodAmountSelected
            ]}>
              Pay {method.id === 'RAZORPAY' ? `₹${Number(totalAmountInr).toFixed(2)}` : `NPR ${Number(totalAmountNpr).toFixed(2)}`}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Coupon */}
        <Text style={styles.sectionTitle}>Have a coupon?</Text>
        <View style={styles.couponContainer}>
          <TextInput
            style={styles.couponInput}
            placeholder="Enter code"
            value={couponCode}
            onChangeText={setCouponCode}
            editable={!isCouponApplied}
          />
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={isCouponApplied ? removeCoupon : applyCoupon}
          >
            <Text style={styles.applyButtonText}>
              {isCouponApplied ? 'Remove' : 'Apply'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handlePayment}
          disabled={paymentLoading}
        >
          {paymentLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* eSewa WebView Modal */}
      {showWebView.visible && (
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              style={styles.webViewCloseButton}
              onPress={() => {
                setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
                setPaymentLoading(false);
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>eSewa Payment</Text>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Error Display */}
          {showWebView.error ? (
            <ScrollView style={styles.errorContainer}>
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>eSewa Payment Error</Text>
                <Text style={styles.errorMessage}>{showWebView.error}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setShowWebView({ visible: false, html: '', uri: null, paymentData: null, token: null, error: null });
                  setPaymentLoading(false);
                }}
              >
                <Text style={styles.retryButtonText}>Close & Try Again</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <WebView
              source={{ html: showWebView.html }}
              style={styles.webView}
              originWhitelist={['*']}
              onNavigationStateChange={handleEsewaWebViewNavigation}
              onLoadStart={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('🔵 WebView Load Start:', nativeEvent.url);
              }}
              onLoadEnd={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('🔵 WebView Load End:', nativeEvent.url);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ WebView error:', nativeEvent);
                setShowWebView(prev => ({
                  ...prev,
                  error: `WebView Error: ${nativeEvent.description || nativeEvent.code || 'Unknown error'}`
                }));
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ WebView HTTP error:', nativeEvent);
                // Don't show error for our custom scheme URLs
                if (!nativeEvent.url?.startsWith('esewa://')) {
                  setShowWebView(prev => ({
                    ...prev,
                    error: `HTTP Error ${nativeEvent.statusCode}: ${nativeEvent.description || 'Request failed'}`
                  }));
                }
              }}
              onShouldStartLoadWithRequest={handleEsewaUrlIntercept}
              onMessage={(event) => {
                console.log('WebView message:', event.nativeEvent.data);
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              cacheEnabled={false}
              incognito={false}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color="#60BB46" />
                  <Text style={styles.webViewLoadingText}>Loading eSewa...</Text>
                </View>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  seatCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  seatCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 24,
  },
  seatLineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seatLineItemRowLast: {
    marginBottom: 0,
  },
  seatLineItemLeft: {
    flex: 1,
    paddingRight: 12,
  },
  seatDetails: {
    flex: 1,
    paddingRight: 12,
  },
  seatNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
    lineHeight: 22,
  },
  seatTypeText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  seatPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  pointContainer: {
    marginBottom: 16,
  },
  pointLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pointName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  pointTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtotalLabel: {
    fontSize: 15,
    color: '#374151',
  },
  subtotalValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  paymentMethodCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  paymentMethodNameSelected: {
    color: '#4F46E5',
  },
  paymentMethodAmount: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodAmountSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  couponContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  applyButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // ... Keep existing WebView and Debug styles ...
  webViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#60BB46',
    paddingTop: 50,
  },
  webViewCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  webViewLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#60BB46',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    padding: 20,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  debugBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debugOverlay: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    zIndex: 9999,
    elevation: 100,
  },
  debugCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  debugLabel: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  debugScroll: {
    maxHeight: 200,
  },
  debugCloseBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  debugCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PaymentScreen;
