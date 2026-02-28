import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const USER_NAME_KEY = '@trailmate_user_name';
const ONBOARDING_KEY = '@trailmate_onboarded';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  const handleResetOnboarding = async () => {
    await AsyncStorage.multiRemove([ONBOARDING_KEY, USER_NAME_KEY]);
    router.replace('/onboarding/welcome');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(userName || 'T').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{userName || 'Traveler'}</Text>
        <Text style={styles.memberSince}>Member since 2026</Text>
      </View>

      <View style={styles.statsRow}>
        {[
          { value: '3', label: 'Trips' },
          { value: '12', label: 'Countries' },
          { value: '7', label: 'Friends' },
        ].map((stat, i) => (
          <View key={i} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={styles.resetButton}
        onPress={handleResetOnboarding}
      >
        <Text style={styles.resetText}>Reset Onboarding</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    alignItems: 'center',
    ...BorderRadius.card,
    ...Shadows.card,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.white,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  memberSince: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
    marginBottom: Spacing.xl,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
