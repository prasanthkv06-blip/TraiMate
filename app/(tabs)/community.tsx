import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../src/constants/theme';
import { useCommunity } from '../../src/contexts/CommunityContext';
import { likePost, unlikePost, isPostLiked } from '../../src/services/community/interactionService';
import { supabase } from '../../src/lib/supabase';
import FeedList from '../../src/components/community/FeedList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SEGMENT_TABS = ['Besties', 'For You'] as const;

const FEATURE_ACTIONS = [
  { key: 'live', label: 'Go Live', icon: 'radio' as const, gradient: ['#FF416C', '#FF4B2B'] as const, route: '/community/live' },
  { key: 'yap', label: 'Yap', icon: 'chatbubbles' as const, gradient: ['#4776E6', '#8E54E9'] as const, route: '/community/chat/bali-indonesia' },
  { key: 'sos', label: 'SOS', icon: 'hand-left' as const, gradient: ['#F7971E', '#FFD200'] as const, route: '/community/help-request' },
  { key: 'fyp', label: 'FYP', icon: 'compass' as const, gradient: ['#11998e', '#38ef7d'] as const, route: '/community/search' },
] as const;

const MOCK_CLIPS = [
  { id: '1', username: 'adventurer_k', views: '2.1k', gradient: ['#FF6B6B', '#ee5a24'] as const },
  { id: '2', username: 'nomad.life', views: '8.4k', gradient: ['#4ECDC4', '#2C7873'] as const },
  { id: '3', username: 'solo_travlr', views: '950', gradient: ['#45B7D1', '#2980B9'] as const },
  { id: '4', username: 'backpack.bae', views: '5.6k', gradient: ['#f953c6', '#b91d73'] as const },
  { id: '5', username: 'jet.setter', views: '12k', gradient: ['#FFEAA7', '#FDCB6E'] as const },
  { id: '6', username: 'wander.lust', views: '3.3k', gradient: ['#a18cd1', '#fbc2eb'] as const },
  { id: '7', username: 'trail.queen', views: '720', gradient: ['#FF8A5C', '#EA5455'] as const },
];

export default function CommunityTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    feedPosts,
    feedLoading,
    feedRefreshing,
    feedHasMore,
    feedType,
    setFeedType,
    refreshFeed,
    loadMoreFeed,
    unreadCount,
  } = useCommunity();

  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const activeSegment = feedType === 'following' ? 0 : 1;

  // --- Animation 1: Fire badge pulse ---
  const firePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(firePulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(firePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [firePulse]);

  // --- Animation 2: Shimmer on "Drop a Clip" card ---
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  // --- Animation 3: Staggered entrance (pills + clips) ---
  const entranceAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0)),
  ).current;
  useEffect(() => {
    Animated.stagger(
      100,
      entranceAnims.map(anim =>
        Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ),
    ).start();
  }, [entranceAnims]);

  // --- Animation 4: Sliding segment indicator ---
  const segmentSlide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(segmentSlide, {
      toValue: activeSegment,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, [activeSegment, segmentSlide]);

  // --- Animation 5: Header collapse on scroll ---
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // --- Animation 6: Go Live rotating ring ---
  const liveRingRotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(liveRingRotate, { toValue: 1, duration: 2500, useNativeDriver: true, easing: undefined }),
    );
    loop.start();
    return () => loop.stop();
  }, [liveRingRotate]);
  const liveRingSpin = liveRingRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- Animation 7: Clip parallax on horizontal scroll ---
  const clipScrollX = useRef(new Animated.Value(0)).current;

  // --- Animation 8: Clip long-press preview ---
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const clipPreviewScale = useRef(new Animated.Value(1)).current;
  const clipPreviewOverlay = useRef(new Animated.Value(0)).current;

  const handleClipLongPress = useCallback((clipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPreviewClipId(clipId);
    Animated.parallel([
      Animated.spring(clipPreviewScale, { toValue: 1.3, useNativeDriver: true, friction: 5 }),
      Animated.timing(clipPreviewOverlay, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [clipPreviewScale, clipPreviewOverlay]);

  const handleClipPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(clipPreviewScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(clipPreviewOverlay, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setPreviewClipId(null));
  }, [clipPreviewScale, clipPreviewOverlay]);

  // --- Animation 9: Fun refresh loading text ---
  const REFRESH_TEXTS = ['Catching vibes...', 'Loading the tea...', 'Slay incoming...'];
  const [refreshTextIndex, setRefreshTextIndex] = useState(0);
  useEffect(() => {
    if (!feedRefreshing) return;
    const interval = setInterval(() => {
      setRefreshTextIndex(prev => (prev + 1) % REFRESH_TEXTS.length);
    }, 800);
    return () => clearInterval(interval);
  }, [feedRefreshing]);

  // Check liked status for loaded posts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ids = new Set<string>();
      await Promise.all(
        feedPosts.map(async (post) => {
          try {
            const liked = await isPostLiked(post.id, user.id);
            if (liked) ids.add(post.id);
          } catch {}
        }),
      );
      if (!cancelled) setLikedPostIds(ids);
    })();
    return () => { cancelled = true; };
  }, [feedPosts]);

  const handleSegmentChange = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedType(index === 0 ? 'following' : 'explore');
  }, [setFeedType]);

  const handleLike = useCallback(async (postId: string) => {
    setLikedPostIds(prev => new Set(prev).add(postId));
    try { await likePost(postId); } catch {
      setLikedPostIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
    }
  }, []);

  const handleUnlike = useCallback(async (postId: string) => {
    setLikedPostIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
    try { await unlikePost(postId); } catch {
      setLikedPostIds(prev => new Set(prev).add(postId));
    }
  }, []);

  const handleComment = useCallback((postId: string) => {
    router.push({ pathname: '/community/post/[id]', params: { id: postId } });
  }, [router]);

  const handleAuthorPress = useCallback((userId: string) => {
    router.push(`/community/profile/${userId}` as any);
  }, [router]);

  // Quick-access feature pills with gradients + staggered entrance + Go Live ring
  const FeatureButtons = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.featureRow}
    >
      {FEATURE_ACTIONS.map((action, index) => (
        <Animated.View
          key={action.key}
          style={{
            opacity: entranceAnims[index],
            transform: [
              { translateX: entranceAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
            ],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.featureButton, pressed && styles.featureButtonPressed]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(action.route as any); }}
          >
            {action.key === 'live' ? (
              <View style={styles.liveRingWrapper}>
                <Animated.View style={[styles.liveRingBorder, { transform: [{ rotate: liveRingSpin }] }]} />
                <LinearGradient
                  colors={action.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featurePill}
                >
                  <Ionicons name={action.icon} size={16} color={Colors.white} />
                  <Text style={styles.featureLabel}>{action.label}</Text>
                </LinearGradient>
              </View>
            ) : (
              <LinearGradient
                colors={action.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featurePill}
              >
                <Ionicons name={action.icon} size={16} color={Colors.white} />
                <Text style={styles.featureLabel}>{action.label}</Text>
              </LinearGradient>
            )}
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );

  // Clips (short video reels) section — TikTok/Reels style
  // Wrapped in staggered entrance anim (index 4 = clips section)
  const ClipsSection = (
    <Animated.View
      style={[
        styles.clipsContainer,
        {
          opacity: entranceAnims[4],
          transform: [
            { translateX: entranceAnims[4].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.clipsSectionHeader}>
        <View style={styles.clipsTitleRow}>
          <Text style={styles.clipsSectionTitle}>Clips</Text>
          <Animated.View style={[styles.clipsFireBadge, { transform: [{ scale: firePulse }] }]}>
            <Ionicons name="flame" size={12} color={Colors.white} />
          </Animated.View>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/community/clips' as any); }}
          style={styles.clipsSeeAllButton}
        >
          <Text style={styles.clipsSeeAll}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
        </Pressable>
      </View>
      {/* Dark overlay for long-press preview */}
      {previewClipId && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5, opacity: clipPreviewOverlay }]}
          pointerEvents="none"
        />
      )}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.clipsScroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: clipScrollX } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Create new clip card with shimmer */}
        <Pressable
          style={({ pressed }) => [styles.clipItem, pressed && { transform: [{ scale: 0.95 }] }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/community/create-clip' as any); }}
        >
          <LinearGradient
            colors={['#2C2520', '#4a3f38']}
            style={styles.clipCreateCard}
          >
            <View style={styles.clipCreateIconRing}>
              <Ionicons name="videocam" size={22} color={Colors.white} />
            </View>
            <Text style={styles.clipCreateText}>Drop a{'\n'}Clip</Text>
            {/* Shimmer overlay */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                { transform: [{ translateX: shimmerTranslateX }] },
              ]}
              pointerEvents="none"
            />
          </LinearGradient>
        </Pressable>
        {/* Clip thumbnails with parallax + long-press */}
        {MOCK_CLIPS.map((clip, index) => {
          const parallaxOffset = clipScrollX.interpolate({
            inputRange: [(index - 1) * 110, index * 110, (index + 1) * 110],
            outputRange: [-8, 0, 8],
            extrapolate: 'clamp',
          });
          const isPreview = previewClipId === clip.id;
          return (
            <Animated.View
              key={clip.id}
              style={{
                transform: [
                  { translateX: parallaxOffset },
                  { scale: isPreview ? clipPreviewScale : 1 },
                ],
                zIndex: isPreview ? 10 : 1,
              }}
            >
              <Pressable
                style={({ pressed }) => [styles.clipItem, pressed && !isPreview && { transform: [{ scale: 0.95 }] }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/community/clips/${clip.id}` as any); }}
                onLongPress={() => handleClipLongPress(clip.id)}
                onPressOut={previewClipId ? handleClipPressOut : undefined}
                delayLongPress={400}
              >
                <LinearGradient
                  colors={clip.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.clipThumbnail}
                >
                  <View style={styles.clipPlayButton}>
                    <Ionicons name="play" size={18} color={Colors.white} />
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.clipOverlay}
                  >
                    <Text style={styles.clipUsername} numberOfLines={1}>{clip.username}</Text>
                    <View style={styles.clipViewsRow}>
                      <Ionicons name="eye" size={10} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.clipViews}>{clip.views}</Text>
                    </View>
                  </LinearGradient>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </Animated.View>
  );

  // Segment header rendered inside FeedList
  const ListHeader = (
    <>
      {FeatureButtons}
      {ClipsSection}
      {/* Refresh loading text */}
      {feedRefreshing && (
        <View style={styles.refreshTextContainer}>
          <Text style={styles.refreshText}>{REFRESH_TEXTS[refreshTextIndex]}</Text>
        </View>
      )}
      <View style={styles.segmentContainer}>
        {/* Sliding indicator pill */}
        <Animated.View
          style={[
            styles.segmentIndicator,
            {
              transform: [
                {
                  translateX: segmentSlide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, (SCREEN_WIDTH - Spacing.sm * 2 - 4) / 2],
                  }),
                },
              ],
            },
          ]}
        />
        {SEGMENT_TABS.map((tab, index) => (
          <Pressable
            key={tab}
            style={styles.segmentTab}
            onPress={() => handleSegmentChange(index)}
          >
            <Text style={[styles.segmentText, activeSegment === index && styles.segmentTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — collapses on scroll */}
      <Animated.View
        style={[
          styles.header,
          { transform: [{ translateY: headerTranslateY }], opacity: headerOpacity },
        ]}
      >
        <Text style={styles.headerTitle}>Tribe</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/community/search' as any); }}
            style={styles.headerButton}
          >
            <Ionicons name="search-outline" size={22} color={Colors.text} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/community/notifications' as any); }}
            style={styles.headerButton}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </Animated.View>

      {/* Feed with PostCard components */}
      <FeedList
        posts={feedPosts}
        loading={feedLoading}
        refreshing={feedRefreshing}
        hasMore={feedHasMore}
        onRefresh={refreshFeed}
        onLoadMore={loadMoreFeed}
        onLike={handleLike}
        onUnlike={handleUnlike}
        onComment={handleComment}
        onAuthorPress={handleAuthorPress}
        likedPostIds={likedPostIds}
        ListHeaderComponent={ListHeader}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      />

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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.white,
  },
  featureRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: 8,
  },
  featureButton: {},
  featureButtonPressed: {
    transform: [{ scale: 0.93 }],
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  featureLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  clipsContainer: {
    paddingBottom: Spacing.md,
  },
  clipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  clipsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clipsSectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  clipsFireBadge: {
    backgroundColor: '#FF416C',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipsSeeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  clipsSeeAll: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  clipsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  clipItem: {},
  clipCreateCard: {
    width: 100,
    height: 140,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  clipCreateIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipCreateText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 15,
  },
  clipThumbnail: {
    width: 100,
    height: 140,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clipPlayButton: {
    marginTop: 40,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clipOverlay: {
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 20,
  },
  clipUsername: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.white,
  },
  clipViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  clipViews: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm - 2,
  },
  segmentIndicator: {
    position: 'absolute',
    left: 0,
    top: 2,
    bottom: 2,
    width: '50%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm - 2,
  },
  segmentText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  // Shimmer overlay on "Drop a Clip" card
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 60,
    borderRadius: BorderRadius.md,
  },
  // Go Live rotating ring wrapper
  liveRingWrapper: {
    position: 'relative',
  },
  liveRingBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: 'rgba(255,65,108,0.6)',
    borderStyle: 'dashed',
  },
  // Refresh loading text
  refreshTextContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  refreshText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
});
