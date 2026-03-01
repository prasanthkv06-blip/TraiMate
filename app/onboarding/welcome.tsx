import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(40)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const decorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in decorative background
      Animated.timing(decorOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Title slide up
      Animated.parallel([
        Animated.spring(titleY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle slide up
      Animated.parallel([
        Animated.spring(subtitleY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Button slide up
      Animated.parallel([
        Animated.spring(buttonY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/name');
  };

  const handleExploreAsGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('@traimate_user_name', 'Traveler');
    await AsyncStorage.setItem('@traimate_onboarded', 'true');
    await AsyncStorage.setItem('@traimate_guest_mode', 'true');
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      {/* Decorative background circles */}
      <Animated.View style={[styles.decorContainer, { opacity: decorOpacity }]}>
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </Animated.View>

      <View style={styles.content}>
        {/* Logo / Icon */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          }}
        >
          <Text style={styles.title}>TrailMate</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={{
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleY }],
          }}
        >
          <Text style={styles.subtitle}>
            Your AI-powered travel companion
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View
          style={[
            styles.featurePills,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleY }],
            },
          ]}
        >
          {['AI Local Guide', 'Smart Itineraries', 'Live Weather', 'Real Places'].map((feature, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{feature}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* CTA Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonY }],
          },
        ]}
      >
        <Pressable
          onPress={handleGetStarted}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handleExploreAsGuest}
          style={({ pressed }) => [
            styles.guestButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.guestButtonText}>Explore as Guest</Text>
        </Pressable>

        <Text style={styles.termsText}>
          No sign-up needed · Explore freely
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  decorContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorCircle1: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: Colors.sage,
    opacity: 0.06,
    top: -width * 0.2,
    right: -width * 0.2,
  },
  decorCircle2: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: Colors.accent,
    opacity: 0.05,
    bottom: height * 0.15,
    left: -width * 0.15,
  },
  decorCircle3: {
    width: width * 0.3,
    height: width * 0.3,
    backgroundColor: Colors.sage,
    opacity: 0.04,
    top: height * 0.35,
    right: -width * 0.05,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.hero,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: Spacing.lg,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pill: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  buttonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  guestButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  guestButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.accent,
  },
  termsText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
