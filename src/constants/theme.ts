/**
 * TraiMate Design System
 */

export const Colors = {
  // Primary palette
  background: '#F7F3EE',
  accent: '#B07A50',       // Terracotta
  sage: '#5E8A5A',         // Sage green
  text: '#2C2520',         // Dark brown

  // Extended palette
  accentLight: '#D4A574',
  accentDark: '#8B5E3C',
  sageLight: '#7BA677',
  sageDark: '#4A6E47',

  // Neutrals
  white: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E8E2DB',
  textSecondary: '#6B5E54',
  textMuted: '#9B8E84',
  overlay: 'rgba(44, 37, 32, 0.5)',

  // Feedback
  error: '#C75450',
  success: '#5E8A5A',
  warning: '#D4A574',
} as const;

export const Fonts = {
  heading: 'PlayfairDisplay_700Bold',
  headingMedium: 'PlayfairDisplay_500Medium',
  headingItalic: 'PlayfairDisplay_700Bold_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  hero: 44,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
  // Organic asymmetric border radius for cards
  card: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 22,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  nav: {
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;
