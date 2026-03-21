import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MobileLoginScreen from '../screens/Auth/MobileLoginScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import OtpLoginScreen from '../screens/Auth/OtpLoginScreen';

export type GuestStackParamList = {
  MobileLogin: undefined;
  ForgotPassword: undefined;
  OtpLogin: undefined;
};

const Stack = createNativeStackNavigator<GuestStackParamList>();

/**
 * GuestNavigator - Navigator for unauthenticated users
 *
 * MobileLoginScreen has the full login form + register→browser button.
 * ForgotPassword and OtpLogin are accessible from the login screen.
 */
const GuestNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MobileLogin"
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="MobileLogin" component={MobileLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
    </Stack.Navigator>
  );
};

export default GuestNavigator;
