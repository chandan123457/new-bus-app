/**
 * App Navigator
 * Main navigation configuration for the application
 * Handles screen transitions and navigation stack
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '../screens/LandingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TabNavigator from './TabNavigator';
import BusSearchResultsScreen from '../screens/BusSearchResultsScreen';
import SeatSelectionScreen from '../screens/SeatSelectionScreen';
import SeatSelectionDuplicate from '../screens/SeatSelectionDuplicate';
import PassengerInformation from '../screens/PassengerInformation';
import PaymentScreen from '../screens/PaymentScreen';
import BoardingPointsScreen from '../screens/BoardingPointsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

/**
 * App Navigator Component
 * Configures the navigation structure and screen options
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false,
        }}
      >
        {/* Landing/Splash Screen */}
        <Stack.Screen 
          name="Landing" 
          component={LandingScreen}
          options={{
            animation: 'none',
          }}
        />
        
        {/* Sign In Screen */}
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Sign Up Screen */}
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Forgot Password Screen */}
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Main Tab Navigator (Home, Bookings, Offers, Profile) */}
        <Stack.Screen 
          name="Home" 
          component={TabNavigator}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Bus Search Results Screen */}
        <Stack.Screen 
          name="BusSearchResults" 
          component={BusSearchResultsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Seat Selection Screen */}
        <Stack.Screen 
          name="SeatSelection" 
          component={SeatSelectionScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Seat Selection Duplicate Screen (with Lower/Upper selector) */}
        <Stack.Screen 
          name="SeatSelectionDuplicate" 
          component={SeatSelectionDuplicate}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Boarding Points Selection Screen */}
        <Stack.Screen 
          name="BoardingPoints" 
          component={BoardingPointsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Passenger Information Screen */}
        <Stack.Screen 
          name="PassengerInformation" 
          component={PassengerInformation}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Payment Screen */}
        <Stack.Screen 
          name="Payment" 
          component={PaymentScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Notifications Screen */}
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
