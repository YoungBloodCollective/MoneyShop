import React from 'react';
import {View, ActivityIndicator} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';
import {useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold} from '@expo-google-fonts/inter';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import {colors} from './src/theme/designSystem';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand.primary,
    background: colors.dark[800],
    card: colors.dark[700],
    text: colors.light[100],
    border: colors.dark[400],
    notification: colors.brand.primary,
  },
};

const paperTheme = {
  ...MD3LightTheme,
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: 'Inter_400Regular' },
    bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: 'Inter_400Regular' },
    bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: 'Inter_400Regular' },
    labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: 'Inter_600SemiBold' },
    labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: 'Inter_500Medium' },
    labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: 'Inter_500Medium' },
    titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: 'Inter_700Bold' },
    titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: 'Inter_600SemiBold' },
    titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: 'Inter_600SemiBold' },
    headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: 'Inter_700Bold' },
    headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: 'Inter_700Bold' },
    headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: 'Inter_600SemiBold' },
    displayLarge: { ...MD3LightTheme.fonts.displayLarge, fontFamily: 'Inter_800ExtraBold' },
    displayMedium: { ...MD3LightTheme.fonts.displayMedium, fontFamily: 'Inter_700Bold' },
    displaySmall: { ...MD3LightTheme.fonts.displaySmall, fontFamily: 'Inter_600SemiBold' },
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand.primary,
    primaryContainer: colors.info[50],
    secondary: colors.brand.secondary,
    secondaryContainer: 'rgba(107, 107, 247, 0.08)',
    surface: colors.dark[700],
    surfaceVariant: colors.dark[600],
    background: colors.dark[800],
    error: colors.error[500],
    onPrimary: '#FFFFFF',
    onSurface: colors.light[100],
    onSurfaceVariant: colors.light[70],
    onBackground: colors.light[100],
    outline: colors.dark[400],
    elevation: {
      level0: 'transparent',
      level1: colors.dark[700],
      level2: colors.dark[600],
      level3: colors.dark[500],
      level4: colors.dark[500],
      level5: colors.dark[400],
    },
  },
};

const App = () => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.dark[800]}}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <NavigationContainer theme={navigationTheme}>
            <AppNavigator />
          </NavigationContainer>
        </PaperProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
