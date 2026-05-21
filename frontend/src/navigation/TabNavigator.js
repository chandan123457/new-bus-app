import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';

import HomeScreen from '../screens/HomeScreen';
import BookingsScreen from '../screens/BookingsScreen';
import OffersScreen from '../screens/OffersScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Icons
const HomeIconNav = ({ active = false }) => (
  <Svg width="26" height="26" viewBox="0 0 24 24">
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}/>
  </Svg>
);

const BookingsIconNav = ({ active = false }) => (
  <Svg width="26" height="26" viewBox="0 0 24 24">
    <Path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" fill={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}/>
  </Svg>
);

const OffersIconNav = ({ active = false }) => (
  <Svg width="26" height="26" viewBox="0 0 24 24">
    <Path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}/>
  </Svg>
);

const ProfileIconNav = ({ active = false }) => (
  <Svg width="26" height="26" viewBox="0 0 24 24">
    <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}/>
  </Svg>
);

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.bottomNav}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let IconComponent;
        if (route.name === 'Home') IconComponent = HomeIconNav;
        else if (route.name === 'Bookings') IconComponent = BookingsIconNav;
        else if (route.name === 'Offers') IconComponent = OffersIconNav;
        else if (route.name === 'Profile') IconComponent = ProfileIconNav;

        return (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <IconComponent active={isFocused} />
            <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Offers" component={OffersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#2C5F6F',
    paddingTop: 10,
    paddingBottom: 20,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '400',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default TabNavigator;
