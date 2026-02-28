import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

// Helper: compute trip duration from ISO date strings
function getTripDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 1;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string; startDate?: string; endDate?: string }>();

  const TOTAL_DAYS = getTripDays(params.startDate, params.endDate);

  const [selectedDay, setSelectedDay] = useState(1);
  const [draftText, setDraftText] = useState('');
  const [savedEntries, setSavedEntries] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;
  const cardScale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate on day switch
  const animateDaySwitch = () => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(12);
    cardScale.setValue(0.97);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDaySelect = (day: number) => {
    if (day === selectedDay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(day);
    setDraftText('');
    animateDaySwitch();
  };

  const handleSave = () => {
    if (!draftText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedEntries((prev) => ({ ...prev, [selectedDay]: draftText.trim() }));
    setDraftText('');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        setPhotos(prev => [...prev, photo.uri]);
        setShowCamera(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleOpenCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleRemovePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'Voice-to-text will be available in a future update');
  };

  const stats = { activities: 0, expenses: 0, spent: 0 };
  const hasSavedEntry = !!savedEntries[selectedDay];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Trip Journal</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelector}
      >
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((day) => {
          const isActive = day === selectedDay;
          const hasEntry = !!savedEntries[day];
          return (
            <Pressable
              key={day}
              onPress={() => handleDaySelect(day)}
              style={[
                styles.dayPill,
                isActive && styles.dayPillActive,
              ]}
            >
              <Text
                style={[
                  styles.dayPillText,
                  isActive && styles.dayPillTextActive,
                ]}
              >
                Day {day}
              </Text>
              {hasEntry && !isActive && (
                <View style={styles.dayDot} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [
              { translateY: contentTranslateY },
              { scale: cardScale },
            ],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Journal Card */}
          <View style={styles.journalCardOuter}>
            <LinearGradient
              colors={['rgba(176, 122, 80, 0.06)', 'rgba(94, 138, 90, 0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.journalCardGradient}
            >
              <View style={styles.journalCardHeader}>
                <Text style={styles.journalCardHeading}>
                  {'\u{1F4DD}'} Day {selectedDay} Journal
                </Text>
                <Text style={styles.journalCardDate}>
                  {new Date(2026, 1, 27 + selectedDay).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.journalInput}
                  multiline
                  placeholder="What made today special?"
                  placeholderTextColor={Colors.textMuted}
                  value={draftText}
                  onChangeText={setDraftText}
                  textAlignVertical="top"
                />
              </View>

              {/* Media Buttons */}
              <View style={styles.mediaRow}>
                <Pressable onPress={handleOpenCamera} style={styles.mediaButton}>
                  <Ionicons name="camera-outline" size={20} color={Colors.accent} />
                  <Text style={styles.mediaButtonText}>Add Photo</Text>
                </Pressable>
                <Pressable onPress={handleVoiceNote} style={styles.mediaButton}>
                  <Ionicons name="mic-outline" size={20} color={Colors.accent} />
                  <Text style={styles.mediaButtonText}>Voice Note</Text>
                </Pressable>
              </View>

              {/* Photo Grid */}
              {photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {photos.map((uri, index) => (
                    <View key={index} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoImage} />
                      <Pressable onPress={() => handleRemovePhoto(index)} style={styles.photoRemove}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButtonOuter,
                  !draftText.trim() && styles.saveButtonDisabled,
                  pressed && draftText.trim() ? { opacity: 0.85 } : null,
                ]}
                disabled={!draftText.trim()}
              >
                <LinearGradient
                  colors={
                    draftText.trim()
                      ? [Colors.accent, Colors.accentDark]
                      : [Colors.border, Colors.border]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Text
                    style={[
                      styles.saveButtonText,
                      !draftText.trim() && styles.saveButtonTextDisabled,
                    ]}
                  >
                    Save Entry
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Saved Entry */}
              {hasSavedEntry && (
                <View style={styles.savedEntryContainer}>
                  <View style={styles.savedBadgeRow}>
                    <View style={styles.savedBadge}>
                      <Text style={styles.savedBadgeText}>Saved</Text>
                    </View>
                  </View>
                  <View style={styles.savedEntryCard}>
                    <View style={styles.savedEntryBorder} />
                    <Text style={styles.savedEntryText}>
                      {savedEntries[selectedDay]}
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Day Stats */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Day {selectedDay} Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>{'\u{1F3AF}'}</Text>
                <Text style={styles.statValue}>{stats.activities}</Text>
                <Text style={styles.statLabel}>activities</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>{'\u{1F4B3}'}</Text>
                <Text style={styles.statValue}>{stats.expenses}</Text>
                <Text style={styles.statLabel}>expenses</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>{'\u{1F4B0}'}</Text>
                <Text style={styles.statValue}>{stats.spent.toLocaleString()}</Text>
                <Text style={styles.statLabel}>spent</Text>
              </View>
            </View>
            <Text style={styles.statsSummary}>
              {stats.activities} activities {'\u00B7'} {stats.expenses} expenses {'\u00B7'} {stats.spent.toLocaleString()} spent
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
            <View style={styles.cameraOverlay}>
              <Pressable onPress={() => setShowCamera(false)} style={styles.cameraCloseBtn}>
                <Ionicons name="close" size={28} color="#FFF" />
              </Pressable>
              <View style={styles.cameraBottomBar}>
                <Pressable onPress={handleTakePhoto} style={styles.captureBtn}>
                  <View style={styles.captureBtnInner} />
                </Pressable>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backArrow: {
    fontSize: 24,
    color: Colors.text,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  // Day Selector
  daySelector: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: 10,
  },
  dayPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dayPillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  dayPillTextActive: {
    color: Colors.white,
  },
  dayDot: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.sage,
  },

  // Journal Card
  journalCardOuter: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  journalCardGradient: {
    padding: Spacing.xl,
    backgroundColor: Colors.white,
  },
  journalCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  journalCardHeading: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  journalCardDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  // Input
  inputWrapper: {
    backgroundColor: '#FBF8F4',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  journalInput: {
    minHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 24,
  },

  // Save Button
  saveButtonOuter: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  saveButtonTextDisabled: {
    color: Colors.textMuted,
  },

  // Saved Entry
  savedEntryContainer: {
    marginTop: Spacing.xl,
  },
  savedBadgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  savedBadge: {
    backgroundColor: 'rgba(94, 138, 90, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  savedBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  savedEntryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(176, 122, 80, 0.04)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  savedEntryBorder: {
    width: 3,
    backgroundColor: Colors.accentLight,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  savedEntryText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 24,
    padding: Spacing.md,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  statsTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  statsSummary: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },

  // Media Buttons
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  mediaButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },

  // Photo Grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  cameraCloseBtn: {
    alignSelf: 'flex-end',
    marginRight: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomBar: {
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF',
  },
});
