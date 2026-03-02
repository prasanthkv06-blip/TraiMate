import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts, FontSizes } from '../../src/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();

  useEffect(() => {
    async function handleCallback() {
      try {
        const { access_token, refresh_token } = params;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.warn('OAuth callback error:', error.message);
            router.replace('/auth');
            return;
          }

          // Session set successfully — the auth state listener in AuthContext
          // will handle the navigation via the root index
          router.replace('/');
          return;
        }

        // No tokens — redirect back to auth
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
