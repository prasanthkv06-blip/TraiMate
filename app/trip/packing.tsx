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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { getSmartPackingList, type PackingItem } from '../../src/constants/aiData';

// ── Helpers ──
function cleanDestinationName(d: string): string {
  return d.replace(/[^\w\s,]/g, '').split(',')[0].trim();
}

// ── Constants ──
const CIRCLE_SIZE = 100;
const CIRCLE_STROKE_WIDTH = 10;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE_WIDTH) / 2;

const CATEGORY_META: Record<string, { emoji: string; order: number }> = {
  Documents:  { emoji: '📄', order: 0 },
  Essentials: { emoji: '🎒', order: 1 },
  Clothing:   { emoji: '👕', order: 2 },
  Toiletries: { emoji: '🧴', order: 3 },
  Health:     { emoji: '💊', order: 4 },
  Activity:   { emoji: '🏄', order: 5 },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META);

// Detect trip types from returned items (since DEST_TYPE_MAP isn't exported)
function detectTripTypes(items: PackingItem[]): string[] {
  const typeIndicators: Record<string, string[]> = {
    Beach:     ['Swimsuit', 'Beach towel', 'Flip flops', 'Snorkel gear', 'Reef-safe sunscreen'],
    Cultural:  ['Modest clothing', 'Sarong / cover-up', 'Slip-on shoes', 'Guidebook / phrasebook'],
    Wellness:  ['Yoga mat', 'Workout clothes', 'Resistance bands', 'Essential oils'],
    Adventure: ['Hiking boots', 'Rain jacket', 'Headlamp / torch', 'Trekking poles', 'Dry bag'],
    City:      ['Smart casual outfit', 'Metro card / transit pass', 'Walking shoes (comfy)', 'Cross-body bag'],
    Cold:      ['Warm jacket', 'Thermal layers', 'Gloves', 'Warm boots'],
  };
  const itemNames = new Set(items.map(i => i.name));
  const detected: string[] = [];
  for (const [type, indicators] of Object.entries(typeIndicators)) {
    if (indicators.some(name => itemNames.has(name))) {
      detected.push(type);
    }
  }
  return detected.length > 0 ? detected : ['General'];
}

// ── Animated Checkbox Component ──
function AnimatedCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const scaleAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: checked ? 1 : 0,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
      ]),
    ]).start();
  }, [checked]);

  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <Animated.View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          { transform: [{ scale: bounceAnim }] },
        ]}
      >
        <Animated.Text
          style={[
            styles.checkmark,
            { opacity: scaleAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          ✓
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Packing Item Row ──
function PackingItemRow({
  item,
  packed,
  onToggle,
  index,
}: {
  item: PackingItem;
  packed: boolean;
  onToggle: () => void;
  index: number;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 40;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.itemRow,
        packed && styles.itemRowPacked,
        {
          opacity: opacityAnim,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <AnimatedCheckbox checked={packed} onToggle={onToggle} />
      <Text style={styles.itemEmoji}>{item.emoji}</Text>
      <Text
        style={[styles.itemName, packed && styles.itemNamePacked]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
      {item.essential && (
        <View style={styles.essentialBadge}>
          <Text style={styles.essentialBadgeText}>Essential</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Circular Progress ──
function CircularProgress({
  progress,
  packed,
  total,
}: {
  progress: number;
  packed: number;
  total: number;
}) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: progress,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const color =
    progress === 0 ? Colors.error : progress >= 0.5 ? Colors.sage : Colors.accent;

  return (
    <View style={styles.circularContainer}>
      <View style={styles.circularOuter}>
        {/* Background circle */}
        <View style={styles.svgContainer}>
          <View
            style={[
              styles.circleTrack,
              {
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: CIRCLE_SIZE / 2,
                borderWidth: CIRCLE_STROKE_WIDTH,
                borderColor: Colors.border,
              },
            ]}
          />
          {/* We'll use an overlay approach for the progress arc */}
          <Animated.View
            style={[
              styles.circleProgress,
              {
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: CIRCLE_SIZE / 2,
                borderWidth: CIRCLE_STROKE_WIDTH,
                borderColor: color,
                borderLeftColor: 'transparent',
                borderBottomColor: 'transparent',
                transform: [
                  {
                    rotate: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-45deg', '315deg'],
                    }),
                  },
                ],
              },
            ]}
          />
          {/* Second half for > 50% */}
          {progress > 0.5 && (
            <Animated.View
              style={[
                styles.circleProgress,
                {
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  borderRadius: CIRCLE_SIZE / 2,
                  borderWidth: CIRCLE_STROKE_WIDTH,
                  borderColor: color,
                  borderLeftColor: 'transparent',
                  borderBottomColor: 'transparent',
                  transform: [
                    {
                      rotate: animValue.interpolate({
                        inputRange: [0.5, 1],
                        outputRange: ['-45deg', '135deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>
        {/* Center text */}
        <View style={styles.circleCenter}>
          <Text style={[styles.circlePercentage, { color }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
      <Text style={styles.circleLabel}>
        {packed} of {total} items packed
      </Text>
      {progress === 1 && (
        <Text style={styles.allPackedText}>All packed! Ready to go</Text>
      )}
    </View>
  );
}

// ── Main Screen ──
export default function PackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();

  const destination = params.destination ? cleanDestinationName(params.destination) : 'General';
  const tripDays = 7;

  // Generate initial packing list from AI
  const aiItems = useMemo(() => getSmartPackingList(destination, tripDays), [destination, tripDays]);
  const tripTypes = useMemo(() => detectTripTypes(aiItems), [aiItems]);

  // State
  const [packedIds, setPackedIds] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<PackingItem[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Essentials');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(bannerAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(progressAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(contentAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // All items (AI + custom)
  const allItems = useMemo(() => [...aiItems, ...customItems], [aiItems, customItems]);

  // Generate unique IDs for items
  const itemIdMap = useMemo(() => {
    const map = new Map<string, string>();
    allItems.forEach((item, idx) => {
      map.set(`${item.category}-${item.name}-${idx}`, `${item.category}-${item.name}-${idx}`);
    });
    return map;
  }, [allItems]);

  const getItemId = useCallback(
    (item: PackingItem, idx: number) => `${item.category}-${item.name}-${idx}`,
    []
  );

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, { item: PackingItem; globalIdx: number }[]> = {};
    allItems.forEach((item, idx) => {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ item, globalIdx: idx });
    });
    // Sort categories by defined order
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const orderA = CATEGORY_META[a]?.order ?? 99;
      const orderB = CATEGORY_META[b]?.order ?? 99;
      return orderA - orderB;
    });
    return sorted;
  }, [allItems]);

  // Stats
  const totalItems = allItems.length;
  const packedCount = packedIds.size;
  const progress = totalItems > 0 ? packedCount / totalItems : 0;

  // Handlers
  const togglePacked = useCallback(
    (itemId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPackedIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    },
    []
  );

  const toggleCategory = useCallback((category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const uncheckAll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPackedIds(new Set());
  }, []);

  const packEssentials = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPackedIds((prev) => {
      const next = new Set(prev);
      allItems.forEach((item, idx) => {
        if (item.essential) {
          next.add(getItemId(item, idx));
        }
      });
      return next;
    });
  }, [allItems, getItemId]);

  const addCustomItem = useCallback(() => {
    if (!newItemText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newItem: PackingItem = {
      name: newItemText.trim(),
      emoji: '📦',
      essential: false,
      category: selectedCategory,
    };
    setCustomItems((prev) => [...prev, newItem]);
    setNewItemText('');
    setShowAddForm(false);
    // Expand the category if collapsed
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.delete(selectedCategory);
      return next;
    });
  }, [newItemText, selectedCategory]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={20} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Packing List</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </Animated.View>

      {/* ── Quick Actions ── */}
      <Animated.View
        style={[
          styles.quickActionsRow,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={uncheckAll}
          style={[styles.quickActionBtn, styles.quickActionOutline]}
        >
          <Text style={styles.quickActionOutlineText}>Uncheck All</Text>
        </Pressable>
        <Pressable onPress={packEssentials} style={[styles.quickActionBtn, styles.quickActionFilled]}>
          <Text style={styles.quickActionFilledText}>Pack Essentials</Text>
        </Pressable>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* ── AI Smart Generation Banner ── */}
        <Animated.View
          style={[
            styles.aiBanner,
            {
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.aiBannerContent}>
            <View style={styles.aiBannerHeader}>
              <Text style={styles.aiBannerIcon}>{'🤖'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBannerTitle}>AI-Powered Packing</Text>
                <Text style={styles.aiBannerSubtitle}>
                  Smart list for {destination} · {tripDays} days
                </Text>
              </View>
            </View>
            <View style={styles.typeBadgesRow}>
              {tripTypes.map((type) => (
                <View key={type} style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Progress Section ── */}
        <Animated.View
          style={[
            styles.progressCard,
            {
              opacity: progressAnim,
              transform: [
                {
                  scale: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <CircularProgress
            progress={progress}
            packed={packedCount}
            total={totalItems}
          />
        </Animated.View>

        {/* ── Category Sections ── */}
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          }}
        >
          {groupedItems.map(([category, items]) => {
            const isCollapsed = collapsedCategories.has(category);
            const catPacked = items.filter(({ item, globalIdx }) =>
              packedIds.has(getItemId(item, globalIdx))
            ).length;
            const catTotal = items.length;
            const meta = CATEGORY_META[category] || { emoji: '📦', order: 99 };

            return (
              <View key={category} style={styles.catSection}>
                {/* Category Header */}
                <Pressable
                  onPress={() => toggleCategory(category)}
                  style={styles.catHeader}
                >
                  <Text style={styles.catEmoji}>{meta.emoji}</Text>
                  <Text style={styles.catTitle}>{category}</Text>
                  <View style={styles.catCountBadge}>
                    <Text style={styles.catCountText}>
                      {catPacked}/{catTotal}
                    </Text>
                  </View>
                  <Ionicons name={isCollapsed ? "chevron-forward" : "chevron-down"} size={16} color={Colors.textMuted} style={styles.catChevron} />
                </Pressable>

                {/* Category Items */}
                {!isCollapsed &&
                  items.map(({ item, globalIdx }, localIdx) => {
                    const itemId = getItemId(item, globalIdx);
                    return (
                      <PackingItemRow
                        key={itemId}
                        item={item}
                        packed={packedIds.has(itemId)}
                        onToggle={() => togglePacked(itemId)}
                        index={localIdx}
                      />
                    );
                  })}

                {/* Category completion indicator */}
                {!isCollapsed && catPacked === catTotal && catTotal > 0 && (
                  <View style={styles.catCompleteRow}>
                    <Text style={styles.catCompleteText}>
                      All {category.toLowerCase()} packed
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>

        {/* ── Add Custom Item ── */}
        <Animated.View
          style={[
            styles.addSection,
            {
              opacity: contentAnim,
            },
          ]}
        >
          {!showAddForm ? (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={styles.addTrigger}
            >
              <Ionicons name="add" size={20} color={Colors.accent} />
              <Text style={styles.addTriggerText}>Add Custom Item</Text>
            </Pressable>
          ) : (
            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>Add Custom Item</Text>

              <TextInput
                style={styles.addInput}
                value={newItemText}
                onChangeText={setNewItemText}
                placeholder="Item name..."
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={addCustomItem}
                returnKeyType="done"
              />

              {/* Category Selector */}
              <Pressable
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={styles.categorySelector}
              >
                <Text style={styles.categorySelectorLabel}>Category:</Text>
                <Text style={styles.categorySelectorValue}>
                  {CATEGORY_META[selectedCategory]?.emoji} {selectedCategory}
                </Text>
                <Ionicons name={showCategoryPicker ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
              </Pressable>

              {showCategoryPicker && (
                <View style={styles.categoryPickerList}>
                  {CATEGORY_KEYS.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                      style={[
                        styles.categoryPickerItem,
                        selectedCategory === cat && styles.categoryPickerItemActive,
                      ]}
                    >
                      <Text style={styles.categoryPickerEmoji}>
                        {CATEGORY_META[cat].emoji}
                      </Text>
                      <Text
                        style={[
                          styles.categoryPickerText,
                          selectedCategory === cat && styles.categoryPickerTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.addFormActions}>
                <Pressable
                  onPress={() => {
                    setShowAddForm(false);
                    setNewItemText('');
                    setShowCategoryPicker(false);
                  }}
                  style={styles.addCancelBtn}
                >
                  <Text style={styles.addCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={addCustomItem}
                  style={[
                    styles.addConfirmBtn,
                    !newItemText.trim() && styles.addConfirmBtnDisabled,
                  ]}
                >
                  <Text style={styles.addConfirmText}>Add Item</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  backArrow: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: Fonts.bodyBold,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: Colors.sage,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
  },
  aiBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
    letterSpacing: 1,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionOutline: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  quickActionOutlineText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  quickActionFilled: {
    backgroundColor: Colors.sage,
  },
  quickActionFilledText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },

  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  // AI Banner
  aiBanner: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.sageDark,
    ...Shadows.card,
  },
  aiBannerContent: {
    padding: Spacing.lg,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  aiBannerIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  aiBannerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.white,
    marginBottom: 4,
  },
  aiBannerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  typeBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  typeBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },

  // Progress Card
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.card,
  },
  circularContainer: {
    alignItems: 'center',
  },
  circularOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  svgContainer: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circleTrack: {
    position: 'absolute',
  },
  circleProgress: {
    position: 'absolute',
  },
  circleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercentage: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
  },
  circleLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  allPackedText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.sage,
    marginTop: Spacing.xs,
  },

  // Categories
  catSection: {
    marginBottom: Spacing.lg,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  catEmoji: {
    fontSize: 22,
  },
  catTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    flex: 1,
  },
  catCountBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  catCountText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  catChevron: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  catCompleteRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  catCompleteText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },

  // Item Row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md - 2,
    borderRadius: BorderRadius.md,
    marginBottom: 6,
    ...Shadows.card,
  },
  itemRowPacked: {
    opacity: 0.65,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 2,
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
  },
  itemEmoji: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  itemName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  itemNamePacked: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  essentialBadge: {
    backgroundColor: Colors.accentLight + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
    marginLeft: Spacing.sm,
  },
  essentialBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.accentDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Add Custom Item
  addSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  addTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  addTriggerIcon: {
    fontSize: 20,
    color: Colors.accent,
    fontFamily: Fonts.bodyBold,
  },
  addTriggerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  addForm: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  addFormTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  addInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  categorySelectorLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  categorySelectorValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  categorySelectorChevron: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  categoryPickerList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  categoryPickerItemActive: {
    backgroundColor: Colors.sage + '18',
  },
  categoryPickerEmoji: {
    fontSize: 16,
  },
  categoryPickerText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  categoryPickerTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.sage,
  },
  addFormActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  addCancelText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  addConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  addConfirmBtnDisabled: {
    opacity: 0.5,
  },
  addConfirmText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
});
