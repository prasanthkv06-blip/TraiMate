import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { getDestinationImage } from '../../src/utils/destinationImages';
import { callGemini, isConfigured } from '../../src/lib/gemini';
import { getCached, setCache } from '../../src/lib/apiCache';

interface DestInfo {
  description: string;
  highlights: string[];
  bestTime: string;
  language: string;
  currency: string;
}

export default function DestinationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name: string; country?: string }>();
  const name = params.name || 'Destination';
  const country = params.country || '';
  const imageUrl = getDestinationImage(name);

  const [info, setInfo] = useState<DestInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDestInfo();
  }, [name]);

  const loadDestInfo = async () => {
    const cacheKey = `dest_info_${name.toLowerCase()}`;
    const cached = await getCached<DestInfo>(cacheKey);
    if (cached) { setInfo(cached); setLoading(false); return; }

    if (!isConfigured()) {
      setInfo({
        description: `${name} is a popular travel destination${country ? ` in ${country}` : ''} known for its unique culture, cuisine, and attractions.`,
        highlights: ['Local cuisine', 'Historic landmarks', 'Cultural experiences', 'Scenic views'],
        bestTime: 'Year-round',
        language: 'Local language',
        currency: 'Local currency',
      });
      setLoading(false);
      return;
    }

    try {
      const prompt = `Give me travel info about ${name}${country ? `, ${country}` : ''}.
Return ONLY valid JSON (no markdown, no code blocks):
{
  "description": "2-3 sentence engaging description for travelers",
  "highlights": ["top 4-5 things to do/see, each 3-6 words"],
  "bestTime": "best months to visit",
  "language": "primary language spoken",
  "currency": "local currency name and code"
}`;
      const response = await callGemini(prompt, { temperature: 0.6, maxOutputTokens: 512, responseMimeType: 'application/json' });
      const parsed = JSON.parse(response) as DestInfo;
      await setCache(cacheKey, parsed);
      setInfo(parsed);
    } catch {
      setInfo({
        description: `${name} is a wonderful destination${country ? ` in ${country}` : ''} waiting to be explored.`,
        highlights: ['Local culture', 'Cuisine', 'Sightseeing', 'Adventure'],
        bestTime: 'Check locally',
        language: '--',
        currency: '--',
      });
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: imageUrl }} style={[styles.hero, { paddingTop: insets.top }]}>
          <LinearGradient colors={['rgba(44,37,32,0.3)', 'transparent', 'rgba(44,37,32,0.8)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.heroHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={20}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroCountry}>{country.toUpperCase()}</Text>
            <Text style={styles.heroName}>{name}</Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Loading destination info...</Text>
            </View>
          ) : info ? (
            <>
              <Text style={styles.description}>{info.description}</Text>

              {/* Quick facts */}
              <View style={styles.factsRow}>
                {[
                  { icon: 'calendar-outline' as const, label: 'Best Time', value: info.bestTime },
                  { icon: 'language-outline' as const, label: 'Language', value: info.language },
                  { icon: 'cash-outline' as const, label: 'Currency', value: info.currency },
                ].map((fact) => (
                  <View key={fact.label} style={styles.factCard}>
                    <Ionicons name={fact.icon} size={18} color={Colors.sage} />
                    <Text style={styles.factLabel}>{fact.label}</Text>
                    <Text style={styles.factValue} numberOfLines={2}>{fact.value}</Text>
                  </View>
                ))}
              </View>

              {/* Highlights */}
              <Text style={styles.sectionTitle}>Top Things to Do</Text>
              {info.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <View style={styles.highlightDot} />
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </>
          ) : null}

          {/* CTA */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/create-trip' as any, params: { prefill: `${name}${country ? `, ${country}` : ''}` } });
            }}
            style={styles.ctaBtn}
          >
            <LinearGradient colors={['#5E8A5A', '#3D6B39']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
              <Ionicons name="airplane" size={20} color={Colors.white} />
              <Text style={styles.ctaText}>Plan a trip to {name}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { height: 300, justifyContent: 'space-between' },
  heroHeader: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  heroContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  heroCountry: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 4,
  },
  heroName: { fontFamily: Fonts.heading, fontSize: FontSizes.xxxl, color: Colors.white },
  body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  loadingWrap: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  loadingText: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted },
  description: {
    fontFamily: Fonts.body, fontSize: FontSizes.md, color: Colors.textSecondary,
    lineHeight: 24, marginBottom: Spacing.xl,
  },
  factsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  factCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', gap: 4, ...Shadows.card,
  },
  factLabel: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted },
  factValue: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xs, color: Colors.text, textAlign: 'center' },
  sectionTitle: {
    fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text,
    marginBottom: Spacing.md,
  },
  highlightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  highlightDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.sage },
  highlightText: { fontFamily: Fonts.body, fontSize: FontSizes.md, color: Colors.text },
  ctaBtn: { marginTop: Spacing.xl, borderRadius: BorderRadius.pill, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.pill,
  },
  ctaText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
});
