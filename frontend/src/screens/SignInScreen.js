import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

const SignInScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastBackPressTime = useRef(0);
  const backPressTimer = useRef(null);
  const EXIT_DELAY = 1000; // 1 second window for double press

  // Handle double back press to exit immediately
  useEffect(() => {
    const backAction = () => {
      const currentTime = Date.now();
      if (lastBackPressTime.current !== 0 && currentTime - lastBackPressTime.current < EXIT_DELAY) {
        // Second back press within 1 second - exit immediately
        if (backPressTimer.current) {
          clearTimeout(backPressTimer.current);
        }
        lastBackPressTime.current = 0;
        BackHandler.exitApp();
        return true;
      } else {
        // First back press
        lastBackPressTime.current = currentTime;
        if (navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else {
          BackHandler.exitApp();
        }
        // Reset timer after delay
        if (backPressTimer.current) {
          clearTimeout(backPressTimer.current);
        }
        backPressTimer.current = setTimeout(() => {
          lastBackPressTime.current = 0;
        }, EXIT_DELAY);
        return true; // Prevent default behavior
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => {
      backHandler.remove();
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
    };
  }, [navigation]);

  // Prefill email if provided (e.g., after password reset)
  useEffect(() => {
    const prefill = route?.params?.prefillEmail;
    if (typeof prefill === 'string' && prefill.trim()) {
      setEmail(prefill.trim().toLowerCase());
    }
  }, [route?.params?.prefillEmail]);

  const validateForm = () => {
    // Reset error
    setError('');

    // Check if email is empty
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }

    // Check if password is empty
    if (!password) {
      setError('Password is required');
      return false;
    }

    return true;
  };

  const handleSignIn = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Set loading state
    setLoading(true);
    setError('');

    try {
      // Call API
      const result = await userAPI.signin({
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('Signin result:', result);

      if (result.success) {
        // Safely extract token and user data
        const token = result.data?.token;
        const user = result.data?.user;
        
        if (!token || !user) {
          console.error('Invalid response structure:', result.data);
          setError('Invalid server response. Please try again.');
          return;
        }
        
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        
        console.log('Sign in successful, stored token and user data');
        
        // Sign in successful - reset navigation so Home becomes the root
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // Show error message from API
        const errorMessage = result.error || 'Sign in failed. Please try again.';
        
        console.log('Signin failed:', errorMessage);
        
        // Provide helpful message for invalid credentials
        if (errorMessage.toLowerCase().includes('invalid credentials')) {
          setError('Invalid credentials. Please verify your email first before signing in. Check your email for the verification OTP sent during signup.');
        } else {
          setError(errorMessage);
          // Avoid noisy alerts for known server-down scenario; the inline error is enough.
          if (errorMessage !== 'Server is down. Please try again later.') {
            Alert.alert('Sign In Failed', errorMessage);
          }
        }
      }
    } catch (err) {
      // This should rarely happen since userAPI.signin doesn't throw
      console.error('Unexpected signin error:', err);
      const serverDownMessage = 'Server is down. Please try again later.';
      const rawMessage = (err?.message || '').toLowerCase();
      const isServerDown =
        !rawMessage ||
        rawMessage.includes('network') ||
        rawMessage.includes('failed to fetch') ||
        rawMessage.includes('timeout') ||
        rawMessage.includes('econnrefused') ||
        rawMessage.includes('enotfound') ||
        rawMessage.includes('cannot connect');

      const errorMessage = isServerDown ? serverDownMessage : `Unexpected error: ${err.message}`;
      setError(errorMessage);
      if (!isServerDown) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword', { email: email.trim().toLowerCase() });
  };

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      {/* Full-screen background with soft teal overlay */}
      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Soft teal overlay */}
        <View style={styles.overlay} />
        
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Floating Logo - positioned above form card */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Sign In Card - logo bottom half overlaps it with visible gap */}
              <View style={styles.signInCard}>
                {/* Title */}
                <Text style={styles.heading}>Sign in your account</Text>

                {/* Email Field */}
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ex: lakshaybkl@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Password Field */}
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <View style={styles.forgotRow}>
                  <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[styles.signInButton, (loading || !email.trim() || !password) && styles.signInButtonDisabled]}
                  onPress={handleSignIn}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.signInButtonText}>SIGN IN</Text>
                  )}
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
                    <Text style={styles.signUpLink}>SIGN UP</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
};

const LOGO_CIRCLE_SIZE = 90;
const CARD_BORDER_RADIUS = 24;
const INPUT_HEIGHT = 48;
const BUTTON_HEIGHT = 50;
const PRIMARY_BLUE = '#3B82F6';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  background: {
    flex: 1,
    width: width,
    height: height,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(43, 99, 110, 0.85)', // Soft teal overlay
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },

  // Floating Logo - positioned above form card
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: -(LOGO_CIRCLE_SIZE / 2) + 15, // Bottom half overlaps form card, with small visible gap
    zIndex: 10,
  },

  logoCircle: {
    width: LOGO_CIRCLE_SIZE,
    height: LOGO_CIRCLE_SIZE,
    borderRadius: LOGO_CIRCLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  logo: {
    width: LOGO_CIRCLE_SIZE * 0.6,
    height: LOGO_CIRCLE_SIZE * 0.6,
  },

  // Sign In Card (Second White Card) - SECOND CARD, logo bottom half overlaps it
  signInCard: {
    width: width * 0.9,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_BORDER_RADIUS,
    paddingTop: (LOGO_CIRCLE_SIZE / 2) + 20, // Space for logo bottom half overlap + visible gap
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginTop: 0, // Logo container marginBottom handles the overlap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 2,
  },

  // Title
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'left',
    marginBottom: 24,
  },

  // Input label
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'left',
  },

  // Input field - light gray background, rounded corners, borderless
  input: {
    height: INPUT_HEIGHT,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 16,
    borderWidth: 0,
  },

  // Sign In Button - full width, blue background, white bold text
  signInButton: {
    height: BUTTON_HEIGHT,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  dividerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },

  dividerText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '400',
  },

  // Footer - Sign Up Link
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  signUpText: {
    color: '#1F2937',
    fontSize: 14,
  },

  signUpLink: {
    color: PRIMARY_BLUE,
    fontSize: 14,
    fontWeight: '700',
  },

  // Error container
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EF5350',
  },

  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  signInButtonDisabled: {
    opacity: 0.6,
  },

  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },

  forgotText: {
    color: '#0EA5E9',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default SignInScreen;
