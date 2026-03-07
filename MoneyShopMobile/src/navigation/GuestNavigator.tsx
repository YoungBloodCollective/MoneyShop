import React from 'react';
import {Platform} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MobileLoginScreen from '../screens/Auth/MobileLoginScreen';
import LandingScreen from '../screens/Landing/LandingScreen';

export type GuestStackParamList = {
  MobileLogin: undefined;
  Landing: undefined;
};

const Stack = createNativeStackNavigator<GuestStackParamList>();

/**
 * GuestNavigator - Navigator for unauthenticated users
 *
 * On mobile: simple login screen that redirects to browser for auth.
 * On web: full landing page with calculator, features, etc.
 */
const GuestNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={Platform.OS === 'web' ? 'Landing' : 'MobileLogin'}
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="MobileLogin"
        component={MobileLoginScreen}
      />
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
      />
    </Stack.Navigator>
  );
};

export default GuestNavigator;
