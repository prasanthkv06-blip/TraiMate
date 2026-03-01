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
  Linking,
  ActionSheetIOS,
  InteractionManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import AIGuide from '../../src/components/AIGuide';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';
import { CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_IONICONS, type AISuggestion } from '../../src/constants/aiData';
import {
  generateItinerary,
  generateItineraryAsync,
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
  getTrendingSuggestionsAsync,
  getLiveDataAsync,
  generateAIRescheduleSuggestions,
  type AIRescheduleSuggestion,
  type LiveData,
} from '../../src/utils/liveHelpers';
import { generateDailyBriefing, type LiveContext } from '../../src/lib/gemini';
import { getCurrencySymbol } from '../../src/lib/exchangeRate';
import { useTripContext } from '../../src/contexts/TripContext';
import { getUserRole, getTripVisibility, setTripVisibility, renameTrip, duplicateTrip, deleteTrip } from '../../src/services/tripService';
import { hasPermission, type TripRole } from '../../src/utils/permissions';
import type { TripVisibility, BookingLocal } from '../../src/services/storageCache';
import { getDestinationImage } from '../../src/utils/destinationImages';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Cross-platform alert that works on web (where Alert.alert is a no-op)
function crossAlert(
  title: string,
  message: string,
  buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[],
) {
  if (Platform.OS === 'web') {
    if (buttons) {
      const confirmBtn = buttons.find(b => b.style !== 'cancel');
      if (confirmBtn) {
        if (window.confirm(`${title}\n\n${message}`)) {
          confirmBtn.onPress?.();
        }
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }
  Alert.alert(title, message, buttons);
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
  { key: 'review', label: 'Recap', icon: 'sparkles-outline' },
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

// ── Time helpers for arrival/departure modal ─────────────────────────────

interface Time12 { hour: number; minute: number; period: 'AM' | 'PM' }

function parseTime12(str: string): Time12 {
  const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: 12, minute: 0, period: 'PM' };
  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10), period: match[3].toUpperCase() as 'AM' | 'PM' };
}

function formatTime12(h: number, m: number, period: 'AM' | 'PM'): string {
  return `${h}:${m.toString().padStart(2, '0')} ${period}`;
}

function to24h(time12: string): string {
  const { hour, minute, period } = parseTime12(time12);
  let h = hour;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function detectFlightTimes(bookings: BookingLocal[], tripStart?: string, tripEnd?: string): {
  arrivalTime: string | null;
  departureTime: string | null;
  hasReturnFlight: boolean;
} {
  let arrivalTime: string | null = null;
  let departureTime: string | null = null;
  let hasReturnFlight = false;

  if (!bookings || bookings.length === 0) return { arrivalTime, departureTime, hasReturnFlight };

  const normalizeDate = (d?: string) => d ? d.split('T')[0] : '';
  const startNorm = normalizeDate(tripStart);
  const endNorm = normalizeDate(tripEnd);

  for (const b of bookings) {
    if (b.type !== 'flight') continue;
    const bStartNorm = normalizeDate(b.startDate);
    const bReturnNorm = normalizeDate(b.returnDate);
    const bEndNorm = normalizeDate(b.endDate);

    // Inbound flight: starts on trip start date
    if (bStartNorm === startNorm && b.startTime && !arrivalTime) {
      arrivalTime = b.startTime;
    }
    // Return flight with returnDate matching trip end
    if (bReturnNorm === endNorm && b.returnTime) {
      departureTime = b.returnTime;
      hasReturnFlight = true;
    }
    // Separate outbound on end date (one-way booking for return)
    if (!departureTime && bStartNorm === endNorm && b.startTime) {
      departureTime = b.startTime;
      hasReturnFlight = true;
    }
  }

  return { arrivalTime, departureTime, hasReturnFlight };
}

// ── TimeInput inline component ───────────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseTime12(value);
  const hour = parsed.hour;
  const minute = parsed.minute;
  const period = parsed.period;

  const cycleHour = (dir: 1 | -1) => {
    let h = hour + dir;
    if (h > 12) h = 1;
    if (h < 1) h = 12;
    onChange(formatTime12(h, minute, period));
  };

  const cycleMinute = (dir: 1 | -1) => {
    const steps = [0, 15, 30, 45];
    const idx = steps.indexOf(minute);
    let next = idx + dir;
    if (next >= steps.length) next = 0;
    if (next < 0) next = steps.length - 1;
    onChange(formatTime12(hour, steps[next], period));
  };

  const togglePeriod = () => {
    onChange(formatTime12(hour, minute, period === 'AM' ? 'PM' : 'AM'));
  };

  const segmentStyle = {
    alignItems: 'center' as const,
    width: 52,
  };

  const chevronHitSlop = { top: 8, bottom: 8, left: 12, right: 12 };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.md, paddingVertical: 6, paddingHorizontal: 8 }}>
      {/* Hour */}
      <View style={segmentStyle}>
        <Pressable onPress={() => cycleHour(1)} hitSlop={chevronHitSlop}>
          <Ionicons name="chevron-up" size={18} color={Colors.textMuted} />
        </Pressable>
        <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 22, color: Colors.text, marginVertical: 2 }}>
          {hour.toString().padStart(2, '0')}
        </Text>
        <Pressable onPress={() => cycleHour(-1)} hitSlop={chevronHitSlop}>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 22, color: Colors.textMuted, marginBottom: 2 }}>:</Text>

      {/* Minute */}
      <View style={segmentStyle}>
        <Pressable onPress={() => cycleMinute(1)} hitSlop={chevronHitSlop}>
          <Ionicons name="chevron-up" size={18} color={Colors.textMuted} />
        </Pressable>
        <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 22, color: Colors.text, marginVertical: 2 }}>
          {minute.toString().padStart(2, '0')}
        </Text>
        <Pressable onPress={() => cycleMinute(-1)} hitSlop={chevronHitSlop}>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* AM/PM */}
      <Pressable
        onPress={togglePeriod}
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 4 }}
      >
        <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 16, color: Colors.accent }}>{period}</Text>
      </Pressable>
    </View>
  );
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
  const isUserCreatedTrip = !isNewTrip && !!params.destination && !SAMPLE_TRIPS.find(t => t.id === params.id);
  const tripStyles = params.styles ? params.styles.split(',').filter(Boolean) : [];
  const isSoloTrip = params.tripType === 'solo' || (!params.tripType && !isNewTrip);

  // For existing trips from sample data
  const sampleTrip = SAMPLE_TRIPS.find((t) => t.id === params.id);

  // Build trip object from either params, user-created trip, or sample data
  const trip = (isNewTrip || isUserCreatedTrip)
    ? {
        name: params.tripName || 'My Trip',
        destination: cleanDestination(params.destination || ''),
        startDate: formatDate(params.startDate),
        endDate: formatDate(params.endDate),
        photos: [getDestinationImage(params.destination || '')],
        memberCount: 0, // dynamic — uses squad.length
        emoji: getDestEmoji(params.destination || ''),
        phase: 'planning' as const,
      }
    : sampleTrip || {
        name: 'My New Trip',
        destination: 'Destination TBD',
        startDate: 'TBD',
        endDate: 'TBD',
        photos: [getDestinationImage('')],
        memberCount: 1,
        emoji: '🌍',
        phase: 'planning' as const,
      };

  // ── Shared context (persists across trip screen navigations) ─────────────
  const tripCtx = useTripContext();

  // ── Squad state (dynamic, no mock data) ─────────────────────────────────
  const [squad, setSquad] = useState<SquadMember[]>(() => {
    // Restore from context if available
    return tripCtx.squad.length > 1 ? tripCtx.squad : [YOU_MEMBER];
  });

  // ── Core state ─────────────────────────────────────────────────────────
  const [activePhase, setActivePhase] = useState<Phase>('plan');
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showAIPicksSheet, setShowAIPicksSheet] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Itinerary state machine ────────────────────────────────────────────
  const [itineraryStatus, setItineraryStatus] = useState<ItineraryStatus>(() => {
    return tripCtx.itinerary.length > 0 ? 'ready' : 'empty';
  });
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(() => {
    return tripCtx.itinerary.length > 0 ? tripCtx.itinerary : [];
  });
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
  const [trendingDetail, setTrendingDetail] = useState<AISuggestion | null>(null);
  const [asyncTrending, setAsyncTrending] = useState<AISuggestion[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [dailyBriefing, setDailyBriefing] = useState<string | null>(null);
  const [liveEditItem, setLiveEditItem] = useState<ItineraryItem | null>(null);
  const [liveEditTime, setLiveEditTime] = useState('');
  const [liveEditTitle, setLiveEditTitle] = useState('');
  const [showMapView, setShowMapView] = useState(false);

  // ── Time modal state (arrival/departure) ───────────────────────────────
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('12:00 PM');
  const [departureTime, setDepartureTime] = useState('6:00 PM');
  const [hasReturnFlight, setHasReturnFlight] = useState(false);
  const lastTimesRef = useRef<{ arrival: string; departure: string; hasFlight: boolean } | null>(null);

  // ── Form state for add/edit item ───────────────────────────────────────
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ActivityType>('activity');
  const [formTime, setFormTime] = useState('12:00');
  const [formDuration, setFormDuration] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showTripMenu, setShowTripMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [localTripName, setLocalTripName] = useState(trip.name);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // ── Role-based permissions ─────────────────────────────────────────────
  const [userRole, setUserRole] = useState<TripRole>('organizer');
  const canEditItinerary = hasPermission(userRole, 'canEditItinerary');
  const canInvite = hasPermission(userRole, 'canInvite');
  const canDeleteTrip = hasPermission(userRole, 'canDeleteTrip');
  const canEditTrip = hasPermission(userRole, 'canEditTrip');
  const [tripVisibility, setTripVisibilityState] = useState<TripVisibility>('private');

  // ── Form state for add day ─────────────────────────────────────────────
  const [newDayTitle, setNewDayTitle] = useState('');

  // ── Animation refs ─────────────────────────────────────────────────────
  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const livePulse = useRef(new Animated.Value(0.4)).current;
  const [dockExpanded, setDockExpanded] = useState(false);
  const dockAnim = useRef(new Animated.Value(0)).current;
  // Track timeout IDs for cleanup on unmount
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Generate stable invite code from trip ID
  const [inviteCode] = useState(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const seed = (params.id || 'trip').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < 6; i++) code += chars[(seed * (i + 7) + i * 13) % chars.length];
    return code;
  });

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load user role and trip visibility
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      if (params.id) {
        getUserRole(params.id).then(setUserRole);
        getTripVisibility(params.id).then(setTripVisibilityState);
      }
    });
    return () => handle.cancel();
  }, [params.id]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Cleanup all tracked timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(id => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  // ── Sync local state → TripContext ──────────────────────────────────────
  useEffect(() => {
    tripCtx.setTripMeta({
      id: params.id || '',
      name: trip.name,
      destination: cleanDestination(params.destination || trip.destination),
      startDate: params.startDate,
      endDate: params.endDate,
      currency: params.currency,
      tripType: params.tripType,
    });
  }, [params.id, params.destination, params.startDate, params.endDate]);

  useEffect(() => {
    tripCtx.setSquad(squad);
  }, [squad]);

  useEffect(() => {
    if (itinerary.length > 0) {
      tripCtx.setItinerary(itinerary);
    }
  }, [itinerary]);

  // ── Load live data (weather, forecast, AQI, exchange rate, trending) when live tab is active ──
  useEffect(() => {
    if (activePhase !== 'live') return;
    let cancelled = false;

    const handle = InteractionManager.runAfterInteractions(() => {
      const destName = cleanDestination(params.destination || trip.destination);

      // Load trending
      setTrendingLoading(true);
      getTrendingSuggestionsAsync(destName).then(results => {
        if (!cancelled && results.length > 0) setAsyncTrending(results);
      }).finally(() => {
        if (!cancelled) setTrendingLoading(false);
      });

      // Load weather + forecast + AQI + exchange rate
      getLiveDataAsync(destName).then(data => {
        if (!cancelled) setLiveData(data);
      });
    });

    return () => { cancelled = true; handle.cancel(); };
  }, [activePhase, params.destination, trip.destination]);

  // ── Generate smart daily briefing when live data is ready ──
  useEffect(() => {
    if (!liveData?.realWeather || dailyBriefing) return;
    let cancelled = false;

    const handle = InteractionManager.runAfterInteractions(() => {
      const destName = cleanDestination(params.destination || trip.destination);
      const currentDay = getCurrentDayNumber(params.startDate);
      const totalDays = itinerary.length || 5;
      const todayPlan = getTodayItinerary(itinerary, currentDay);

      const context: LiveContext = {
        weather: liveData.realWeather ? {
          temp: liveData.realWeather.temp,
          condition: liveData.realWeather.condition,
          alert: liveData.realWeather.alert,
          humidity: liveData.realWeather.humidity,
          windSpeed: liveData.realWeather.windSpeed,
        } : undefined,
        sunrise: liveData.realWeather?.sunrise,
        sunset: liveData.realWeather?.sunset,
        aqi: liveData.aqi ? { label: liveData.aqi.label, advice: liveData.aqi.advice } : undefined,
        forecast: liveData.forecast.slice(0, 3).map(f => ({
          date: f.date,
          high: f.high,
          low: f.low,
          condition: f.condition,
          pop: f.pop,
        })),
        currentDay,
        totalDays,
        todayActivities: todayPlan?.items.map(i => i.title) || [],
      };

      generateDailyBriefing(destName, context).then(briefing => {
        if (!cancelled) setDailyBriefing(briefing);
      }).catch(() => {});
    });

    return () => { cancelled = true; handle.cancel(); };
  }, [liveData, params.destination, trip.destination]);

  // ── Schedule local push notifications ────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!params.startDate || !params.endDate || params.startDate === 'TBD' || params.endDate === 'TBD') return;

    const handle = InteractionManager.runAfterInteractions(() => {
    const scheduleTripNotifications = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;

        await Notifications.cancelAllScheduledNotificationsAsync();

        const start = new Date(params.startDate!);
        const end = new Date(params.endDate!);
        const now = new Date();
        const tripName = trip.name;
        const destination = cleanDestination(params.destination || trip.destination);

        // 1 day before start
        const dayBefore = new Date(start);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(18, 0, 0, 0);
        if (dayBefore > now) {
          await Notifications.scheduleNotificationAsync({
            content: { title: '✈️ Trip tomorrow!', body: `${tripName} to ${destination} starts tomorrow!` },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayBefore },
          });
        }

        // Morning of start
        const morningOf = new Date(start);
        morningOf.setHours(8, 0, 0, 0);
        if (morningOf > now) {
          await Notifications.scheduleNotificationAsync({
            content: { title: '🎉 It\'s go time!', body: `Your ${tripName} adventure begins today!` },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningOf },
          });
        }

        // 1 day after end
        const dayAfterEnd = new Date(end);
        dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
        dayAfterEnd.setHours(10, 0, 0, 0);
        if (dayAfterEnd > now) {
          await Notifications.scheduleNotificationAsync({
            content: { title: '📸 How was it?', body: `${tripName} just ended — time to recap!` },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayAfterEnd },
          });
        }

        console.log('[TrailMate] Trip notifications scheduled');
      } catch (e) {
        console.log('[TrailMate] Could not schedule notifications:', e);
      }
    };

    scheduleTripNotifications();
    });
    return () => handle.cancel();
  }, [params.startDate, params.endDate]);

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
  const inviteLink = `https://trailmate.app/join/${inviteCode}`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleShare = async (channel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = `Join my trip "${trip.name}" to ${trip.destination} on TrailMate!`;
    const msg = `${text}\n\n${inviteLink}`;
    try {
      await Share.share({
        message: msg,
        title: `Join ${trip.name} on TrailMate`,
        url: inviteLink,
      });
    } catch {}
  };

  // ── Dismiss alert helper ──────────────────────────────────────────────
  const dismissAlert = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  // ── Alert banner renderer ──────────────────────────────────────────────
  const renderAlertBanner = (id: string, emoji: string, text: string, borderColor: string, bgColor: string) => {
    if (dismissedAlerts.has(id)) return null;
    return (
      <View key={id} style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: bgColor,
        borderLeftWidth: 3, borderLeftColor: borderColor,
        borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
      }}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
        <Text style={{ flex: 1, fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.text }}>{text}</Text>
        <Pressable onPress={() => dismissAlert(id)} hitSlop={10}>
          <Text style={{ fontSize: 18, color: Colors.textMuted, fontWeight: '600' }}>×</Text>
        </Pressable>
      </View>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // ITINERARY ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  // ── Open time modal (pre-fill from flight bookings) ─────────────────────
  const openTimeModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const detected = detectFlightTimes(tripCtx.bookings, params.startDate, params.endDate);
    setArrivalTime(detected.arrivalTime || '12:00 PM');
    setDepartureTime(detected.departureTime || '6:00 PM');
    setHasReturnFlight(detected.hasReturnFlight);
    setShowTimeModal(true);
  }, [tripCtx.bookings, params.startDate, params.endDate]);

  // ── AI Generation ──────────────────────────────────────────────────────
  const startAIGeneration = useCallback((arrTime?: string, depTime?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTimeModal(false);
    setItineraryStatus('generating');

    // Save times for regeneration
    if (arrTime || depTime) {
      lastTimesRef.current = { arrival: arrTime || '12:00 PM', departure: depTime || '6:00 PM', hasFlight: hasReturnFlight };
    }

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

    // Clear any previous generation timeouts
    timeoutIdsRef.current.forEach(id => clearTimeout(id));
    timeoutIdsRef.current = [];

    delays.forEach((delay, i) => {
      accumulated += delay;
      const tid = setTimeout(() => {
        setGenSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, done: true } : s));
        if (i < delays.length - 1) {
          setGenCurrentStep(i + 1);
        }
      }, accumulated);
      timeoutIdsRef.current.push(tid);
    });

    // Generate actual itinerary after animation (async with fallback)
    const finalTid = setTimeout(async () => {
      const genParams = {
        destination: params.destination || trip.destination,
        startDate: params.startDate || '',
        endDate: params.endDate || '',
        styles: tripStyles,
        tripType: (params.tripType as 'solo' | 'group') || 'solo',
        arrivalTime: arrTime,
        departureTime: depTime,
        hasFlightBooking: hasReturnFlight || undefined,
      };

      const generated = await generateItineraryAsync(genParams);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItinerary(generated);
      setItineraryStatus('ready');
      setBuiltFromScratch(false);
      setGenCurrentStep(-1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, accumulated + 800);
    timeoutIdsRef.current.push(finalTid);
  }, [params.destination, params.startDate, params.endDate, params.tripType, tripStyles, trip.destination, hasReturnFlight]);

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
  const doRegenerate = useCallback(() => {
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

    // Clear any previous generation timeouts
    timeoutIdsRef.current.forEach(id => clearTimeout(id));
    timeoutIdsRef.current = [];

    const delays = [1000, 1500, 1500, 1000];
    let accumulated = 0;

    delays.forEach((delay, i) => {
      accumulated += delay;
      const tid = setTimeout(() => {
        setGenSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, done: true } : s));
        if (i < delays.length - 1) setGenCurrentStep(i + 1);
      }, accumulated);
      timeoutIdsRef.current.push(tid);
    });

    const savedTimes = lastTimesRef.current;
    const finalTid = setTimeout(async () => {
      const genParams = {
        destination: params.destination || trip.destination,
        startDate: params.startDate || '',
        endDate: params.endDate || '',
        styles: tripStyles,
        tripType: (params.tripType as 'solo' | 'group') || 'solo',
        arrivalTime: savedTimes?.arrival,
        departureTime: savedTimes?.departure,
        hasFlightBooking: savedTimes?.hasFlight || undefined,
      };

      const generated = await generateItineraryAsync(genParams);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItinerary(generated);
      setItineraryStatus('ready');
      setBuiltFromScratch(false);
      setGenCurrentStep(-1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, accumulated + 800);
    timeoutIdsRef.current.push(finalTid);
  }, [params.destination, params.startDate, params.endDate, params.tripType, tripStyles, trip.destination]);

  const handleRegenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    crossAlert(
      'Regenerate itinerary?',
      'This will replace your current plan. Any edits will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: doRegenerate,
        },
      ],
    );
  }, [params.destination, params.startDate, params.endDate, params.tripType, tripStyles, trip.destination]);

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
    setFormAssignedTo('');
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
    setFormAssignedTo(item.assignedTo || '');
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
                        assignedTo: formAssignedTo || undefined,
                      }
                    : it,
                ),
              }
            : day,
        ),
      );
    } else {
      // Add new
      const newItem = {
        ...createNewItem({
          title: formTitle.trim(),
          type: formType,
          time: formTime,
          duration: formDuration || undefined,
          location: formLocation || undefined,
          notes: formNotes || undefined,
        }),
        assignedTo: formAssignedTo || undefined,
      };
      setItinerary(prev =>
        prev.map(day =>
          day.id === editingDayId
            ? { ...day, items: [...day.items, newItem] }
            : day,
        ),
      );
    }

    setShowAddItemSheet(false);
  }, [formTitle, formType, formTime, formDuration, formLocation, formNotes, formAssignedTo, editingDayId, editingItem]);

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
    crossAlert(
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
        defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJhAPk3KFb1AAAAABJRU5ErkJggg==' }}
        style={[styles.hero, { paddingTop: insets.top }]}
      >
        <View style={styles.heroGradient} pointerEvents="none">
          <LinearGradient
            colors={['rgba(44,37,32,0.4)', 'transparent', 'rgba(44,37,32,0.7)']}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        <View style={styles.heroHeader}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.canGoBack() ? router.back() : router.push('/'); }} style={styles.backButton} hitSlop={20}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Notification bell */}
            <Pressable
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/notifications' as any);
              }}
              hitSlop={20}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.white} />
              <View style={styles.notifDot} />
            </Pressable>
            {/* Three dots with badge */}
            <Pressable
              style={styles.moreButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTripMenu(prev => !prev);
              }}
              hitSlop={20}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={Colors.white} />
              <View style={styles.notifDot} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroDestination}>
            {trip.emoji} {trip.destination}
          </Text>
          <Text style={styles.heroTitle}>{localTripName}</Text>
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
                  {canInvite && (
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowInviteSheet(true); }}
                      style={[styles.squadAvatar, styles.squadAddBtn, { marginLeft: -8, zIndex: 1 }]}
                    >
                      <Text style={styles.squadAddText}>+</Text>
                    </Pressable>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.squadLabel}>
                    {squad.length === 1 ? 'Just you so far' : `${squad.length} in the squad`}
                  </Text>
                  {canInvite && (
                    <Pressable onPress={() => setShowInviteSheet(true)} hitSlop={8}>
                      <Text style={styles.squadInviteLink}>+ Invite your crew</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* ── Plan Phase Alerts ──────────────────────── */}
            {(() => {
              const alerts: React.ReactNode[] = [];
              // Countdown alert — trip starts within 14 days
              if (params.startDate && params.startDate !== 'TBD') {
                const daysUntil = Math.ceil((new Date(params.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysUntil > 0 && daysUntil <= 14) {
                  alerts.push(renderAlertBanner('plan-countdown', '⏰', `Trip starts in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — finish your plan!`, '#E67E22', 'rgba(230,126,34,0.1)'));
                }
              }
              // Empty itinerary alert
              if (itineraryStatus === 'empty') {
                alerts.push(renderAlertBanner('plan-empty', '📝', 'No itinerary yet — tap AI Plan to get started', Colors.accent, `${Colors.accent}18`));
              }
              // Solo + no invites
              if (isSoloTrip && squad.length <= 1) {
                alerts.push(renderAlertBanner('plan-solo', '👥', 'Going solo? Invite friends from the squad bar above', '#4A8BA8', 'rgba(74,139,168,0.1)'));
              }
              return alerts.length > 0 ? <View style={{ marginBottom: Spacing.sm }}>{alerts}</View> : null;
            })()}

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
                  onPress={openTimeModal}
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
                        crossAlert(
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
                            {canEditItinerary && (
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
                            )}
                          </View>

                          <View style={styles.itineraryContent}>
                            <View style={[styles.livePlanIcon, { backgroundColor: `${CATEGORY_COLORS[item.type] || Colors.sage}18` }]}>
                              <Ionicons
                                name={(CATEGORY_IONICONS[item.type] || 'flag') as any}
                                size={18}
                                color={CATEGORY_COLORS[item.type] || Colors.sage}
                              />
                            </View>
                            <Text style={styles.itineraryTitle}>{item.title}</Text>
                          </View>

                          {/* Assigned To */}
                          {item.assignedTo && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Ionicons name="person-outline" size={12} color={Colors.accent} />
                              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.accent }}>{item.assignedTo}</Text>
                            </View>
                          )}

                          {/* Location */}
                          {item.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.itineraryLocation}>{item.location}</Text>
                            </View>
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
                    {canEditItinerary && (
                      <Pressable
                        onPress={() => openAddItem(day.id)}
                        style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={styles.addItemBtnText}>+ Add activity</Text>
                      </Pressable>
                    )}
                  </View>
                ))}

                {/* Add another day */}
                {canEditItinerary && (
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
                )}
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Plan Essentials — sticky bottom grid ────── */}
          <View style={styles.essentialsBar}>
            <View style={styles.essentialsGrid}>
              {[
                { icon: 'wallet-outline' as const, label: 'Stash', route: '/trip/stash' },
                { icon: 'chatbubbles-outline' as const, label: 'Chat', route: '/trip/chat' },
                { icon: 'stats-chart-outline' as const, label: 'Polls', route: '/trip/polls' },
              ].map((f, i) => (
                <Pressable
                  key={`ess-${i}`}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: f.route as any, params: { tripId: params.id, tripName: trip.name, destination: params.destination || '' } }); }}
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
          const weather = liveData?.weather || getSimulatedWeather(destName);
          const preTripAlerts = getPreTripAlerts(destName);
          const syncTrending = getTrendingSuggestions(destName);
          const trending = asyncTrending.length > 0 ? asyncTrending : syncTrending;
          const aiSuggestions = generateAIRescheduleSuggestions(todayPlan?.items || [], weather)
            .filter(s => !dismissedSuggestions.has(s.id));

          return (
          <>
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
                    {liveData?.realWeather ? ` · Feels ${liveData.realWeather.feelsLike}°C` : ''}
                  </Text>
                </View>
                <Ionicons name={weather.icon as any} size={32} color={Colors.white} />
              </View>

              {/* Real weather details row */}
              {liveData?.realWeather && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="water-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{liveData.realWeather.humidity}%</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="speedometer-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{liveData.realWeather.windSpeed} m/s</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="sunny-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{liveData.realWeather.sunrise}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="moon-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{liveData.realWeather.sunset}</Text>
                  </View>
                </View>
              )}

              {weather.alert && (
                <View style={styles.liveWeatherAlert}>
                  <Ionicons name="warning-outline" size={14} color="#FBBF24" />
                  <Text style={styles.liveWeatherAlertText}>{weather.alert}</Text>
                </View>
              )}

              {/* Smart AI Briefing */}
              {dailyBriefing && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="sparkles" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>AI BRIEFING</Text>
                  </View>
                  <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.white, lineHeight: 20 }}>{dailyBriefing}</Text>
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

            {/* ── Forecast + AQI + Exchange Rate row ────────── */}
            {(liveData?.forecast.length || liveData?.aqi || liveData?.exchangeRate) ? (
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                {/* Forecast mini cards */}
                {liveData?.forecast.length ? (
                  <View style={{ flex: 2, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadows.card }}>
                    <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.textMuted, marginBottom: 8 }}>FORECAST</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {liveData.forecast.slice(0, 4).map((f, fi) => (
                        <View key={`fc-${fi}`} style={{ alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.textSecondary }}>{f.date}</Text>
                          <Ionicons name={f.icon as any} size={18} color={Colors.sage} />
                          <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.text }}>{f.high}°</Text>
                          <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted }}>{f.low}°</Text>
                          {f.pop > 20 && (
                            <Text style={{ fontFamily: Fonts.body, fontSize: 9, color: '#3B82F6' }}>{f.pop}%</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* AQI + Exchange Rate column */}
                <View style={{ flex: 1, gap: Spacing.sm }}>
                  {liveData?.aqi && (
                    <View style={{ backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadows.card }}>
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.textMuted, marginBottom: 4 }}>AIR QUALITY</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: liveData.aqi.color }} />
                        <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text }}>{liveData.aqi.label}</Text>
                      </View>
                    </View>
                  )}
                  {liveData?.exchangeRate && (
                    <View style={{ backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadows.card }}>
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.textMuted, marginBottom: 4 }}>EXCHANGE</Text>
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text }}>
                        1 {liveData.exchangeRate.from} = {liveData.exchangeRate.rate.toFixed(2)} {getCurrencySymbol(liveData.exchangeRate.to)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* ── Live Phase Alerts ──────────────────────── */}
            <View style={{ marginTop: Spacing.sm }}>
              {renderAlertBanner('live-day', '📍', `Day ${currentDay} of ${totalDays} — make it count!`, '#5E8A5A', 'rgba(94,138,90,0.1)')}
              {renderAlertBanner('live-packing', '🎒', 'Don\'t forget to check your packing list', '#9B59B6', 'rgba(155,89,182,0.1)')}
            </View>

            {/* ── B) Today's Plan Timeline ────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <Text style={styles.liveSectionTitle}>TODAY'S PLAN</Text>
              {todayPlan && todayPlan.items.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowMapView(!showMapView);
                    }}
                    style={[styles.liveViewToggle, showMapView && styles.liveViewToggleActive]}
                  >
                    <Ionicons name={showMapView ? 'list' : 'map'} size={16} color={showMapView ? Colors.white : Colors.sage} />
                    <Text style={[styles.liveViewToggleText, showMapView && { color: Colors.white }]}>
                      {showMapView ? 'List' : 'Map'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Map View */}
            {showMapView && todayPlan && todayPlan.items.length > 0 ? (
              <View style={styles.liveMapCard}>
                <LinearGradient
                  colors={['#E8F5E9', '#F1F8E9']}
                  style={styles.liveMapGradient}
                >
                  <View style={styles.liveMapHeader}>
                    <Ionicons name="navigate-circle" size={24} color={Colors.sage} />
                    <Text style={styles.liveMapTitle}>Today's Route</Text>
                    <Text style={styles.liveMapCount}>{todayPlan.items.length} stops</Text>
                  </View>
                  {todayPlan.items.map((item, i, arr) => (
                    <Pressable
                      key={`map-${item.id}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const query = encodeURIComponent(`${item.location || item.title}, ${destName}`);
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                      }}
                      style={({ pressed }) => [styles.liveMapStop, pressed && { backgroundColor: 'rgba(94,138,90,0.08)' }]}
                    >
                      <View style={styles.liveMapStopLeft}>
                        <View style={[styles.liveMapStopNumber, { backgroundColor: CATEGORY_COLORS[item.type] || Colors.sage }]}>
                          <Text style={styles.liveMapStopNumberText}>{i + 1}</Text>
                        </View>
                        {i < arr.length - 1 && <View style={styles.liveMapStopLine} />}
                      </View>
                      <View style={styles.liveMapStopContent}>
                        <Text style={styles.liveMapStopTime}>{item.time}</Text>
                        <Text style={styles.liveMapStopTitle}>{item.title}</Text>
                        {item.location && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Ionicons name="location" size={12} color={Colors.sage} />
                            <Text style={styles.liveMapStopLocation}>{item.location}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.liveMapStopAction}>
                        <Ionicons name="navigate-outline" size={18} color={Colors.sage} />
                      </View>
                    </Pressable>
                  ))}
                  {/* Open all in Maps */}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const firstItem = todayPlan.items[0];
                      const query = encodeURIComponent(`${firstItem.location || firstItem.title}, ${destName}`);
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                    }}
                    style={({ pressed }) => [styles.liveMapOpenAll, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="open-outline" size={16} color={Colors.sage} />
                    <Text style={styles.liveMapOpenAllText}>Open in Google Maps</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            ) : todayPlan && todayPlan.items.length > 0 ? (
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
                  <Pressable
                    style={({ pressed }) => [styles.itineraryCard, pressed && { backgroundColor: '#F9F6F2' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.itineraryTime}>{item.time}</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {/* Map pin */}
                        {item.location && (
                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              const query = encodeURIComponent(`${item.location}, ${destName}`);
                              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                            }}
                            hitSlop={8}
                            style={styles.liveItemAction}
                          >
                            <Ionicons name="navigate-outline" size={15} color={Colors.sage} />
                          </Pressable>
                        )}
                        {/* Edit */}
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setLiveEditItem(item);
                            setLiveEditTime(item.time);
                            setLiveEditTitle(item.title);
                          }}
                          hitSlop={8}
                          style={styles.liveItemAction}
                        >
                          <Ionicons name="create-outline" size={15} color={Colors.accent} />
                        </Pressable>
                        {/* Delete */}
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            crossAlert(
                              'Remove Activity',
                              `Remove "${item.title}" from today's plan?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: () => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setItinerary(prev => prev.map(day =>
                                      day.dayNumber === currentDay
                                        ? { ...day, items: day.items.filter(it => it.id !== item.id) }
                                        : day
                                    ));
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  },
                                },
                              ]
                            );
                          }}
                          hitSlop={8}
                          style={styles.liveItemAction}
                        >
                          <Ionicons name="trash-outline" size={15} color={Colors.error} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.itineraryContent}>
                      <View style={[styles.livePlanIcon, { backgroundColor: `${CATEGORY_COLORS[item.type] || Colors.sage}18` }]}>
                        <Ionicons
                          name={(CATEGORY_IONICONS[item.type] || 'flag') as any}
                          size={18}
                          color={CATEGORY_COLORS[item.type] || Colors.sage}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itineraryTitle}>{item.title}</Text>
                        {item.location && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                            <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted }}>{item.location}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {item.duration && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                        <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted }}>{item.duration}</Text>
                      </View>
                    )}
                    {item.aiTip ? (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6, backgroundColor: `${Colors.sage}08`, padding: 8, borderRadius: 8 }}>
                        <Ionicons name="sparkles" size={12} color={Colors.sage} style={{ marginTop: 1 }} />
                        <Text style={{ fontFamily: Fonts.body, fontStyle: 'italic', fontSize: FontSizes.xs, color: Colors.textSecondary, flex: 1 }}>
                          {item.aiTip}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyDayMsg}>
                <Ionicons name="calendar-outline" size={28} color={Colors.textMuted} />
                <Text style={[styles.emptyDayText, { marginTop: 8 }]}>No plan yet for today</Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 }}>
                  Add activities from AI Suggestions or Trending below
                </Text>
              </View>
            )}

            {/* ── Edit Item Modal ────────────────────────── */}
            {liveEditItem && (
              <Modal visible={!!liveEditItem} transparent animationType="fade" onRequestClose={() => setLiveEditItem(null)}>
                <View style={styles.trendingModalOverlay}>
                  <View style={[styles.trendingModalSheet, { maxHeight: '50%' as any }]}>
                    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
                      <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                      <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text }}>Edit Activity</Text>
                      <Pressable onPress={() => setLiveEditItem(null)} style={styles.trendingModalClose}>
                        <Ionicons name="close" size={22} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                    <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 6 }}>TITLE</Text>
                    <TextInput
                      style={styles.liveEditInput}
                      value={liveEditTitle}
                      onChangeText={setLiveEditTitle}
                      placeholder="Activity name"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 6, marginTop: Spacing.md }}>TIME</Text>
                    <TextInput
                      style={styles.liveEditInput}
                      value={liveEditTime}
                      onChangeText={setLiveEditTime}
                      placeholder="e.g. 09:00"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setItinerary(prev => prev.map(day =>
                          day.dayNumber === currentDay
                            ? {
                                ...day,
                                items: day.items.map(it =>
                                  it.id === liveEditItem.id
                                    ? { ...it, title: liveEditTitle.trim() || it.title, time: liveEditTime.trim() || it.time }
                                    : it
                                ),
                              }
                            : day
                        ));
                        setLiveEditItem(null);
                      }}
                      style={({ pressed }) => [styles.trendingModalAddBtn, { marginTop: Spacing.lg }, pressed && { opacity: 0.85 }]}
                    >
                      <LinearGradient colors={['#5E8A5A', '#4A7A4A']} style={styles.trendingModalAddGradient}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                        <Text style={styles.trendingModalAddText}>Save Changes</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </Modal>
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
                            // Build new item from suggestion
                            const newItem: ItineraryItem = {
                              id: `ai-${Date.now()}`,
                              time: suggestion.type === 'reschedule' ? '09:00' : '12:00',
                              title: suggestion.title.replace(/^(Add |Move )/, '').replace(/^(a |an )/, ''),
                              emoji: '✨',
                              type: 'activity',
                              duration: '1h',
                              aiTip: suggestion.reason,
                              source: 'ai',
                            };
                            setItinerary(prev => {
                              const dayExists = prev.some(d => d.dayNumber === currentDay);
                              if (dayExists) {
                                return prev.map(day =>
                                  day.dayNumber === currentDay
                                    ? { ...day, items: [...day.items, newItem] }
                                    : day
                                );
                              }
                              // Create the day if it doesn't exist
                              return [...prev, { id: `day-${currentDay}`, dayNumber: currentDay, title: `Day ${currentDay}`, items: [newItem] }];
                            });
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setDismissedSuggestions(prev => new Set([...prev, suggestion.id]));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            crossAlert(
                              'Added to Today\'s Plan!',
                              `"${newItem.title}" has been added to your itinerary`
                            );
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
            {(trending.length > 0 || trendingLoading) && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                  <Text style={styles.liveSectionTitle}>TRENDING NEARBY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="flame" size={14} color="#EF4444" />
                    <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted }}>{trendingLoading ? 'Loading...' : `${trending.length} spots`}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
                  {trending.map((item, idx) => {
                    const fullStars = Math.floor(item.rating);
                    const hasHalf = item.rating - fullStars >= 0.3;
                    return (
                      <Pressable
                        key={`trend-${idx}`}
                        style={({ pressed }) => [styles.liveTrendingCard, pressed && { transform: [{ scale: 0.96 }] }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setTrendingDetail(item);
                        }}
                      >
                        {/* Gradient accent strip at top */}
                        <LinearGradient
                          colors={item.stype === 'food' ? ['#F59E0B', '#EF4444'] : ['#5E8A5A', '#3B82F6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ height: 3, borderTopLeftRadius: BorderRadius.md, borderTopRightRadius: BorderRadius.md, marginTop: -12, marginHorizontal: -12, marginBottom: 10 }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <View style={[styles.liveTrendingIcon, { backgroundColor: item.stype === 'food' ? '#FEF3C7' : `${Colors.sage}15` }]}>
                            <Ionicons
                              name={item.stype === 'food' ? 'restaurant' : 'compass'}
                              size={18}
                              color={item.stype === 'food' ? '#F59E0B' : Colors.sage}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.liveTrendingTitle} numberOfLines={1}>{item.tl}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Ionicons name="location-outline" size={10} color={Colors.textMuted} />
                              <Text style={styles.liveTrendingLocation} numberOfLines={1}>{item.l}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, marginBottom: 8 }} numberOfLines={2}>{item.desc}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={styles.liveTrendingRating}>
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Ionicons
                                key={`star-${idx}-${si}`}
                                name={si < fullStars ? 'star' : (si === fullStars && hasHalf ? 'star-half' : 'star-outline')}
                                size={12}
                                color="#FBBF24"
                              />
                            ))}
                            <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.text, marginLeft: 4 }}>{item.rating}</Text>
                          </View>
                          <Text style={styles.liveTrendingPrice}>{item.price}</Text>
                        </View>
                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {item.tags.slice(0, 3).map((tag, ti) => (
                              <View key={`tag-${idx}-${ti}`} style={[
                                styles.liveTrendingTag,
                                tag === 'Open Now' && { backgroundColor: 'rgba(76,175,80,0.12)' },
                                tag === 'Closed' && { backgroundColor: 'rgba(244,67,54,0.12)' },
                              ]}>
                                <Text style={[
                                  styles.liveTrendingTagText,
                                  tag === 'Open Now' && { color: '#4CAF50' },
                                  tag === 'Closed' && { color: '#F44336' },
                                ]}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {/* Tap hint */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
                          <Ionicons name="add-circle" size={16} color={Colors.sage} />
                          <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.sage }}>Tap to explore</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* ── Bottom spacer for fixed bar ────────────── */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── E) Expandable Command Center ──────────── */}
          <View style={styles.liveBottomBar} pointerEvents="box-none">
            <LinearGradient
              colors={['rgba(247,243,238,0)', 'rgba(247,243,238,0.9)', 'rgba(247,243,238,1)']}
              style={styles.liveBottomFade}
              pointerEvents="none"
            />

            {/* Expanded overlay backdrop */}
            {dockExpanded && (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDockExpanded(false);
                  Animated.spring(dockAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
                }}
              />
            )}

            {/* Expanded cards */}
            {dockExpanded && (
              <Animated.View style={[styles.dockExpandedCards, {
                opacity: dockAnim,
                transform: [{ translateY: dockAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              }]}>
                {/* Journal Card */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDockExpanded(false);
                    Animated.spring(dockAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
                    router.push({ pathname: '/trip/journal' as any, params: { tripId: params.id, destination: params.destination || '', startDate: params.startDate || '', endDate: params.endDate || '' } });
                  }}
                  style={({ pressed }) => [styles.dockCard, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <LinearGradient
                    colors={['#5E8A5A', '#3D6B39']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dockCardGradient}
                  >
                    <View style={styles.dockCardIconRow}>
                      <View style={styles.dockCardIconCircle}>
                        <Ionicons name="book" size={22} color="#5E8A5A" />
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                    <Text style={styles.dockCardTitle}>Journal</Text>
                    <Text style={styles.dockCardSub}>Write, snap photos, record voice</Text>
                    <View style={styles.dockCardFeatures}>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="pencil" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Write</Text>
                      </View>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="camera" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Photo</Text>
                      </View>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="mic" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Voice</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Expense Card */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDockExpanded(false);
                    Animated.spring(dockAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
                    router.push({ pathname: '/trip/stash' as any, params: { tripId: params.id, destination: params.destination || '', startDate: params.startDate || '', endDate: params.endDate || '' } });
                  }}
                  style={({ pressed }) => [styles.dockCard, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <LinearGradient
                    colors={['#B07A50', '#8B5E3C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dockCardGradient}
                  >
                    <View style={styles.dockCardIconRow}>
                      <View style={styles.dockCardIconCircle}>
                        <Ionicons name="wallet" size={22} color="#B07A50" />
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                    <Text style={styles.dockCardTitle}>Stash</Text>
                    <Text style={styles.dockCardSub}>Spending, bookings & more</Text>
                    <View style={styles.dockCardFeatures}>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="card" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Log</Text>
                      </View>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="camera" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Receipt</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Poll Card */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDockExpanded(false);
                    Animated.spring(dockAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
                    router.push({ pathname: '/trip/polls' as any, params: { tripId: params.id } });
                  }}
                  style={({ pressed }) => [styles.dockCard, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <LinearGradient
                    colors={['#6366F1', '#4338CA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dockCardGradient}
                  >
                    <View style={styles.dockCardIconRow}>
                      <View style={styles.dockCardIconCircle}>
                        <Ionicons name="stats-chart" size={22} color="#6366F1" />
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                    <Text style={styles.dockCardTitle}>Polls</Text>
                    <Text style={styles.dockCardSub}>Vote with your crew</Text>
                    <View style={styles.dockCardFeatures}>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="people" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Group</Text>
                      </View>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="checkmark-circle" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Vote</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Chat Card */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDockExpanded(false);
                    Animated.spring(dockAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
                    router.push({ pathname: '/trip/chat' as any, params: { tripId: params.id, tripName: trip.name } });
                  }}
                  style={({ pressed }) => [styles.dockCard, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <LinearGradient
                    colors={['#4A8BA8', '#2E6B85']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dockCardGradient}
                  >
                    <View style={styles.dockCardIconRow}>
                      <View style={styles.dockCardIconCircle}>
                        <Ionicons name="chatbubbles" size={22} color="#4A8BA8" />
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                    <Text style={styles.dockCardTitle}>Group Chat</Text>
                    <Text style={styles.dockCardSub}>Talk with your squad</Text>
                    <View style={styles.dockCardFeatures}>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="chatbubble" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Message</Text>
                      </View>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="people" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Squad</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Activity Card */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDockExpanded(false);
                    Animated.spring(dockAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
                    router.push({ pathname: '/trip/activity' as any, params: { tripId: params.id } });
                  }}
                  style={({ pressed }) => [styles.dockCard, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <LinearGradient
                    colors={['#D4A574', '#B07A50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dockCardGradient}
                  >
                    <View style={styles.dockCardIconRow}>
                      <View style={styles.dockCardIconCircle}>
                        <Ionicons name="time" size={22} color="#D4A574" />
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.6)" />
                    </View>
                    <Text style={styles.dockCardTitle}>Activity</Text>
                    <Text style={styles.dockCardSub}>See what your squad's been up to</Text>
                    <View style={styles.dockCardFeatures}>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="list" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Feed</Text>
                      </View>
                      <View style={styles.dockCardFeaturePill}>
                        <Ionicons name="notifications" size={11} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.dockCardFeatureText}>Updates</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Collapsed FAB pill */}
            <View style={{ alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 28 : 12 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const expanding = !dockExpanded;
                  setDockExpanded(expanding);
                  Animated.spring(dockAnim, {
                    toValue: expanding ? 1 : 0,
                    useNativeDriver: true,
                    friction: 7,
                    tension: 50,
                  }).start();
                }}
                style={({ pressed }) => [styles.dockFab, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <LinearGradient
                  colors={dockExpanded ? ['#374151', '#1F2937'] : ['#1F2937', '#111827']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.dockFabGradient}
                >
                  {!dockExpanded ? (
                    <>
                      <View style={[styles.dockFabDot, { backgroundColor: '#5E8A5A' }]} />
                      <View style={[styles.dockFabDot, { backgroundColor: '#B07A50' }]} />
                      <View style={[styles.dockFabDot, { backgroundColor: '#6366F1' }]} />
                      <View style={[styles.dockFabDot, { backgroundColor: '#4A8BA8' }]} />
                      <Text style={styles.dockFabLabel}>Quick Actions</Text>
                      <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.5)" />
                    </>
                  ) : (
                    <>
                      <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.dockFabLabel}>Close</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* ── Trending Detail Modal ──────────────────── */}
          {trendingDetail && (
            <Modal
              visible={!!trendingDetail}
              transparent
              animationType="slide"
              onRequestClose={() => setTrendingDetail(null)}
            >
              <View style={styles.trendingModalOverlay}>
                <View style={styles.trendingModalSheet}>
                  {/* Handle bar */}
                  <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                  </View>
                  {/* Header */}
                  <View style={styles.trendingModalHeader}>
                    <View style={[styles.trendingModalIconWrap, { backgroundColor: trendingDetail.stype === 'food' ? '#FEF3C7' : `${Colors.sage}15` }]}>
                      <Ionicons
                        name={trendingDetail.stype === 'food' ? 'restaurant' : 'compass'}
                        size={28}
                        color={trendingDetail.stype === 'food' ? '#F59E0B' : Colors.sage}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trendingModalTitle}>{trendingDetail.tl}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="location" size={13} color={Colors.sage} />
                        <Text style={styles.trendingModalLocation}>{trendingDetail.l}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => setTrendingDetail(null)} style={styles.trendingModalClose}>
                      <Ionicons name="close" size={22} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                  {/* Rating + Price row */}
                  <View style={styles.trendingModalMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flexDirection: 'row', gap: 1 }}>
                        {Array.from({ length: 5 }).map((_, si) => {
                          const fs = Math.floor(trendingDetail.rating);
                          const hh = trendingDetail.rating - fs >= 0.3;
                          return (
                            <Ionicons
                              key={`modal-star-${si}`}
                              name={si < fs ? 'star' : (si === fs && hh ? 'star-half' : 'star-outline')}
                              size={16}
                              color="#FBBF24"
                            />
                          );
                        })}
                      </View>
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text }}>{trendingDetail.rating}</Text>
                    </View>
                    <View style={styles.trendingModalPriceBadge}>
                      <Ionicons name="pricetag" size={13} color={Colors.sage} />
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.sage }}>{trendingDetail.price}</Text>
                    </View>
                  </View>
                  {/* Description */}
                  <Text style={styles.trendingModalDesc}>{trendingDetail.desc}</Text>
                  {/* AI insight */}
                  {trendingDetail.ai ? (
                    <View style={styles.trendingModalAI}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="sparkles" size={14} color={Colors.sage} />
                        <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xs, color: Colors.sage }}>AI Insight</Text>
                      </View>
                      <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 }}>{trendingDetail.ai}</Text>
                    </View>
                  ) : null}
                  {/* Tags */}
                  {trendingDetail.tags && trendingDetail.tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg }}>
                      {trendingDetail.tags.map((tag, ti) => (
                        <View key={`mtag-${ti}`} style={styles.trendingModalTag}>
                          <Text style={styles.trendingModalTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Add to Plan button */}
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      const newItem: ItineraryItem = {
                        id: `trend-${Date.now()}`,
                        time: trendingDetail.stype === 'food' ? '13:00' : '15:00',
                        title: trendingDetail.tl,
                        emoji: '✨',
                        type: trendingDetail.stype === 'food' ? 'food' : 'activity',
                        duration: '1.5h',
                        location: trendingDetail.l,
                        aiTip: trendingDetail.ai || `Trending — rated ${trendingDetail.rating}/5`,
                        source: 'ai',
                      };
                      setItinerary(prev => {
                        const dayExists = prev.some(d => d.dayNumber === currentDay);
                        if (dayExists) {
                          return prev.map(day =>
                            day.dayNumber === currentDay
                              ? { ...day, items: [...day.items, newItem] }
                              : day
                          );
                        }
                        return [...prev, { id: `day-${currentDay}`, dayNumber: currentDay, title: `Day ${currentDay}`, items: [newItem] }];
                      });
                      setTrendingDetail(null);
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      crossAlert('Added to Today\'s Plan!', `"${trendingDetail.tl}" is now in your itinerary`);
                    }}
                    style={({ pressed }) => [styles.trendingModalAddBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                  >
                    <LinearGradient
                      colors={['#5E8A5A', '#4A7A4A']}
                      style={styles.trendingModalAddGradient}
                    >
                      <Ionicons name="add-circle" size={20} color={Colors.white} />
                      <Text style={styles.trendingModalAddText}>Add to Today's Plan</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </Modal>
          )}
          </>
          );
        })()}

        {/* ══════════════════════════════════════════════════════
            RECAP TAB
        ══════════════════════════════════════════════════════ */}
        {activePhase === 'review' && (() => {
          const destName = cleanDestination(params.destination || trip.destination);
          const dayTotal = itinerary.length || 5;
          const activityTotal = itinerary.reduce((s, d) => s + d.items.length, 0);
          const recapParams = `destination=${encodeURIComponent(destName)}&tripName=${encodeURIComponent(trip.name)}&dayCount=${dayTotal}`;

          const RECAP_ACTIONS = [
            { icon: 'swap-horizontal' as const, tab: 'settle', label: 'Settle Up', desc: 'Split & settle expenses', gradient: ['#5E8A5A', '#3D6B39'] as const },
            { icon: 'analytics' as const, tab: 'report', label: 'AI Report', desc: 'Smart trip insights', gradient: ['#1a1a2e', '#16213e'] as const },
            { icon: 'sparkles' as const, tab: 'create', label: 'Create', desc: 'Reel, Blog & Story', gradient: ['#833AB4', '#C13584'] as const },
            { icon: 'podium' as const, tab: 'leaderboard', label: 'Leaderboard', desc: 'Who won the trip?', gradient: ['#E67E22', '#D35400'] as const },
            { icon: 'map' as const, tab: 'map', label: 'Trip Map', desc: 'Your journey route', gradient: ['#1a535c', '#0b2d30'] as const },
            { icon: 'share-social' as const, tab: 'share', label: 'Share Trip', desc: 'Tell the world', gradient: ['#4A8BA8', '#2C6E84'] as const },
          ];

          return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Recap Phase Alerts ─────────────────────── */}
            <View style={{ marginBottom: Spacing.sm }}>
              {renderAlertBanner('recap-complete', '🎉', 'Trip complete! Save your favorite memories', '#FFC947', 'rgba(255,201,71,0.1)')}
              {renderAlertBanner('recap-settle', '💳', 'Don\'t forget to settle expenses with your crew', '#5E8A5A', 'rgba(94,138,90,0.1)')}
            </View>

            {/* Trip-Specific Hero — Compact */}
            <View style={{ borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadows.cardHover }}>
              <LinearGradient
                colors={['#1a1a2e', '#16213e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: Spacing.lg }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,201,71,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="sparkles" size={22} color="#FFC947" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,201,71,0.8)', letterSpacing: 2, textTransform: 'uppercase' }}>Your Journey</Text>
                    <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.xxl, color: Colors.white }}>{destName}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                  {[
                    { icon: 'calendar-outline' as const, val: dayTotal, label: 'Days' },
                    { icon: 'people-outline' as const, val: squad.length, label: 'Mates' },
                    { icon: 'flash-outline' as const, val: activityTotal || 15, label: 'Activities' },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: 'center' }}>
                      <Ionicons name={s.icon} size={14} color="rgba(255,201,71,0.7)" style={{ marginBottom: 2 }} />
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.lg, color: Colors.white }}>{s.val}</Text>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>

            {/* Quick Actions Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg }}>
              {RECAP_ACTIONS.map((action) => (
                <Pressable
                  key={action.tab}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (action.tab === 'share') {
                      Share.share({ message: `Just wrapped up an amazing trip to ${destName}! ${dayTotal} days, ${squad.length} friends, countless memories. Planned with TrailMate.` }).catch(() => {});
                    } else {
                      router.push(`/trip/review?tab=${action.tab}&${recapParams}` as any);
                    }
                  }}
                  style={({ pressed }) => [{
                    width: (SCREEN_WIDTH - Spacing.xl * 2 - 10) / 2,
                    borderRadius: BorderRadius.md,
                    overflow: 'hidden',
                    ...Shadows.card,
                  }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                >
                  <LinearGradient
                    colors={[action.gradient[0], action.gradient[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: Spacing.md, height: 90, justifyContent: 'space-between' }}
                  >
                    <Ionicons name={action.icon} size={24} color="rgba(255,255,255,0.9)" />
                    <View>
                      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white }}>{action.label}</Text>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{action.desc}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>

            {/* Open Full Recap CTA */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/trip/review?tab=settle&${recapParams}` as any); }}
              style={{ borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl, ...Shadows.card }}
            >
              <LinearGradient
                colors={['#5E8A5A', '#3D6B39']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 8 }}
              >
                <Ionicons name="sparkles" size={20} color={Colors.white} />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white }}>Open Full Recap</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </LinearGradient>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
          );
        })()}
      </Animated.View>

      {/* ── AI Floating Chatbot (Plan & Live tabs) ────────── */}
      {(activePhase === 'plan' || activePhase === 'live') && (
        <AIGuide
          destination={trip.destination}
          liveContext={liveData?.realWeather ? {
            weather: { temp: liveData.realWeather.temp, condition: liveData.realWeather.condition, alert: liveData.realWeather.alert, humidity: liveData.realWeather.humidity, windSpeed: liveData.realWeather.windSpeed, visibility: liveData.realWeather.visibility },
            sunrise: liveData.realWeather.sunrise,
            sunset: liveData.realWeather.sunset,
            aqi: liveData.aqi ? { label: liveData.aqi.label, advice: liveData.aqi.advice } : undefined,
            forecast: liveData.forecast.slice(0, 3).map(f => ({ date: f.date, high: f.high, low: f.low, condition: f.condition, pop: f.pop })),
            exchangeRate: liveData.exchangeRate ? { from: liveData.exchangeRate.from, to: liveData.exchangeRate.to, rate: liveData.exchangeRate.rate } : undefined,
            localTime: liveData.localTimeInfo?.localTime,
            localDayOfWeek: liveData.localTimeInfo?.dayOfWeek,
            trafficCondition: liveData.trafficCondition || undefined,
          } : undefined}
        />
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

              {/* Assign to */}
              {!isSoloTrip && (
                <>
                  <Text style={styles.formLabel}>ASSIGN TO (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => setFormAssignedTo('')}
                        style={[styles.assignChip, !formAssignedTo && styles.assignChipActive]}
                      >
                        <Text style={[styles.assignChipText, !formAssignedTo && styles.assignChipTextActive]}>Anyone</Text>
                      </Pressable>
                      {squad.map(m => (
                        <Pressable
                          key={m.id}
                          onPress={() => setFormAssignedTo(m.name)}
                          style={[styles.assignChip, formAssignedTo === m.name && styles.assignChipActive]}
                        >
                          <View style={[styles.assignChipAvatar, { backgroundColor: m.color }]}>
                            <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.white }}>{m.initial}</Text>
                          </View>
                          <Text style={[styles.assignChipText, formAssignedTo === m.name && styles.assignChipTextActive]}>{m.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

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

      {/* Trip options dropdown menu — full-screen overlay */}
      {showTripMenu && (
        <Pressable style={styles.tripMenuOverlay} onPress={() => setShowTripMenu(false)}>
          <View style={[styles.tripMenuDropdown, { top: insets.top + Spacing.sm + 44 }]}>
            <View style={styles.tripMenuGrid}>
              {[
                { label: 'Share', icon: 'share-outline' as const, onPress: () => { setShowTripMenu(false); Share.share({ message: `Check out my trip to ${trip.destination}! ✈️` }); } },
                { label: 'Rename', icon: 'create-outline' as const, onPress: () => { setShowTripMenu(false); setRenameValue(localTripName); setShowRenameModal(true); } },
                { label: 'Duplicate', icon: 'copy-outline' as const, onPress: async () => {
                  setShowTripMenu(false);
                  if (!params.id) return;
                  try {
                    const copy = await duplicateTrip(params.id);
                    crossAlert('Trip Duplicated', `"${copy.name}" has been created.`, [
                      { text: 'Stay Here', style: 'cancel' },
                      { text: 'Go to Copy', onPress: () => router.replace({ pathname: '/trip/[id]', params: { id: copy.id, destination: copy.destination, tripName: copy.name, startDate: copy.startDate || '', endDate: copy.endDate || '' } }) },
                    ]);
                  } catch { crossAlert('Error', 'Failed to duplicate trip.'); }
                } },
                { label: 'Export', icon: 'download-outline' as const, onPress: () => {
                  setShowTripMenu(false);
                  const lines: string[] = [`✈️ ${localTripName} — ${trip.destination}`, `${trip.startDate} – ${trip.endDate}`, ''];
                  if (tripCtx.itinerary.length > 0) {
                    tripCtx.itinerary.forEach(day => {
                      lines.push(`📅 Day ${day.dayNumber}${day.title ? ` — ${day.title}` : ''}`);
                      day.items.forEach(item => { lines.push(`  ${item.emoji || '📍'} ${item.time} ${item.title}${item.notes ? ` (${item.notes})` : ''}`); });
                      lines.push('');
                    });
                  } else { lines.push('No itinerary items yet.'); }
                  Share.share({ message: lines.join('\n'), title: `${localTripName} Itinerary` });
                } },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.onPress(); }}
                  style={styles.tripMenuGridItem}
                >
                  <View style={styles.tripMenuGridIcon}>
                    <Ionicons name={item.icon} size={18} color={Colors.text} />
                  </View>
                  <Text style={styles.tripMenuGridLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            {canEditTrip && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const next: TripVisibility = tripVisibility === 'public' ? 'private' : tripVisibility === 'private' ? 'secret' : 'public';
                  setTripVisibilityState(next);
                  if (params.id) setTripVisibility(params.id, next);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }}
              >
                <Ionicons
                  name={tripVisibility === 'public' ? 'globe-outline' : tripVisibility === 'private' ? 'lock-closed-outline' : 'eye-off-outline'}
                  size={15}
                  color={Colors.textSecondary}
                />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.textSecondary, flex: 1 }}>
                  {tripVisibility === 'public' ? 'Public' : tripVisibility === 'private' ? 'Private' : 'Secret'}
                </Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted }}>Tap to change</Text>
              </Pressable>
            )}
            {canDeleteTrip && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTripMenu(false);
                  crossAlert('Delete Trip', `Are you sure you want to delete "${localTripName}"? This cannot be undone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                      if (params.id) { await deleteTrip(params.id); router.replace('/'); }
                    } },
                  ]);
                }}
                style={styles.tripMenuDeleteRow}
              >
                <Ionicons name="trash-outline" size={15} color={Colors.error} />
                <Text style={styles.tripMenuDeleteLabel}>Delete Trip</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      )}

      {/* ═══════════════════════════════════════════════
          RENAME MODAL */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(44,37,32,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowRenameModal(false)}>
          <Pressable style={{ backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: SCREEN_WIDTH - 64 }} onPress={() => {}}>
            <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text, marginBottom: Spacing.md }}>Rename Trip</Text>
            <TextInput
              style={{ fontFamily: Fonts.body, fontSize: FontSizes.md, color: Colors.text, backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg }}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Trip name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              selectTextOnFocus
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable onPress={() => setShowRenameModal(false)} style={{ flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.background, alignItems: 'center' }}>
                <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: FontSizes.md, color: Colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const trimmed = renameValue.trim();
                  if (!trimmed || !params.id) return;
                  await renameTrip(params.id, trimmed);
                  setLocalTripName(trimmed);
                  setShowRenameModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={{ flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.sage, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════
          ARRIVAL / DEPARTURE TIME MODAL
      ═══════════════════════════════════════════════ */}
      <Modal visible={showTimeModal} transparent animationType="fade" onRequestClose={() => setShowTimeModal(false)}>
        <Pressable style={styles.timeModalOverlay} onPress={() => setShowTimeModal(false)}>
          <Pressable style={styles.timeModalCard} onPress={() => {}}>
            {/* Header */}
            <View style={styles.timeModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeModalTitle}>When do you arrive & leave?</Text>
                <Text style={styles.timeModalSubtitle}>
                  {hasReturnFlight ? 'Pre-filled from your flight bookings' : "We'll plan around your schedule"}
                </Text>
              </View>
              <Pressable onPress={() => setShowTimeModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Arrival */}
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.timeModalLabel}>ARRIVAL TIME (DAY 1)</Text>
              <TimeInput value={arrivalTime} onChange={setArrivalTime} />
              <Text style={styles.timeModalHint}>We'll add 2h for check-in before planning activities</Text>
            </View>

            {/* Departure */}
            <View style={{ marginBottom: 24 }}>
              <Text style={styles.timeModalLabel}>DEPARTURE TIME (LAST DAY)</Text>
              <TimeInput value={departureTime} onChange={setDepartureTime} />
              <Text style={styles.timeModalHint}>
                {hasReturnFlight ? "We'll keep 3h for airport transit" : 'Activities planned before this time'}
              </Text>
            </View>

            {/* Generate button */}
            <Pressable
              onPress={() => startAIGeneration(arrivalTime, departureTime)}
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <LinearGradient
                colors={[Colors.sage, Colors.sageDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timeModalButton}
              >
                <Ionicons name="sparkles" size={20} color={Colors.white} />
                <Text style={styles.timeModalButtonText}>Generate Itinerary</Text>
              </LinearGradient>
            </Pressable>
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
    height: 196,
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
  notifDot: {
    position: 'absolute' as const,
    top: -1,
    right: -1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  tripMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  tripMenuDropdown: {
    position: 'absolute',
    top: 52,
    right: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 10,
    width: 180,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 101,
  },
  tripMenuGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  tripMenuGridItem: {
    width: '47%' as any,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  tripMenuGridIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 4,
  },
  tripMenuGridLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.text,
  },
  tripMenuDeleteRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    marginTop: 6,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  tripMenuDeleteLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.error,
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
  assignChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  assignChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  assignChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  assignChipTextActive: {
    color: Colors.white,
  },
  assignChipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 180,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  liveTrendingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${Colors.sage}15`,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  liveBottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  },
  liveBottomFade: {
    height: 40,
  },
  // ── Expandable Command Center ──
  dockExpandedCards: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  dockCard: {
    borderRadius: 18,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  dockCardGradient: {
    padding: 16,
    borderRadius: 18,
  },
  dockCardIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  dockCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dockCardTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.white,
    marginBottom: 2,
  },
  dockCardSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  dockCardFeatures: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  dockCardFeaturePill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dockCardFeatureText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  dockFab: {
    borderRadius: 24,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  dockFabGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  dockFabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dockFabLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 4,
  },
  liveTrendingTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: `${Colors.sage}12`,
  },
  liveTrendingTagText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.sage,
  },
  // ── Trending Detail Modal ──
  trendingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  trendingModalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '75%' as any,
  },
  trendingModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    paddingVertical: Spacing.md,
  },
  trendingModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  trendingModalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  trendingModalLocation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  trendingModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  trendingModalMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  trendingModalPriceBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: `${Colors.sage}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  trendingModalDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  trendingModalAI: {
    backgroundColor: `${Colors.sage}08`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.sage,
  },
  trendingModalTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  trendingModalTagText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  trendingModalAddBtn: {
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  trendingModalAddGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  trendingModalAddText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
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
  // ── Today's Plan enhancements ──
  livePlanIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  liveViewToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${Colors.sage}12`,
    borderWidth: 1,
    borderColor: `${Colors.sage}30`,
  },
  liveViewToggleActive: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
  },
  liveViewToggleText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.sage,
  },
  liveItemAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  liveEditInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  // ── Map View ──
  liveMapCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' as const,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  liveMapGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  liveMapHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94,138,90,0.15)',
  },
  liveMapTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  liveMapCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
    backgroundColor: 'rgba(94,138,90,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveMapStop: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  liveMapStopLeft: {
    alignItems: 'center' as const,
    width: 32,
    marginRight: 12,
  },
  liveMapStopNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  liveMapStopNumberText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.white,
  },
  liveMapStopLine: {
    width: 2,
    height: 28,
    backgroundColor: 'rgba(94,138,90,0.2)',
    marginTop: 4,
  },
  liveMapStopContent: {
    flex: 1,
  },
  liveMapStopTime: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.sage,
    marginBottom: 2,
  },
  liveMapStopTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  liveMapStopLocation: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  liveMapStopAction: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(94,138,90,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  liveMapOpenAll: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: Spacing.sm,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(94,138,90,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(94,138,90,0.2)',
  },
  liveMapOpenAllText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  // ── Time Modal ────────────────────────────────
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  timeModalCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  timeModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  timeModalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: 4,
  },
  timeModalSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  timeModalLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  timeModalHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 6,
  },
  timeModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  timeModalButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
