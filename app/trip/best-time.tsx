import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MonthData {
  m: string;
  temp: string;
  rain: string;
  crowd: string;
  price: string;
  score: number;
  emoji: string;
  tip: string;
}

// ─── Destination Data ───────────────────────────────────────────────────────

const DESTINATION_DATA: Record<string, MonthData[]> = {
  bali: [
    { m: 'January', temp: '27°C', rain: 'Heavy', crowd: 'Medium', price: 'Budget', score: 5, emoji: '🌧️', tip: 'Rainy season but great deals on villas and resorts.' },
    { m: 'February', temp: '27°C', rain: 'Heavy', crowd: 'Low', price: 'Budget', score: 5, emoji: '🌧️', tip: 'Wettest month — perfect for spa retreats and indoor culture.' },
    { m: 'March', temp: '28°C', rain: 'Moderate', crowd: 'Low', price: 'Budget', score: 6, emoji: '🌦️', tip: 'Rains easing up. Nyepi (Day of Silence) is a unique experience.' },
    { m: 'April', temp: '28°C', rain: 'Light', crowd: 'Medium', price: 'Medium', score: 8, emoji: '☀️', tip: 'Dry season begins — excellent weather and moderate crowds.' },
    { m: 'May', temp: '28°C', rain: 'Light', crowd: 'Medium', price: 'Medium', score: 9, emoji: '☀️', tip: 'Best balance of weather, crowds, and prices.' },
    { m: 'June', temp: '27°C', rain: 'Minimal', crowd: 'High', price: 'High', score: 8, emoji: '☀️', tip: 'Peak dry season starts. Book accommodations early.' },
    { m: 'July', temp: '26°C', rain: 'Minimal', crowd: 'Very High', price: 'Peak', score: 7, emoji: '🌤️', tip: 'Busiest month — amazing weather but crowded everywhere.' },
    { m: 'August', temp: '26°C', rain: 'Minimal', crowd: 'Very High', price: 'Peak', score: 7, emoji: '🌤️', tip: 'Peak season continues. Try lesser-known areas like Amed.' },
    { m: 'September', temp: '27°C', rain: 'Minimal', crowd: 'High', price: 'High', score: 8, emoji: '☀️', tip: 'Crowds thin out slightly. Great surfing conditions.' },
    { m: 'October', temp: '28°C', rain: 'Light', crowd: 'Medium', price: 'Medium', score: 8, emoji: '☀️', tip: 'Sweet spot — good weather returns with fewer tourists.' },
    { m: 'November', temp: '28°C', rain: 'Moderate', crowd: 'Low', price: 'Budget', score: 6, emoji: '🌦️', tip: 'Transition month. Afternoon showers but mornings are clear.' },
    { m: 'December', temp: '27°C', rain: 'Heavy', crowd: 'High', price: 'High', score: 6, emoji: '🌧️', tip: 'Holiday rush meets rainy season. Book NYE celebrations early.' },
  ],
  paris: [
    { m: 'January', temp: '5°C', rain: 'Moderate', crowd: 'Low', price: 'Budget', score: 5, emoji: '❄️', tip: 'Winter sales (Les Soldes) and short museum queues.' },
    { m: 'February', temp: '6°C', rain: 'Light', crowd: 'Low', price: 'Budget', score: 5, emoji: '❄️', tip: 'Valentines Day in Paris — romantic but chilly.' },
    { m: 'March', temp: '10°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 6, emoji: '🌸', tip: 'Spring is arriving. Cherry blossoms begin at Jardin des Plantes.' },
    { m: 'April', temp: '13°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 8, emoji: '🌷', tip: 'Beautiful weather, gardens in bloom. Easter festivities.' },
    { m: 'May', temp: '17°C', rain: 'Moderate', crowd: 'High', price: 'High', score: 8, emoji: '☀️', tip: 'Perfect temperatures. French Open begins late May.' },
    { m: 'June', temp: '20°C', rain: 'Light', crowd: 'High', price: 'High', score: 9, emoji: '☀️', tip: 'Long warm days. Fête de la Musique on June 21st.' },
    { m: 'July', temp: '23°C', rain: 'Light', crowd: 'Very High', price: 'Peak', score: 7, emoji: '🌤️', tip: 'Bastille Day (14th) is spectacular. Locals leave for holiday.' },
    { m: 'August', temp: '23°C', rain: 'Light', crowd: 'High', price: 'High', score: 6, emoji: '🌤️', tip: 'Many local shops close. Touristy but Paris Plages is fun.' },
    { m: 'September', temp: '19°C', rain: 'Light', crowd: 'Medium', price: 'Medium', score: 9, emoji: '🍂', tip: 'Best month — warm, fewer tourists, cultural season starts.' },
    { m: 'October', temp: '14°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 7, emoji: '🍂', tip: 'Beautiful autumn colors. Nuit Blanche art festival.' },
    { m: 'November', temp: '9°C', rain: 'Moderate', crowd: 'Low', price: 'Budget', score: 5, emoji: '🌫️', tip: 'Grey and damp but cozy cafe culture at its best.' },
    { m: 'December', temp: '5°C', rain: 'Moderate', crowd: 'Medium', price: 'High', score: 6, emoji: '🎄', tip: 'Christmas markets and dazzling light displays everywhere.' },
  ],
  tokyo: [
    { m: 'January', temp: '6°C', rain: 'Light', crowd: 'Low', price: 'Budget', score: 6, emoji: '❄️', tip: 'New Year celebrations. Temples are vibrant with Hatsumode.' },
    { m: 'February', temp: '7°C', rain: 'Light', crowd: 'Low', price: 'Budget', score: 6, emoji: '❄️', tip: 'Plum blossoms start. Great hotel deals available.' },
    { m: 'March', temp: '11°C', rain: 'Moderate', crowd: 'High', price: 'High', score: 8, emoji: '🌸', tip: 'Cherry blossom season begins — magical but busy.' },
    { m: 'April', temp: '16°C', rain: 'Moderate', crowd: 'Very High', price: 'Peak', score: 8, emoji: '🌸', tip: 'Peak sakura. Book 6 months ahead for this period.' },
    { m: 'May', temp: '20°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 9, emoji: '☀️', tip: 'Golden Week (early May) is busy but rest of month is ideal.' },
    { m: 'June', temp: '23°C', rain: 'Heavy', crowd: 'Low', price: 'Budget', score: 5, emoji: '🌧️', tip: 'Rainy season (tsuyu). Hydrangeas are stunning though.' },
    { m: 'July', temp: '27°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 6, emoji: '🎆', tip: 'Summer festivals and fireworks. Hot and humid.' },
    { m: 'August', temp: '29°C', rain: 'Moderate', crowd: 'High', price: 'High', score: 5, emoji: '🌡️', tip: 'Obon season. Very hot and humid — stay hydrated.' },
    { m: 'September', temp: '25°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 7, emoji: '🌤️', tip: 'Typhoon risk but temperatures become more comfortable.' },
    { m: 'October', temp: '19°C', rain: 'Moderate', crowd: 'Medium', price: 'Medium', score: 8, emoji: '🍁', tip: 'Autumn foliage begins. Perfect temperatures for exploration.' },
    { m: 'November', temp: '14°C', rain: 'Light', crowd: 'High', price: 'High', score: 9, emoji: '🍁', tip: 'Peak autumn colors — stunning gardens and temple grounds.' },
    { m: 'December', temp: '8°C', rain: 'Light', crowd: 'Medium', price: 'Medium', score: 7, emoji: '🎄', tip: 'Winter illuminations everywhere. Great holiday shopping.' },
  ],
  dubai: [
    { m: 'January', temp: '20°C', rain: 'Minimal', crowd: 'Very High', price: 'Peak', score: 9, emoji: '☀️', tip: 'Dubai Shopping Festival. Perfect weather for everything.' },
    { m: 'February', temp: '21°C', rain: 'Minimal', crowd: 'Very High', price: 'Peak', score: 9, emoji: '☀️', tip: 'Ideal temperatures. Dubai Food Festival happens now.' },
    { m: 'March', temp: '25°C', rain: 'Minimal', crowd: 'High', price: 'High', score: 8, emoji: '☀️', tip: 'Warm and wonderful. Last comfortable month before heat.' },
    { m: 'April', temp: '30°C', rain: 'Minimal', crowd: 'Medium', price: 'Medium', score: 6, emoji: '🌤️', tip: 'Getting hot. Beach days are still enjoyable early morning.' },
    { m: 'May', temp: '35°C', rain: 'Minimal', crowd: 'Low', price: 'Budget', score: 4, emoji: '🌡️', tip: 'Summer heat kicks in. Great mall and indoor deals though.' },
    { m: 'June', temp: '38°C', rain: 'Minimal', crowd: 'Low', price: 'Budget', score: 3, emoji: '🔥', tip: 'Extremely hot. Only indoor and evening activities.' },
    { m: 'July', temp: '41°C', rain: 'Minimal', crowd: 'Low', price: 'Budget', score: 2, emoji: '🔥', tip: 'Hottest month. Dubai Summer Surprises for bargain hunters.' },
    { m: 'August', temp: '41°C', rain: 'Minimal', crowd: 'Low', price: 'Budget', score: 2, emoji: '🔥', tip: 'Peak heat. Hotel prices at their lowest all year.' },
    { m: 'September', temp: '38°C', rain: 'Minimal', crowd: 'Low', price: 'Budget', score: 3, emoji: '🌡️', tip: 'Still very hot. Ramadan may affect dining hours.' },
    { m: 'October', temp: '33°C', rain: 'Minimal', crowd: 'Medium', price: 'Medium', score: 6, emoji: '🌤️', tip: 'Heat subsiding. Season begins to pick up again.' },
    { m: 'November', temp: '27°C', rain: 'Minimal', crowd: 'High', price: 'High', score: 8, emoji: '☀️', tip: 'Beautiful weather. Dubai Fitness Challenge citywide events.' },
    { m: 'December', temp: '22°C', rain: 'Minimal', crowd: 'Very High', price: 'Peak', score: 9, emoji: '🎄', tip: 'Perfect weather plus NYE celebrations at the Burj Khalifa.' },
  ],
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Color Utilities ────────────────────────────────────────────────────────

const scoreColor = (score: number): string => {
  if (score >= 8) return Colors.sage;
  if (score >= 6) return '#D9A24E';
  if (score >= 4) return '#CC8844';
  return Colors.error;
};

const crowdColor = (crowd: string): string => {
  if (crowd === 'Very High' || crowd === 'High') return Colors.error;
  if (crowd === 'Medium') return '#D9A24E';
  return Colors.sage;
};

const priceColor = (price: string): string => {
  if (price === 'Peak') return Colors.error;
  if (price === 'High') return '#CC8844';
  if (price === 'Medium') return '#D9A24E';
  return Colors.sage;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function BestTimeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();

  const rawDestination = params.destination || 'Bali';
  const destination = rawDestination.replace(/^[\p{Emoji}\s]+/u, '').trim() || rawDestination;
  const destinationKey = destination.split(',')[0].trim().toLowerCase();
  const monthData = DESTINATION_DATA[destinationKey] || DESTINATION_DATA.bali;

  const currentMonthIndex = new Date().getMonth();
  const currentMonth = monthData[currentMonthIndex];

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonthIndex);
  const selectedMonth = monthData[selectedMonthIndex];

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Derived summary data
  const bestMonths = monthData
    .filter((d) => d.score >= 8)
    .map((d) => MONTH_SHORT[MONTH_NAMES.indexOf(d.m)])
    .join(', ') || 'N/A';

  const cheapestMonths = monthData
    .filter((d) => d.price === 'Budget')
    .map((d) => MONTH_SHORT[MONTH_NAMES.indexOf(d.m)])
    .join(', ') || 'N/A';

  const avoidMonths = monthData
    .filter((d) => d.score <= 3)
    .map((d) => MONTH_SHORT[MONTH_NAMES.indexOf(d.m)])
    .join(', ') || 'None';

  const handleMonthPress = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonthIndex(index);
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const renderAssessmentCard = () => {
    const sc = scoreColor(selectedMonth.score);
    return (
      <View style={styles.assessmentCard}>
        <View style={styles.assessmentHeader}>
          <View>
            <Text style={styles.assessmentMonth}>{selectedMonth.m}</Text>
            <Text style={styles.assessmentSubtitle}>
              {selectedMonthIndex === currentMonthIndex ? 'Current Month' : 'Selected Month'}
            </Text>
          </View>
          <View style={[styles.scoreBadgeLarge, { backgroundColor: sc }]}>
            <Text style={styles.scoreBadgeLargeText}>{selectedMonth.score}/10</Text>
          </View>
        </View>

        <View style={styles.assessmentGrid}>
          <View style={styles.assessmentGridItem}>
            <Text style={styles.gridEmoji}>{selectedMonth.emoji}</Text>
            <Text style={styles.gridValue}>{selectedMonth.temp}</Text>
            <Text style={styles.gridLabel}>Weather</Text>
          </View>
          <View style={styles.assessmentGridItem}>
            <Text style={styles.gridEmoji}>💧</Text>
            <Text style={styles.gridValue}>{selectedMonth.rain}</Text>
            <Text style={styles.gridLabel}>Rainfall</Text>
          </View>
          <View style={styles.assessmentGridItem}>
            <Text style={styles.gridEmoji}>👥</Text>
            <Text style={[styles.gridValue, { color: crowdColor(selectedMonth.crowd) }]}>
              {selectedMonth.crowd}
            </Text>
            <Text style={styles.gridLabel}>Crowds</Text>
          </View>
          <View style={styles.assessmentGridItem}>
            <Text style={styles.gridEmoji}>💰</Text>
            <Text style={[styles.gridValue, { color: priceColor(selectedMonth.price) }]}>
              {selectedMonth.price}
            </Text>
            <Text style={styles.gridLabel}>Pricing</Text>
          </View>
        </View>

        <View style={styles.assessmentTipRow}>
          <Text style={styles.assessmentTipIcon}>💡</Text>
          <Text style={styles.assessmentTipText}>{selectedMonth.tip}</Text>
        </View>
      </View>
    );
  };

  const renderSummaryCards = () => (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryCard, { borderLeftColor: Colors.sage }]}>
        <Text style={styles.summaryIcon}>✨</Text>
        <Text style={styles.summaryLabel}>Best Months</Text>
        <Text style={[styles.summaryValue, { color: Colors.sage }]}>{bestMonths}</Text>
      </View>
      <View style={[styles.summaryCard, { borderLeftColor: '#D9A24E' }]}>
        <Text style={styles.summaryIcon}>💸</Text>
        <Text style={styles.summaryLabel}>Cheapest</Text>
        <Text style={[styles.summaryValue, { color: '#D9A24E' }]}>{cheapestMonths}</Text>
      </View>
      <View style={[styles.summaryCard, { borderLeftColor: Colors.error }]}>
        <Text style={styles.summaryIcon}>⚠️</Text>
        <Text style={styles.summaryLabel}>Avoid</Text>
        <Text style={[styles.summaryValue, { color: Colors.error }]}>{avoidMonths}</Text>
      </View>
    </View>
  );

  const renderMonthRow = (data: MonthData, index: number) => {
    const isSelected = index === selectedMonthIndex;
    const isCurrent = index === currentMonthIndex;
    const sc = scoreColor(data.score);
    const barWidth = `${(data.score / 10) * 100}%` as const;

    return (
      <Pressable
        key={data.m}
        onPress={() => handleMonthPress(index)}
        style={[
          styles.monthRow,
          isSelected && styles.monthRowSelected,
          isCurrent && !isSelected && styles.monthRowCurrent,
        ]}
      >
        <View style={styles.monthRowHeader}>
          <View style={styles.monthNameRow}>
            <Text style={styles.monthEmoji}>{data.emoji}</Text>
            <View>
              <Text style={[styles.monthName, isSelected && styles.monthNameSelected]}>
                {data.m}
              </Text>
              {isCurrent && (
                <Text style={styles.currentBadgeText}>Current</Text>
              )}
            </View>
          </View>
          <View style={[styles.scoreChip, { backgroundColor: sc }]}>
            <Text style={styles.scoreChipText}>{data.score}</Text>
          </View>
        </View>

        {/* Score bar */}
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: barWidth, backgroundColor: sc }]} />
        </View>

        {/* Tags */}
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>🌡 {data.temp}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>💧 {data.rain}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: `${crowdColor(data.crowd)}18` }]}>
            <Text style={[styles.tagText, { color: crowdColor(data.crowd) }]}>
              👥 {data.crowd}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: `${priceColor(data.price)}18` }]}>
            <Text style={[styles.tagText, { color: priceColor(data.price) }]}>
              💰 {data.price}
            </Text>
          </View>
        </View>

        {/* Tip */}
        <Text style={styles.monthTip}>{data.tip}</Text>
      </Pressable>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={20}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Best Time to Visit</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews
        >
          {/* AI Badge */}
          <LinearGradient
            colors={[Colors.accent, '#8B5E3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBadge}
          >
            <Text style={styles.aiBadgeIcon}>🤖</Text>
            <View style={styles.aiBadgeContent}>
              <Text style={styles.aiBadgeTitle}>AI Travel Intelligence</Text>
              <Text style={styles.aiBadgeSubtitle}>
                Weather, crowds & pricing for {destination}
              </Text>
            </View>
          </LinearGradient>

          {/* Assessment Card */}
          {renderAssessmentCard()}

          {/* Summary Cards */}
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          {renderSummaryCards()}

          {/* Monthly Guide */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
            Month-by-Month Guide
          </Text>
          <Text style={styles.sectionSubtitle}>
            Tap any month to see detailed assessment
          </Text>

          {monthData.map((data, index) => renderMonthRow(data, index))}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ℹ️ Data is based on historical averages and may vary year to year.
              Always check current conditions before booking.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // ── AI Badge ────────────────────────────────────────────────────────────
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  aiBadgeIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  aiBadgeContent: {
    flex: 1,
  },
  aiBadgeTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
    marginBottom: 2,
  },
  aiBadgeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Assessment Card ─────────────────────────────────────────────────────
  assessmentCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  assessmentMonth: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  assessmentSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scoreBadgeLarge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  scoreBadgeLargeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  assessmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  assessmentGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridEmoji: {
    fontSize: 22,
    marginBottom: Spacing.xs,
  },
  gridValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    textAlign: 'center',
  },
  gridLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  assessmentTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(176,122,80,0.08)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 4,
  },
  assessmentTipIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  assessmentTipText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Section ─────────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // ── Summary Cards ───────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 4,
    borderLeftWidth: 3,
    ...Shadows.card,
  },
  summaryIcon: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    lineHeight: 16,
  },

  // ── Month Rows ──────────────────────────────────────────────────────────
  monthRow: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadows.card,
  },
  monthRowSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(176,122,80,0.04)',
  },
  monthRowCurrent: {
    borderColor: Colors.sageLight,
    borderStyle: 'dashed' as any,
  },
  monthRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  monthEmoji: {
    fontSize: 26,
  },
  monthName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  monthNameSelected: {
    color: Colors.accent,
  },
  currentBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.sage,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },

  // Score bar
  scoreBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: Spacing.sm + 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Tags
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  tagText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  // Tip
  monthTip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // ── Disclaimer ──────────────────────────────────────────────────────────
  disclaimer: {
    backgroundColor: 'rgba(212,165,116,0.12)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  disclaimerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
