import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(headerY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleReset = async () => {
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: resetError } = await auth.resetPassword(email);
    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const Wrapper = Platform.OS === 'web'
    ? View
    : ({ children, ...props }: any) => (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false} {...props}>
          {children}
        </TouchableWithoutFeedback>
      );

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <Text style={styles.successEmoji}>📬</Text>
        <Text style={styles.successTitle}>Reset link sent!</Text>
        <Text style={styles.successSubtitle}>
          Check your email at {email} for a link to reset your password.
        </Text>
        <Pressable
          onPress={() => router.replace('/auth/sign-in')}
          style={styles.successButton}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <Wrapper style={Platform.OS === 'web' ? { flex: 1 } : undefined}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={20}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>

          <View style={styles.content}>
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                { opacity: headerOpacity, transform: [{ translateY: headerY }] },
              ]}
            >
              <Text style={styles.emoji}>🔑</Text>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a link to reset your password
              </Text>
            </Animated.View>

            {/* Form card */}
            <Animated.View
              style={[
                styles.card,
                { opacity: cardOpacity, transform: [{ translateY: cardY }] },
              ]}
            >
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </Animated.View>
          </View>

          {/* Submit button */}
          <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
            <Pressable
              onPress={handleReset}
              disabled={isLoading}
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
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  successButton: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    paddingTop: 60,
    paddingLeft: Spacing.lg,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.text,
    lineHeight: 44,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    ...BorderRadius.card,
    ...Shadows.card,
  },
  inputLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  button: {
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
});
