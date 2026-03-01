import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import {
  getInvitation,
  acceptInvitation,
  declineInvitation,
  type AcceptResult,
} from '../../src/services/inviteService';
import type { InvitationLocal } from '../../src/services/storageCache';
import { ROLE_INFO } from '../../src/utils/permissions';

type ScreenState = 'loading' | 'preview' | 'accepting' | 'accepted' | 'declined' | 'error';

export default function JoinTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [state, setState] = useState<ScreenState>('loading');
  const [invitation, setInvitation] = useState<InvitationLocal | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptResult, setAcceptResult] = useState<AcceptResult | null>(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadInvitation();
  }, [code]);

  useEffect(() => {
    if (state !== 'loading') {
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

  const loadInvitation = async () => {
    if (!code) {
      setState('error');
      setErrorMessage('No invite code provided');
      return;
    }

    try {
      const inv = await getInvitation(code);
      if (!inv) {
        setState('error');
        setErrorMessage('Invitation not found. It may have been deleted.');
        return;
      }

      if (inv.status === 'accepted') {
        setState('error');
        setErrorMessage('This invitation has already been accepted.');
        return;
      }

      if (inv.status === 'declined') {
        setState('error');
        setErrorMessage('This invitation was declined.');
        return;
      }

      if (inv.status === 'expired' || new Date(inv.expiresAt) < new Date()) {
        setState('error');
        setErrorMessage('This invitation has expired. Ask the organizer for a new one.');
        return;
      }

      setInvitation(inv);
      setState('preview');
    } catch {
      setState('error');
      setErrorMessage('Could not load invitation. Please try again.');
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('accepting');

    try {
      const result = await acceptInvitation(invitation.inviteCode);
      setAcceptResult(result);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setState('accepted');
      } else {
        setState('error');
        setErrorMessage(result.error || 'Could not join trip');
      }
    } catch {
      setState('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'web') {
      if (!window.confirm('Decline this invitation?')) return;
    }

    await declineInvitation(invitation.inviteCode);
    setState('declined');
  };

  const handleGoToTrip = () => {
    if (acceptResult?.tripId) {
      router.replace({
        pathname: '/trip/[id]',
        params: {
          id: acceptResult.tripId,
          destination: acceptResult.destination || '',
          tripName: acceptResult.tripName || '',
        },
      });
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'TBD';
    try {
      const d = new Date(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return 'TBD';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoHome} hitSlop={20}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {state === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      )}

      {state === 'preview' && invitation && (
        <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          {/* Invitation card */}
          <View style={styles.inviteCard}>
            <Text style={styles.inviteEmoji}>🏝️</Text>
            <Text style={styles.inviteHeading}>You're invited!</Text>

            <View style={styles.tripInfo}>
              <Text style={styles.tripName}>{invitation.tripName}</Text>
              <View style={styles.tripDetail}>
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.tripDetailText}>{invitation.destination}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="shield-outline" size={18} color={Colors.accent} />
                <Text style={styles.metaLabel}>Your role</Text>
                <Text style={styles.metaValue}>
                  {ROLE_INFO[invitation.role].emoji} {ROLE_INFO[invitation.role].label}
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={18} color={Colors.accent} />
                <Text style={styles.metaLabel}>Expires</Text>
                <Text style={styles.metaValue}>{formatDate(invitation.expiresAt)}</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <Pressable onPress={handleAccept} style={styles.acceptButton}>
            <LinearGradient
              colors={[Colors.sage, Colors.sageDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptGradient}
            >
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={styles.acceptText}>Join Trip</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleDecline} style={styles.declineButton}>
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>

          <Text style={styles.inviteCode}>
            Invite code: {invitation.inviteCode.toUpperCase()}
          </Text>
        </Animated.View>
      )}

      {state === 'accepting' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.sage} />
          <Text style={styles.loadingText}>Joining trip...</Text>
        </View>
      )}

      {state === 'accepted' && (
        <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>You're in!</Text>
            <Text style={styles.successSubtitle}>
              Welcome to "{acceptResult?.tripName}"
            </Text>
          </View>

          <Pressable onPress={handleGoToTrip} style={styles.acceptButton}>
            <LinearGradient
              colors={[Colors.sage, Colors.sageDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptGradient}
            >
              <Ionicons name="airplane" size={22} color={Colors.white} />
              <Text style={styles.acceptText}>View Trip</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {state === 'declined' && (
        <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>👋</Text>
            <Text style={styles.successTitle}>Invitation declined</Text>
            <Text style={styles.successSubtitle}>
              No worries! You can always join later if the invite is still valid.
            </Text>
          </View>

          <Pressable onPress={handleGoHome} style={styles.declineButton}>
            <Text style={styles.declineText}>Go Home</Text>
          </Pressable>
        </Animated.View>
      )}

      {state === 'error' && (
        <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.errorCard}>
            <Text style={styles.successEmoji}>😕</Text>
            <Text style={styles.errorTitle}>Oops</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>

          <Pressable onPress={handleGoHome} style={styles.acceptButton}>
            <LinearGradient
              colors={[Colors.sage, Colors.sageDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptGradient}
            >
              <Ionicons name="home" size={20} color={Colors.white} />
              <Text style={styles.acceptText}>Go Home</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  content: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  // Invite card
  inviteCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.cardHover,
    marginBottom: Spacing.xl,
  },
  inviteEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  inviteHeading: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  tripInfo: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  tripName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    textAlign: 'center',
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripDetailText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    width: '100%',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  metaLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  metaValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  // Buttons
  acceptButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
  },
  acceptText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  declineButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  declineText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  inviteCode: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    letterSpacing: 1,
  },
  // Success
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.cardHover,
    marginBottom: Spacing.xl,
  },
  successEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Error
  errorCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.cardHover,
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
