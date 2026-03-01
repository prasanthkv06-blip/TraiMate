import { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const ONBOARDING_KEY = '@traimate_onboarded';
const USER_NAME_KEY = '@traimate_user_name';

export default function NameScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const inputBorderColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(headerY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(cardY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Auto-focus the input after animations
      setTimeout(() => inputRef.current?.focus(), 200);
    });
  }, []);

  useEffect(() => {
    Animated.timing(inputBorderColor, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = inputBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.accent],
  });

  const handleContinue = async () => {
    if (name.trim().length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.warn('Storage error:', e);
    }

    router.replace('/(tabs)/home');
  };

  const isValid = name.trim().length > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Decorative elements */}
        <View style={styles.decorContainer}>
          <View style={[styles.decorDot, styles.dot1]} />
          <View style={[styles.decorDot, styles.dot2]} />
          <View style={[styles.decorDot, styles.dot3]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Back indicator */}
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
                {
                  opacity: headerOpacity,
                  transform: [{ translateY: headerY }],
                },
              ]}
            >
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.title}>What should{'\n'}we call you?</Text>
              <Text style={styles.subtitle}>
                This is how you'll appear to your travel companions
              </Text>
            </Animated.View>

            {/* Input card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [{ translateY: cardY }],
                },
              ]}
            >
              <Text style={styles.inputLabel}>Your name</Text>
              <Animated.View
                style={[
                  styles.inputWrapper,
                  { borderColor },
                ]}
              >
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Alex"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onSubmitEditing={handleContinue}
                  maxLength={30}
                />
              </Animated.View>
              {name.trim().length > 0 && (
                <Text style={styles.greeting}>
                  Nice to meet you, {name.trim()}! 🌟
                </Text>
              )}
            </Animated.View>
          </View>

          {/* CTA Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              { opacity: buttonOpacity },
            ]}
          >
            <Pressable
              onPress={handleContinue}
              disabled={!isValid}
              style={({ pressed }) => [
                styles.button,
                !isValid && styles.buttonDisabled,
                pressed && isValid && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={
                  isValid
                    ? [Colors.accent, Colors.accentDark]
                    : [Colors.border, Colors.border]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text
                  style={[
                    styles.buttonText,
                    !isValid && styles.buttonTextDisabled,
                  ]}
                >
                  Continue
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={isValid ? Colors.white : Colors.textMuted}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
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
  decorDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  dot1: {
    width: 8,
    height: 8,
    opacity: 0.15,
    top: '15%',
    right: '20%',
  },
  dot2: {
    width: 12,
    height: 12,
    opacity: 0.1,
    top: '40%',
    left: '10%',
  },
  dot3: {
    width: 6,
    height: 6,
    opacity: 0.12,
    bottom: '30%',
    right: '15%',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    paddingTop: 60,
    paddingLeft: Spacing.lg,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 28,
    color: Colors.text,
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
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  input: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  greeting: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.sage,
    marginTop: Spacing.md,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  button: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
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
  buttonTextDisabled: {
    color: Colors.textMuted,
  },
  buttonArrow: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
});
