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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useTripContext, getCurrencySymbol } from '../../src/contexts/TripContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_COL_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.xl * 2 - 10) / 2;

// Mood definitions
const MOODS = [
  { key: 'amazing', label: 'Amazing', icon: 'happy-outline' as const, color: '#5E8A5A' },
  { key: 'good', label: 'Good', icon: 'thumbs-up-outline' as const, color: '#7BA677' },
  { key: 'okay', label: 'Okay', icon: 'remove-outline' as const, color: '#D4A574' },
  { key: 'tired', label: 'Tired', icon: 'sad-outline' as const, color: '#B07A50' },
  { key: 'rough', label: 'Rough', icon: 'thunderstorm-outline' as const, color: '#C75450' },
];

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

// Helper: get date for a specific trip day
function getDateForDay(startDate: string | undefined, day: number): string {
  if (!startDate) {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  try {
    const start = new Date(startDate);
    const date = new Date(start.getTime() + (day - 1) * 86400000);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string; startDate?: string; endDate?: string }>();
  const tripCtx = useTripContext();

  // Use dates from context if not passed as params
  const startDate = params.startDate || tripCtx.tripMeta.startDate;
  const endDate = params.endDate || tripCtx.tripMeta.endDate;
  const TOTAL_DAYS = getTripDays(startDate, endDate);
  const destination = params.destination || tripCtx.tripMeta.destination || 'My Trip';

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  // Read from context — these are the persisted values
  const savedEntries = tripCtx.journalEntries;
  const moodsByDay = tripCtx.journalMoods;
  const photos = tripCtx.journalPhotos[selectedDay] || [];
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;
  const cardScale = useRef(new Animated.Value(0.97)).current;
  const micPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulsing animation for mic button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Restore mood when switching days
  useEffect(() => {
    setSelectedMood(moodsByDay[selectedDay] || null);
  }, [selectedDay]);

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

  const handleMoodSelect = (moodKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMood = selectedMood === moodKey ? null : moodKey;
    setSelectedMood(newMood);
    tripCtx.setJournalMood(selectedDay, newMood);
  };

  const handleSave = () => {
    if (!draftText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    tripCtx.setJournalEntry(selectedDay, draftText.trim());
    setDraftText('');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        tripCtx.addJournalPhoto(selectedDay, photo.uri);
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
    tripCtx.removeJournalPhoto(selectedDay, index);
  };

  const handleVoiceNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Coming Soon', 'Voice-to-text will be available in a future update');
  };

  // Compute stats from context for current day
  const dayItinerary = tripCtx.itinerary.find(d => d.dayNumber === selectedDay);
  const dayExpenses = tripCtx.expenses.filter(e => {
    // Match expenses by date — if trip has startDate, compute which day an expense belongs to
    if (!startDate) return false;
    try {
      const tripStart = new Date(startDate);
      const expDate = new Date(e.date);
      const dayNum = Math.ceil((expDate.getTime() - tripStart.getTime()) / 86400000) + 1;
      return dayNum === selectedDay;
    } catch {
      return false;
    }
  });
  const stats = {
    activities: dayItinerary?.items.length || 0,
    expenses: dayExpenses.length,
    spent: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
  };
  const hasSavedEntry = !!savedEntries[selectedDay];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ===== GRADIENT HEADER ===== */}
      <LinearGradient
        colors={['#5E8A5A', '#3D6B39']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Top row: back button + title */}
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Travel Journal</Text>
            <Text style={styles.headerDestination}>{destination}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Date display */}
        <Text style={styles.headerDate}>
          {getDateForDay(startDate, selectedDay)}
        </Text>

        {/* Mood selector row */}
        <View style={styles.moodRow}>
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.key;
            return (
              <Pressable
                key={mood.key}
                onPress={() => handleMoodSelect(mood.key)}
                style={[
                  styles.moodButton,
                  isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              >
                <Ionicons
                  name={mood.icon}
                  size={22}
                  color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    isSelected && { color: '#FFFFFF', fontFamily: Fonts.bodySemiBold },
                  ]}
                >
                  {mood.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* ===== COMPACT DAY SELECTOR ===== */}
      <View style={styles.daySelectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelector}
        >
          {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((day) => {
            const isActive = day === selectedDay;
            const hasEntry = !!savedEntries[day];
            const hasMood = !!moodsByDay[day];
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
                    styles.dayPillNumber,
                    isActive && styles.dayPillNumberActive,
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayPillLabel,
                    isActive && styles.dayPillLabelActive,
                  ]}
                >
                  Day
                </Text>
                {(hasEntry || hasMood) && !isActive && (
                  <View style={styles.dayDot} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ===== MAIN CONTENT ===== */}
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
          {/* ===== TEXT INPUT AREA ===== */}
          <View style={styles.inputCard}>
            <View style={styles.inputCardHeader}>
              <View style={styles.inputCardTitleRow}>
                <Ionicons name="create-outline" size={20} color={Colors.sage} />
                <Text style={styles.inputCardTitle}>
                  Day {selectedDay} Entry
                </Text>
              </View>
              {selectedMood && (
                <View style={styles.currentMoodBadge}>
                  <Ionicons
                    name={MOODS.find((m) => m.key === selectedMood)?.icon || 'happy-outline'}
                    size={14}
                    color={MOODS.find((m) => m.key === selectedMood)?.color || Colors.sage}
                  />
                  <Text style={[styles.currentMoodText, { color: MOODS.find((m) => m.key === selectedMood)?.color }]}>
                    {MOODS.find((m) => m.key === selectedMood)?.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.journalInput}
                multiline
                placeholder="What made today special? Describe the sights, sounds, and feelings..."
                placeholderTextColor={Colors.textMuted}
                value={draftText}
                onChangeText={setDraftText}
                textAlignVertical="top"
              />
              <View style={styles.inputBottomFade} />
            </View>

            {/* ===== MEDIA BUTTONS ===== */}
            <View style={styles.mediaRow}>
              <Pressable
                onPress={handleOpenCamera}
                style={({ pressed }) => [
                  styles.photoButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="camera" size={20} color={Colors.white} />
                <Text style={styles.photoButtonText}>Add Photo</Text>
              </Pressable>

              <Pressable
                onPress={handleVoiceNote}
                style={({ pressed }) => [
                  styles.voiceButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                  <View style={styles.micIconWrapper}>
                    <Ionicons name="mic" size={22} color="#C75450" />
                  </View>
                </Animated.View>
                <Text style={styles.voiceButtonText}>Voice Note</Text>
              </Pressable>
            </View>

            {/* ===== PHOTO GRID (Masonry 2-col) ===== */}
            {photos.length > 0 && (
              <View style={styles.photoGrid}>
                <View style={styles.photoColumn}>
                  {photos.filter((_, i) => i % 2 === 0).map((uri, i) => {
                    const originalIndex = i * 2;
                    const isEven = i % 2 === 0;
                    return (
                      <View
                        key={originalIndex}
                        style={[
                          styles.photoThumb,
                          { height: isEven ? 180 : 140 },
                        ]}
                      >
                        <Image source={{ uri }} style={styles.photoImage} />
                        <Pressable
                          onPress={() => handleRemovePhoto(originalIndex)}
                          style={styles.photoRemoveOverlay}
                        >
                          <View style={styles.photoRemoveBtn}>
                            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.photoColumn}>
                  {photos.filter((_, i) => i % 2 === 1).map((uri, i) => {
                    const originalIndex = i * 2 + 1;
                    const isEven = i % 2 === 0;
                    return (
                      <View
                        key={originalIndex}
                        style={[
                          styles.photoThumb,
                          { height: isEven ? 140 : 180 },
                        ]}
                      >
                        <Image source={{ uri }} style={styles.photoImage} />
                        <Pressable
                          onPress={() => handleRemovePhoto(originalIndex)}
                          style={styles.photoRemoveOverlay}
                        >
                          <View style={styles.photoRemoveBtn}>
                            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ===== SAVE BUTTON ===== */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButtonOuter,
                !draftText.trim() && styles.saveButtonDisabled,
                pressed && draftText.trim() ? { transform: [{ scale: 0.97 }] } : null,
              ]}
              disabled={!draftText.trim()}
            >
              <LinearGradient
                colors={
                  draftText.trim()
                    ? ['#5E8A5A', '#3D6B39']
                    : [Colors.border, Colors.border]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color={draftText.trim() ? '#FFFFFF' : Colors.textMuted}
                  style={{ marginRight: 8 }}
                />
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
          </View>

          {/* ===== SAVED ENTRY (Quote card) ===== */}
          {hasSavedEntry && (
            <View style={styles.savedEntryCard}>
              <View style={styles.savedEntryHeader}>
                <View style={styles.savedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.sage} />
                  <Text style={styles.savedBadgeText}>Saved Entry</Text>
                </View>
              </View>
              <View style={styles.savedEntryBody}>
                <Text style={styles.quoteMarkOpen}>{'\u201C'}</Text>
                <Text style={styles.savedEntryText}>
                  {savedEntries[selectedDay]}
                </Text>
                <View style={styles.savedEntryFooter}>
                  <Text style={styles.savedEntryDayLabel}>
                    Day {selectedDay}
                  </Text>
                  <View style={styles.savedEntryDivider} />
                  <Text style={styles.savedEntryDateLabel}>
                    {getDateForDay(startDate, selectedDay)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ===== DAY STATS ===== */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Ionicons name="analytics-outline" size={20} color={Colors.sage} />
              <Text style={styles.statsTitle}>Day {selectedDay} Overview</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: 'rgba(94, 138, 90, 0.12)' }]}>
                  <Ionicons name="flag-outline" size={20} color={Colors.sage} />
                </View>
                <Text style={styles.statValue}>{stats.activities}</Text>
                <Text style={styles.statLabel}>Activities</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: 'rgba(176, 122, 80, 0.12)' }]}>
                  <Ionicons name="card-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.statValue}>{stats.expenses}</Text>
                <Text style={styles.statLabel}>Expenses</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: 'rgba(199, 84, 80, 0.10)' }]}>
                  <Ionicons name="cash-outline" size={20} color="#C75450" />
                </View>
                <Text style={styles.statValue}>{getCurrencySymbol(tripCtx.tripMeta.currency)}{stats.spent.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
            </View>
            <View style={styles.statsSummaryRow}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.statsSummary}>
                {stats.activities} activities  {'\u00B7'}  {stats.expenses} expenses  {'\u00B7'}  {getCurrencySymbol(tripCtx.tripMeta.currency)}{stats.spent.toLocaleString()} spent
              </Text>
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </Animated.View>

      {/* ===== CAMERA MODAL ===== */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
              style={styles.cameraOverlay}
            >
              <View style={styles.cameraTopBar}>
                <Pressable onPress={() => setShowCamera(false)} style={styles.cameraCloseBtn}>
                  <Ionicons name="close" size={26} color="#FFF" />
                </Pressable>
                <Text style={styles.cameraTitle}>Take a Photo</Text>
                <View style={{ width: 44 }} />
              </View>
              <View style={styles.cameraBottomBar}>
                <Pressable onPress={handleTakePhoto} style={styles.captureBtn}>
                  <View style={styles.captureBtnInner} />
                </Pressable>
              </View>
            </LinearGradient>
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

  // ===== GRADIENT HEADER =====
  headerGradient: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: '#FFFFFF',
  },
  headerDestination: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerDate: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  // Mood selector
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: BorderRadius.md,
  },
  moodLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },

  // ===== DAY SELECTOR =====
  daySelectorWrapper: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  daySelector: {
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  dayPill: {
    width: 48,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayPillActive: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
    ...Shadows.card,
  },
  dayPillNumber: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  dayPillNumberActive: {
    color: '#FFFFFF',
  },
  dayPillLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayPillLabelActive: {
    color: 'rgba(255,255,255,0.75)',
  },
  dayDot: {
    position: 'absolute',
    bottom: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.sage,
  },

  // ===== CONTENT =====
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },

  // ===== INPUT CARD =====
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  inputCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputCardTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  currentMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(94, 138, 90, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  currentMoodText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },

  // Input area
  inputWrapper: {
    backgroundColor: '#FDF9F3',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 226, 219, 0.8)',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    // Subtle inner shadow feel via nested styling
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  journalInput: {
    minHeight: 140,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 26,
  },
  inputBottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'transparent',
  },

  // ===== MEDIA BUTTONS =====
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.sage,
  },
  photoButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  voiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: 'rgba(199, 84, 80, 0.2)',
  },
  micIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(199, 84, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: '#C75450',
  },

  // ===== PHOTO GRID (Masonry) =====
  photoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  photoColumn: {
    flex: 1,
    gap: 10,
  },
  photoThumb: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemoveOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== SAVE BUTTON =====
  saveButtonOuter: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: Colors.textMuted,
  },

  // ===== SAVED ENTRY (Quote card) =====
  savedEntryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  savedEntryHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(94, 138, 90, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.pill,
  },
  savedBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  savedEntryBody: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  quoteMarkOpen: {
    fontFamily: Fonts.headingItalic,
    fontSize: 56,
    color: 'rgba(94, 138, 90, 0.2)',
    lineHeight: 56,
    marginBottom: -10,
    marginLeft: -4,
  },
  savedEntryText: {
    fontFamily: Fonts.headingItalic,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 28,
    paddingLeft: Spacing.sm,
  },
  savedEntryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  savedEntryDayLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  savedEntryDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 10,
  },
  savedEntryDateLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  // ===== STATS CARD =====
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  statsTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
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
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
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
    height: 50,
    backgroundColor: Colors.border,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  statsSummary: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  // ===== CAMERA MODAL =====
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
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
  cameraBottomBar: {
    alignItems: 'center',
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
});
