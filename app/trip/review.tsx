import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
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
import { CATEGORY_IONICONS, CATEGORY_COLORS } from '../../src/constants/aiData';
import {
  calculateSettlements,
  generateTripReport,
  generateLeaderboard,
  generateBlogPost,
  generateThread,
  generateMapLocations,
  estimateDistance,
  SAMPLE_EXPENSES,
  SAMPLE_MEMBERS,
  SAMPLE_JOURNALS,
  SHARE_FORMATS,
  type TripExpense,
  type TripMember,
  type JournalEntry,
  type Settlement,
  type MemberBalance,
  type TripReportData,
  type LeaderboardEntry,
  type ShareFormat,
  type MapLocation,
} from '../../src/utils/reviewHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Sub-tabs ───────────────────────────────────────────────────────────

const SUB_TABS = [
  { key: 'settle', label: 'Settle', icon: 'swap-horizontal' as const },
  { key: 'report', label: 'AI Report', icon: 'analytics' as const },
  { key: 'create', label: 'Create', icon: 'sparkles' as const },
  { key: 'leaderboard', label: 'Board', icon: 'podium' as const },
  { key: 'map', label: 'Map', icon: 'map' as const },
] as const;

type SubTab = (typeof SUB_TABS)[number]['key'];

// ── Simulated itinerary for map ────────────────────────────────────────

const SAMPLE_ITINERARY = [
  {
    dayNumber: 1,
    items: [
      { title: 'Airport Arrival', time: '14:00', type: 'transport', location: 'Airport Terminal' },
      { title: 'Hotel Check-in', time: '16:00', type: 'hotel', location: 'Beach Resort' },
      { title: 'Welcome Dinner', time: '19:00', type: 'food', location: 'Seaside Restaurant' },
    ],
  },
  {
    dayNumber: 2,
    items: [
      { title: 'Temple Visit', time: '08:00', type: 'culture', location: 'Ancient Temple' },
      { title: 'Local Market Lunch', time: '12:30', type: 'food', location: 'Night Market' },
      { title: 'Scooter Exploration', time: '15:00', type: 'activity', location: 'Coastal Road' },
      { title: 'Sunset Point', time: '17:30', type: 'sightseeing', location: 'Cliff Viewpoint' },
    ],
  },
  {
    dayNumber: 3,
    items: [
      { title: 'Spa Morning', time: '09:00', type: 'wellness', location: 'Wellness Spa' },
      { title: 'Beach Club', time: '14:00', type: 'activity', location: 'South Beach Club' },
      { title: 'Cocktails & Chill', time: '18:00', type: 'nightlife', location: 'Rooftop Bar' },
    ],
  },
  {
    dayNumber: 4,
    items: [
      { title: 'Sunrise Cruise', time: '06:00', type: 'activity', location: 'Marina Dock' },
      { title: 'Brunch', time: '10:00', type: 'food', location: 'Garden Cafe' },
      { title: 'Souvenir Shopping', time: '14:00', type: 'shopping', location: 'Artisan Village' },
    ],
  },
  {
    dayNumber: 5,
    items: [
      { title: 'Farewell Breakfast', time: '08:00', type: 'food', location: 'Hotel Restaurant' },
      { title: 'Departure', time: '12:00', type: 'transport', location: 'Airport Terminal' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{
    tab?: string;
    destination?: string;
    tripName?: string;
    dayCount?: string;
  }>();

  // ── Read initial tab from route params ─────────────────────────────
  const initialTab = (searchParams.tab && SUB_TABS.some(t => t.key === searchParams.tab))
    ? searchParams.tab as SubTab
    : 'settle';
  const [activeTab, setActiveTab] = useState<SubTab>(initialTab);

  // Update tab when params change (e.g. navigating back with different tab)
  useEffect(() => {
    if (searchParams.tab && SUB_TABS.some(t => t.key === searchParams.tab)) {
      setActiveTab(searchParams.tab as SubTab);
    }
  }, [searchParams.tab]);

  // ── Data (simulated — in production, pass via params or context) ────
  const expenses = SAMPLE_EXPENSES;
  const members = SAMPLE_MEMBERS;
  const journals = SAMPLE_JOURNALS;
  const destination = searchParams.destination || 'Goa';
  const dayCount = searchParams.dayCount ? parseInt(searchParams.dayCount, 10) : 5;
  const tripName = searchParams.tripName || 'Goa Adventure';

  // ── Computed data ──────────────────────────────────────────────────
  const settlementData = calculateSettlements(expenses, members);
  const reportData = generateTripReport(expenses, members, dayCount, destination);
  const leaderboard = generateLeaderboard(expenses, members, journals);
  const mapLocations = generateMapLocations(SAMPLE_ITINERARY);
  const totalDistance = estimateDistance(mapLocations.length);

  // ── State ──────────────────────────────────────────────────────────
  const [settledMembers, setSettledMembers] = useState<Set<string>>(new Set());
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [showReelModal, setShowReelModal] = useState(false);
  const [reelProgress, setReelProgress] = useState(0);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  // ── Animations ─────────────────────────────────────────────────────
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchTab = (tab: SubTab) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  // ── Handlers ───────────────────────────────────────────────────────

  const handleSettle = (memberName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSettledMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberName)) next.delete(memberName);
      else next.add(memberName);
      return next;
    });
  };

  const handleShareReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        title: `${tripName} — Trip Recap`,
        message: `Just wrapped up ${dayCount} amazing days in ${destination}! Total spend: ₹${reportData.totalSpent.toLocaleString('en-IN')} across ${expenses.length} expenses with ${members.length} friends. Trip score: ${reportData.tripScore}/100. Planned with TraiMate.`,
      });
    } catch {}
  };

  const handleFormatSelect = (format: ShareFormat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFormat(format.key);

    if (format.key === 'blog') {
      setShowBlogModal(true);
    } else if (format.key === 'thread') {
      setShowThreadModal(true);
    } else if (format.key === 'reel') {
      setShowReelModal(true);
      simulateReelGeneration();
    } else if (format.key === 'story') {
      Alert.alert(
        'Story Generated',
        'Your Instagram Story card has been created with trip highlights, stats, and photos. Ready to share!',
        [
          { text: 'Share Now', onPress: () => handleShareReport() },
          { text: 'Later', style: 'cancel' },
        ],
      );
    }
  };

  const simulateReelGeneration = () => {
    setReelProgress(0);
    const steps = [10, 25, 45, 65, 80, 95, 100];
    steps.forEach((p, i) => {
      setTimeout(() => setReelProgress(p), (i + 1) * 600);
    });
  };

  const handleShareBlog = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const blog = generateBlogPost(destination, dayCount, journals, reportData.highlights);
    try {
      await Share.share({ title: `${dayCount} Days in ${destination}`, message: blog });
    } catch {}
  };

  const handleShareThread = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tweets = generateThread(destination, dayCount, journals, reportData.totalSpent);
    try {
      await Share.share({ title: `${destination} Thread`, message: tweets.join('\n\n---\n\n') });
    } catch {}
  };

  // ══════════════════════════════════════════════════════════════════
  // SETTLE TAB
  // ══════════════════════════════════════════════════════════════════

  const renderSettle = () => {
    const allSettled = settledMembers.size >= settlementData.settlements.length;

    return (
      <>
        {/* Per Person Share — Compact */}
        <View style={[styles.gradientCardWrapper, { marginBottom: Spacing.md }]}>
          <LinearGradient
            colors={['#5E8A5A', '#3D6B39']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="wallet-outline" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.7)' }}>Per Person Share</Text>
              <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.xxl, color: Colors.white }}>
                ₹{settlementData.perPerson.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.9)' }}>₹{settlementData.totalSpent.toLocaleString('en-IN')}</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>÷ {members.length} people</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Members */}
        <View style={styles.sectionRow}>
          <Ionicons name="people-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Who Paid What</Text>
        </View>

        {settlementData.balances.map((member) => {
          const isPositive = member.balance >= 0;
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
                <View style={[styles.balanceBadge, { backgroundColor: isPositive ? 'rgba(94,138,90,0.12)' : 'rgba(199,84,80,0.12)' }]}>
                  <Ionicons
                    name={isPositive ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={isPositive ? Colors.success : Colors.error}
                  />
                  <Text style={[styles.memberBalanceAmount, { color: isPositive ? Colors.success : Colors.error }]}>
                    ₹{Math.abs(member.balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <Text style={[styles.memberBalanceLabel, { color: isPositive ? Colors.success : Colors.error }]}>
                  {isPositive ? 'gets back' : 'owes'}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Settlements */}
        <View style={[styles.sectionRow, { marginTop: Spacing.lg }]}>
          <Ionicons name="swap-horizontal-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Settlements</Text>
        </View>

        {settlementData.settlements.map((s, index) => {
          const isSettled = settledMembers.has(`${s.from}-${s.to}`);
          return (
            <Pressable
              key={index}
              onPress={() => handleSettle(`${s.from}-${s.to}`)}
              style={[styles.card, styles.settlementCard, isSettled && styles.settlementSettled]}
            >
              <View style={styles.settlementContent}>
                <View style={styles.settlementFromTo}>
                  <View style={[styles.settlementDot, { backgroundColor: Colors.error }]} />
                  <Text style={styles.settlementName}>{s.from}</Text>
                  <View style={styles.settlementArrowWrap}>
                    <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                  </View>
                  <View style={[styles.settlementDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.settlementName}>{s.to}</Text>
                </View>
                <Text style={[styles.settlementAmount, isSettled && { color: Colors.textMuted }]}>
                  ₹{s.amount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.settleCheckbox, isSettled && styles.settleCheckboxActive]}>
                {isSettled && <Ionicons name="checkmark" size={14} color={Colors.white} />}
              </View>
            </Pressable>
          );
        })}

        {/* All Settled Badge */}
        {allSettled && (
          <View style={styles.allSettledCard}>
            <LinearGradient
              colors={['#5E8A5A', '#3D6B39']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.allSettledGradient}
            >
              <Ionicons name="checkmark-circle" size={32} color={Colors.white} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.allSettledTitle}>All Settled!</Text>
                <Text style={styles.allSettledSub}>Everyone is square. No pending payments.</Text>
              </View>
            </LinearGradient>
          </View>
        )}
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // AI REPORT TAB
  // ══════════════════════════════════════════════════════════════════

  const renderReport = () => {
    const maxCatAmount = Math.max(...reportData.categoryBreakdown.map(c => c.amount), 1);

    return (
      <>
        {/* Trip Score — Compact */}
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }]}>
          <View style={styles.tripScoreCircle}>
            <Text style={styles.tripScoreNumber}>{reportData.tripScore}</Text>
            <Text style={styles.tripScoreOf}>/100</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text }}>
              {reportData.tripScore >= 80 ? 'Legendary Trip!' :
               reportData.tripScore >= 60 ? 'Great Adventure!' :
               'Solid Trip!'}
            </Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 }}>
              {dayCount} days · {expenses.length} expenses · {members.length} mates
            </Text>
          </View>
          <Pressable onPress={handleShareReport} hitSlop={10}>
            <Ionicons name="share-outline" size={20} color={Colors.accent} />
          </Pressable>
        </View>

        {/* Savings Callout */}
        {reportData.savingsVsSimilar > 0 && (
          <View style={styles.savingsCard}>
            <View style={styles.savingsIconWrap}>
              <Ionicons name="trending-down" size={24} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savingsTitle}>You saved ₹{reportData.savingsVsSimilar.toLocaleString('en-IN')}</Text>
              <Text style={styles.savingsDesc}>compared to similar trips to {destination}</Text>
            </View>
          </View>
        )}

        {/* Spending Breakdown */}
        <View style={styles.sectionRow}>
          <Ionicons name="pie-chart-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Spending Breakdown</Text>
        </View>

        <View style={styles.totalSpentRow}>
          <Text style={styles.totalSpentLabel}>Total Spent</Text>
          <Text style={styles.totalSpentAmount}>₹{reportData.totalSpent.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.card}>
          {reportData.categoryBreakdown.map((cat, index) => {
            const catLabel = cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
            const barWidth = (cat.amount / maxCatAmount) * 100;

            return (
              <View key={cat.category} style={[styles.categoryRow, index < reportData.categoryBreakdown.length - 1 && styles.categoryRowBorder]}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIconCircle, { backgroundColor: cat.color + '1A' }]}>
                      <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    </View>
                    <Text style={styles.categoryName}>{catLabel}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>₹{cat.amount.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.categoryPct, { color: cat.color }]}>{cat.pct.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${barWidth}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Highlights */}
        <View style={[styles.sectionRow, { marginTop: Spacing.lg }]}>
          <Ionicons name="star-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Trip Highlights</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.md, paddingRight: Spacing.md }}
        >
          {reportData.highlights.map((h, i) => (
            <View key={i} style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: Colors.sage + '1A' }]}>
                <Ionicons name={h.icon as any} size={20} color={Colors.sage} />
              </View>
              <Text style={styles.highlightTitle}>{h.title}</Text>
              <Text style={styles.highlightDesc} numberOfLines={2}>{h.description}</Text>
              {h.metric && (
                <View style={styles.highlightMetric}>
                  <Text style={styles.highlightMetricText}>{h.metric}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Insights */}
        <View style={[styles.sectionRow, { marginTop: Spacing.lg }]}>
          <Ionicons name="bulb-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>AI Insights</Text>
        </View>

        {reportData.insights.map((insight, i) => (
          <Pressable
            key={i}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedInsight(expandedInsight === i ? null : i);
            }}
            style={styles.insightCard}
          >
            <View style={[styles.insightAccent, { backgroundColor: insight.color }]} />
            <View style={[styles.insightIconWrap, { backgroundColor: insight.color + '1A' }]}>
              <Ionicons name={insight.icon as any} size={20} color={insight.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDetail} numberOfLines={expandedInsight === i ? undefined : 1}>
                {insight.detail}
              </Text>
            </View>
            <Ionicons name={expandedInsight === i ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
          </Pressable>
        ))}

        {/* Tips for Next Trip */}
        <View style={[styles.sectionRow, { marginTop: Spacing.lg }]}>
          <Ionicons name="rocket-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Pro Tips for Next Time</Text>
        </View>

        <View style={styles.card}>
          {reportData.nextTripTips.map((tip, i) => (
            <View key={i} style={[styles.tipRow, i < reportData.nextTripTips.length - 1 && styles.tipRowBorder]}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Share Report CTA */}
        <Pressable onPress={handleShareReport} style={styles.shareReportBtn}>
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareReportGradient}
          >
            <Ionicons name="share-outline" size={20} color={Colors.white} />
            <Text style={styles.shareReportText}>Share Trip Report</Text>
          </LinearGradient>
        </Pressable>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // CREATE TAB (Story / Reel / Blog / Thread)
  // ══════════════════════════════════════════════════════════════════

  const renderCreate = () => (
    <>
      {/* Hero — Compact */}
      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }]}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="sparkles" size={22} color="#FFC947" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text }}>Share Your Trip</Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textSecondary }}>AI transforms your journey into content</Text>
        </View>
      </View>

      {/* Format Cards */}
      <View style={styles.sectionRow}>
        <Ionicons name="color-wand-outline" size={18} color={Colors.sage} />
        <Text style={styles.sectionTitle}>Choose a Format</Text>
      </View>

      {SHARE_FORMATS.map((format, i) => (
        <Pressable
          key={format.key}
          onPress={() => handleFormatSelect(format)}
          style={({ pressed }) => [styles.formatCard, pressed && styles.formatCardPressed]}
        >
          <LinearGradient
            colors={[format.gradient[0], format.gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.formatIconGradient}
          >
            <Ionicons name={format.icon as any} size={24} color={Colors.white} />
          </LinearGradient>
          <View style={styles.formatContent}>
            <Text style={styles.formatLabel}>{format.label}</Text>
            <Text style={styles.formatDesc}>{format.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </Pressable>
      ))}

      {/* How it works */}
      <View style={[styles.sectionRow, { marginTop: Spacing.lg }]}>
        <Ionicons name="help-circle-outline" size={18} color={Colors.sage} />
        <Text style={styles.sectionTitle}>How it Works</Text>
      </View>

      <View style={styles.card}>
        {[
          { step: 1, icon: 'finger-print', text: 'Pick a format above' },
          { step: 2, icon: 'sparkles', text: 'AI compiles your photos, journal & highlights' },
          { step: 3, icon: 'eye', text: 'Preview & customize text and style' },
          { step: 4, icon: 'share-social', text: 'Export & share via native share sheet' },
        ].map((s, i) => (
          <View key={s.step} style={[styles.howItWorksRow, i < 3 && styles.howItWorksBorder]}>
            <View style={styles.howItWorksStep}>
              <Text style={styles.howItWorksStepNum}>{s.step}</Text>
            </View>
            <Ionicons name={s.icon as any} size={20} color={Colors.sage} style={{ marginRight: 10 }} />
            <Text style={styles.howItWorksText}>{s.text}</Text>
          </View>
        ))}
      </View>
    </>
  );

  // ══════════════════════════════════════════════════════════════════
  // LEADERBOARD TAB
  // ══════════════════════════════════════════════════════════════════

  const renderLeaderboard = () => {
    const BADGE_LABELS: Record<string, string> = {
      cash: 'Big Spender',
      'shield-checkmark': 'Budget Keeper',
      heart: 'Most Generous',
      compass: 'Explorer',
      book: 'Journal Champ',
    };

    return (
      <>
        {/* Leaderboard Hero — Compact */}
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }]}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFC9471A', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="trophy" size={22} color="#E67E22" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text }}>Trip Leaderboard</Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textSecondary }}>{tripName} · {members.length} travellers</Text>
          </View>
        </View>

        {/* Leaderboard entries */}
        {leaderboard.map((entry, i) => (
          <View key={i} style={styles.leaderboardCard}>
            <View style={styles.leaderboardRank}>
              <Ionicons name={entry.badge as any} size={22} color={entry.badgeColor} />
            </View>
            <View style={[styles.leaderboardAvatar, { backgroundColor: entry.color }]}>
              <Text style={styles.leaderboardAvatarText}>{entry.initial}</Text>
            </View>
            <View style={styles.leaderboardInfo}>
              <View style={styles.leaderboardNameRow}>
                <Text style={styles.leaderboardName}>{entry.name}</Text>
                <View style={[styles.leaderboardBadge, { backgroundColor: entry.badgeColor + '1A' }]}>
                  <Text style={[styles.leaderboardBadgeText, { color: entry.badgeColor }]}>
                    {BADGE_LABELS[entry.badge] || 'Award'}
                  </Text>
                </View>
              </View>
              <Text style={styles.leaderboardStat}>{entry.stat}</Text>
            </View>
          </View>
        ))}

        {/* Fun Stats */}
        <View style={[styles.sectionRow, { marginTop: Spacing.lg }]}>
          <Ionicons name="stats-chart-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Fun Stats</Text>
        </View>

        <View style={styles.funStatsGrid}>
          {[
            { icon: 'pizza', value: `₹${(reportData.categoryBreakdown.find(c => c.category === 'food')?.amount || 0).toLocaleString('en-IN')}`, label: 'Spent on Food', color: '#B07A50' },
            { icon: 'bed', value: `${dayCount}`, label: 'Nights Away', color: '#8B6DB5' },
            { icon: 'camera', value: `${journals.reduce((s, j) => s + j.photos.length, 0) || 23}`, label: 'Photos Taken', color: '#4A8BA8' },
            { icon: 'happy', value: `${journals.filter(j => j.mood === 'amazing').length}`, label: 'Amazing Days', color: '#5E8A5A' },
          ].map((stat, i) => (
            <View key={i} style={styles.funStatCard}>
              <View style={[styles.funStatIcon, { backgroundColor: stat.color + '1A' }]}>
                <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              </View>
              <Text style={styles.funStatValue}>{stat.value}</Text>
              <Text style={styles.funStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // MAP TAB
  // ══════════════════════════════════════════════════════════════════

  const renderMap = () => {
    const uniqueLocations = mapLocations.filter(
      (loc, i, arr) => arr.findIndex(l => l.name === loc.name) === i,
    );

    return (
      <>
        {/* Map Stats — Compact row */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
          {[
            { icon: 'location' as const, num: `${uniqueLocations.length}`, label: 'Places', color: '#22C55E' },
            { icon: 'speedometer' as const, num: `${totalDistance}+`, label: 'km', color: '#4A8BA8' },
            { icon: 'calendar' as const, num: `${dayCount}`, label: 'Days', color: '#E67E22' },
          ].map((s) => (
            <View key={s.label} style={[styles.card, { flex: 1, alignItems: 'center', paddingVertical: 14 }]}>
              <Ionicons name={s.icon} size={18} color={s.color} style={{ marginBottom: 4 }} />
              <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.lg, color: Colors.text }}>{s.num}</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Route Timeline */}
        <View style={styles.sectionRow}>
          <Ionicons name="trail-sign-outline" size={18} color={Colors.sage} />
          <Text style={styles.sectionTitle}>Route Timeline</Text>
        </View>

        {SAMPLE_ITINERARY.map((day) => (
          <View key={day.dayNumber} style={styles.mapDaySection}>
            <View style={styles.mapDayHeader}>
              <View style={styles.mapDayBadge}>
                <Text style={styles.mapDayBadgeText}>{day.dayNumber}</Text>
              </View>
              <Text style={styles.mapDayLabel}>Day {day.dayNumber}</Text>
              <Text style={styles.mapDayCount}>{day.items.length} stops</Text>
            </View>

            {day.items.map((item, idx) => {
              const iconName = CATEGORY_IONICONS[item.type] || 'location';
              const iconColor = CATEGORY_COLORS[item.type] || Colors.sage;

              return (
                <View key={idx} style={styles.mapItemRow}>
                  {/* Timeline connector */}
                  <View style={styles.mapTimelineCol}>
                    <View style={[styles.mapTimelineDot, { backgroundColor: iconColor }]}>
                      <Ionicons name={iconName as any} size={14} color={Colors.white} />
                    </View>
                    {idx < day.items.length - 1 && <View style={styles.mapTimelineLine} />}
                  </View>

                  {/* Content */}
                  <View style={styles.mapItemContent}>
                    <Text style={styles.mapItemTitle}>{item.title}</Text>
                    <View style={styles.mapItemMeta}>
                      <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.mapItemLocation}>{item.location}</Text>
                    </View>
                  </View>

                  <Text style={styles.mapItemTime}>{item.time}</Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* Distance summary */}
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: Spacing.md }]}>
          <View style={[styles.funStatIcon, { backgroundColor: '#22C55E1A' }]}>
            <Ionicons name="footsteps" size={22} color="#22C55E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Distance Covered</Text>
            <Text style={styles.insightDetail}>
              You visited {uniqueLocations.length} unique locations across {dayCount} days,
              covering approximately {totalDistance}+ km. That's roughly {Math.round(totalDistance / dayCount)} km per day!
            </Text>
          </View>
        </View>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  const renderContent = () => {
    switch (activeTab) {
      case 'settle': return renderSettle();
      case 'report': return renderReport();
      case 'create': return renderCreate();
      case 'leaderboard': return renderLeaderboard();
      case 'map': return renderMap();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={20}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{destination} Recap</Text>
        <Pressable
          onPress={handleShareReport}
          hitSlop={20}
          style={styles.headerAction}
        >
          <Ionicons name="share-outline" size={22} color={Colors.accent} />
        </Pressable>
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
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? Colors.white : Colors.textMuted}
                style={{ marginRight: 5 }}
              />
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
        >
          {renderContent()}
          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Blog Preview Modal ────────────────────────── */}
      <Modal visible={showBlogModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Blog Preview</Text>
              <Pressable onPress={() => setShowBlogModal(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.blogScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.blogPreviewTitle}>
                {dayCount} Days in {destination} — A Journey to Remember
              </Text>
              <Text style={styles.blogPreviewMeta}>
                By You · {dayCount} min read
              </Text>
              {journals.map((entry, i) => (
                <View key={i} style={styles.blogEntry}>
                  <Text style={styles.blogDayLabel}>
                    {i === 0 ? 'The Beginning' : `Day ${entry.day}`}
                    {entry.mood ? ` — Feeling ${entry.mood}` : ''}
                  </Text>
                  <Text style={styles.blogEntryText}>{entry.text}</Text>
                </View>
              ))}
              <View style={styles.blogFooter}>
                <Text style={styles.blogFooterText}>
                  Written with love and a little help from TraiMate AI
                </Text>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => { setShowBlogModal(false); handleShareBlog(); }}
                style={styles.modalPrimaryBtn}
              >
                <LinearGradient
                  colors={['#5E8A5A', '#3D6B39']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPrimaryGradient}
                >
                  <Ionicons name="share-outline" size={18} color={Colors.white} />
                  <Text style={styles.modalPrimaryText}>Share Blog</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Thread Preview Modal ──────────────────────── */}
      <Modal visible={showThreadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thread Preview</Text>
              <Pressable onPress={() => setShowThreadModal(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.blogScroll} showsVerticalScrollIndicator={false}>
              {generateThread(destination, dayCount, journals, reportData.totalSpent).map((tweet, i) => (
                <View key={i} style={styles.threadCard}>
                  <View style={styles.threadHeader}>
                    <View style={[styles.threadAvatar, { backgroundColor: Colors.accent }]}>
                      <Text style={styles.threadAvatarText}>Y</Text>
                    </View>
                    <View>
                      <Text style={styles.threadAuthor}>You</Text>
                      <Text style={styles.threadHandle}>@traveller</Text>
                    </View>
                    <Text style={styles.threadCount}>{i + 1}/{generateThread(destination, dayCount, journals, reportData.totalSpent).length}</Text>
                  </View>
                  <Text style={styles.threadText}>{tweet}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => { setShowThreadModal(false); handleShareThread(); }}
                style={styles.modalPrimaryBtn}
              >
                <LinearGradient
                  colors={['#1DA1F2', '#0D8BD9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalPrimaryGradient}
                >
                  <Ionicons name="share-outline" size={18} color={Colors.white} />
                  <Text style={styles.modalPrimaryText}>Share Thread</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reel Generation Modal ─────────────────────── */}
      <Modal visible={showReelModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.reelModalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              style={styles.reelModalGradient}
            >
              {reelProgress < 100 ? (
                <>
                  <Ionicons name="videocam" size={48} color="#FFC947" style={{ marginBottom: 16 }} />
                  <Text style={styles.reelModalTitle}>Creating Your Reel</Text>
                  <Text style={styles.reelModalSub}>
                    {reelProgress < 30 ? 'Gathering your best moments...' :
                     reelProgress < 60 ? 'Adding transitions & effects...' :
                     reelProgress < 90 ? 'Mixing the soundtrack...' :
                     'Finalizing...'}
                  </Text>
                  <View style={styles.reelProgressTrack}>
                    <View style={[styles.reelProgressBar, { width: `${reelProgress}%` }]} />
                  </View>
                  <Text style={styles.reelProgressText}>{reelProgress}%</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={56} color="#22C55E" style={{ marginBottom: 16 }} />
                  <Text style={styles.reelModalTitle}>Reel Ready!</Text>
                  <Text style={styles.reelModalSub}>
                    Your {dayCount}-day {destination} reel is ready to share
                  </Text>
                  <View style={styles.reelActions}>
                    <Pressable
                      onPress={() => {
                        setShowReelModal(false);
                        handleShareReport();
                      }}
                      style={styles.reelShareBtn}
                    >
                      <Text style={styles.reelShareText}>Share Now</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowReelModal(false)}
                      style={styles.reelLaterBtn}
                    >
                      <Text style={styles.reelLaterText}>Save for Later</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════

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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
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

  // Shared
  card: {
    backgroundColor: Colors.card,
    ...BorderRadius.card,
    padding: Spacing.lg,
    ...Shadows.card,
    marginBottom: Spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  gradientCardWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.cardHover,
  },

  // ═══ SETTLE TAB ═══

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  memberBalanceAmount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
  },
  memberBalanceLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  settlementSettled: {
    opacity: 0.6,
    backgroundColor: '#F0F0ED',
  },
  settlementContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  settlementArrowWrap: {
    marginHorizontal: 2,
  },
  settlementAmount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  settleCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  settleCheckboxActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },

  allSettledCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  allSettledGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  allSettledTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  allSettledSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // ═══ AI REPORT TAB ═══

  tripScoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripScoreNumber: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
  },
  tripScoreOf: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: -3,
  },

  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(94,138,90,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(94,138,90,0.2)',
    gap: 12,
  },
  savingsIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(94,138,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.success,
  },
  savingsDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  totalSpentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalSpentLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  totalSpentAmount: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },

  categoryRow: {
    paddingVertical: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 40,
    textAlign: 'right',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },

  highlightCard: {
    width: 160,
    backgroundColor: Colors.white,
    ...BorderRadius.card,
    padding: Spacing.md,
    ...Shadows.card,
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  highlightTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 4,
  },
  highlightDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  highlightMetric: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.sage + '15',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  highlightMetricText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.sage,
  },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    ...BorderRadius.card,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  insightAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  insightTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: 2,
  },
  insightDetail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingRight: Spacing.md,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  tipRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.sage + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  tipText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  shareReportBtn: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  shareReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  shareReportText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },

  // ═══ CREATE TAB ═══

  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    ...BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  formatCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  formatIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  formatContent: {
    flex: 1,
  },
  formatLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  formatDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  howItWorksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  howItWorksBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  howItWorksStep: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.sage + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  howItWorksStepNum: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.sage,
  },
  howItWorksText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },

  // ═══ LEADERBOARD TAB ═══

  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    ...BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  leaderboardRank: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leaderboardAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaderboardName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  leaderboardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leaderboardBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
  },
  leaderboardStat: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  funStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  funStatCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.white,
    ...BorderRadius.card,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  funStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  funStatValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  funStatLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ═══ MAP TAB ═══

  mapDaySection: {
    marginBottom: Spacing.lg,
  },
  mapDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mapDayBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mapDayBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  mapDayLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  mapDayCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  mapItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  mapTimelineCol: {
    width: 40,
    alignItems: 'center',
  },
  mapTimelineDot: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  mapTimelineLine: {
    width: 2,
    height: 32,
    backgroundColor: Colors.border,
  },
  mapItemContent: {
    flex: 1,
    paddingBottom: 16,
    marginLeft: 8,
  },
  mapItemTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  mapItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  mapItemLocation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  mapItemTime: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ═══ MODALS ═══

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 32, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  modalActions: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  modalPrimaryBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  modalPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  modalPrimaryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },

  // Blog Modal
  blogScroll: {
    paddingHorizontal: Spacing.xl,
    maxHeight: 400,
  },
  blogPreviewTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: 8,
  },
  blogPreviewMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  blogEntry: {
    marginBottom: Spacing.lg,
  },
  blogDayLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.sage,
    marginBottom: 6,
  },
  blogEntryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  blogFooter: {
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  blogFooterText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Thread Modal
  threadCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  threadAuthor: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  threadHandle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  threadCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  threadText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },

  // Reel Modal
  reelModalContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  reelModalGradient: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  reelModalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.white,
  },
  reelModalSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  reelProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  reelProgressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFC947',
  },
  reelProgressText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  reelActions: {
    width: '100%',
    gap: 10,
  },
  reelShareBtn: {
    backgroundColor: '#22C55E',
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  reelShareText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  reelLaterBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  reelLaterText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.8)',
  },
});
