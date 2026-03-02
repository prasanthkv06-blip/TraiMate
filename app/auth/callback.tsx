import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts, FontSizes } from '../../src/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();

  useEffect(() => {
    async function handleCallback() {
      try {
        let accessToken = params.access_token;
        let refreshToken = params.refresh_token;

        // On web, tokens may be in the URL hash fragment
        if (!accessToken && Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          accessToken = hashParams.get('access_token') ?? undefined;
          refreshToken = hashParams.get('refresh_token') ?? undefined;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.warn('OAuth callback error:', error.message);
            router.replace('/auth');
            return;
          }

          router.replace('/');
          return;
        }

        // Supabase may auto-detect tokens on web — check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/');
          return;
        }

        // No tokens and no session — redirect back to auth
        router.replace('/auth');
      } catch (e) {
        console.warn('OAuth callback error:', e);
        router.replace('/auth');
      }
    }

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
