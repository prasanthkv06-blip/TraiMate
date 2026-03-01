import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

interface VisaResult {
  country: string;
  emoji: string;
  status: 'visa-free' | 'visa-on-arrival' | 'e-visa' | 'visa-required';
  duration: string;
  notes: string;
}

const STATUS_CONFIG = {
  'visa-free': { label: 'Visa Free', color: Colors.sage, bg: 'rgba(94,138,90,0.1)' },
  'visa-on-arrival': { label: 'Visa on Arrival', color: '#4A8BA8', bg: 'rgba(74,139,168,0.1)' },
  'e-visa': { label: 'E-Visa', color: Colors.accent, bg: 'rgba(176,122,80,0.1)' },
  'visa-required': { label: 'Visa Required', color: Colors.error, bg: 'rgba(199,84,80,0.1)' },
};

const SAMPLE_RESULTS: VisaResult[] = [
  { country: 'Japan', emoji: '🇯🇵', status: 'visa-free', duration: 'Up to 90 days', notes: 'Tourist visa waiver for most Western passport holders' },
  { country: 'Thailand', emoji: '🇹🇭', status: 'visa-on-arrival', duration: 'Up to 30 days', notes: 'Available at major airports and land borders' },
  { country: 'India', emoji: '🇮🇳', status: 'e-visa', duration: 'Up to 30 days', notes: 'Apply online at least 4 days before arrival' },
  { country: 'China', emoji: '🇨🇳', status: 'visa-required', duration: 'Varies', notes: 'Must apply at embassy/consulate before travel' },
  { country: 'South Korea', emoji: '🇰🇷', status: 'visa-free', duration: 'Up to 90 days', notes: 'K-ETA required before travel' },
];

export default function VisaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();
  const [passport, setPassport] = useState('');
  const [results, setResults] = useState<VisaResult[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleCheck = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasChecked(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Visa Checker</Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Passport input */}
          <View style={styles.passportCard}>
            <Text style={styles.passportLabel}>YOUR PASSPORT</Text>
            <View style={styles.passportInput}>
              <Text style={styles.passportFlag}>🇺🇸</Text>
              <TextInput
                style={styles.passportText}
                value={passport}
                onChangeText={setPassport}
                placeholder="Enter nationality"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <Pressable onPress={handleCheck} style={styles.checkButton}>
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark]}
                style={styles.checkGradient}
              >
                <Text style={styles.checkText}>Check Requirements</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                <Text style={styles.legendText}>{config.label}</Text>
              </View>
            ))}
          </View>

          {/* Results */}
          {hasChecked && (
            <>
              <Text style={styles.sectionTitle}>
                Destinations ({results.length})
              </Text>
              {results.map((result) => {
                const config = STATUS_CONFIG[result.status];
                return (
                  <View key={result.country} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultFlag}>{result.emoji}</Text>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultCountry}>{result.country}</Text>
                        <Text style={styles.resultDuration}>{result.duration}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                        <Text style={[styles.statusText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.resultNotes}>{result.notes}</Text>
                  </View>
                );
              })}
            </>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ Visa requirements change frequently. Always verify with the official embassy or consulate before travel.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  backArrow: { fontSize: 24, color: Colors.text },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl },
  passportCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.card },
  passportLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.sm },
  passportInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: 12, marginBottom: Spacing.md },
  passportFlag: { fontSize: 24, marginRight: 10 },
  passportText: { flex: 1, fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.lg, color: Colors.text },
  checkButton: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  checkGradient: { padding: 14, alignItems: 'center' },
  checkText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textSecondary },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text, marginBottom: Spacing.md },
  resultCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: 10, ...Shadows.card },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  resultFlag: { fontSize: 32, marginRight: 12 },
  resultInfo: { flex: 1 },
  resultCountry: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.text },
  resultDuration: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xs },
  resultNotes: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  disclaimer: { backgroundColor: 'rgba(212,165,116,0.15)', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md },
  disclaimerText: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },
});
