import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/theme';

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap; label: string }> = {
  explore: { default: 'compass-outline', active: 'compass', label: 'Discover' },
  create: { default: 'add', active: 'add', label: 'New Trip' },
  profile: { default: 'person-outline', active: 'person', label: 'Profile' },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            // Skip routes not in our tab configuration (e.g. hidden home tab)
            if (!TAB_ICONS[route.name]) return null;

            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isCreate = route.name === 'create';
            const iconInfo = TAB_ICONS[route.name];

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Centered elevated create button
            if (isCreate) {
              return (
                <Pressable
                  key={route.key}
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
                  <Text style={styles.createLabel}>New Trip</Text>
                </Pressable>
              );
            }

            // Regular tab (Discover / Profile)
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
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
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {iconInfo.label}
                </Text>
                {isFocused && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
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
    maxWidth: 360,
    borderRadius: 24,
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
    justifyContent: 'space-around',
    height: 60,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
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
    marginTop: -28,
    paddingBottom: 2,
  },
  createButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  createButtonGradient: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#3D6B39',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  createLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
