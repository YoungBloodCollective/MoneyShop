import React from 'react';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PaperProvider, MD3DarkTheme} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Revolut-inspired dark navigation theme
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#0075EB',
    background: '#111214',
    card: '#191C1F',
    text: '#FFFFFF',
    border: '#3A3D41',
    notification: '#0075EB',
  },
};

// Dark Paper theme
const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#0075EB',
    primaryContainer: 'rgba(0, 117, 235, 0.1)',
    secondary: '#7F84F6',
    secondaryContainer: 'rgba(127, 132, 246, 0.1)',
    surface: '#191C1F',
    surfaceVariant: '#1F2226',
    background: '#111214',
    error: '#EF4444',
    onPrimary: '#FFFFFF',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#B0B3B7',
    onBackground: '#FFFFFF',
    outline: '#3A3D41',
    elevation: {
      level0: 'transparent',
      level1: '#191C1F',
      level2: '#1F2226',
      level3: '#2A2D31',
      level4: '#2A2D31',
      level5: '#3A3D41',
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
