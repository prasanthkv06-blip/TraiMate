import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../constants/theme';

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap; label: string }> = {
  home: { default: 'home-outline', active: 'home', label: 'Home' },
  explore: { default: 'search-outline', active: 'search', label: 'Explore' },
  create: { default: 'add', active: 'add', label: 'New Trip' },
  chat: { default: 'chatbubble-ellipses-outline', active: 'chatbubble-ellipses', label: 'Guide' },
  profile: { default: 'person-outline', active: 'person', label: 'Profile' },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.blur} />
        ) : (
          <View style={styles.androidBg} />
        )}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isCreate = route.name === 'create';
            const iconInfo = TAB_ICONS[route.name] || { default: 'document-outline' as keyof typeof Ionicons.glyphMap, active: 'document' as keyof typeof Ionicons.glyphMap, label: route.name };

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

            if (isCreate) {
              return (
                <Pressable
                  key={route.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/create-trip');
                  }}
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed && styles.createButtonPressed,
                  ]}
                >
                  <View style={styles.createButtonInner}>
                    <Ionicons name="add" size={28} color={Colors.white} />
                  </View>
                </Pressable>
              );
            }

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
    paddingHorizontal: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  androidBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.accent,
    fontFamily: Fonts.bodySemiBold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  createButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  createButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
