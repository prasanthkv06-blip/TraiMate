import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FlightData {
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  returnFrom?: string;
  returnTo?: string;
  returnDate?: string;
  returnTime?: string;
}

interface HotelData {
  name: string;
  location: string;
  pricePerNight: string;
  checkIn: string;
  checkOut: string;
}

const DEFAULT_FLIGHT: FlightData = {
  airline: 'IndiGo',
  flightNumber: '6E-2145',
  from: 'DEL',
  to: 'GOI',
  departureDate: 'Mar 10',
  departureTime: '10:30 AM',
  returnFrom: 'GOI',
  returnTo: 'DEL',
  returnDate: 'Mar 15',
  returnTime: '7:45 PM',
};

const DEFAULT_HOTEL: HotelData = {
  name: 'Taj Fort Aguada',
  location: 'Sinquerim Beach',
  pricePerNight: '8,500',
  checkIn: 'Mar 10',
  checkOut: 'Mar 15',
};

const QUICK_LINKS = [
  { id: 'flights', emoji: '🔍', label: 'Search Flights', sub: 'Find best fares' },
  { id: 'hotels', emoji: '🏨', label: 'Search Hotels', sub: 'Compare prices' },
  { id: 'insurance', emoji: '🛡️', label: 'Travel Insurance', sub: 'Stay protected' },
  { id: 'transfer', emoji: '🚖', label: 'Airport Transfer', sub: 'Book a ride' },
];

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();

  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [hotelData, setHotelData] = useState<HotelData | null>(null);

  const [editingFlight, setEditingFlight] = useState(false);
  const [editingHotel, setEditingHotel] = useState(false);

  // Flight form fields
  const [fAirline, setFAirline] = useState('');
  const [fFlightNumber, setFFlightNumber] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fDepDate, setFDepDate] = useState('');
  const [fDepTime, setFDepTime] = useState('');
  const [fRetFrom, setFRetFrom] = useState('');
  const [fRetTo, setFRetTo] = useState('');
  const [fRetDate, setFRetDate] = useState('');
  const [fRetTime, setFRetTime] = useState('');

  // Hotel form fields
  const [hName, setHName] = useState('');
  const [hLocation, setHLocation] = useState('');
  const [hPrice, setHPrice] = useState('');
  const [hCheckIn, setHCheckIn] = useState('');
  const [hCheckOut, setHCheckOut] = useState('');

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleSection = (callback: () => void) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    callback();
  };

  const openFlightForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (flightData) {
      setFAirline(flightData.airline);
      setFFlightNumber(flightData.flightNumber);
      setFFrom(flightData.from);
      setFTo(flightData.to);
      setFDepDate(flightData.departureDate);
      setFDepTime(flightData.departureTime);
      setFRetFrom(flightData.returnFrom || '');
      setFRetTo(flightData.returnTo || '');
      setFRetDate(flightData.returnDate || '');
      setFRetTime(flightData.returnTime || '');
    } else {
      setFAirline('');
      setFFlightNumber('');
      setFFrom('');
      setFTo('');
      setFDepDate('');
      setFDepTime('');
      setFRetFrom('');
      setFRetTo('');
      setFRetDate('');
      setFRetTime('');
    }
    toggleSection(() => setEditingFlight(true));
  };

  const saveFlightData = () => {
    if (!fAirline.trim() || !fFrom.trim() || !fTo.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data: FlightData = {
      airline: fAirline.trim(),
      flightNumber: fFlightNumber.trim(),
      from: fFrom.trim().toUpperCase(),
      to: fTo.trim().toUpperCase(),
      departureDate: fDepDate.trim(),
      departureTime: fDepTime.trim(),
    };
    if (fRetFrom.trim()) {
      data.returnFrom = fRetFrom.trim().toUpperCase();
      data.returnTo = fRetTo.trim().toUpperCase();
      data.returnDate = fRetDate.trim();
      data.returnTime = fRetTime.trim();
    }
    setFlightData(data);
    toggleSection(() => setEditingFlight(false));
  };

  const openHotelForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hotelData) {
      setHName(hotelData.name);
      setHLocation(hotelData.location);
      setHPrice(hotelData.pricePerNight);
      setHCheckIn(hotelData.checkIn);
      setHCheckOut(hotelData.checkOut);
    } else {
      setHName('');
      setHLocation('');
      setHPrice('');
      setHCheckIn('');
      setHCheckOut('');
    }
    toggleSection(() => setEditingHotel(true));
  };

  const saveHotelData = () => {
    if (!hName.trim() || !hLocation.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHotelData({
      name: hName.trim(),
      location: hLocation.trim(),
      pricePerNight: hPrice.trim(),
      checkIn: hCheckIn.trim(),
      checkOut: hCheckOut.trim(),
    });
    toggleSection(() => setEditingHotel(false));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Bookings</Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ====== FLIGHT CARD ====== */}
          <Animated.View style={[styles.bookingCard, { transform: [{ scale: cardScale }] }]}>
            {/* Gradient strip */}
            <LinearGradient
              colors={[Colors.accent, Colors.accentLight, Colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGradientStrip}
            />

            <View style={styles.cardContent}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Flight Details ✈️</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              </View>

              {flightData && !editingFlight ? (
                <Pressable onPress={openFlightForm}>
                  {/* Route display */}
                  <View style={styles.routeContainer}>
                    <View style={styles.routeCity}>
                      <Text style={styles.cityCode}>{flightData.from}</Text>
                      <Text style={styles.cityLabel}>Departure</Text>
                    </View>
                    <View style={styles.routeLine}>
                      <View style={styles.dottedLine} />
                      <Text style={styles.planeIcon}>✈️</Text>
                      <View style={styles.dottedLine} />
                    </View>
                    <View style={[styles.routeCity, { alignItems: 'flex-end' }]}>
                      <Text style={styles.cityCode}>{flightData.to}</Text>
                      <Text style={styles.cityLabel}>Arrival</Text>
                    </View>
                  </View>

                  {/* Flight info */}
                  <View style={styles.flightInfoRow}>
                    <View style={styles.flightInfoItem}>
                      <Text style={styles.flightInfoLabel}>AIRLINE</Text>
                      <Text style={styles.flightInfoValue}>{flightData.airline}</Text>
                    </View>
                    <View style={styles.flightInfoItem}>
                      <Text style={styles.flightInfoLabel}>FLIGHT</Text>
                      <Text style={styles.flightInfoValue}>{flightData.flightNumber}</Text>
                    </View>
                    <View style={styles.flightInfoItem}>
                      <Text style={styles.flightInfoLabel}>DEPARTURE</Text>
                      <Text style={styles.flightInfoValue}>{flightData.departureTime}</Text>
                      <Text style={styles.flightInfoSub}>{flightData.departureDate}</Text>
                    </View>
                  </View>

                  {/* Return flight */}
                  {flightData.returnFrom && (
                    <View style={styles.returnSection}>
                      <View style={styles.returnDivider}>
                        <View style={styles.returnDividerLine} />
                        <Text style={styles.returnLabel}>Return</Text>
                        <View style={styles.returnDividerLine} />
                      </View>
                      <View style={styles.returnRoute}>
                        <Text style={styles.returnRouteText}>
                          {flightData.returnFrom} → {flightData.returnTo}
                        </Text>
                        <Text style={styles.returnTimeText}>
                          {flightData.returnDate} · {flightData.returnTime}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={styles.tapHint}>Tap to edit</Text>
                </Pressable>
              ) : !editingFlight ? (
                <Pressable onPress={openFlightForm} style={styles.addButton}>
                  <Text style={styles.addEmoji}>✈️</Text>
                  <Text style={styles.addText}>+ Add flight details</Text>
                </Pressable>
              ) : null}

              {/* Flight edit form */}
              {editingFlight && (
                <View style={styles.formSection}>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>AIRLINE</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fAirline}
                        onChangeText={setFAirline}
                        placeholder="e.g. IndiGo"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>FLIGHT NO.</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fFlightNumber}
                        onChangeText={setFFlightNumber}
                        placeholder="e.g. 6E-2145"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>FROM (CODE)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fFrom}
                        onChangeText={setFFrom}
                        placeholder="DEL"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="characters"
                        maxLength={4}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>TO (CODE)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fTo}
                        onChangeText={setFTo}
                        placeholder="GOI"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="characters"
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>DEPARTURE DATE</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fDepDate}
                        onChangeText={setFDepDate}
                        placeholder="Mar 10"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>DEPARTURE TIME</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fDepTime}
                        onChangeText={setFDepTime}
                        placeholder="10:30 AM"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Return flight fields */}
                  <View style={styles.optionalHeader}>
                    <View style={styles.optionalDivider} />
                    <Text style={styles.optionalLabel}>Return (optional)</Text>
                    <View style={styles.optionalDivider} />
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>FROM</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fRetFrom}
                        onChangeText={setFRetFrom}
                        placeholder="GOI"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="characters"
                        maxLength={4}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>TO</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fRetTo}
                        onChangeText={setFRetTo}
                        placeholder="DEL"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="characters"
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>RETURN DATE</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fRetDate}
                        onChangeText={setFRetDate}
                        placeholder="Mar 15"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>RETURN TIME</Text>
                      <TextInput
                        style={styles.formInput}
                        value={fRetTime}
                        onChangeText={setFRetTime}
                        placeholder="7:45 PM"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleSection(() => setEditingFlight(false));
                      }}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={saveFlightData} style={styles.saveBtn}>
                      <LinearGradient
                        colors={[Colors.accent, Colors.accentDark]}
                        style={styles.saveBtnGradient}
                      >
                        <Text style={styles.saveBtnText}>Save Flight</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ====== HOTEL CARD ====== */}
          <Animated.View style={[styles.bookingCard, { transform: [{ scale: cardScale }] }]}>
            {/* Gradient strip */}
            <LinearGradient
              colors={[Colors.sage, Colors.sageLight, Colors.sage]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGradientStrip}
            />

            <View style={styles.cardContent}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Hotel Details 🏨</Text>
              </View>

              {hotelData && !editingHotel ? (
                <Pressable onPress={openHotelForm}>
                  <View style={styles.hotelMain}>
                    <View style={styles.hotelIconWrap}>
                      <Text style={styles.hotelIconEmoji}>🏨</Text>
                    </View>
                    <View style={styles.hotelInfo}>
                      <Text style={styles.hotelName}>{hotelData.name}</Text>
                      <Text style={styles.hotelLocation}>📍 {hotelData.location}</Text>
                    </View>
                  </View>

                  <View style={styles.hotelDetails}>
                    <View style={styles.hotelDetailItem}>
                      <Text style={styles.hotelDetailLabel}>PRICE/NIGHT</Text>
                      <Text style={styles.hotelDetailValue}>₹{hotelData.pricePerNight}</Text>
                    </View>
                    <View style={styles.hotelDetailDivider} />
                    <View style={styles.hotelDetailItem}>
                      <Text style={styles.hotelDetailLabel}>CHECK-IN</Text>
                      <Text style={styles.hotelDetailValue}>{hotelData.checkIn}</Text>
                    </View>
                    <View style={styles.hotelDetailDivider} />
                    <View style={styles.hotelDetailItem}>
                      <Text style={styles.hotelDetailLabel}>CHECK-OUT</Text>
                      <Text style={styles.hotelDetailValue}>{hotelData.checkOut}</Text>
                    </View>
                  </View>

                  <Text style={styles.tapHint}>Tap to edit</Text>
                </Pressable>
              ) : !editingHotel ? (
                <Pressable onPress={openHotelForm} style={styles.addButton}>
                  <Text style={styles.addEmoji}>🏨</Text>
                  <Text style={styles.addText}>+ Add hotel details</Text>
                </Pressable>
              ) : null}

              {/* Hotel edit form */}
              {editingHotel && (
                <View style={styles.formSection}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>HOTEL NAME</Text>
                    <TextInput
                      style={styles.formInput}
                      value={hName}
                      onChangeText={setHName}
                      placeholder="e.g. Taj Fort Aguada"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>LOCATION</Text>
                    <TextInput
                      style={styles.formInput}
                      value={hLocation}
                      onChangeText={setHLocation}
                      placeholder="e.g. Sinquerim Beach"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>PRICE PER NIGHT (₹)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={hPrice}
                      onChangeText={setHPrice}
                      placeholder="e.g. 8,500"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>CHECK-IN</Text>
                      <TextInput
                        style={styles.formInput}
                        value={hCheckIn}
                        onChangeText={setHCheckIn}
                        placeholder="Mar 10"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>CHECK-OUT</Text>
                      <TextInput
                        style={styles.formInput}
                        value={hCheckOut}
                        onChangeText={setHCheckOut}
                        placeholder="Mar 15"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleSection(() => setEditingHotel(false));
                      }}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={saveHotelData} style={styles.saveBtn}>
                      <LinearGradient
                        colors={[Colors.sage, Colors.sageDark]}
                        style={styles.saveBtnGradient}
                      >
                        <Text style={styles.saveBtnText}>Save Hotel</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ====== QUICK LINKS ====== */}
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksGrid}>
            {QUICK_LINKS.map((link) => (
              <Pressable
                key={link.id}
                style={styles.quickLinkCard}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <View style={styles.quickLinkTop}>
                  <Text style={styles.quickLinkEmoji}>{link.emoji}</Text>
                  <Text style={styles.quickLinkArrow}>→</Text>
                </View>
                <Text style={styles.quickLinkLabel}>{link.label}</Text>
                <Text style={styles.quickLinkSub}>{link.sub}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backArrow: {
    fontSize: 24,
    color: Colors.text,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  // ---- Booking Card ----
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  cardGradientStrip: {
    height: 6,
    width: '100%',
  },
  cardContent: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  aiBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  aiBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
    letterSpacing: 0.5,
  },

  // ---- Flight Route ----
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  routeCity: {
    alignItems: 'flex-start',
  },
  cityCode: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  cityLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  routeLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  dottedLine: {
    flex: 1,
    height: 1.5,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planeIcon: {
    fontSize: 18,
    marginHorizontal: 6,
  },

  // ---- Flight Info ----
  flightInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  flightInfoItem: {
    flex: 1,
  },
  flightInfoLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  flightInfoValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  flightInfoSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // ---- Return flight ----
  returnSection: {
    marginTop: Spacing.md,
  },
  returnDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  returnDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  returnLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
    letterSpacing: 0.5,
  },
  returnRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  returnRouteText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  returnTimeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  tapHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  // ---- Add Button (empty state) ----
  addButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  addText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },

  // ---- Hotel display ----
  hotelMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  hotelIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  hotelIconEmoji: {
    fontSize: 26,
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  hotelLocation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  hotelDetails: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  hotelDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  hotelDetailLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  hotelDetailValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  hotelDetailDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },

  // ---- Form ----
  formSection: {
    marginTop: Spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
  },
  formField: {
    flex: 1,
  },
  formFieldFull: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  optionalDivider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  optionalLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginHorizontal: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },

  // ---- Quick Links ----
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLinkCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.card,
  },
  quickLinkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickLinkEmoji: {
    fontSize: 24,
  },
  quickLinkArrow: {
    fontSize: 16,
    color: Colors.textMuted,
    fontFamily: Fonts.body,
  },
  quickLinkLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  quickLinkSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  // ---- Utility ----
  sageLight: {
    color: Colors.sageLight,
  },
});
