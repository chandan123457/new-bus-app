/**
 * Landing/Splash Screen Component
 * 
 * This is the first screen users see when opening the app.
 * Features a premium full-screen background with centered logo in circular container.
 * 
 * Design Principles:
 * - Minimal and clean interface
 * - Premium brand presentation
 * - Responsive across all device sizes
 * - Proper safe area handling for notched devices
 * 
 * @component
 * @example
 * <LandingScreen navigation={navigation} />
 */

import React, { useEffect } from 'react';
import {
  View,
  ImageBackground,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

/**
 * Landing Screen Component
 * Displays full-screen branded splash screen with logo
 * 
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation object
 */
const LandingScreen = ({ navigation }) => {
  /**
   * Auto-navigation to SignIn after splash delay
   */
  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token && isActive) {
          navigation.replace('Home');
          return;
        }
      } catch (err) {
        console.warn('Auth bootstrap failed, falling back to SignIn:', err?.message);
      }

      if (isActive) {
        setTimeout(() => {
          if (isActive) navigation.replace('SignIn');
        }, 1200);
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
  }, [navigation]);

  return (
    <>
      {/* Status Bar Configuration */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Full-Screen Background with Image */}
      <ImageBackground
        source={require('../../assets/landing-background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark Overlay for Better Contrast */}
        <View style={styles.overlay} pointerEvents="none" />

        {/* Safe Area Container */}
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.container}>
            {/* Main Content - Logo Container */}
            <View style={styles.content}>
              {/* Circular White Container with Logo */}
              <View style={styles.logoCircle}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
};

/**
 * Styles
 * Production-grade styling with proper organization and naming
 */
const styles = StyleSheet.create({
  // Full-screen background image
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  
  // Dark overlay for contrast and premium look
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    zIndex: 1,
  },
  
  // Safe area wrapper
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  
  // Main container
  container: {
    flex: 1,
  },
  
  // Content container - centers logo
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  
  // White circular container for logo - ONLY this has white background
  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    
    // iOS shadow only - Android elevation causes square artifacts
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  // Logo image with explicit dimensions
  logo: {
    width: 120,
    height: 120,
  },
});

export default LandingScreen;
