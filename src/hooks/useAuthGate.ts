import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for gating features behind authentication.
 * Guest users see an alert prompting them to sign in.
 * Authenticated users proceed directly.
 */
export function useAuthGate() {
  const { session, isGuest } = useAuth();
  const router = useRouter();

  const requireAuth = useCallback(
    (featureName: string, onSuccess: () => void) => {
      if (session?.user) {
        onSuccess();
        return;
      }

      if (isGuest) {
        Alert.alert(
          'Sign in required',
          `Create an account to use ${featureName}. Your data will be preserved.`,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Sign in',
              onPress: () => router.push('/auth'),
            },
          ],
        );
        return;
      }

      // Not authenticated and not guest — redirect to auth
      router.push('/auth');
    },
    [session, isGuest, router],
  );

  return { requireAuth, isAuthenticated: !!session?.user, isGuest };
}
