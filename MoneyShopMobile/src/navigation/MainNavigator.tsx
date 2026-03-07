import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ApplicationListScreen from '../screens/Dashboard/ApplicationListScreen';
import SimulatorScreen from '../screens/Simulator/SimulatorScreen';
import SimulatorFormScreen from '../screens/Simulator/SimulatorFormScreen';
import SimulatorResultScreen from '../screens/Simulator/SimulatorResultScreen';
import ApplicationWizardScreen from '../screens/Application/ApplicationWizardScreen';
import ApplicationSuccessScreen from '../screens/Application/ApplicationSuccessScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import LegalMenuScreen from '../screens/Legal/LegalMenuScreen';
import TermsScreen from '../screens/Legal/TermsScreen';
import PrivacyScreen from '../screens/Legal/PrivacyScreen';
import MandateScreen from '../screens/Legal/MandateScreen';
import ComplianceScreen from '../screens/Legal/ComplianceScreen';
import DataTransferScreen from '../screens/Legal/DataTransferScreen';
import ConsentManagementScreen from '../screens/Consent/ConsentManagementScreen';
import MandateManagementScreen from '../screens/Mandate/MandateManagementScreen';
import BrokerDirectoryScreen from '../screens/Broker/BrokerDirectoryScreen';
import FinancialDataScreen from '../screens/Profile/FinancialDataScreen';
import KycFormScreen from '../screens/Kyc/KycFormScreen';
import KycAdminScreen from '../screens/Kyc/KycAdminScreen';
import VerificationScreen from '../screens/Auth/VerificationScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import CustomHeader from '../components/CustomHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors} from '../theme/designSystem';
import type {ScoringResult} from '../types/application.types';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  ApplicationList: undefined;
  ApplicationWizard: undefined;
  ApplicationSuccess: undefined;
  Verification: {type: 'email' | 'phone'; email?: string; phone?: string; onComplete?: string};
  KycForm: undefined;
  KycAdmin: undefined;
};

export type SimulatorStackParamList = {
  SimulatorHome: undefined;
  SimulatorForm: undefined;
  SimulatorResult: { result: ScoringResult };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  LegalMenu: undefined;
  Terms: undefined;
  Privacy: undefined;
  Mandate: undefined;
  Compliance: undefined;
  DataTransfer: undefined;
  ConsentManagement: undefined;
  MandateManagement: undefined;
  BrokerDirectory: undefined;
  FinancialData: undefined;
  KycForm: undefined;
  KycAdmin: undefined;
};

export type ChatStackParamList = {
  ChatHome: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Simulator: undefined;
  Profile: undefined;
  Chat: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const DashStack = createNativeStackNavigator<DashboardStackParamList>();
const SimStack = createNativeStackNavigator<SimulatorStackParamList>();
const ProfStack = createNativeStackNavigator<ProfileStackParamList>();
const ChatStackNav = createNativeStackNavigator<ChatStackParamList>();

const DashboardStack = () => {
  const getTitle = (routeName: string) => {
    const titles: {[key: string]: string} = {
      ApplicationList: 'Cererile mele',
      ApplicationWizard: 'Cerere nouă',
      Verification: 'Verificare',
      KycForm: 'Verificare KYC',
      KycAdmin: 'Verificări KYC',
    };
    return titles[routeName];
  };

  return (
    <DashStack.Navigator
      screenOptions={{
        header: ({navigation, route}) => (
          <CustomHeader
            title={route.name === 'DashboardHome' ? undefined : getTitle(route.name)}
            onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
            showLogo={route.name === 'DashboardHome'}
          />
        ),
      }}>
      <DashStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{headerShown: true}}
      />
      <DashStack.Screen
        name="ApplicationList"
        component={ApplicationListScreen}
      />
      <DashStack.Screen
        name="ApplicationWizard"
        component={ApplicationWizardScreen}
      />
      <DashStack.Screen
        name="ApplicationSuccess"
        component={ApplicationSuccessScreen}
        options={{headerShown: false}}
      />
      <DashStack.Screen
        name="Verification"
        component={VerificationScreen as any}
        options={{headerShown: false}}
      />
      <DashStack.Screen
        name="KycForm"
        component={KycFormScreen}
      />
      <DashStack.Screen
        name="KycAdmin"
        component={KycAdminScreen}
      />
    </DashStack.Navigator>
  );
};

const SimulatorStack = () => {
  const getTitle = (routeName: string) => {
    const titles: {[key: string]: string} = {
      SimulatorForm: 'Simulator Credit',
      SimulatorResult: 'Rezultat Simulator',
    };
    return titles[routeName];
  };

  return (
    <SimStack.Navigator
      screenOptions={{
        header: ({navigation, route}) => (
          <CustomHeader
            title={route.name === 'SimulatorHome' ? undefined : getTitle(route.name)}
            onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
            showLogo={route.name === 'SimulatorHome'}
          />
        ),
      }}>
      <SimStack.Screen
        name="SimulatorHome"
        component={SimulatorScreen}
        options={{headerShown: true}}
      />
      <SimStack.Screen
        name="SimulatorForm"
        component={SimulatorFormScreen}
      />
      <SimStack.Screen
        name="SimulatorResult"
        component={SimulatorResultScreen as any}
      />
    </SimStack.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Simulator') {
            iconName = focused ? 'calculator' : 'calculator-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'robot' : 'robot-outline';
          } else {
            iconName = 'help-circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.light[50],
        headerShown: false,
        tabBarStyle: {
          display: 'flex',
          backgroundColor: colors.dark[800],
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.06)',
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.3,
          shadowRadius: 12,
          height: 72,
          paddingBottom: 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{title: 'Dashboard'}}
      />
      <Tab.Screen
        name="Simulator"
        component={SimulatorStack}
        options={{title: 'Simulator'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{title: 'Profil'}}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{title: 'Chat'}}
      />
    </Tab.Navigator>
  );
};

const ChatStack = () => {
  return (
    <ChatStackNav.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <ChatStackNav.Screen
        name="ChatHome"
        component={ChatScreen}
      />
    </ChatStackNav.Navigator>
  );
};

const ProfileStack = () => {
  const getTitle = (routeName: string) => {
    const titles: {[key: string]: string} = {
      LegalMenu: 'Informații Legale',
      Terms: 'Termeni și Condiții',
      Privacy: 'Politica de Confidențialitate',
      Mandate: 'Politica de Mandatare',
      Compliance: 'Pachet de Conformitate',
      DataTransfer: 'Politica de Transmitere Date',
      ConsentManagement: 'Gestionare Consimțământ',
      MandateManagement: 'Gestionare Mandate',
      BrokerDirectory: 'Director Brokeri',
      FinancialData: 'Date Financiare',
      KycForm: 'Verificare Identitate',
      KycAdmin: 'Verificări KYC',
    };
    return titles[routeName];
  };

  return (
    <ProfStack.Navigator
      screenOptions={{
        header: ({navigation, route}) => (
          <CustomHeader
            title={route.name === 'ProfileHome' ? undefined : getTitle(route.name)}
            onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
            showLogo={route.name === 'ProfileHome'}
          />
        ),
      }}>
      <ProfStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{headerShown: true}}
      />
      <ProfStack.Screen
        name="LegalMenu"
        component={LegalMenuScreen}
      />
      <ProfStack.Screen
        name="Terms"
        component={TermsScreen}
      />
      <ProfStack.Screen
        name="Privacy"
        component={PrivacyScreen}
      />
      <ProfStack.Screen
        name="Mandate"
        component={MandateScreen}
      />
      <ProfStack.Screen
        name="Compliance"
        component={ComplianceScreen}
      />
      <ProfStack.Screen
        name="DataTransfer"
        component={DataTransferScreen}
      />
      <ProfStack.Screen
        name="ConsentManagement"
        component={ConsentManagementScreen}
      />
      <ProfStack.Screen
        name="MandateManagement"
        component={MandateManagementScreen}
      />
      <ProfStack.Screen
        name="BrokerDirectory"
        component={BrokerDirectoryScreen}
      />
      <ProfStack.Screen
        name="FinancialData"
        component={FinancialDataScreen}
        options={{headerShown: false}}
      />
      <ProfStack.Screen
        name="KycForm"
        component={KycFormScreen}
      />
      <ProfStack.Screen
        name="KycAdmin"
        component={KycAdminScreen}
      />
    </ProfStack.Navigator>
  );
};

export default MainNavigator;
