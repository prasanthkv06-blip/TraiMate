import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { syncAllBookingReminders } from '../src/services/bookingReminders';
import { ConnectivityProvider } from '../src/contexts/ConnectivityContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          PlayfairDisplay_500Medium,
          PlayfairDisplay_700Bold,
          PlayfairDisplay_700Bold_Italic,
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        });
      } catch (e) {
        console.warn('Font loading error:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
      syncAllBookingReminders();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <ConnectivityProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="auth"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="create-trip"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="explore"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="trip"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </AuthProvider>
    </ConnectivityProvider>
  );
}
