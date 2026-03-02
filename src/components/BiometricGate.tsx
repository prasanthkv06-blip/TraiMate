import { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../constants/theme';
import { useBiometric } from '../contexts/BiometricContext';

export function BiometricGate() {
  const { isLocked, unlock } = useBiometric();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock TraiMate',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        unlock();
      } else {
        setError(
          result.error === 'user_cancel'
            ? 'Authentication cancelled'
            : 'Authentication failed. Tap to try again.',
        );

        // Clear error after a short delay
        setTimeout(() => setError(null), 3000);
      }
    } catch (e) {
      setError('An unexpected error occurred. Tap to try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, unlock]);

  return (
    <Modal
      visible={isLocked}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* App branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="trail-sign" size={36} color={Colors.white} />
          </View>
          <Text style={styles.appName}>TraiMate</Text>
        </View>

        {/* Lock prompt */}
        <View style={styles.promptContainer}>
          <Text style={styles.title}>Unlock TraiMate</Text>
          <Text style={styles.subtitle}>Tap to authenticate</Text>
        </View>

        {/* Lock button */}
        <Pressable
          style={({ pressed }) => [
            styles.lockButton,
            pressed && styles.lockButtonPressed,
          ]}
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
          accessibilityLabel="Authenticate with biometrics"
          accessibilityRole="button"
        >
          <Ionicons
            name={isAuthenticating ? 'hourglass-outline' : 'lock-closed'}
            size={32}
            color={Colors.white}
          />
        </Pressable>

        {/* Error message */}
        {error !== null && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  promptContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  lockButton: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  lockButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.white,
    textAlign: 'center',
  },
});
