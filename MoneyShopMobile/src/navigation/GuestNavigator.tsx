import React, {useState, useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MobileLoginScreen from '../screens/Auth/MobileLoginScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import OtpLoginScreen from '../screens/Auth/OtpLoginScreen';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';

export type GuestStackParamList = {
  Welcome: undefined;
  MobileLogin: undefined;
  ForgotPassword: undefined;
  OtpLogin: undefined;
};

const Stack = createNativeStackNavigator<GuestStackParamList>();

const ONBOARDING_KEY = '@moneyshop:onboarding_completed';

const GuestNavigator = () => {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(value => {
      setShowOnboarding(value !== 'true');
    });
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding === null) return null;

  if (showOnboarding) {
    return <WelcomeScreen onComplete={handleOnboardingComplete} />;
  }

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
