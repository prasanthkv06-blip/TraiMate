import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function AuthLandingScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(40)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const decorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(decorOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
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
      Animated.parallel([
        Animated.spring(buttonsY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleApple = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingProvider('apple');
    const { error } = await auth.signInWithApple();
    setLoadingProvider(null);
    if (!error) {
      router.replace('/');
    }
  };

  const handleGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingProvider('google');
    const { error } = await auth.signInWithGoogle();
    setLoadingProvider(null);
    if (!error) {
      router.replace('/');
    }
  };

  const handleEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth/sign-in');
  };

  const handleGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await auth.continueAsGuest();
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
        {/* Logo */}
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
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>TrailMate</Text>
          <Text style={styles.subtitle}>
            Your AI-powered travel companion
          </Text>
        </Animated.View>
      </View>

      {/* Auth buttons */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsY }],
          },
        ]}
      >
        {/* Apple Sign In (iOS only) */}
        {Platform.OS === 'ios' && (
          <Pressable
            onPress={handleApple}
            disabled={loadingProvider !== null}
            style={({ pressed }) => [
              styles.appleButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {loadingProvider === 'apple' ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color={Colors.white} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Google Sign In */}
        <Pressable
          onPress={handleGoogle}
          disabled={loadingProvider !== null}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.buttonPressed,
          ]}
        >
          {loadingProvider === 'google' ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={Colors.text} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {/* Email Sign In */}
        <Pressable
          onPress={handleEmail}
          disabled={loadingProvider !== null}
          style={({ pressed }) => [
            styles.emailButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emailButtonGradient}
          >
            <Ionicons name="mail-outline" size={18} color={Colors.white} />
            <Text style={styles.emailButtonText}>Sign in with Email</Text>
          </LinearGradient>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Guest mode */}
        <Pressable
          onPress={handleGuest}
          disabled={loadingProvider !== null}
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
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  appleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  appleButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  googleButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  emailButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  emailButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  emailButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
  },
  guestButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
