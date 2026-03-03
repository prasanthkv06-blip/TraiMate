import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import type { PostWithAuthor } from '../../types/community';
import PostCard from './PostCard';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface FeedListProps {
  posts: PostWithAuthor[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onLike?: (postId: string) => void;
  onUnlike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onOptions?: (postId: string) => void;
  onAuthorPress?: (userId: string) => void;
  likedPostIds?: Set<string>;
  ListHeaderComponent?: React.ReactElement;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function FeedList({
  posts,
  loading,
  refreshing,
  hasMore,
  onRefresh,
  onLoadMore,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onOptions,
  onAuthorPress,
  likedPostIds,
  ListHeaderComponent,
  onScroll,
}: FeedListProps) {
  const renderItem = useCallback(
    ({ item }: { item: PostWithAuthor }) => (
      <PostCard
        post={item}
        isLiked={likedPostIds?.has(item.id)}
        onLike={onLike}
        onUnlike={onUnlike}
        onComment={onComment}
        onShare={onShare}
        onOptions={onOptions}
        onAuthorPress={onAuthorPress}
      />
    ),
    [likedPostIds, onLike, onUnlike, onComment, onShare, onOptions, onAuthorPress],
  );

  const renderFooter = useCallback(() => {
    if (!hasMore || posts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    );
  }, [hasMore, posts.length]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtext}>
          Follow travelers or share your own adventure to get started!
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.accent}
        />
      }
      contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
    />
  );
}

export default React.memo(FeedList);

const styles = StyleSheet.create({
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
});
