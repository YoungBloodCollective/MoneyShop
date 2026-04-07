import React from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';
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
