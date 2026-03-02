import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors } from '../src/constants/theme';

const ONBOARDING_KEY = '@traimate_onboarded';

export default function Index() {
  const { session, isLoading: authLoading, isGuest } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasOnboarded(value === 'true');
      } catch {
        setHasOnboarded(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkOnboarding();
  }, []);

  if (isLoading || authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  // Authenticated + onboarded → home
  if (session && hasOnboarded) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Authenticated but not onboarded (new OAuth user) → name screen
  if (session && !hasOnboarded) {
    return <Redirect href="/onboarding/name" />;
  }

  // Guest mode + onboarded → home
  if (!session && isGuest && hasOnboarded) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Not authenticated and not guest → auth screen
  return <Redirect href="/auth" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
