import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;
const CARD_HEIGHT = 220;

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  photos: string[];
  memberCount: number;
  phase: 'planning' | 'live' | 'review';
  emoji?: string;
}

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

const PHASE_CONFIG = {
  planning: { label: 'Planning', color: Colors.sage, emoji: '📝' },
  live: { label: 'Live', color: Colors.accent, emoji: '✈️' },
  review: { label: 'Memories', color: '#8B6DB5', emoji: '📸' },
};

function TripCard({ trip, onPress }: TripCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (trip.photos.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % trip.photos.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [trip.photos.length]);

  const phase = PHASE_CONFIG[trip.phase];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }]}>
        <ImageBackground
          source={{ uri: trip.photos[currentPhotoIndex] }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={['transparent', 'rgba(44, 37, 32, 0.8)']}
            style={styles.gradient}
          />
        </ImageBackground>
      </Animated.View>

      {/* Phase badge */}
      <View style={[styles.phaseBadge, { backgroundColor: phase.color }]}>
        <Text style={styles.phaseBadgeText}>
          {phase.emoji} {phase.label}
        </Text>
      </View>

      {/* Photo dots indicator */}
      {trip.photos.length > 1 && (
        <View style={styles.dots}>
          {trip.photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentPhotoIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Card content */}
      <View style={styles.content}>
        <View style={styles.contentLeft}>
          <Text style={styles.destination}>
            {trip.emoji || '🌍'} {trip.destination}
          </Text>
          <Text style={styles.tripName}>{trip.name}</Text>
          <Text style={styles.dates}>
            {trip.startDate} — {trip.endDate}
          </Text>
        </View>
        <View style={styles.memberBubble}>
          <Text style={styles.memberCount}>{trip.memberCount}</Text>
          <Text style={styles.memberLabel}>going</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(TripCard, (prev, next) =>
  prev.trip.id === next.trip.id && prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    ...Shadows.card,
    marginBottom: Spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 22,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  phaseBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  phaseBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  dots: {
    position: 'absolute',
    top: 16,
    right: 14,
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 16,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 16,
  },
  contentLeft: {
    flex: 1,
  },
  destination: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  tripName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.white,
    marginBottom: 2,
  },
  dates: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  memberBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    marginLeft: 12,
  },
  memberCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  memberLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
});
