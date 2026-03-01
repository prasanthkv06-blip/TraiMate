import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/theme';

// Tab order: Home, Explore, [+ center], Profile
// The "create" route is a dummy tab — its press opens the create-trip modal.
const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap; label: string }> = {
  home: { default: 'home-outline', active: 'home', label: 'Home' },
  explore: { default: 'compass-outline', active: 'compass', label: 'Explore' },
  create: { default: 'add', active: 'add', label: '' },
  trips: { default: 'briefcase-outline', active: 'briefcase', label: 'Trips' },
  profile: { default: 'person-outline', active: 'person', label: 'Me' },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();

  // Separate left tabs, center button, right tabs for balanced layout
  const leftTabs = ['home', 'explore'];
  const rightTabs = ['trips', 'profile'];

  const renderTab = useCallback((routeName: string) => {
    const routeIndex = state.routes.findIndex(r => r.name === routeName);
    if (routeIndex === -1) return null;
    const route = state.routes[routeIndex];
    const { options } = descriptors[route.key];
    const isFocused = state.index === routeIndex;
    const iconInfo = TAB_ICONS[routeName];
    if (!iconInfo) return null;

    return (
      <Pressable
        key={route.key}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
      >
        <Ionicons
          name={isFocused ? iconInfo.active : iconInfo.default}
          size={22}
          color={isFocused ? Colors.accent : Colors.textMuted}
        />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
          {iconInfo.label}
        </Text>
        {isFocused && <View style={styles.activeIndicator} />}
      </Pressable>
    );
  }, [state, descriptors, navigation]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.tabRow}>
          {/* Left tabs */}
          <View style={styles.tabGroup}>
            {leftTabs.map(renderTab)}
          </View>

          {/* Center create button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/create-trip');
            }}
            style={({ pressed }) => [
              styles.createButtonWrapper,
              pressed && styles.createButtonPressed,
            ]}
          >
            <LinearGradient
              colors={['#5E8A5A', '#3D6B39']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createButtonGradient}
            >
              <Ionicons name="add" size={28} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.createLabel}>Let's go</Text>
          </Pressable>

          {/* Right tabs */}
          <View style={styles.tabGroup}>
            {rightTabs.map(renderTab)}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 62,
    paddingHorizontal: 12,
  },
  tabGroup: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    position: 'relative',
    gap: 3,
  },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.accent,
    fontFamily: Fonts.bodySemiBold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 18,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  createButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    marginHorizontal: 8,
    gap: 3,
  },
  createLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
  },
  createButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  createButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#3D6B39',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
});
