import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { BUDGET_DB, getRegion, CURRENCY_MAP, CATEGORY_ICONS, CATEGORY_COLORS } from '../../src/constants/aiData';

// ── Types ────────────────────────────────────────────────────────────────────

type TravelStyle = 'budget' | 'mid' | 'luxury';

interface StyleOption {
  key: TravelStyle;
  emoji: string;
  label: string;
  subtitle: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { key: 'budget', emoji: '\uD83C\uDF92', label: 'Budget', subtitle: 'Hostels & street food' },
  { key: 'mid', emoji: '\uD83C\uDFE8', label: 'Mid-range', subtitle: 'Comfortable & balanced' },
  { key: 'luxury', emoji: '\u2728', label: 'Luxury', subtitle: 'Premium everything' },
];

const BUDGET_CATEGORIES: Array<'hotel' | 'food' | 'transport' | 'activity' | 'shopping'> = [
  'hotel', 'food', 'transport', 'activity', 'shopping',
];

const CATEGORY_LABELS: Record<string, string> = {
  hotel: 'Accommodation',
  food: 'Food & Dining',
  transport: 'Transport',
  activity: 'Activities',
  shopping: 'Shopping',
};

const BUDGET_TIPS: Record<TravelStyle, string[]> = {
  budget: [
    'Eat at local markets and warungs for authentic food under $3 per meal.',
    'Use public transport or rent a scooter to save on daily travel costs.',
    'Book hostels or guesthouses early for the best off-peak rates.',
  ],
  mid: [
    'Book combo tickets for attractions to save 20-30% on entry fees.',
    'Stay in boutique hotels outside main tourist zones for better value.',
    'Mix local eateries with mid-range restaurants for a balanced food experience.',
  ],
  luxury: [
    'Hire a private guide for personalized tours and skip-the-line access.',
    'Book luxury villas with a group to split costs on premium stays.',
    'Pre-book fine dining restaurants to guarantee availability and best tables.',
  ],
};

// ── Component ────────────────────────────────────────────────────────────────

// Strip emoji prefix from destination string
function cleanDest(d: string): string {
  return d.replace(/^[\p{Emoji}\s]+/u, '').trim() || d;
}

export default function BudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();

  // State
  const [destination, setDestination] = useState(params.destination ? cleanDest(params.destination) : '');
  const [days, setDays] = useState('');
  const [members, setMembers] = useState('1');
  const [style, setStyle] = useState<TravelStyle>('mid');

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

  // Derived data
  const numDays = Math.max(1, parseInt(days, 10) || 1);
  const numMembers = Math.max(1, parseInt(members, 10) || 1);

  const region = useMemo(() => getRegion(destination), [destination]);
  const budgetData = useMemo(() => BUDGET_DB[region] || BUDGET_DB.sea, [region]);
  const currencySymbol = useMemo(() => CURRENCY_MAP[budgetData.currency] || '$', [budgetData.currency]);
  const tierData = useMemo(() => budgetData[style], [budgetData, style]);

  const categoryBreakdown = useMemo(() => {
    const maxPerDay = Math.max(...BUDGET_CATEGORIES.map((c) => tierData[c]));
    return BUDGET_CATEGORIES.map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      icon: CATEGORY_ICONS[cat],
      color: CATEGORY_COLORS[cat],
      perDay: tierData[cat],
      total: tierData[cat] * numDays,
      progress: maxPerDay > 0 ? tierData[cat] / maxPerDay : 0,
    }));
  }, [tierData, numDays]);

  const totalBudget = useMemo(
    () => BUDGET_CATEGORIES.reduce((sum, cat) => sum + tierData[cat] * numDays, 0),
    [tierData, numDays],
  );

  const perDayAvg = useMemo(
    () => Math.round(totalBudget / numDays),
    [totalBudget, numDays],
  );

  const perPerson = useMemo(
    () => Math.round(totalBudget / numMembers),
    [totalBudget, numMembers],
  );

  // Handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleStyleSelect = useCallback((s: TravelStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStyle(s);
  }, []);

  const formatAmount = useCallback(
    (amount: number) => `${currencySymbol}${amount.toLocaleString()}`,
    [currencySymbol],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Budget Planner</Text>
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
          {/* AI Badge Banner */}
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBadge}
          >
            <Text style={styles.aiBadgeIcon}>{'\uD83E\uDD16'}</Text>
            <View style={styles.aiBadgeContent}>
              <Text style={styles.aiBadgeTitle}>AI Budget Estimator</Text>
              <Text style={styles.aiBadgeSubtitle}>
                AI-powered budget estimation
              </Text>
            </View>
          </LinearGradient>

          {/* Trip Info Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>TRIP DETAILS</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Destination</Text>
                <TextInput
                  style={styles.textInput}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="e.g. Bali"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.inputRowDouble}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Days</Text>
                <TextInput
                  style={styles.textInput}
                  value={days}
                  onChangeText={setDays}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ width: Spacing.md }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Members</Text>
                <TextInput
                  style={styles.textInput}
                  value={members}
                  onChangeText={setMembers}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Travel Style Selector */}
          <Text style={styles.sectionTitle}>Travel Style</Text>
          <View style={styles.styleRow}>
            {STYLE_OPTIONS.map((opt) => {
              const isSelected = style === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => handleStyleSelect(opt.key)}
                  style={[
                    styles.styleCard,
                    isSelected && styles.styleCardSelected,
                  ]}
                >
                  <Text style={styles.styleEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[
                      styles.styleLabel,
                      isSelected && styles.styleLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.styleSubtitle}>{opt.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Budget Breakdown */}
          <Text style={styles.sectionTitle}>Budget Breakdown</Text>
          <Text style={styles.sectionSubtitle}>
            Per-day costs in {budgetData.currency} ({currencySymbol})
          </Text>
          <View style={styles.breakdownCard}>
            {categoryBreakdown.map((cat) => (
              <View key={cat.key} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryName}>{cat.label}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryPerDay}>
                      {formatAmount(cat.perDay)}/day
                    </Text>
                    <Text style={styles.categoryTotal}>
                      {formatAmount(cat.total)}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round(cat.progress * 100)}%`,
                        backgroundColor: cat.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Total Budget Card */}
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}
          >
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalAmount}>{formatAmount(totalBudget)}</Text>
            <View style={styles.totalDivider} />
            <View style={styles.totalSubRow}>
              <View style={styles.totalSubItem}>
                <Text style={styles.totalSubLabel}>Per Day</Text>
                <Text style={styles.totalSubValue}>{formatAmount(perDayAvg)}</Text>
              </View>
              <View style={styles.totalSubDivider} />
              <View style={styles.totalSubItem}>
                <Text style={styles.totalSubLabel}>Per Person</Text>
                <Text style={styles.totalSubValue}>{formatAmount(perPerson)}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Budget Tips */}
          <Text style={styles.sectionTitle}>Quick Tips</Text>
          <View style={styles.tipsCard}>
            {BUDGET_TIPS[style].map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={styles.tipBullet}>
                  <Text style={styles.tipBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              {'\u2139\uFE0F'} Estimates are based on average traveler data and may vary.
              Always budget extra for unexpected expenses.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

  // ── AI Badge ──────────────────────────────────────────────────────────────
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

  // ── Trip Info Section ─────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  sectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  inputRow: {
    marginBottom: Spacing.md,
  },
  inputRowDouble: {
    flexDirection: 'row',
  },
  inputGroup: {},
  inputLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },

  // ── Travel Style ──────────────────────────────────────────────────────────
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
  styleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  styleCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  styleCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(176,122,80,0.06)',
  },
  styleEmoji: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  styleLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  styleLabelSelected: {
    color: Colors.accent,
  },
  styleSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Budget Breakdown ──────────────────────────────────────────────────────
  breakdownCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  categoryRow: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryPerDay: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  categoryTotal: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // ── Total Budget Card ─────────────────────────────────────────────────────
  totalCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.cardHover,
  },
  totalLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  totalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'stretch',
    marginBottom: Spacing.md,
  },
  totalSubRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalSubItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalSubDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  totalSubLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  totalSubValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },

  // ── Budget Tips ───────────────────────────────────────────────────────────
  tipsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
    ...Shadows.card,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(176,122,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 2,
    marginTop: 1,
  },
  tipBulletText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
  tipText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Disclaimer ────────────────────────────────────────────────────────────
  disclaimer: {
    backgroundColor: 'rgba(212,165,116,0.12)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  disclaimerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
