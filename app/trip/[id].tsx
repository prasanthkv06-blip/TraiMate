import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ImageBackground,
  Dimensions,
  Share,
  Modal,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import AIGuide from '../../src/components/AIGuide';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../src/constants/aiData';
import {
  generateItinerary,
  createEmptyDays,
  createNewDay,
  createNewItem,
  getTripDuration,
  getDestinationKey,
  type ItineraryDay,
  type ItineraryItem,
  type ItineraryStatus,
  type ActivityType,
} from '../../src/utils/itineraryGenerator';
import {
  isTripLive,
  isTripTomorrow,
  getCurrentDayNumber,
  getTodayItinerary,
  getGreeting,
  getSimulatedWeather,
  getPreTripAlerts,
  getTrendingSuggestions,
  generateAIRescheduleSuggestions,
  type AIRescheduleSuggestion,
} from '../../src/utils/liveHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Squad member type ──────────────────────────────────────────────────────
interface SquadMember {
  id: string;
  name: string;
  initial: string;
  color: string;
}

const AVATAR_COLORS = ['#5E8A5A', '#8B6DB5', '#4A8BA8', '#D4A574', '#C75450', '#7B68AE'];

// "You" is always the first member
const YOU_MEMBER: SquadMember = { id: '0', name: 'You', initial: 'Y', color: Colors.accent };

type Phase = 'plan' | 'live' | 'review';

const PHASE_TABS: { key: Phase; label: string; icon: string }[] = [
  { key: 'plan', label: 'Plan', icon: 'map-outline' },
  { key: 'live', label: 'Live', icon: 'navigate-outline' },
  { key: 'review', label: 'Review', icon: 'camera-outline' },
];

// ── Activity type options for the add/edit sheet ───────────────────────────
const ACTIVITY_TYPES: { key: ActivityType; label: string; emoji: string; icon: string; color: string }[] = [
  { key: 'food', label: 'Eat', emoji: '🍽️', icon: 'restaurant-outline', color: '#B07A50' },
  { key: 'sightseeing', label: 'Explore', emoji: '📸', icon: 'compass-outline', color: '#6B8E6B' },
  { key: 'activity', label: 'Adventure', emoji: '🎯', icon: 'flash-outline', color: '#5E8A5A' },
  { key: 'nightlife', label: 'Nightlife', emoji: '🌙', icon: 'moon-outline', color: '#9B59B6' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️', icon: 'bag-outline', color: '#D4A574' },
  { key: 'transport', label: 'Transit', emoji: '🚗', icon: 'car-outline', color: '#4A8BA8' },
];

// ── Helper: format ISO date to readable ────────────────────────────────────
function formatDate(isoStr?: string): string {
  if (!isoStr) return 'TBD';
  try {
    const d = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return isoStr;
  }
}

function formatDayDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return '';
  }
}

// ── Helper: format 24h time to 12h display ─────────────────────────────
function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

// ── Time & Duration presets ──────────────────────────────────────────────
const TIME_GROUPS = [
  { label: 'Morning', times: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'] },
  { label: 'Afternoon', times: ['12:00', '13:00', '14:00', '15:00', '16:00'] },
  { label: 'Evening', times: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] },
];

const DURATION_PRESETS = [
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '1.5h', value: '1.5h' },
  { label: '2h', value: '2h' },
  { label: '3h', value: '3h' },
  { label: '4h', value: '4h' },
  { label: 'Half day', value: '5h' },
  { label: 'Full day', value: '8h' },
];

// ── Extract clean destination name from param ──────────────────────────────
function cleanDestination(dest: string): string {
  // Remove emoji prefix like "🌺 Bali, Indonesia" → "Bali, Indonesia"
  return dest.replace(/^[\p{Emoji}\s]+/u, '').trim() || dest;
}

function getDestEmoji(dest: string): string {
  const match = dest.match(/^([\p{Emoji}]+)/u);
  return match ? match[1].trim() : '🌍';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function TripDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    destination?: string;
    tripName?: string;
    startDate?: string;
    endDate?: string;
    styles?: string;
    currency?: string;
    tripType?: string;
  }>();

  // ── Parse trip params ──────────────────────────────────────────────────
  const isNewTrip = params.id === 'new-trip' && !!params.destination;
  const tripStyles = params.styles ? params.styles.split(',').filter(Boolean) : [];
  const isSoloTrip = params.tripType === 'solo' || (!params.tripType && !isNewTrip);

  // For existing trips from sample data
  const sampleTrip = SAMPLE_TRIPS.find((t) => t.id === params.id);

  // Build trip object from either params or sample data
  const trip = isNewTrip
    ? {
        name: params.tripName || 'My Trip',
        destination: cleanDestination(params.destination || ''),
        startDate: formatDate(params.startDate),
        endDate: formatDate(params.endDate),
        photos: ['https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80'],
        memberCount: 0, // dynamic — uses squad.length
        emoji: getDestEmoji(params.destination || ''),
        phase: 'planning' as const,
      }
    : sampleTrip || {
        name: 'My New Trip',
        destination: 'Destination TBD',
        startDate: 'TBD',
        endDate: 'TBD',
        photos: ['https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80'],
        memberCount: 1,
        emoji: '🌍',
        phase: 'planning' as const,
      };

  // ── Squad state (dynamic, no mock data) ─────────────────────────────────
  const [squad, setSquad] = useState<SquadMember[]>([YOU_MEMBER]);

  // ── Core state ─────────────────────────────────────────────────────────
  const [activePhase, setActivePhase] = useState<Phase>('plan');
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showAIPicksSheet, setShowAIPicksSheet] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Itinerary state machine ────────────────────────────────────────────
  const [itineraryStatus, setItineraryStatus] = useState<ItineraryStatus>('empty');
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [builtFromScratch, setBuiltFromScratch] = useState(false);

  // ── AI generation animation state ──────────────────────────────────────
  const [genSteps, setGenSteps] = useState<{ msg: string; done: boolean }[]>([]);
  const [genCurrentStep, setGenCurrentStep] = useState(-1);

  // ── Editing state ──────────────────────────────────────────────────────
  const [showAddItemSheet, setShowAddItemSheet] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [showAddDaySheet, setShowAddDaySheet] = useState(false);
  const [editingDayTitle, setEditingDayTitle] = useState<string | null>(null); // dayId being title-edited
  const [showItemMenu, setShowItemMenu] = useState<{ dayId: string; itemId: string } | null>(null);
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());

  // ── Form state for add/edit item ───────────────────────────────────────
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ActivityType>('activity');
  const [formTime, setFormTime] = useState('12:00');
  const [formDuration, setFormDuration] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // ── Form state for add day ─────────────────────────────────────────────
  const [newDayTitle, setNewDayTitle] = useState('');

  // ── Animation refs ─────────────────────────────────────────────────────
  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0.4)).current;
  const inviteCode = 'x7kq2m';

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Phase switching ────────────────────────────────────────────────────
  const switchPhase = (phase: Phase, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePhase(phase);
    const tabWidth = (SCREEN_WIDTH - Spacing.xl * 2 - 8) / 3;
    Animated.spring(tabIndicatorX, {
      toValue: index * tabWidth,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // ── Invite helpers ─────────────────────────────────────────────────────
  const inviteLink = `trailmate.app/join/${inviteCode}`;

  const handleCopyLink = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleShare = async (channel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const msg = `Yo! Join "${trip.name}" to ${trip.destination} on TrailMate 🌍\n\n${inviteLink}`;
    if (channel === 'native') {
      try { await Share.share({ message: msg, title: trip.name }); } catch {}
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // ITINERARY ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  // ── AI Generation ──────────────────────────────────────────────────────
  const startAIGeneration = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItineraryStatus('generating');

    const destName = cleanDestination(params.destination || trip.destination);
    const duration = getTripDuration(params.startDate || '', params.endDate || '');
    const styleList = tripStyles.length > 0 ? tripStyles.join(' + ') : 'explorer';

    const steps = [
      { msg: `🔍 Analyzing your trip to ${destName}...`, done: false },
      { msg: `🎯 Matching your ${styleList} vibes...`, done: false },
      { msg: `📝 Building a ${duration}-day itinerary...`, done: false },
      { msg: `💡 Adding local insider tips...`, done: false },
    ];

    setGenSteps(steps);
    setGenCurrentStep(0);

    // Animate through steps
    const delays = [1000, 1500, 1500, 1000];
    let accumulated = 0;

    delays.forEach((delay, i) => {
      accumulated += delay;
      setTimeout(() => {
        setGenSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, done: true } : s));
        if (i < delays.length - 1) {
          setGenCurrentStep(i + 1);
        }
      }, accumulated);
    });

    // Generate actual itinerary after animation
    setTimeout(() => {
      const generated = generateItinerary({
        destination: params.destination || trip.destination,
        startDate: params.startDate || '',
        endDate: params.endDate || '',
        styles: tripStyles,
        tripType: (params.tripType as 'solo' | 'group') || 'solo',
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItinerary(generated);
      setItineraryStatus('ready');
      setBuiltFromScratch(false);
      setGenCurrentStep(-1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, accumulated + 800);
  }, [params.destination, params.startDate, params.endDate, params.tripType, tripStyles, trip.destination]);

  // ── Build from scratch ─────────────────────────────────────────────────
  const startFromScratch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const duration = getTripDuration(params.startDate || '', params.endDate || '');
    const startDateObj = params.startDate ? new Date(params.startDate) : null;
    const days = createEmptyDays(duration, startDateObj);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItinerary(days);
    setItineraryStatus('ready');
    setBuiltFromScratch(true);
  }, [params.startDate, params.endDate]);

  // ── Regenerate ─────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    Alert.alert(
      'Regenerate itinerary?',
      'This will replace your current plan. Any edits will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', onPress: startAIGeneration },
      ],
    );
  }, [startAIGeneration]);

  // ── Add item ───────────────────────────────────────────────────────────
  const openAddItem = useCallback((dayId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingDayId(dayId);
    setEditingItem(null);
    setFormTitle('');
    setFormType('activity');
    setFormTime('12:00');
    setFormDuration('');
    setFormLocation('');
    setFormNotes('');
    setShowTimePicker(false);
    setShowDurationPicker(false);
    setShowAddItemSheet(true);
  }, []);

  // ── Edit item ──────────────────────────────────────────────────────────
  const openEditItem = useCallback((dayId: string, item: ItineraryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingDayId(dayId);
    setEditingItem(item);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormTime(item.time);
    setFormDuration(item.duration || '');
    setFormLocation(item.location || '');
    setFormNotes(item.notes || '');
    setShowTimePicker(false);
    setShowDurationPicker(false);
    setShowAddItemSheet(true);
    setShowItemMenu(null);
  }, []);

  // ── Save item (add or update) ──────────────────────────────────────────
  const handleSaveItem = useCallback(() => {
    if (!formTitle.trim() || !editingDayId) return;
    setShowTimePicker(false);
    setShowDurationPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (editingItem) {
      // Update existing
      setItinerary(prev =>
        prev.map(day =>
          day.id === editingDayId
            ? {
                ...day,
                items: day.items.map(it =>
                  it.id === editingItem.id
                    ? {
                        ...it,
                        title: formTitle.trim(),
                        type: formType,
                        time: formTime,
                        duration: formDuration || undefined,
                        location: formLocation || undefined,
                        notes: formNotes || undefined,
                        emoji: CATEGORY_ICONS[formType] || '📍',
                      }
                    : it,
                ),
              }
            : day,
        ),
      );
    } else {
      // Add new
      const newItem = createNewItem({
        title: formTitle.trim(),
        type: formType,
        time: formTime,
        duration: formDuration || undefined,
        location: formLocation || undefined,
        notes: formNotes || undefined,
      });
      setItinerary(prev =>
        prev.map(day =>
          day.id === editingDayId
            ? { ...day, items: [...day.items, newItem] }
            : day,
        ),
      );
    }

    setShowAddItemSheet(false);
  }, [formTitle, formType, formTime, formDuration, formLocation, formNotes, editingDayId, editingItem]);

  // ── Delete item ────────────────────────────────────────────────────────
  const handleDeleteItem = useCallback((dayId: string, itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItinerary(prev =>
      prev.map(day =>
        day.id === dayId
          ? { ...day, items: day.items.filter(it => it.id !== itemId) }
          : day,
      ),
    );
    setShowItemMenu(null);
  }, []);

  // ── Move item up/down ──────────────────────────────────────────────────
  const moveItem = useCallback((dayId: string, itemId: string, direction: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItinerary(prev =>
      prev.map(day => {
        if (day.id !== dayId) return day;
        const items = [...day.items];
        const idx = items.findIndex(it => it.id === itemId);
        if (idx < 0) return day;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= items.length) return day;
        [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
        return { ...day, items };
      }),
    );
    setShowItemMenu(null);
  }, []);

  // ── Add day ────────────────────────────────────────────────────────────
  const handleAddDay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextNum = itinerary.length + 1;
    const title = newDayTitle.trim() || `Day ${nextNum}`;
    const day = createNewDay(nextNum, title);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItinerary(prev => [...prev, day]);
    setShowAddDaySheet(false);
    setNewDayTitle('');
  }, [itinerary.length, newDayTitle]);

  // ── Update day title ───────────────────────────────────────────────────
  const handleUpdateDayTitle = useCallback((dayId: string, title: string) => {
    setItinerary(prev =>
      prev.map(day => day.id === dayId ? { ...day, title } : day),
    );
  }, []);

  // ── Delete day ─────────────────────────────────────────────────────────
  const handleDeleteDay = useCallback((dayId: string) => {
    const day = itinerary.find(d => d.id === dayId);
    Alert.alert(
      `Delete Day ${day?.dayNumber}?`,
      'All activities in this day will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setItinerary(prev =>
              prev
                .filter(d => d.id !== dayId)
                .map((d, i) => ({ ...d, dayNumber: i + 1 })),
            );
          },
        },
      ],
    );
  }, [itinerary]);

  // ── Toggle AI tip expansion ────────────────────────────────────────────
  const toggleTip = useCallback((itemId: string) => {
    setExpandedTips(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* ── Hero image ──────────────────────────────────────── */}
      <ImageBackground
        source={{ uri: trip.photos[0] }}
        style={[styles.hero, { paddingTop: insets.top }]}
      >
        <View style={styles.heroGradient} pointerEvents="none">
          <LinearGradient
            colors={['rgba(44,37,32,0.4)', 'transparent', 'rgba(44,37,32,0.7)']}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        <View style={styles.heroHeader}>
          <Pressable onPress={() => { router.canGoBack() ? router.back() : router.push('/'); }} style={styles.backButton} hitSlop={20}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Pressable style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroDestination}>
            {trip.emoji} {trip.destination}
          </Text>
          <Text style={styles.heroTitle}>{trip.name}</Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroDate}>{trip.startDate} — {trip.endDate}</Text>
            <View style={styles.heroMembers}>
              <Text style={styles.heroMemberText}>
                {isSoloTrip ? 'Solo 🧳' : `${squad.length} going`}
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* ── Phase tabs ──────────────────────────────────────── */}
      <View style={styles.phaseTabs}>
        <Animated.View
          style={[
            styles.phaseTabIndicator,
            { transform: [{ translateX: tabIndicatorX }] },
          ]}
        />
        {PHASE_TABS.map((tab, index) => {
          const isActive = activePhase === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => switchPhase(tab.key, index)}
              style={styles.phaseTab}
            >
              <Ionicons name={tab.icon as any} size={16} color={isActive ? Colors.accent : Colors.textMuted} />
              <Text
                style={[
                  styles.phaseTabLabel,
                  isActive && styles.phaseTabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.key === 'live' && (isTripLive(params.startDate, params.endDate) || !params.startDate) && (
                <Animated.View style={{
                  width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E',
                  marginLeft: 4, opacity: livePulse,
                }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ─────────────────────────────────────────── */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {/* ══════════════════════════════════════════════════════
            PLAN TAB
        ══════════════════════════════════════════════════════ */}
        {activePhase === 'plan' && (
          <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Squad / Solo bar ────────────────────── */}
            {isSoloTrip ? (
              <View style={styles.squadBar}>
                <View style={[styles.squadAvatar, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.squadAvatarText}>Y</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.squadLabel}>Solo adventure 🧳</Text>
                  <Text style={styles.squadSoloHint}>Main character energy — just you</Text>
                </View>
              </View>
            ) : (
              <View style={styles.squadBar}>
                <View style={styles.squadAvatarRow}>
                  {squad.map((m, i) => (
                    <View
                      key={m.id}
                      style={[
                        styles.squadAvatar,
                        { backgroundColor: m.color, marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i },
                      ]}
                    >
                      <Text style={styles.squadAvatarText}>{m.initial}</Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowInviteSheet(true); }}
                    style={[styles.squadAvatar, styles.squadAddBtn, { marginLeft: -8, zIndex: 1 }]}
                  >
                    <Text style={styles.squadAddText}>+</Text>
                  </Pressable>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.squadLabel}>
                    {squad.length === 1 ? 'Just you so far' : `${squad.length} in the squad`}
                  </Text>
                  <Pressable onPress={() => setShowInviteSheet(true)} hitSlop={8}>
                    <Text style={styles.squadInviteLink}>+ Invite your crew</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════
                EMPTY STATE
            ═══════════════════════════════════════════════ */}
            {itineraryStatus === 'empty' && (
              <View style={styles.emptyState}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                  <Ionicons name="map-outline" size={48} color={Colors.accent} />
                  <Ionicons name="sparkles" size={20} color={Colors.sage} />
                </View>
                <Text style={styles.emptyTitle}>No plan yet — let's fix that</Text>
                <Text style={styles.emptySubtext}>
                  Let our AI travel agent whip up a killer itinerary, or build your own from scratch
                </Text>

                {/* AI Generate CTA */}
                <Pressable
                  onPress={startAIGeneration}
                  style={({ pressed }) => [styles.aiCtaButton, pressed && { transform: [{ scale: 0.97 }] }]}
                >
                  <LinearGradient
                    colors={[Colors.sage, Colors.sageDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.aiCtaGradient}
                  >
                    <Ionicons name="sparkles" size={28} color={Colors.white} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiCtaTitle}>Let AI plan this trip</Text>
                      <Text style={styles.aiCtaSub}>Based on your vibes & destination</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                  </LinearGradient>
                </Pressable>

                {/* Manual CTA */}
                <Pressable
                  onPress={startFromScratch}
                  style={({ pressed }) => [styles.scratchBtn, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.scratchBtnText}>Build from scratch</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.accent} />
                  </View>
                </Pressable>
              </View>
            )}

            {/* ═══════════════════════════════════════════════
                AI GENERATING STATE
            ═══════════════════════════════════════════════ */}
            {itineraryStatus === 'generating' && (
              <View style={styles.genContainer}>
                <View style={styles.genCard}>
                  <View style={styles.genCardHeader}>
                    <Ionicons name="sparkles" size={24} color={Colors.sage} />
                    <Text style={styles.genCardTitle}>AI Travel Agent</Text>
                  </View>

                  {genSteps.map((step, i) => (
                    <View key={i} style={styles.genStep}>
                      {step.done ? (
                        <View style={styles.genStepDotDone}>
                          <Text style={styles.genStepCheck}>✓</Text>
                        </View>
                      ) : i === genCurrentStep ? (
                        <View style={styles.genStepDotActive} />
                      ) : (
                        <View style={styles.genStepDotPending} />
                      )}
                      <Text
                        style={[
                          styles.genStepText,
                          step.done && styles.genStepTextDone,
                          i === genCurrentStep && styles.genStepTextActive,
                        ]}
                      >
                        {step.msg}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Skeleton days */}
                {[1, 2, 3].map(i => (
                  <View key={i} style={styles.skeletonDay}>
                    <View style={styles.skeletonBadge} />
                    <View style={styles.skeletonLine} />
                    <View style={[styles.skeletonLine, { width: '60%' }]} />
                  </View>
                ))}
              </View>
            )}

            {/* ═══════════════════════════════════════════════
                READY STATE — Editable Itinerary
            ═══════════════════════════════════════════════ */}
            {itineraryStatus === 'ready' && (
              <View>
                {/* Itinerary action buttons */}
                <View style={styles.itineraryActions}>
                  {builtFromScratch && (
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Switch to AI plan?',
                          'This will replace your manual plan with an AI-generated itinerary.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Let AI plan', onPress: startAIGeneration },
                          ],
                        );
                      }}
                      style={({ pressed }) => [styles.aiPlanBtn, pressed && { opacity: 0.7 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="sparkles" size={14} color={Colors.sage} />
                        <Text style={styles.aiPlanBtnText}>Let AI plan this</Text>
                      </View>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleRegenerate}
                    style={({ pressed }) => [styles.regenBtn, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.regenBtnText}>Regenerate itinerary</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Days */}
                {itinerary.map((day) => (
                  <View key={day.id} style={styles.daySection}>
                    {/* Day header */}
                    <View style={styles.dayHeader}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>Day {day.dayNumber}</Text>
                      </View>

                      {editingDayTitle === day.id ? (
                        <TextInput
                          style={styles.dayTitleInput}
                          value={day.title}
                          onChangeText={(t) => handleUpdateDayTitle(day.id, t)}
                          onBlur={() => setEditingDayTitle(null)}
                          onSubmitEditing={() => setEditingDayTitle(null)}
                          autoFocus
                          selectTextOnFocus
                        />
                      ) : (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setEditingDayTitle(day.id);
                          }}
                          style={styles.dayTitleRow}
                          onLongPress={() => handleDeleteDay(day.id)}
                        >
                          <Text style={styles.dayTitle}>{day.title}</Text>
                          <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
                        </Pressable>
                      )}
                    </View>

                    {/* Day date */}
                    {day.date && (
                      <Text style={styles.dayDateLabel}>{formatDayDate(day.date)}</Text>
                    )}

                    {/* Items */}
                    {day.items.map((item, i) => (
                      <View key={item.id} style={styles.itineraryItem}>
                        {/* Timeline */}
                        <View style={styles.timeline}>
                          <View
                            style={[
                              styles.timelineDot,
                              { backgroundColor: CATEGORY_COLORS[item.type] || Colors.accent },
                            ]}
                          />
                          {i < day.items.length - 1 && <View style={styles.timelineLine} />}
                        </View>

                        {/* Card */}
                        <Pressable
                          onPress={() => openEditItem(day.id, item)}
                          style={({ pressed }) => [
                            styles.itineraryCard,
                            pressed && { transform: [{ scale: 0.98 }] },
                          ]}
                        >
                          <View style={styles.itineraryCardTop}>
                            <Text style={styles.itineraryTime}>{item.time}</Text>
                            {item.duration && (
                              <Text style={styles.itineraryDuration}>· {item.duration}</Text>
                            )}
                            <View style={{ flex: 1 }} />
                            {/* Options menu */}
                            <Pressable
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowItemMenu(
                                  showItemMenu?.itemId === item.id ? null : { dayId: day.id, itemId: item.id },
                                );
                              }}
                              hitSlop={12}
                              style={styles.itemMenuBtn}
                            >
                              <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
                            </Pressable>
                          </View>

                          <View style={styles.itineraryContent}>
                            <Text style={styles.itineraryEmoji}>{item.emoji}</Text>
                            <Text style={styles.itineraryTitle}>{item.title}</Text>
                          </View>

                          {/* Location */}
                          {item.location && (
                            <Text style={styles.itineraryLocation}>📍 {item.location}</Text>
                          )}

                          {/* AI Tip */}
                          {item.aiTip && (
                            <Pressable
                              onPress={() => toggleTip(item.id)}
                              style={styles.aiTipRow}
                            >
                              <Text style={styles.aiTipIcon}>💡</Text>
                              <Text
                                style={styles.aiTipText}
                                numberOfLines={expandedTips.has(item.id) ? undefined : 1}
                              >
                                {item.aiTip}
                              </Text>
                            </Pressable>
                          )}

                          {/* User notes */}
                          {item.notes && (
                            <Text style={styles.itemNotes}>📝 {item.notes}</Text>
                          )}

                          {/* Item action menu (dropdown) */}
                          {showItemMenu?.itemId === item.id && (
                            <View style={styles.itemActionMenu}>
                              <Pressable
                                onPress={() => openEditItem(day.id, item)}
                                style={styles.itemAction}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="pencil-outline" size={14} color={Colors.text} /><Text style={styles.itemActionText}>Edit</Text></View>
                              </Pressable>
                              <Pressable
                                onPress={() => moveItem(day.id, item.id, 'up')}
                                style={styles.itemAction}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-up-outline" size={14} color={Colors.text} /><Text style={styles.itemActionText}>Move up</Text></View>
                              </Pressable>
                              <Pressable
                                onPress={() => moveItem(day.id, item.id, 'down')}
                                style={styles.itemAction}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-down-outline" size={14} color={Colors.text} /><Text style={styles.itemActionText}>Move down</Text></View>
                              </Pressable>
                              <Pressable
                                onPress={() => handleDeleteItem(day.id, item.id)}
                                style={[styles.itemAction, { borderBottomWidth: 0 }]}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="trash-outline" size={14} color={Colors.error} /><Text style={[styles.itemActionText, { color: Colors.error }]}>Delete</Text></View>
                              </Pressable>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    ))}

                    {/* Empty day message */}
                    {day.items.length === 0 && (
                      <View style={styles.emptyDayMsg}>
                        <Text style={styles.emptyDayText}>No activities yet — tap below to add some 🎯</Text>
                      </View>
                    )}

                    {/* Add activity button */}
                    <Pressable
                      onPress={() => openAddItem(day.id)}
                      style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.addItemBtnText}>+ Add activity</Text>
                    </Pressable>
                  </View>
                ))}

                {/* Add another day */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNewDayTitle('');
                    setShowAddDaySheet(true);
                  }}
                  style={({ pressed }) => [styles.addDayBtn, pressed && { transform: [{ scale: 0.97 }] }]}
                >
                  <Text style={styles.addDayBtnText}>+ Add another day</Text>
                </Pressable>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Plan Essentials — sticky bottom grid ────── */}
          <View style={styles.essentialsBar}>
            <View style={styles.essentialsGrid}>
              {[
                { icon: 'wallet-outline' as const, label: 'Spend', route: '/trip/expenses' },
                { icon: 'airplane-outline' as const, label: 'Booking', route: '/trip/bookings' },
                { icon: 'stats-chart-outline' as const, label: 'Polls', route: '/trip/polls' },
              ].map((f, i) => (
                <Pressable
                  key={`ess-${i}`}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: f.route as any, params: { tripId: params.id, destination: params.destination || '' } }); }}
                  style={({ pressed }) => [styles.essentialCard, pressed && { transform: [{ scale: 0.93 }] }]}
                >
                  <Ionicons name={f.icon} size={22} color={Colors.accent} />
                  <Text style={styles.essentialCardLabel}>{f.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAIPicksSheet(true); }}
                style={({ pressed }) => [styles.essentialCard, styles.essentialCardAI, pressed && { transform: [{ scale: 0.93 }] }]}
              >
                <Ionicons name="sparkles-outline" size={22} color={Colors.sage} />
                <Text style={[styles.essentialCardLabel, { color: Colors.sage }]}>AI Picks</Text>
              </Pressable>
            </View>
          </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            LIVE TAB
        ══════════════════════════════════════════════════════ */}
        {activePhase === 'live' && (() => {
          const destName = cleanDestination(params.destination || trip.destination);
          const destKey = getDestinationKey(params.destination || trip.destination);
          const tripIsLive = isTripLive(params.startDate, params.endDate) || !params.startDate;
          const tripIsTomorrow = isTripTomorrow(params.startDate);
          const currentDay = getCurrentDayNumber(params.startDate);
          const totalDays = itinerary.length || 5;
          const todayPlan = getTodayItinerary(itinerary, currentDay);
          const weather = getSimulatedWeather(destName);
          const preTripAlerts = getPreTripAlerts(destName);
          const trending = getTrendingSuggestions(destName);
          const aiSuggestions = generateAIRescheduleSuggestions(todayPlan?.items || [], weather)
            .filter(s => !dismissedSuggestions.has(s.id));

          return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── A) AI Briefing Card ────────────────────── */}
            <LinearGradient
              colors={['#5E8A5A', '#4A7A4A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.liveAICard}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveGreeting}>{getGreeting()}</Text>
                  <Text style={styles.liveDayInfo}>
                    Day {currentDay} of {totalDays} · {destName} · {weather.temp}°C
                  </Text>
                </View>
                <Ionicons name={weather.icon as any} size={32} color={Colors.white} />
              </View>
              {weather.alert && (
                <View style={styles.liveWeatherAlert}>
                  <Ionicons name="warning-outline" size={14} color="#FBBF24" />
                  <Text style={styles.liveWeatherAlertText}>{weather.alert}</Text>
                </View>
              )}
              {tripIsTomorrow && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white, marginBottom: 8 }}>
                    Trip starts tomorrow!
                  </Text>
                  {preTripAlerts.map((alert, idx) => (
                    <View key={`pre-alert-${idx}`} style={styles.livePreTripAlert}>
                      <Text style={{ fontSize: 14 }}>{alert.emoji}</Text>
                      <Text style={styles.livePreTripAlertText}>{alert.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>

            {/* ── B) Today's Plan Timeline ────────────────── */}
            <Text style={styles.liveSectionTitle}>TODAY'S PLAN</Text>
            {todayPlan && todayPlan.items.length > 0 ? (
              todayPlan.items.map((item, i, arr) => (
                <View key={item.id} style={styles.itineraryItem}>
                  <View style={styles.timeline}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: CATEGORY_COLORS[item.type] || Colors.accent },
                      ]}
                    />
                    {i < arr.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.itineraryCard}>
                    <Text style={styles.itineraryTime}>{item.time}</Text>
                    <View style={styles.itineraryContent}>
                      <Text style={styles.itineraryEmoji}>{item.emoji}</Text>
                      <Text style={styles.itineraryTitle}>{item.title}</Text>
                    </View>
                    {item.aiTip ? (
                      <Text style={{ fontFamily: Fonts.body, fontStyle: 'italic', fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 }}>
                        {item.aiTip}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyDayMsg}>
                <Ionicons name="calendar-outline" size={28} color={Colors.textMuted} />
                <Text style={[styles.emptyDayText, { marginTop: 8 }]}>No plan yet for today</Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 }}>
                  Switch to the Plan tab to create your itinerary
                </Text>
              </View>
            )}

            {/* ── C) AI Suggestions ────────────────────────── */}
            {aiSuggestions.length > 0 && (
              <>
                <Text style={styles.liveSectionTitle}>AI SUGGESTS</Text>
                {aiSuggestions.map((suggestion) => (
                  <View key={`ai-sug-${suggestion.id}`} style={styles.liveSuggestionCard}>
                    <View style={styles.liveSuggestionIcon}>
                      <Ionicons name={suggestion.icon as any} size={22} color={Colors.sage} />
                    </View>
                    <View style={styles.liveSuggestionContent}>
                      <Text style={styles.liveSuggestionTitle}>{suggestion.title}</Text>
                      <Text style={styles.liveSuggestionReason}>{suggestion.reason}</Text>
                      <View style={styles.liveSuggestionActions}>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert('Added!', 'Suggestion applied to your itinerary');
                          }}
                          style={styles.liveSuggestionAccept}
                        >
                          <Text style={styles.liveSuggestionAcceptText}>Accept</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setDismissedSuggestions(prev => new Set([...prev, suggestion.id]));
                          }}
                          style={styles.liveSuggestionDismiss}
                        >
                          <Text style={styles.liveSuggestionDismissText}>Dismiss</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* ── D) Trending Nearby ────────────────────────── */}
            {trending.length > 0 && (
              <>
                <Text style={styles.liveSectionTitle}>TRENDING NEARBY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
                  {trending.map((item, idx) => {
                    const fullStars = Math.floor(item.rating);
                    const hasHalf = item.rating - fullStars >= 0.3;
                    return (
                      <View key={`trend-${idx}`} style={styles.liveTrendingCard}>
                        <View style={styles.liveTrendingIcon}>
                          <Ionicons
                            name={item.stype === 'food' ? 'restaurant-outline' : 'compass-outline'}
                            size={22}
                            color={Colors.sage}
                          />
                        </View>
                        <Text style={styles.liveTrendingTitle} numberOfLines={2}>{item.tl}</Text>
                        <Text style={styles.liveTrendingLocation} numberOfLines={1}>{item.l}</Text>
                        <View style={styles.liveTrendingRating}>
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Ionicons
                              key={`star-${idx}-${si}`}
                              name={si < fullStars ? 'star' : (si === fullStars && hasHalf ? 'star-half' : 'star-outline')}
                              size={12}
                              color="#FBBF24"
                            />
                          ))}
                        </View>
                        <Text style={styles.liveTrendingPrice}>{item.price}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* ── E) Quick Actions ────────────────────────── */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: Spacing.xl }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/trip/journal' as any, params: { tripId: params.id, destination: params.destination || '' } });
                }}
                style={({ pressed }) => [styles.liveQuickAction, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <View style={styles.liveQuickActionIcon}>
                  <Ionicons name="book-outline" size={24} color={Colors.sage} />
                </View>
                <Text style={styles.liveQuickActionLabel}>Journal</Text>
                <View style={styles.liveQuickActionSubIcons}>
                  <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
                  <Ionicons name="camera-outline" size={14} color={Colors.textMuted} />
                  <Ionicons name="mic-outline" size={14} color={Colors.textMuted} />
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/trip/expenses' as any, params: { tripId: params.id, destination: params.destination || '' } });
                }}
                style={({ pressed }) => [styles.liveQuickAction, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <View style={styles.liveQuickActionIcon}>
                  <Ionicons name="wallet-outline" size={24} color={Colors.sage} />
                </View>
                <Text style={styles.liveQuickActionLabel}>Expense</Text>
                <View style={styles.liveQuickActionSubIcons}>
                  <Ionicons name="card-outline" size={14} color={Colors.textMuted} />
                  <Ionicons name="camera-outline" size={14} color={Colors.textMuted} />
                </View>
              </Pressable>
            </View>

            {/* ── F) Bottom spacer ────────────────────────── */}
            <View style={{ height: 120 }} />
          </ScrollView>
          );
        })()}

        {/* ══════════════════════════════════════════════════════
            REVIEW TAB
        ══════════════════════════════════════════════════════ */}
        {activePhase === 'review' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.itineraryCard, { alignItems: 'center', paddingVertical: 24, marginBottom: Spacing.md }]}>
              <Ionicons name="trophy-outline" size={48} color={Colors.accent} style={{ marginBottom: 8 }} />
              <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text }}>Trip Complete!</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4 }}>{itinerary.length || 3} days · 12 expenses · 2 journals</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: Spacing.xl }}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/trip/review' as any); }}
                style={{ flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', ...Shadows.card }}
              >
                <Ionicons name="stats-chart-outline" size={24} color={Colors.accent} style={{ marginBottom: 4 }} />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text }}>Summary</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/trip/review' as any); }}
                style={{ flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', ...Shadows.card }}
              >
                <Ionicons name="people-outline" size={24} color={Colors.accent} style={{ marginBottom: 4 }} />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text }}>Settle Up</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/trip/review' as any); }}
                style={{ flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', ...Shadows.card }}
              >
                <Ionicons name="images-outline" size={24} color={Colors.accent} style={{ marginBottom: 4 }} />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text }}>Memories</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/trip/review' as any); }}
              style={{ borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl }}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 8 }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white }}>View Full Trip Review</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </LinearGradient>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </Animated.View>

      {/* ── AI Floating Chatbot (Plan & Live tabs) ────────── */}
      {(activePhase === 'plan' || activePhase === 'live') && (
        <AIGuide destination={trip.destination} />
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}

      {/* ── Invite bottom sheet ───────────────────────────── */}
      <Modal visible={showInviteSheet} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add to the squad 🤙</Text>
            <Text style={styles.sheetSubtitle}>Share the link and let them join instantly</Text>

            <View style={styles.sheetLinkRow}>
              <View style={styles.sheetLinkBox}>
                <Text style={{ fontSize: 14 }}>🔗</Text>
                <Text style={styles.sheetLinkText} numberOfLines={1}>{inviteLink}</Text>
              </View>
              <Pressable
                onPress={handleCopyLink}
                style={[styles.sheetCopyBtn, linkCopied && { backgroundColor: Colors.sage }]}
              >
                <Text style={styles.sheetCopyText}>{linkCopied ? 'Copied! ✓' : 'Copy'}</Text>
              </Pressable>
            </View>

            <View style={styles.sheetShareRow}>
              <Pressable onPress={() => handleShare('whatsapp')} style={styles.sheetShareBtn}>
                <View style={[styles.sheetShareIcon, { backgroundColor: '#25D366' }]}>
                  <Text style={styles.sheetShareIconText}>W</Text>
                </View>
                <Text style={styles.sheetShareName}>WhatsApp</Text>
              </Pressable>
              <Pressable onPress={() => handleShare('sms')} style={styles.sheetShareBtn}>
                <View style={[styles.sheetShareIcon, { backgroundColor: '#4A90D9' }]}>
                  <Text style={styles.sheetShareIconText}>💬</Text>
                </View>
                <Text style={styles.sheetShareName}>SMS</Text>
              </Pressable>
              <Pressable onPress={() => handleShare('email')} style={styles.sheetShareBtn}>
                <View style={[styles.sheetShareIcon, { backgroundColor: '#EA4335' }]}>
                  <Text style={styles.sheetShareIconText}>✉️</Text>
                </View>
                <Text style={styles.sheetShareName}>Email</Text>
              </Pressable>
              <Pressable onPress={() => handleShare('native')} style={styles.sheetShareBtn}>
                <View style={[styles.sheetShareIcon, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.sheetShareIconText}>↗</Text>
                </View>
                <Text style={styles.sheetShareName}>More</Text>
              </Pressable>
            </View>

            <Text style={styles.sheetSectionLabel}>CURRENT SQUAD</Text>
            {squad.map((m) => (
              <View key={m.id} style={styles.sheetMemberRow}>
                <View style={[styles.sheetMemberAvatar, { backgroundColor: m.color }]}>
                  <Text style={styles.sheetMemberAvatarText}>{m.initial}</Text>
                </View>
                <Text style={styles.sheetMemberName}>{m.name}</Text>
                {m.id === '0' && (
                  <View style={styles.sheetOrgBadge}>
                    <Text style={styles.sheetOrgBadgeText}>👑 You</Text>
                  </View>
                )}
              </View>
            ))}

            <Pressable
              onPress={() => setShowInviteSheet(false)}
              style={styles.sheetCloseBtn}
            >
              <Text style={styles.sheetCloseBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Add/Edit Item Sheet ─────────────────────────────── */}
      <Modal visible={showAddItemSheet} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.addItemSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingItem ? 'Edit Activity' : 'Add Activity'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={styles.formLabel}>WHAT</Text>
              <TextInput
                style={styles.formInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g., Sunset dinner at the beach"
                placeholderTextColor={Colors.textMuted}
                maxLength={80}
              />

              {/* Type — visual icon grid */}
              <Text style={styles.formLabel}>TYPE</Text>
              <View style={styles.typeIconGrid}>
                {ACTIVITY_TYPES.map((t) => {
                  const isActive = formType === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setFormType(t.key);
                      }}
                      style={[
                        styles.typeIconCard,
                        { backgroundColor: isActive ? t.color : `${t.color}15` },
                        isActive && { borderColor: t.color, transform: [{ scale: 1.05 }] },
                      ]}
                    >
                      <Ionicons name={t.icon as any} size={26} color={isActive ? Colors.white : t.color} />
                      <Text style={[
                        styles.typeIconLabel,
                        isActive && styles.typeIconLabelActive,
                      ]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Time & Duration — compact row */}
              <Text style={styles.formLabel}>WHEN</Text>
              <View style={styles.timeDurationRow}>
                {/* Time selector button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowTimePicker(!showTimePicker);
                    setShowDurationPicker(false);
                  }}
                  style={[
                    styles.timeSelector,
                    showTimePicker && styles.timeSelectorActive,
                  ]}
                >
                  <Text style={styles.timeSelectorIcon}>🕐</Text>
                  <Text style={[
                    styles.timeSelectorValue,
                    showTimePicker && styles.timeSelectorValueActive,
                  ]}>{formatTimeDisplay(formTime)}</Text>
                  <Text style={styles.timeSelectorArrow}>{showTimePicker ? '▲' : '▼'}</Text>
                </Pressable>

                {/* Duration selector button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowDurationPicker(!showDurationPicker);
                    setShowTimePicker(false);
                  }}
                  style={[
                    styles.timeSelector,
                    showDurationPicker && styles.timeSelectorActive,
                  ]}
                >
                  <Text style={styles.timeSelectorIcon}>⏱</Text>
                  <Text style={[
                    styles.timeSelectorValue,
                    showDurationPicker && styles.timeSelectorValueActive,
                  ]}>{formDuration || 'Duration'}</Text>
                  <Text style={styles.timeSelectorArrow}>{showDurationPicker ? '▲' : '▼'}</Text>
                </Pressable>
              </View>

              {/* Time dropdown */}
              {showTimePicker && (
                <View style={styles.pickerDropdown}>
                  {TIME_GROUPS.map((group) => (
                    <View key={group.label}>
                      <Text style={styles.pickerGroupLabel}>{group.label}</Text>
                      <View style={styles.pickerGrid}>
                        {group.times.map((t) => (
                          <Pressable
                            key={t}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setFormTime(t);
                              setShowTimePicker(false);
                            }}
                            style={[
                              styles.pickerGridItem,
                              formTime === t && styles.pickerGridItemActive,
                            ]}
                          >
                            <Text style={[
                              styles.pickerGridText,
                              formTime === t && styles.pickerGridTextActive,
                            ]}>{formatTimeDisplay(t)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Duration dropdown */}
              {showDurationPicker && (
                <View style={styles.pickerDropdown}>
                  <View style={styles.pickerGrid}>
                    {DURATION_PRESETS.map((d) => (
                      <Pressable
                        key={d.value}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setFormDuration(d.value);
                          setShowDurationPicker(false);
                        }}
                        style={[
                          styles.pickerGridItem,
                          styles.pickerGridItemDuration,
                          formDuration === d.value && styles.pickerGridItemActive,
                        ]}
                      >
                        <Text style={[
                          styles.pickerGridText,
                          formDuration === d.value && styles.pickerGridTextActive,
                        ]}>{d.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Location */}
              <Text style={styles.formLabel}>WHERE (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="e.g., Le Marais, 4th"
                placeholderTextColor={Colors.textMuted}
                maxLength={60}
              />

              {/* Notes */}
              <Text style={styles.formLabel}>NOTES (optional)</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 72, textAlignVertical: 'top' }]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="Anything to remember..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={200}
              />

              {/* Save button */}
              <Pressable
                onPress={handleSaveItem}
                style={({ pressed }) => [
                  styles.saveItemBtn,
                  !formTitle.trim() && { opacity: 0.5 },
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
                disabled={!formTitle.trim()}
              >
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveItemBtnGradient}
                >
                  <Text style={styles.saveItemBtnText}>
                    {editingItem ? 'Save changes' : `Add to Day ${itinerary.find(d => d.id === editingDayId)?.dayNumber || ''}`}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Cancel */}
              <Pressable
                onPress={() => setShowAddItemSheet(false)}
                style={styles.cancelFormBtn}
              >
                <Text style={styles.cancelFormBtnText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Day Sheet ──────────────────────────────────── */}
      <Modal visible={showAddDaySheet} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.addDaySheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add a day</Text>

            <Text style={styles.formLabel}>DAY TITLE</Text>
            <TextInput
              style={styles.formInput}
              value={newDayTitle}
              onChangeText={setNewDayTitle}
              placeholder={`Day ${itinerary.length + 1} — Free Roam`}
              placeholderTextColor={Colors.textMuted}
              maxLength={40}
              autoFocus
            />

            <Pressable
              onPress={handleAddDay}
              style={({ pressed }) => [styles.saveItemBtn, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <LinearGradient
                colors={[Colors.sage, Colors.sageDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveItemBtnGradient}
              >
                <Text style={styles.saveItemBtnText}>Add day</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => setShowAddDaySheet(false)}
              style={styles.cancelFormBtn}
            >
              <Text style={styles.cancelFormBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── AI Picks Sheet ──────── */}
      <Modal visible={showAIPicksSheet} transparent animationType="slide" onRequestClose={() => setShowAIPicksSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAIPicksSheet(false)}>
          <Pressable style={styles.aiPicksSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>AI Travel Tools</Text>
            <Text style={styles.sheetSubtitle}>Smart suggestions powered by AI</Text>
            <View style={styles.aiPicksGrid}>
              {[
                { icon: 'briefcase-outline' as const, label: 'Packing', desc: 'Smart packing list', route: '/trip/packing', color: '#5E8A5A' },
                { icon: 'cash-outline' as const, label: 'Budget', desc: 'Cost breakdown', route: '/trip/budget', color: '#B07A50' },
                { icon: 'calendar-outline' as const, label: 'Best Time', desc: 'When to visit', route: '/trip/best-time', color: '#4A8BA8' },
                { icon: 'document-text-outline' as const, label: 'Visa Info', desc: 'Entry requirements', route: '/trip/visa', color: '#9B59B6' },
              ].map((f, i) => (
                <Pressable
                  key={`aipick-${i}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowAIPicksSheet(false);
                    router.push({ pathname: f.route as any, params: { tripId: params.id, destination: params.destination || '' } });
                  }}
                  style={({ pressed }) => [styles.aiPickCard, pressed && { transform: [{ scale: 0.96 }] }]}
                >
                  <View style={[styles.aiPickIconWrap, { backgroundColor: `${f.color}15` }]}>
                    <Ionicons name={f.icon} size={24} color={f.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiPickLabel}>{f.label}</Text>
                    <Text style={styles.aiPickDesc}>{f.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowAIPicksSheet(false)} style={styles.sheetCloseBtn}>
              <Text style={styles.sheetCloseBtnText}>Close</Text>
            </Pressable>
            <View style={{ height: 20 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // ── Hero ────────────────────────────────────
  hero: {
    height: 280,
    justifyContent: 'space-between',
    zIndex: 5,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: Colors.white,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonText: {
    fontSize: 22,
    color: Colors.white,
    fontWeight: '700',
  },
  heroContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  heroDestination: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  heroMembers: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroMemberText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  // ── Phase tabs ──────────────────────────────
  phaseTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginTop: -20,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 4,
    position: 'relative',
    zIndex: 10,
    ...Shadows.card,
  },
  phaseTabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: (SCREEN_WIDTH - Spacing.xl * 2 - 8) / 3,
    height: '100%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  phaseTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    zIndex: 1,
  },
  phaseTabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  phaseTabLabelActive: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
  },
  content: {
    flex: 1,
    marginTop: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  // ── Squad bar ───────────────────────────────
  squadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  squadAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  squadAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  squadAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.white,
  },
  squadAddBtn: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 2,
    borderStyle: 'dashed' as any,
  },
  squadAddText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 18,
    color: Colors.accent,
  },
  squadLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  squadInviteLink: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    marginTop: 2,
  },
  squadSoloHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // ── Plan Essentials sticky bar ───────────────
  essentialsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247,243,238,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  essentialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  essentialCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...Shadows.card,
  },
  essentialCardAI: {
    borderLeftWidth: 2.5,
    borderLeftColor: Colors.sage,
  },
  essentialCardLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // ═══════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  aiCtaButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  aiCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  aiCtaTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  aiCtaSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  aiCtaArrow: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 20,
    color: Colors.white,
  },
  scratchBtn: {
    paddingVertical: 12,
  },
  scratchBtnText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  // ═══════════════════════════════════════════════
  // AI GENERATION
  // ═══════════════════════════════════════════════
  genContainer: {
    paddingBottom: Spacing.xl,
  },
  genCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 20,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.sage,
    ...Shadows.card,
  },
  genCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  genCardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  genStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  genStepDotDone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genStepCheck: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  genStepDotActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.sageLight,
    borderWidth: 2,
    borderColor: Colors.sage,
  },
  genStepDotPending: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border,
  },
  genStepText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    flex: 1,
  },
  genStepTextDone: {
    color: Colors.textSecondary,
  },
  genStepTextActive: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
  },
  skeletonDay: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 18,
    marginBottom: 12,
    ...Shadows.card,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    borderRadius: 8,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  skeletonLine: {
    width: '80%',
    height: 14,
    borderRadius: 6,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  // ═══════════════════════════════════════════════
  // READY STATE — Itinerary
  // ═══════════════════════════════════════════════
  itineraryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  aiPlanBtn: {
    backgroundColor: Colors.sageLight,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.sage,
  },
  aiPlanBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  regenBtn: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regenBtnText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  daySection: {
    marginBottom: Spacing.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  dayBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dayBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  dayTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dayTitleEdit: {
    fontSize: 14,
    opacity: 0.5,
  },
  dayTitleInput: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.accent,
    paddingBottom: 2,
  },
  dayDateLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginLeft: 2,
    marginBottom: Spacing.md,
  },
  // ── Itinerary items ─────────────────────────
  itineraryItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  itineraryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: 8,
    marginLeft: 8,
    ...Shadows.card,
  },
  itineraryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itineraryTime: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  itineraryDuration: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  itineraryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itineraryEmoji: {
    fontSize: 18,
  },
  itineraryTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  itineraryLocation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  aiTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F0F7EF',
    borderRadius: 8,
    padding: 8,
  },
  aiTipIcon: {
    fontSize: 13,
    marginTop: 1,
  },
  aiTipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.sage,
    flex: 1,
    lineHeight: 17,
  },
  itemNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  itemMenuBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemMenuDots: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textMuted,
  },
  itemActionMenu: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
    overflow: 'hidden',
    ...Shadows.card,
  },
  itemAction: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemActionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  emptyDayMsg: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  emptyDayText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  addItemBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed' as any,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 32,
    marginTop: 4,
  },
  addItemBtnText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  addDayBtn: {
    borderWidth: 1.5,
    borderColor: Colors.sage,
    borderStyle: 'dashed' as any,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addDayBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.sage,
  },
  // ═══════════════════════════════════════════════
  // INVITE SHEET
  // ═══════════════════════════════════════════════
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,37,32,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: 18,
  },
  sheetLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 5,
    marginBottom: 20,
    ...Shadows.card,
  },
  sheetLinkBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
  },
  sheetLinkText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  sheetCopyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sheetCopyText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  sheetShareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 22,
  },
  sheetShareBtn: {
    alignItems: 'center',
    gap: 6,
  },
  sheetShareIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetShareIconText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  sheetShareName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sheetSectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  sheetMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 6,
  },
  sheetMemberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetMemberAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.white,
  },
  sheetMemberName: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  sheetOrgBadge: {
    backgroundColor: '#FDF6F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  sheetOrgBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.accent,
  },
  sheetCloseBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  sheetCloseBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  // ═══════════════════════════════════════════════
  // ADD/EDIT ITEM SHEET
  // ═══════════════════════════════════════════════
  addItemSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    maxHeight: '85%',
  },
  formLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  formRow: {
    flexDirection: 'row',
  },
  typeIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  typeIconCard: {
    width: '30.5%' as any,
    aspectRatio: 1.1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  typeIconLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeIconLabelActive: {
    color: Colors.white,
  },
  saveItemBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: 24,
  },
  saveItemBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveItemBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  cancelFormBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  cancelFormBtnText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  // ── Add day sheet ───────────────────────────
  addDaySheetContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  // ── Time / Duration selectors ─────────────────
  timeDurationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  timeSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  timeSelectorActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  timeSelectorIcon: {
    fontSize: 16,
  },
  timeSelectorValue: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  timeSelectorValueActive: {
    color: Colors.accent,
  },
  timeSelectorArrow: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  pickerDropdown: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
    ...Shadows.card,
  },
  pickerGroupLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pickerGridItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  pickerGridItemActive: {
    backgroundColor: Colors.accent,
  },
  pickerGridItemDuration: {
    minWidth: 60,
    alignItems: 'center',
  },
  pickerGridText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  pickerGridTextActive: {
    color: Colors.white,
    fontFamily: Fonts.bodySemiBold,
  },
  // ═══════════════════════════════════════════════
  // AI PICKS SHEET
  // ═══════════════════════════════════════════════
  aiPicksSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  aiPicksGrid: {
    gap: 10,
    marginBottom: 16,
  },
  aiPickCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 16,
    gap: 14,
    ...Shadows.card,
  },
  aiPickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  aiPickLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  aiPickDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ── Live Tab styles ─────────────────────────────────────────────────
  liveAICard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  liveGreeting: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.white,
    marginBottom: 4,
  },
  liveDayInfo: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  liveWeatherRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  liveWeatherIcon: {
    marginRight: 4,
  },
  liveWeatherTemp: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  liveWeatherAlert: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    gap: 6,
  },
  liveWeatherAlertText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: '#FBBF24',
    flex: 1,
  },
  liveSectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  liveSuggestionCard: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.sage,
    ...Shadows.card,
  },
  liveSuggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.sage}15`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  liveSuggestionContent: {
    flex: 1,
  },
  liveSuggestionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  liveSuggestionReason: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  liveSuggestionActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  liveSuggestionAccept: {
    backgroundColor: Colors.sage,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  liveSuggestionAcceptText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  liveSuggestionDismiss: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  liveSuggestionDismissText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  liveTrendingCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginRight: 10,
    ...Shadows.card,
  },
  liveTrendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.sage}15`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  liveTrendingTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginBottom: 2,
  },
  liveTrendingLocation: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  liveTrendingRating: {
    flexDirection: 'row' as const,
    gap: 1,
    marginBottom: 4,
  },
  liveTrendingPrice: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  liveQuickAction: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center' as const,
    ...Shadows.card,
  },
  liveQuickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${Colors.sage}15`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  liveQuickActionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 6,
  },
  liveQuickActionSubIcons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  livePreTripAlert: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  livePreTripAlertText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
});
