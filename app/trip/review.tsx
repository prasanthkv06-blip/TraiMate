import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ──────────────────────────────────────────────
// Sub-tab definitions
// ──────────────────────────────────────────────

const SUB_TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'budget', label: 'Budget Variance' },
  { key: 'settlements', label: 'Settlements' },
  { key: 'memories', label: 'Memories' },
] as const;

type SubTab = (typeof SUB_TABS)[number]['key'];

// ──────────────────────────────────────────────
// Sample data
// ──────────────────────────────────────────────

const TRIP_NAME = 'Goa Adventure';
const TRIP_DAYS = 5;

const CATEGORY_COLORS: Record<string, string> = {
  food: '#E67E22',
  transport: '#3498DB',
  hotel: '#8E44AD',
  activity: '#27AE60',
  shopping: '#E74C3C',
};

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  food: { emoji: '🍕', label: 'Food & Dining' },
  transport: { emoji: '🚕', label: 'Transport' },
  hotel: { emoji: '🏨', label: 'Hotel & Stay' },
  activity: { emoji: '🎟️', label: 'Activities' },
  shopping: { emoji: '🛍️', label: 'Shopping' },
};

const EXPENSE_BREAKDOWN = [
  { category: 'food', amount: 9200 },
  { category: 'transport', amount: 3400 },
  { category: 'hotel', amount: 22000 },
  { category: 'activity', amount: 5800 },
  { category: 'shopping', amount: 4600 },
];

const TOTAL_SPENT = EXPENSE_BREAKDOWN.reduce((s, e) => s + e.amount, 0);

const BUDGET_DATA = [
  { category: 'Flights', emoji: '✈️', planned: 15000, actual: 14200 },
  { category: 'Hotel', emoji: '🏨', planned: 20000, actual: 22000 },
  { category: 'Food', emoji: '🍕', planned: 8000, actual: 9200 },
  { category: 'Transport', emoji: '🚕', planned: 3000, actual: 3400 },
  { category: 'Activities', emoji: '🎟️', planned: 5000, actual: 5800 },
  { category: 'Shopping', emoji: '🛍️', planned: 4000, actual: 4600 },
];

const MEMBERS = [
  { name: 'You', initial: 'Y', color: Colors.accent, paid: 18500 },
  { name: 'Alex', initial: 'A', color: Colors.sage, paid: 12400 },
  { name: 'Sam', initial: 'S', color: '#3498DB', paid: 8600 },
  { name: 'Jordan', initial: 'J', color: '#8E44AD', paid: 5500 },
];

const TOTAL_PAID = MEMBERS.reduce((s, m) => s + m.paid, 0);
const PER_PERSON = TOTAL_PAID / MEMBERS.length;

const SETTLEMENTS = [
  { from: 'Jordan', to: 'You', amount: 5750 },
  { from: 'Sam', to: 'You', amount: 2650 },
  { from: 'Jordan', to: 'Alex', amount: 1150 },
];

const DAYS_DATA = [
  { day: 1, label: 'Day 1 — Arrival', planned: 3, actual: 4, expenses: 5, journal: 'Landed in Goa around noon. The beach vibe hit instantly — warm breeze, salty air...' },
  { day: 2, label: 'Day 2 — Beaches', planned: 5, actual: 5, expenses: 7, journal: 'Spent the morning at Anjuna Beach. The flea market was vibrant and chaotic...' },
  { day: 3, label: 'Day 3 — Old Goa', planned: 4, actual: 3, expenses: 4, journal: null },
  { day: 4, label: 'Day 4 — Spice Plantation', planned: 3, actual: 4, expenses: 6, journal: 'The spice plantation tour was unexpectedly one of the best parts of the trip...' },
  { day: 5, label: 'Day 5 — Departure', planned: 2, actual: 2, expenses: 3, journal: null },
];

const TOTAL_EXPENSES_COUNT = DAYS_DATA.reduce((s, d) => s + d.expenses, 0);
const TOTAL_JOURNALS = DAYS_DATA.filter((d) => d.journal).length;

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SubTab>('summary');

  // Entrance animation
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Re-animate on tab switch
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const tabTranslateY = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: SubTab) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade out, switch, fade in
    Animated.parallel([
      Animated.timing(tabOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(tabTranslateY, { toValue: 10, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setActiveTab(tab);
      tabTranslateY.setValue(-10);
      Animated.parallel([
        Animated.timing(tabOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(tabTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  // ──────────────────────────────────────────
  // Summary Tab
  // ──────────────────────────────────────────

  const renderSummary = () => {
    const maxAmount = Math.max(...EXPENSE_BREAKDOWN.map((e) => e.amount));

    return (
      <>
        {/* Trip Analysis card */}
        <View style={[styles.card, { marginBottom: Spacing.lg }]}>
          <View style={styles.analysisHeader}>
            <Text style={styles.analysisEmoji}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisTitle}>Trip Analysis</Text>
              <Text style={styles.analysisSubtitle}>
                {TRIP_NAME} · {TRIP_DAYS} days
              </Text>
            </View>
          </View>
          <Text style={styles.analysisSummary}>
            Your group spent across {EXPENSE_BREAKDOWN.length} categories over {TRIP_DAYS} unforgettable days.
          </Text>
        </View>

        {/* Total Spent card */}
        <View style={[styles.gradientCardWrapper, { marginBottom: Spacing.xl }]}>
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalGradient}
          >
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalAmount}>₹{TOTAL_SPENT.toLocaleString('en-IN')}</Text>
            <Text style={styles.totalSub}>
              {TOTAL_EXPENSES_COUNT} expenses · {MEMBERS.length} travellers
            </Text>
          </LinearGradient>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={[styles.card, { marginBottom: Spacing.lg }]}>
          {EXPENSE_BREAKDOWN.map((item, index) => {
            const meta = CATEGORY_META[item.category];
            const color = CATEGORY_COLORS[item.category];
            const pct = (item.amount / TOTAL_SPENT) * 100;
            const barWidth = (item.amount / maxAmount) * 100;

            return (
              <View key={item.category} style={[styles.categoryRow, index < EXPENSE_BREAKDOWN.length - 1 && styles.categoryRowBorder]}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
                    <Text style={styles.categoryName}>{meta.label}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.categoryPct, { color }]}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${barWidth}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </View>
      </>
    );
  };

  // ──────────────────────────────────────────
  // Budget Variance Tab
  // ──────────────────────────────────────────

  const renderBudgetVariance = () => {
    const totalPlanned = BUDGET_DATA.reduce((s, b) => s + b.planned, 0);
    const totalActual = BUDGET_DATA.reduce((s, b) => s + b.actual, 0);
    const totalVariance = totalActual - totalPlanned;

    return (
      <>
        {/* Summary overview */}
        <View style={styles.budgetOverviewRow}>
          <View style={[styles.budgetStatCard, { flex: 1 }]}>
            <Text style={styles.budgetStatLabel}>Planned</Text>
            <Text style={styles.budgetStatValue}>₹{totalPlanned.toLocaleString('en-IN')}</Text>
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={[styles.budgetStatCard, { flex: 1 }]}>
            <Text style={styles.budgetStatLabel}>Actual</Text>
            <Text style={styles.budgetStatValue}>₹{totalActual.toLocaleString('en-IN')}</Text>
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={[styles.budgetStatCard, { flex: 1, borderColor: totalVariance > 0 ? Colors.error : Colors.success, borderWidth: 1.5 }]}>
            <Text style={styles.budgetStatLabel}>Variance</Text>
            <Text style={[styles.budgetStatValue, { color: totalVariance > 0 ? Colors.error : Colors.success }]}>
              {totalVariance > 0 ? '+' : ''}₹{totalVariance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={[styles.card, { marginTop: Spacing.lg, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }]}>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Planned</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Actual</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Variance</Text>
          </View>

          {/* Table rows */}
          {BUDGET_DATA.map((row, index) => {
            const variance = row.actual - row.planned;
            const isOver = variance > 0;
            const isUnder = variance < 0;

            return (
              <View
                key={row.category}
                style={[
                  styles.tableRow,
                  index % 2 === 0 && { backgroundColor: '#FDFBF9' },
                  index === BUDGET_DATA.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.tableCellRow, { flex: 2 }]}>
                  <Text style={styles.tableCellEmoji}>{row.emoji}</Text>
                  <Text style={styles.tableCellCategory}>{row.category}</Text>
                </View>
                <Text style={[styles.tableCellValue, { flex: 1.3 }]}>₹{row.planned.toLocaleString('en-IN')}</Text>
                <Text style={[styles.tableCellValue, { flex: 1.3 }]}>₹{row.actual.toLocaleString('en-IN')}</Text>
                <View style={[styles.varianceCell, { flex: 1.3 }]}>
                  <View style={[styles.varianceBadge, { backgroundColor: isOver ? '#FDECEC' : isUnder ? '#ECF8EC' : Colors.background }]}>
                    <Text style={[styles.varianceText, { color: isOver ? Colors.error : isUnder ? Colors.success : Colors.textSecondary }]}>
                      {isOver ? '+' : ''}₹{Math.abs(variance).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Insight */}
        <View style={[styles.card, { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Text style={{ fontSize: 28 }}>📊</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Budget Insight</Text>
            <Text style={styles.insightBody}>
              You went over budget on Hotel and Food. Consider pre-booking accommodations and setting daily meal budgets on your next trip.
            </Text>
          </View>
        </View>
      </>
    );
  };

  // ──────────────────────────────────────────
  // Settlements Tab
  // ──────────────────────────────────────────

  const renderSettlements = () => (
    <>
      {/* Per person card */}
      <View style={[styles.gradientCardWrapper, { marginBottom: Spacing.lg }]}>
        <LinearGradient
          colors={[Colors.sage, Colors.sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.perPersonGradient}
        >
          <Text style={styles.perPersonLabel}>Per Person Share</Text>
          <Text style={styles.perPersonAmount}>₹{PER_PERSON.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          <Text style={styles.perPersonSub}>Total ₹{TOTAL_PAID.toLocaleString('en-IN')} ÷ {MEMBERS.length} people</Text>
        </LinearGradient>
      </View>

      {/* Member cards */}
      <Text style={styles.sectionTitle}>Members</Text>
      {MEMBERS.map((member) => {
        const balance = member.paid - PER_PERSON;
        const isPositive = balance >= 0;

        return (
          <View key={member.name} style={[styles.card, styles.memberCard]}>
            <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
              <Text style={styles.memberAvatarText}>{member.initial}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberPaid}>Paid ₹{member.paid.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.memberBalanceCol}>
              <Text style={[styles.memberBalance, { color: isPositive ? Colors.success : Colors.error }]}>
                {isPositive ? 'Gets back' : 'Owes'}
              </Text>
              <Text style={[styles.memberBalanceAmount, { color: isPositive ? Colors.success : Colors.error }]}>
                ₹{Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Settlements */}
      <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Settlements</Text>
      <View style={styles.card}>
        {SETTLEMENTS.map((s, index) => (
          <View key={index} style={[styles.settlementRow, index < SETTLEMENTS.length - 1 && styles.settlementRowBorder]}>
            <View style={styles.settlementFromTo}>
              <View style={[styles.settlementDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.settlementName}>{s.from}</Text>
              <Text style={styles.settlementArrow}>→</Text>
              <View style={[styles.settlementDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.settlementName}>{s.to}</Text>
            </View>
            <Text style={styles.settlementAmount}>₹{s.amount.toLocaleString('en-IN')}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={[styles.card, { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Text style={{ fontSize: 28 }}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.insightTitle}>All Settled?</Text>
          <Text style={styles.insightBody}>
            Once everyone has paid their share, mark the trip as settled to close out the expenses.
          </Text>
        </View>
      </View>
    </>
  );

  // ──────────────────────────────────────────
  // Memories Tab
  // ──────────────────────────────────────────

  const renderMemories = () => (
    <>
      {/* Header card */}
      <View style={[styles.card, { marginBottom: Spacing.lg }]}>
        <View style={styles.memoriesHeader}>
          <Text style={styles.memoriesEmoji}>📸</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.memoriesTitle}>{TRIP_NAME} Memories</Text>
            <View style={styles.memoriesStats}>
              <View style={styles.memoriesStat}>
                <Text style={styles.memoriesStatNum}>{TRIP_DAYS}</Text>
                <Text style={styles.memoriesStatLabel}>days</Text>
              </View>
              <View style={styles.memoriesStatDivider} />
              <View style={styles.memoriesStat}>
                <Text style={styles.memoriesStatNum}>{TOTAL_EXPENSES_COUNT}</Text>
                <Text style={styles.memoriesStatLabel}>expenses</Text>
              </View>
              <View style={styles.memoriesStatDivider} />
              <View style={styles.memoriesStat}>
                <Text style={styles.memoriesStatNum}>{TOTAL_JOURNALS}</Text>
                <Text style={styles.memoriesStatLabel}>journals</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Day cards */}
      {DAYS_DATA.map((day) => (
        <View key={day.day} style={[styles.card, { marginBottom: Spacing.md }]}>
          <View style={styles.dayHeader}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>{day.day}</Text>
            </View>
            <Text style={styles.dayLabel}>{day.label}</Text>
          </View>

          <View style={styles.dayStatsRow}>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatEmoji}>📋</Text>
              <Text style={styles.dayStatText}>{day.planned} planned</Text>
            </View>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatEmoji}>✅</Text>
              <Text style={styles.dayStatText}>{day.actual} completed</Text>
            </View>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatEmoji}>💰</Text>
              <Text style={styles.dayStatText}>{day.expenses} expenses</Text>
            </View>
          </View>

          {day.journal && (
            <View style={styles.journalSnippet}>
              <Text style={styles.journalIcon}>📝</Text>
              <Text style={styles.journalText} numberOfLines={2}>
                {day.journal}
              </Text>
            </View>
          )}
        </View>
      ))}
    </>
  );

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return renderSummary();
      case 'budget':
        return renderBudgetVariance();
      case 'settlements':
        return renderSettlements();
      case 'memories':
        return renderMemories();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Trip Review</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sub-tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        style={styles.tabBarContainer}
      >
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => switchTab(tab.key)} style={[styles.tab, isActive && styles.tabActive]}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      <Animated.View style={[styles.contentWrapper, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          key={activeTab}
        >
          <Animated.View style={{ opacity: tabOpacity, transform: [{ translateY: tabTranslateY }] }}>
            {renderContent()}
          </Animated.View>
          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
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

  // Sub-tabs
  tabBarContainer: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  tabBar: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.white,
  },

  // Content
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },

  // Shared card
  card: {
    backgroundColor: Colors.card,
    ...BorderRadius.card,
    padding: Spacing.lg,
    ...Shadows.card,
  },

  // Section title
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  // ─── Summary Tab ───

  // Analysis card
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: Spacing.md,
  },
  analysisEmoji: {
    fontSize: 40,
  },
  analysisTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  analysisSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  analysisSummary: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Total Spent gradient
  gradientCardWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  totalGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  totalAmount: {
    fontFamily: Fonts.heading,
    fontSize: 48,
    color: Colors.white,
    marginVertical: Spacing.xs,
  },
  totalSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },

  // Category breakdown
  categoryRow: {
    paddingVertical: 14,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryAmount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  categoryPct: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    minWidth: 48,
    textAlign: 'right',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },

  // ─── Budget Variance Tab ───

  budgetOverviewRow: {
    flexDirection: 'row',
  },
  budgetStatCard: {
    backgroundColor: Colors.card,
    ...BorderRadius.card,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  budgetStatLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  budgetStatValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },

  // Table
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.accent,
  },
  tableHeaderCell: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableCellEmoji: {
    fontSize: 16,
  },
  tableCellCategory: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  tableCellValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  varianceCell: {
    alignItems: 'flex-end',
  },
  varianceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  varianceText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
  },

  // Insight card
  insightTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: 4,
  },
  insightBody: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ─── Settlements Tab ───

  perPersonGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  perPersonLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  perPersonAmount: {
    fontFamily: Fonts.heading,
    fontSize: 44,
    color: Colors.white,
    marginVertical: Spacing.xs,
  },
  perPersonSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },

  // Members
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  memberAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  memberPaid: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberBalanceCol: {
    alignItems: 'flex-end',
  },
  memberBalance: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
  },
  memberBalanceAmount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    marginTop: 2,
  },

  // Settlements
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settlementRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settlementFromTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settlementDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  settlementName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  settlementArrow: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.lg,
    color: Colors.textMuted,
    marginHorizontal: 2,
  },
  settlementAmount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },

  // ─── Memories Tab ───

  memoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memoriesEmoji: {
    fontSize: 40,
  },
  memoriesTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  memoriesStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memoriesStat: {
    alignItems: 'center',
  },
  memoriesStatNum: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  memoriesStatLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  memoriesStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  // Day cards
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  dayLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },

  dayStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing.sm,
  },
  dayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayStatEmoji: {
    fontSize: 14,
  },
  dayStatText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  journalSnippet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  journalIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  journalText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
