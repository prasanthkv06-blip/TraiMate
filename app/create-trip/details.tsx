import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  FlatList,
  Dimensions,
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
import { createTrip } from '../../src/services/tripService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Data ──────────────────────────────────────────────────────────────────
const TRIP_STYLES = [
  { id: 'adventure', emoji: '🏔️', label: 'Adventure' },
  { id: 'relaxation', emoji: '🏖️', label: 'Relaxation' },
  { id: 'cultural', emoji: '🏛️', label: 'Cultural' },
  { id: 'foodie', emoji: '🍕', label: 'Foodie' },
  { id: 'road-trip', emoji: '🚗', label: 'Road Trip' },
  { id: 'wellness', emoji: '🧘', label: 'Wellness' },
];

const ALL_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', label: 'British Pound', flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'THB', symbol: '฿', label: 'Thai Baht', flag: '🇹🇭' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'MAD', symbol: 'MAD', label: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'ISK', symbol: 'kr', label: 'Icelandic Krona', flag: '🇮🇸' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar', flag: '🇳🇿' },
];

// Destination → suggested currencies (local currency + USD as universal)
const DESTINATION_CURRENCIES: Record<string, string[]> = {
  'Paris':      ['EUR', 'USD'],
  'Tokyo':      ['JPY', 'USD'],
  'Bali':       ['IDR', 'USD'],
  'New York':   ['USD', 'EUR'],
  'Barcelona':  ['EUR', 'USD'],
  'Santorini':  ['EUR', 'USD'],
  'Marrakech':  ['MAD', 'USD'],
  'Reykjavik':  ['ISK', 'EUR'],
  'Dubai':      ['AED', 'USD'],
  'Bangkok':    ['THB', 'USD'],
  'London':     ['GBP', 'EUR'],
  'Sydney':     ['AUD', 'USD'],
  'Singapore':  ['SGD', 'USD'],
  'Kyoto':      ['JPY', 'USD'],
  'Goa':        ['INR', 'USD'],
};

// Destination → creative trip name suggestions
function getTripNameSuggestions(destination: string): string[] {
  const clean = destination.replace(/^[\p{Emoji}\s]+/u, '').trim();
  const city = clean.split(',')[0].trim(); // "Kerala, India" → "Kerala"

  // Specific destination suggestions
  const SPECIFIC: Record<string, string[]> = {
    'kerala':     [`Kerala Backwaters`, `God's Own Country`, `Kerala Vibes`, `Spice Route Trip`],
    'goa':        [`Goa Sunsets`, `Beach Vibes Goa`, `Goan Getaway`, `Susegado in Goa`],
    'bali':       [`Bali Bliss`, `Island of Gods`, `Bali Dreaming`, `Eat Pray Bali`],
    'paris':      [`Paris Mon Amour`, `City of Lights`, `Parisian Days`, `Bonjour Paris`],
    'tokyo':      [`Tokyo Drift`, `Neon Nights Tokyo`, `Lost in Tokyo`, `Sakura Season`],
    'kyoto':      [`Kyoto Temples`, `Ancient Kyoto`, `Zen in Kyoto`, `Kyoto & Beyond`],
    'dubai':      [`Dubai Luxe`, `Desert & Skyline`, `Golden Dubai`, `Dubai Dazzle`],
    'bangkok':    [`Bangkok Buzz`, `Street Food Safari`, `Temple Run BKK`, `Bangkok Nights`],
    'london':     [`London Calling`, `Cheers to London`, `Royal London`, `London Fog Trip`],
    'new york':   [`NYC Baby!`, `Big Apple Trip`, `Manhattan Vibes`, `New York State`],
    'barcelona':  [`Hola Barcelona`, `Gaudí & Tapas`, `Barcelona Beats`, `Costa Brava Days`],
    'singapore':  [`Lion City Trip`, `Singapore Sling`, `Garden City Vibes`, `SG Explorer`],
    'santorini':  [`Santorini Sunsets`, `Blue Dome Dreams`, `Greek Island Life`, `Oia Getaway`],
    'marrakech':  [`Marrakech Magic`, `Riad & Souk Trip`, `Moroccan Nights`, `Medina Explorer`],
    'reykjavik':  [`Iceland Calling`, `Northern Lights`, `Fire & Ice Trip`, `Arctic Adventure`],
    'sydney':     [`Sydney Harbour`, `Aussie Adventure`, `Down Under Trip`, `Bondi & Beyond`],
  };

  const key = city.toLowerCase();
  const match = SPECIFIC[key] || Object.entries(SPECIFIC).find(([k]) => key.includes(k) || k.includes(key))?.[1];

  if (match) return match;

  // Generic fallback suggestions using the city name
  return [
    `${city} Getaway`,
    `Exploring ${city}`,
    `${city} Adventure`,
    `Escape to ${city}`,
  ];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(d: Date): string {
  const day = d.getDate();
  const month = MONTHS[d.getMonth()].substring(0, 3);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function isBetween(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  return date.getTime() > start.getTime() && date.getTime() < end.getTime();
}

function isBeforeToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

// ─── Calendar Component ────────────────────────────────────────────────────
function CalendarPicker({
  startDate,
  endDate,
  onSelectDate,
  selectingField,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onSelectDate: (date: Date) => void;
  selectingField: 'start' | 'end';
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goToPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 30, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const totalCells = firstDay + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <View style={calStyles.container}>
      {/* Month navigation */}
      <View style={calStyles.header}>
        <Pressable onPress={goToPrev} hitSlop={16} style={calStyles.navBtn}>
          <Text style={calStyles.navArrow}>{'<'}</Text>
        </Pressable>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <Text style={calStyles.monthTitle}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
        </Animated.View>
        <Pressable onPress={goToNext} hitSlop={16} style={calStyles.navBtn}>
          <Text style={calStyles.navArrow}>{'>'}</Text>
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View style={calStyles.weekRow}>
        {WEEKDAYS.map(d => (
          <View key={d} style={calStyles.weekCell}>
            <Text style={calStyles.weekLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <View key={rowIdx} style={calStyles.weekRow}>
          {Array.from({ length: 7 }).map((_, colIdx) => {
            const cellIdx = rowIdx * 7 + colIdx;
            const day = cellIdx - firstDay + 1;
            if (cellIdx < firstDay || day > daysInMonth) {
              return <View key={colIdx} style={calStyles.dayCell} />;
            }

            const date = new Date(viewYear, viewMonth, day);
            const isPast = isBeforeToday(date);
            const isStart = isSameDay(date, startDate);
            const isEnd = isSameDay(date, endDate);
            const isInRange = isBetween(date, startDate, endDate);
            const isToday = isSameDay(date, today);
            const isSelected = isStart || isEnd;

            return (
              <Pressable
                key={colIdx}
                onPress={() => {
                  if (isPast) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectDate(date);
                }}
                style={[
                  calStyles.dayCell,
                  isInRange && calStyles.dayCellInRange,
                  isStart && calStyles.dayCellRangeStart,
                  isEnd && calStyles.dayCellRangeEnd,
                ]}
              >
                <View
                  style={[
                    calStyles.dayInner,
                    isSelected && calStyles.dayInnerSelected,
                    isStart && !isEnd && { backgroundColor: Colors.accent },
                    isEnd && !isStart && { backgroundColor: Colors.sage },
                    isStart && isEnd && { backgroundColor: Colors.accent },
                    isToday && !isSelected && calStyles.dayInnerToday,
                  ]}
                >
                  <Text
                    style={[
                      calStyles.dayText,
                      isPast && calStyles.dayTextDisabled,
                      isSelected && calStyles.dayTextSelected,
                      isToday && !isSelected && calStyles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: Colors.accent }]} />
          <Text style={calStyles.legendLabel}>Start</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: Colors.sage }]} />
          <Text style={calStyles.legendLabel}>End</Text>
        </View>
        {startDate && endDate && (
          <Text style={calStyles.durationText}>
            {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} nights
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Currency Modal ────────────────────────────────────────────────────────
function CurrencyModal({
  visible,
  onClose,
  onSelect,
  currentCode,
  suggestedCodes,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  currentCode: string;
  suggestedCodes: string[];
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const otherCurrencies = ALL_CURRENCIES.filter(
    c => !suggestedCodes.includes(c.code)
  );

  const filtered = search.trim()
    ? otherCurrencies.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.label.toLowerCase().includes(search.toLowerCase())
      )
    : otherCurrencies;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Handle */}
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>All Currencies</Text>

          {/* Search */}
          <View style={modalStyles.searchRow}>
            <Text style={modalStyles.searchIcon}>🔍</Text>
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search currencies..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.code}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340 }}
            renderItem={({ item }) => {
              const isActive = item.code === currentCode;
              return (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(item.code);
                    onClose();
                  }}
                  style={[
                    modalStyles.currencyRow,
                    isActive && modalStyles.currencyRowActive,
                  ]}
                >
                  <Text style={modalStyles.currencyFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[modalStyles.currencyCode, isActive && { color: Colors.accent }]}>
                      {item.code}
                    </Text>
                    <Text style={modalStyles.currencyLabel}>{item.label}</Text>
                  </View>
                  <Text style={[modalStyles.currencySymbol, isActive && { color: Colors.accent }]}>
                    {item.symbol}
                  </Text>
                  {isActive && <Text style={modalStyles.checkMark}>✓</Text>}
                </Pressable>
              );
            }}
          />

          {/* Close */}
          <Pressable onPress={onClose} style={modalStyles.closeBtn}>
            <Text style={modalStyles.closeBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function DetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { destination } = useLocalSearchParams<{ destination: string }>();

  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tripType, setTripType] = useState<'solo' | 'group'>('group');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [currency, setCurrency] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingField, setSelectingField] = useState<'start' | 'end'>('start');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;
  const calendarHeight = useRef(new Animated.Value(0)).current;

  // Suggested currencies based on destination
  const suggestedCurrencies = useMemo(() => {
    const dest = destination || '';
    // Try exact match first, then partial
    const codes = DESTINATION_CURRENCIES[dest]
      || Object.entries(DESTINATION_CURRENCIES).find(
        ([k]) => dest.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(dest.toLowerCase())
      )?.[1]
      || ['USD', 'EUR']; // fallback

    // Always include INR as user's home currency (can be customized)
    const withHome = ['INR', ...codes.filter(c => c !== 'INR')];
    return [...new Set(withHome)].slice(0, 3);
  }, [destination]);

  // Destination-based trip name suggestions
  const nameSuggestions = useMemo(() => getTripNameSuggestions(destination || ''), [destination]);

  // Auto-fill trip name with first suggestion
  useEffect(() => {
    if (!tripName && nameSuggestions.length > 0) {
      setTripName(nameSuggestions[0]);
    }
  }, [nameSuggestions]);

  // Auto-select first suggested currency
  useEffect(() => {
    if (!currency && suggestedCurrencies.length > 0) {
      setCurrency(suggestedCurrencies[0]);
    }
  }, [suggestedCurrencies]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(contentY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleCalendar = (field: 'start' | 'end') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showCalendar && selectingField === field) {
      // Close calendar
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowCalendar(false);
    } else {
      // Open calendar, set the selecting field
      setSelectingField(field);
      if (!showCalendar) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowCalendar(true);
      }
    }
  };

  const handleDateSelect = useCallback((date: Date) => {
    if (selectingField === 'start') {
      setStartDate(date);
      // If end date is before new start, reset it
      if (endDate && date.getTime() >= endDate.getTime()) {
        setEndDate(null);
      }
      // Auto-switch to end date selection
      setSelectingField('end');
    } else {
      // If selected end is before start, swap them
      if (startDate && date.getTime() < startDate.getTime()) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      // Close calendar after selecting end date
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowCalendar(false);
      }, 300);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectingField, startDate, endDate]);

  const toggleStyle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    if (!tripName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tripParams = {
      destination,
      tripName: tripName.trim(),
      startDate: startDate ? startDate.toISOString() : '',
      endDate: endDate ? endDate.toISOString() : '',
      styles: selectedStyles.join(','),
      currency,
      tripType,
    };

    if (tripType === 'solo') {
      // Solo trip — persist, dismiss modal, then push to trip screen
      const trip = await createTrip({
        name: tripName.trim(),
        destination,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        currency,
        tripType,
      });
      router.dismissAll();
      router.push({
        pathname: '/trip/[id]',
        params: { id: trip.id, ...tripParams },
      });
    } else {
      // Group trip — proceed to invite crew
      router.push({
        pathname: '/create-trip/invite',
        params: tripParams,
      });
    }
  };

  const canProceed = tripName.trim().length > 0 && startDate !== null && endDate !== null;

  // Get currency objects for suggested ones
  const suggestedCurrencyObjects = suggestedCurrencies
    .map(code => ALL_CURRENCIES.find(c => c.code === code))
    .filter(Boolean) as typeof ALL_CURRENCIES;

  const selectedCurrencyObj = ALL_CURRENCIES.find(c => c.code === currency);
  const isSelectedInSuggested = suggestedCurrencies.includes(currency);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepDot} />
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <Text style={styles.destBadge}>{destination}</Text>
          <Text style={styles.title}>Trip details 📝</Text>

          {/* Trip name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>TRIP NAME</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={tripName}
                onChangeText={setTripName}
                placeholder={nameSuggestions[0] || 'e.g. Summer in Kyoto'}
                placeholderTextColor={Colors.textMuted}
                maxLength={50}
              />
            </View>
            {/* Name suggestion chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nameSuggestionsRow}
            >
              {nameSuggestions.map((name, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTripName(name);
                  }}
                  style={({ pressed }) => [
                    styles.nameSuggestionChip,
                    tripName === name && styles.nameSuggestionChipActive,
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <Text style={[
                    styles.nameSuggestionText,
                    tripName === name && styles.nameSuggestionTextActive,
                  ]}>{name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* ── Dates ─────────────────────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>TRAVEL DATES</Text>
            <View style={styles.dateRow}>
              {/* Start date */}
              <Pressable
                onPress={() => toggleCalendar('start')}
                style={[
                  styles.dateBox,
                  { flex: 1 },
                  showCalendar && selectingField === 'start' && styles.dateBoxActive,
                ]}
              >
                <Text style={styles.dateFieldLabel}>From</Text>
                <Text
                  style={[
                    styles.dateValue,
                    !startDate && { color: Colors.textMuted },
                  ]}
                >
                  {startDate ? formatDate(startDate) : 'Pick a date'}
                </Text>
              </Pressable>

              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>→</Text>
              </View>

              {/* End date */}
              <Pressable
                onPress={() => toggleCalendar('end')}
                style={[
                  styles.dateBox,
                  { flex: 1 },
                  showCalendar && selectingField === 'end' && styles.dateBoxActive,
                ]}
              >
                <Text style={styles.dateFieldLabel}>To</Text>
                <Text
                  style={[
                    styles.dateValue,
                    !endDate && { color: Colors.textMuted },
                  ]}
                >
                  {endDate ? formatDate(endDate) : 'Pick a date'}
                </Text>
              </Pressable>
            </View>

            {/* Duration badge */}
            {startDate && endDate && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  🗓️ {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days,{' '}
                  {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) - 1} nights
                </Text>
              </View>
            )}

            {/* Calendar picker (inline drop-down) */}
            {showCalendar && (
              <CalendarPicker
                startDate={startDate}
                endDate={endDate}
                onSelectDate={handleDateSelect}
                selectingField={selectingField}
              />
            )}
          </View>

          {/* ── Solo / Group toggle ─────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WHO IS GOING?</Text>
            <View style={styles.tripTypeRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTripType('solo');
                }}
                style={[
                  styles.tripTypeCard,
                  tripType === 'solo' && styles.tripTypeCardActive,
                ]}
              >
                <Text style={styles.tripTypeEmoji}>🧳</Text>
                <Text style={[styles.tripTypeTitle, tripType === 'solo' && styles.tripTypeTitleActive]}>Solo</Text>
                <Text style={styles.tripTypeDesc}>Main character{'\n'}energy</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTripType('group');
                }}
                style={[
                  styles.tripTypeCard,
                  tripType === 'group' && styles.tripTypeCardActive,
                ]}
              >
                <Text style={styles.tripTypeEmoji}>👥</Text>
                <Text style={[styles.tripTypeTitle, tripType === 'group' && styles.tripTypeTitleActive]}>Group</Text>
                <Text style={styles.tripTypeDesc}>Roll with{'\n'}the squad</Text>
              </Pressable>
            </View>
            {tripType === 'group' && (
              <View style={styles.groupHint}>
                <Text style={styles.groupHintText}>
                  You'll add your squad in the next step
                </Text>
              </View>
            )}
          </View>

          {/* ── Currency ──────────────────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CURRENCY</Text>
            <Text style={styles.sublabel}>
              Suggested for {destination || 'your trip'}
            </Text>
            <View style={styles.currencyRow}>
              {suggestedCurrencyObjects.map((c) => {
                const isActive = currency === c.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrency(c.code);
                    }}
                    style={[
                      styles.currencyChip,
                      isActive && styles.currencyChipActive,
                    ]}
                  >
                    <Text style={styles.currencyFlag}>{c.flag}</Text>
                    <View>
                      <Text
                        style={[
                          styles.currencyCode,
                          isActive && styles.currencyCodeActive,
                        ]}
                      >
                        {c.symbol} {c.code}
                      </Text>
                      <Text style={styles.currencyName}>{c.label}</Text>
                    </View>
                  </Pressable>
                );
              })}

              {/* "More" button */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCurrencyModal(true);
                }}
                style={[
                  styles.currencyChip,
                  styles.currencyMoreChip,
                  !isSelectedInSuggested && styles.currencyChipActive,
                ]}
              >
                {!isSelectedInSuggested && selectedCurrencyObj ? (
                  <>
                    <Text style={styles.currencyFlag}>{selectedCurrencyObj.flag}</Text>
                    <View>
                      <Text style={[styles.currencyCode, styles.currencyCodeActive]}>
                        {selectedCurrencyObj.symbol} {selectedCurrencyObj.code}
                      </Text>
                      <Text style={styles.currencyName}>{selectedCurrencyObj.label}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 18 }}>🌐</Text>
                    <View>
                      <Text style={[styles.currencyCode, { color: Colors.textSecondary }]}>More</Text>
                      <Text style={styles.currencyName}>All currencies</Text>
                    </View>
                  </>
                )}
                <Text style={styles.chevron}>▾</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Trip style ────────────────────────────────── */}
          <Text style={styles.label}>TRIP STYLE</Text>
          <View style={styles.styleGrid}>
            {TRIP_STYLES.map((s) => {
              const isActive = selectedStyles.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggleStyle(s.id)}
                  style={[styles.styleChip, isActive && styles.styleChipActive]}
                >
                  <Text style={styles.styleEmoji}>{s.emoji}</Text>
                  <Text style={[styles.styleLabel, isActive && styles.styleLabelActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Next button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleNext}
          disabled={!canProceed}
          style={({ pressed }) => [
            styles.nextButton,
            !canProceed && styles.nextButtonDisabled,
            pressed && canProceed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <LinearGradient
            colors={canProceed ? [Colors.accent, Colors.accentDark] : [Colors.border, Colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButtonGradient}
          >
            <Text style={[styles.nextButtonText, !canProceed && { color: Colors.textMuted }]}>
              {tripType === 'solo' ? "Let's go!" : 'Add the squad'}
            </Text>
            <Text style={[styles.nextButtonArrow, !canProceed && { color: Colors.textMuted }]}>
              →
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Currency modal */}
      <CurrencyModal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        onSelect={setCurrency}
        currentCode={currency}
        suggestedCodes={suggestedCurrencies}
      />
    </View>
  );
}

// ─── Calendar Styles ───────────────────────────────────────────────────────
const calStyles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  monthTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 40,
  },
  dayCellInRange: {
    backgroundColor: '#FDF6F0',
  },
  dayCellRangeStart: {
    backgroundColor: '#FDF6F0',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  dayCellRangeEnd: {
    backgroundColor: '#EDF5EC',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: {
    // Base - overridden inline for start/end colors
  },
  dayInnerToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  dayText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  dayTextDisabled: {
    color: Colors.border,
  },
  dayTextSelected: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.white,
  },
  dayTextToday: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  durationText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.accent,
    marginLeft: 'auto',
  },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 32, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  currencyRowActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyCode: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  currencyLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  currencySymbol: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  checkMark: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  closeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

// ─── Main Styles ───────────────────────────────────────────────────────────
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
    width: 28,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: Colors.sage,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 30,
  },
  destBadge: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  nameSuggestionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingRight: 16,
  },
  nameSuggestionChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  nameSuggestionChipActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  nameSuggestionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  nameSuggestionTextActive: {
    color: Colors.accent,
    fontFamily: Fonts.bodySemiBold,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  sublabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 10,
    marginTop: -4,
  },
  inputWrapper: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  input: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  // ── Date fields ────────────────────────
  dateRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  dateBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Shadows.card,
  },
  dateBoxActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  dateFieldLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  dateSeparator: {
    justifyContent: 'center',
    paddingTop: 10,
  },
  dateSeparatorText: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF6F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    marginTop: 10,
  },
  durationText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
  // ── Solo / Group ───────────────────────
  tripTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tripTypeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  tripTypeCardActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  tripTypeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  tripTypeTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: 4,
  },
  tripTypeTitleActive: {
    color: Colors.accent,
  },
  tripTypeDesc: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  groupHint: {
    marginTop: 10,
    backgroundColor: '#EDF5EC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    alignSelf: 'flex-start',
  },
  groupHintText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  // ── Currency ───────────────────────────
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: '45%' as any,
    ...Shadows.card,
  },
  currencyChipActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  currencyMoreChip: {
    borderStyle: 'dashed' as any,
  },
  currencyFlag: {
    fontSize: 22,
  },
  currencyCode: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  currencyCodeActive: {
    color: Colors.accent,
  },
  currencyName: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  // ── Styles ─────────────────────────────
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  styleChipActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  styleEmoji: {
    fontSize: 18,
  },
  styleLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  styleLabelActive: {
    color: Colors.accent,
    fontFamily: Fonts.bodySemiBold,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },
  nextButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  nextButtonArrow: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
});
