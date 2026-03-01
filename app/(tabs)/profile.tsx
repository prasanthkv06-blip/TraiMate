import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';
import { fetchTrips } from '../../src/services/tripService';

const USER_NAME_KEY = '@traimate_user_name';
const ONBOARDING_KEY = '@traimate_onboarded';
const AVATAR_EMOJI_KEY = '@traimate_avatar_emoji';

const AVATAR_EMOJIS = [
  '✈️', '🌍', '🏔️', '🌊', '🏖️', '🗺️', '🧳', '🚀',
  '🌴', '🏕️', '⛩️', '🗼', '🎒', '🧭', '⛵', '🚂',
  '🌸', '🦋', '🌙', '⭐', '🔥', '🌈', '💎', '🎯',
  '🐻', '🦊', '🐢', '🦜', '🐬', '🦁', '🐼', '🦄',
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [realTripCount, setRealTripCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const entries = await fetchTrips();
      setRealTripCount(entries.length);
    } catch {}
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((name) => {
      if (name) setUserName(name);
    });
    AsyncStorage.getItem(AVATAR_EMOJI_KEY).then((emoji) => {
      if (emoji) setAvatarEmoji(emoji);
    });
    loadStats();
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleOpenPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmoji(avatarEmoji);
    setShowEmojiPicker(true);
  };

  const handleSaveEmoji = async () => {
    if (selectedEmoji) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem(AVATAR_EMOJI_KEY, selectedEmoji);
      setAvatarEmoji(selectedEmoji);
    }
    setShowEmojiPicker(false);
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.multiRemove([ONBOARDING_KEY, USER_NAME_KEY]);
    router.replace('/onboarding/welcome');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Pressable onPress={handleOpenPicker} style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            {avatarEmoji ? (
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
            ) : (
              <Text style={styles.avatarText}>
                {(userName || 'T').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="create-outline" size={12} color={Colors.white} />
          </View>
        </Pressable>
        <Text style={styles.name}>{userName || 'Traveler'}</Text>
        <Text style={styles.memberSince}>Member since {new Date().getFullYear()}</Text>
      </View>

      {/* Emoji avatar picker modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEmojiPicker(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pick your vibe</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {AVATAR_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedEmoji(emoji);
                    }}
                    style={[
                      styles.emojiCell,
                      selectedEmoji === emoji && styles.emojiCellSelected,
                    ]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable onPress={handleSaveEmoji} style={styles.saveButton}>
              <LinearGradient
                colors={['#5E8A5A', '#3D6B39']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.statsRow}>
        {[
          { value: String(realTripCount + SAMPLE_TRIPS.length), label: 'Trips', icon: 'compass-outline' },
          { value: String(new Set(SAMPLE_TRIPS.map(t => t.destination.split(',').pop()?.trim())).size), label: 'Countries', icon: 'globe-outline' },
          { value: String(SAMPLE_TRIPS.reduce((sum, t) => sum + (t.memberCount - 1), 0)), label: 'Friends', icon: 'people-outline' },
        ].map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Ionicons name={stat.icon as any} size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={styles.resetButton}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleResetOnboarding(); }}
        accessibilityRole="button"
        accessibilityLabel="Reset onboarding"
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
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  avatarText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.white,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
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
  // Emoji picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 32, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emojiCell: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  emojiCellSelected: {
    backgroundColor: `${Colors.accent}20`,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  emojiText: {
    fontSize: 28,
  },
  saveButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
