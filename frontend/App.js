/**
 * App Entry Point
 * Root component that initializes the application
 * Sets up providers and global configurations
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * Main App Component
 * Wraps the application with necessary providers
 */
export default function App() {
  return (
    <SafeAreaProvider>
      {/* Configure status bar globally */}
      <StatusBar style="light" />
      
      {/* Main navigation */}
      <AppNavigator />
    </SafeAreaProvider>
  );
}
