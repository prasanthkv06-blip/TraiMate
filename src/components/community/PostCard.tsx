import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { PostWithAuthor, CommentWithAuthor } from '../../types/community';
import MediaCarousel from './MediaCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Random horizontal offsets for floating reaction particles (computed once)
const PARTICLE_OFFSETS = Array.from({ length: 5 }, () => Math.round(Math.random() * 60 - 30));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = Math.max(0, now - then);

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function renderCaption(
  caption: string,
  onHashtagPress?: (tag: string) => void,
  onMentionPress?: (mention: string) => void,
) {
  const parts = caption.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <Text
          key={i}
          style={styles.hashtag}
          onPress={() => onHashtagPress?.(part.slice(1))}
        >
          {part}
        </Text>
      );
    }
    if (part.startsWith('@')) {
      return (
        <Text
          key={i}
          style={styles.mention}
          onPress={() => onMentionPress?.(part.slice(1))}
        >
          {part}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: PostWithAuthor;
  isLiked?: boolean;
  onLike?: (postId: string) => void;
  onUnlike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onOptions?: (postId: string) => void;
  onAuthorPress?: (userId: string) => void;
  previewComments?: CommentWithAuthor[];
  tripDestination?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PostCard({
  post,
  isLiked = false,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onOptions,
  onAuthorPress,
  previewComments,
  tripDestination,
}: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const heartScale = useRef(new Animated.Value(1)).current;

  // --- Animation 10: Double-tap heart overlay ---
  const lastTapRef = useRef(0);
  const doubleTapScale = useRef(new Animated.Value(0)).current;
  const doubleTapOpacity = useRef(new Animated.Value(0)).current;

  const triggerDoubleTapHeart = useCallback(() => {
    doubleTapOpacity.setValue(1);
    doubleTapScale.setValue(0);
    Animated.sequence([
      Animated.spring(doubleTapScale, { toValue: 1.2, useNativeDriver: true, friction: 4 }),
      Animated.spring(doubleTapScale, { toValue: 1.0, useNativeDriver: true, friction: 4 }),
      Animated.timing(doubleTapOpacity, { toValue: 0, duration: 400, delay: 400, useNativeDriver: true }),
    ]).start();
  }, [doubleTapScale, doubleTapOpacity]);

  const handleMediaPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap – trigger like + heart overlay
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!liked) {
        setLiked(true);
        setLikesCount(c => c + 1);
        onLike?.(post.id);
      }
      triggerDoubleTapHeart();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap – navigate after brief delay
      setTimeout(() => {
        if (lastTapRef.current === now) {
          router.push({ pathname: '/community/post/[id]', params: { id: post.id } });
        }
      }, 300);
    }
  }, [liked, post.id, onLike, triggerDoubleTapHeart, router]);

  // --- Animation 11: Floating reaction particles ---
  const particleAnims = useRef(
    Array.from({ length: 5 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    })),
  ).current;

  const triggerParticles = useCallback(() => {
    particleAnims.forEach(p => { p.translateY.setValue(0); p.opacity.setValue(1); });
    Animated.stagger(
      60,
      particleAnims.map(p =>
        Animated.parallel([
          Animated.timing(p.translateY, { toValue: -80, duration: 800, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ),
    ).start();
  }, [particleAnims]);

  // --- Animation 12: Swipeable cards ---
  const panX = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: Animated.event([null, { dx: panX }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (g.dx > 120) {
            // Bookmark action
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else if (g.dx < -120) {
            // Share action
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onShare?.(post.id);
          }
          Animated.spring(panX, { toValue: 0, useNativeDriver: false, friction: 6 }).start();
        },
      }),
    [panX, post.id, onShare],
  );

  const cardRotate = panX.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-3deg', '0deg', '3deg'],
    extrapolate: 'clamp',
  });

  const swipeLeftOpacity = panX.interpolate({
    inputRange: [-120, -40, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  const swipeRightOpacity = panX.interpolate({
    inputRange: [0, 40, 120],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (liked) {
      setLiked(false);
      setLikesCount(c => Math.max(0, c - 1));
      onUnlike?.(post.id);
    } else {
      setLiked(true);
      setLikesCount(c => c + 1);
      onLike?.(post.id);
      // Bounce animation
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
      ]).start();
      triggerParticles();
    }
  }, [liked, post.id, onLike, onUnlike, heartScale, triggerParticles]);

  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onComment) {
      onComment(post.id);
    } else {
      router.push({ pathname: '/community/post/[id]', params: { id: post.id } });
    }
  }, [post.id, onComment, router]);

  const handlePostPress = useCallback(() => {
    router.push({ pathname: '/community/post/[id]', params: { id: post.id } });
  }, [post.id, router]);

  const avatarUri = post.author.avatar_url;
  const initial = (post.author.name || 'U').charAt(0).toUpperCase();

  return (
    <View style={styles.swipeWrapper}>
      {/* Swipe hint icons behind the card */}
      <Animated.View style={[styles.swipeHintLeft, { opacity: swipeLeftOpacity }]}>
        <Ionicons name="share-outline" size={28} color={Colors.accent} />
      </Animated.View>
      <Animated.View style={[styles.swipeHintRight, { opacity: swipeRightOpacity }]}>
        <Ionicons name="bookmark-outline" size={28} color={Colors.accent} />
      </Animated.View>

      <Animated.View
        style={[styles.container, { transform: [{ translateX: panX }, { rotate: cardRotate }] }]}
        {...panResponder.panHandlers}
      >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.authorRow}
          onPress={() => onAuthorPress?.(post.author.id)}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.timestamp}>{timeAgo(post.created_at)}</Text>
              {post.location && (
                <>
                  <Text style={styles.metaDot}>  </Text>
                  <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.locationText}>{post.location}</Text>
                </>
              )}
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={() => onOptions?.(post.id)}
          hitSlop={12}
          style={styles.optionsButton}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Media with double-tap heart overlay */}
      {post.media_urls.length > 0 && (
        <Pressable onPress={handleMediaPress}>
          <MediaCarousel mediaUrls={post.media_urls} width={SCREEN_WIDTH} />
          {/* Double-tap heart overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.doubleTapHeart,
              { opacity: doubleTapOpacity, transform: [{ scale: doubleTapScale }] },
            ]}
          >
            <Ionicons name="heart" size={80} color={Colors.error} />
          </Animated.View>
        </Pressable>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <View style={styles.likeButtonWrapper}>
            <Pressable onPress={handleLike} style={styles.actionButton} hitSlop={8}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={liked ? Colors.error : Colors.text}
                />
              </Animated.View>
              {likesCount > 0 && (
                <Text style={styles.actionCount}>{likesCount}</Text>
              )}
            </Pressable>
            {/* Floating reaction particles */}
            {particleAnims.map((p, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.particle,
                  {
                    opacity: p.opacity,
                    transform: [
                      { translateY: p.translateY },
                      { translateX: PARTICLE_OFFSETS[i] },
                    ],
                  },
                ]}
              >
                <Ionicons name="heart" size={14} color={Colors.error} />
              </Animated.View>
            ))}
          </View>
          <Pressable onPress={handleComment} style={styles.actionButton} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.text} />
            {post.comments_count > 0 && (
              <Text style={styles.actionCount}>{post.comments_count}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onShare?.(post.id); }}
            style={styles.actionButton}
            hitSlop={8}
          >
            <Ionicons name="paper-plane-outline" size={22} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Caption */}
      {post.caption.length > 0 && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            <Text style={styles.captionAuthor}>{post.author.name} </Text>
            {renderCaption(post.caption)}
          </Text>
        </View>
      )}

      {/* Trip link badge */}
      {post.trip_id && tripDestination && (
        <View style={styles.tripBadge}>
          <Ionicons name="airplane-outline" size={14} color={Colors.accent} />
          <Text style={styles.tripBadgeText}>via trip to {tripDestination}</Text>
        </View>
      )}

      {/* Preview comments */}
      {previewComments && previewComments.length > 0 && (
        <View style={styles.commentsPreview}>
          {previewComments.slice(0, 2).map(comment => (
            <Text key={comment.id} style={styles.previewComment} numberOfLines={2}>
              <Text style={styles.previewCommentAuthor}>{comment.author.name} </Text>
              {comment.content}
            </Text>
          ))}
          {post.comments_count > 2 && (
            <Pressable onPress={handlePostPress}>
              <Text style={styles.viewAllComments}>
                View all {post.comments_count} comments
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {post.comments_count > 0 && (!previewComments || previewComments.length === 0) && (
        <Pressable onPress={handlePostPress} style={styles.commentsPreview}>
          <Text style={styles.viewAllComments}>
            View all {post.comments_count} comments
          </Text>
        </Pressable>
      )}
      </Animated.View>
    </View>
  );
}

export default React.memo(PostCard);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  swipeWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  swipeHintLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -20,
    zIndex: 0,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -20,
    zIndex: 0,
  },
  container: {
    backgroundColor: Colors.card,
    zIndex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  authorInfo: {
    marginLeft: Spacing.sm + 2,
    flex: 1,
  },
  authorName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  metaDot: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  locationText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  optionsButton: {
    padding: Spacing.xs,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  // Caption
  captionContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  captionText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  captionAuthor: {
    fontFamily: Fonts.bodySemiBold,
  },
  hashtag: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.sage,
  },
  mention: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  // Trip badge
  tripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: `${Colors.accent}12`,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  tripBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
  // Comments preview
  commentsPreview: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  previewComment: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  previewCommentAuthor: {
    fontFamily: Fonts.bodySemiBold,
  },
  viewAllComments: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButtonWrapper: {
    position: 'relative',
  },
  particle: {
    position: 'absolute',
    top: -10,
    left: 4,
  },
});
