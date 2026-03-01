import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Modal,
  Image,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useTripContext, type TripExpense, getCurrencySymbol, type BookingLocal } from '../../src/contexts/TripContext';
import { addActivityLog } from '../../src/services/tripService';
import { getDeviceId } from '../../src/services/deviceUser';
import { scheduleBookingReminders, cancelBookingReminders } from '../../src/services/bookingReminders';
import type { BookingType } from '../../src/services/storageCache';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Constants ───────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { id: 'food', icon: 'restaurant-outline' as const, label: 'Food' },
  { id: 'transport', icon: 'car-outline' as const, label: 'Transport' },
  { id: 'stay', icon: 'bed-outline' as const, label: 'Stay' },
  { id: 'activity', icon: 'ticket-outline' as const, label: 'Activity' },
  { id: 'shopping', icon: 'bag-outline' as const, label: 'Shopping' },
  { id: 'other', icon: 'cube-outline' as const, label: 'Other' },
];

const BOOKING_TYPES: { id: BookingType; emoji: string; label: string; color: string }[] = [
  { id: 'flight', emoji: '✈️', label: 'Flight', color: '#B07A50' },
  { id: 'hotel', emoji: '🏨', label: 'Hotel', color: '#5E8A5A' },
  { id: 'train', emoji: '🚆', label: 'Train', color: '#4A8BA8' },
  { id: 'activity', emoji: '🎯', label: 'Activity', color: '#9B59B6' },
  { id: 'car_rental', emoji: '🚗', label: 'Car Rental', color: '#E67E22' },
];

const BOOKING_GRADIENT_COLORS: Record<BookingType, readonly [string, string]> = {
  flight: ['#B07A50', '#D4A574'],
  hotel: ['#5E8A5A', '#7BA677'],
  train: ['#4A8BA8', '#6BB0C9'],
  activity: ['#9B59B6', '#C39BD3'],
  car_rental: ['#E67E22', '#F0A050'],
};

const QUICK_LINKS = [
  { id: 'flights', emoji: '🔍', label: 'Search Flights', sub: 'Find best fares' },
  { id: 'hotels', emoji: '🏨', label: 'Search Hotels', sub: 'Compare prices' },
  { id: 'insurance', emoji: '🛡️', label: 'Travel Insurance', sub: 'Stay protected' },
  { id: 'transfer', emoji: '🚖', label: 'Airport Transfer', sub: 'Book a ride' },
];

type Tab = 'spending' | 'bookings';

const ExpenseRow = React.memo(function ExpenseRow({ expense, currSymbol }: { expense: TripExpense; currSymbol: string }) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseIcon}>
        <Ionicons name={expense.icon as any} size={22} color={Colors.accent} />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseName}>{expense.title}</Text>
        <Text style={styles.expenseMeta}>
          Paid by {expense.paidBy} · {(() => { try { return new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return expense.date; } })()}
        </Text>
      </View>
      {expense.receiptUri && (
        <Image source={{ uri: expense.receiptUri }} style={styles.expenseReceiptThumb} />
      )}
      <View style={styles.expenseAmountCol}>
        <Text style={styles.expenseAmount}>{currSymbol}{expense.amount.toFixed(2)}</Text>
        <Text style={styles.expenseSplit}>{'\u00F7'}{expense.splitWith.length}</Text>
      </View>
    </View>
  );
});

export default function StashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();
  const tripCtx = useTripContext();

  const [activeTab, setActiveTab] = useState<Tab>('spending');
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // ── Spending state ────────────────────────────────────────────────
  const MEMBERS = tripCtx.squad.map(m => m.name);
  const expenses = tripCtx.expenses;
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('food');
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // ── Booking state ─────────────────────────────────────────────────
  const bookings = tripCtx.bookings;
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType>('flight');
  const [bTitle, setBTitle] = useState('');
  const [bConfCode, setBConfCode] = useState('');
  const [bFrom, setBFrom] = useState('');
  const [bTo, setBTo] = useState('');
  const [bLocation, setBLocation] = useState('');
  const [bStartDate, setBStartDate] = useState('');
  const [bStartTime, setBStartTime] = useState('');
  const [bEndDate, setBEndDate] = useState('');
  const [bEndTime, setBEndTime] = useState('');
  const [bProvider, setBProvider] = useState('');
  const [bPrice, setBPrice] = useState('');
  const [bNotes, setBNotes] = useState('');
  const [bReturnFrom, setBReturnFrom] = useState('');
  const [bReturnTo, setBReturnTo] = useState('');
  const [bReturnDate, setBReturnDate] = useState('');
  const [bReturnTime, setBReturnTime] = useState('');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string>('');

  const contentOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  const currSymbol = getCurrencySymbol(tripCtx.tripMeta.currency);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // ── Balances ────────────────────────────────────────────────────
  const balances: Record<string, number> = {};
  MEMBERS.forEach(m => { balances[m] = 0; });
  expenses.forEach(e => {
    const share = e.amount / e.splitWith.length;
    balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount;
    e.splitWith.forEach(m => { balances[m] = (balances[m] || 0) - share; });
  });

  // ── Sorted bookings ────────────────────────────────────────────
  const now = new Date();
  const { upcoming, past } = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const u: BookingLocal[] = [];
    const p: BookingLocal[] = [];
    for (const b of sorted) {
      const d = new Date(b.startDate);
      (d >= now ? u : p).push(b);
    }
    return { upcoming: u, past: p };
  }, [bookings]);

  const [showPastBookings, setShowPastBookings] = useState(false);

  // ── Tab switching ─────────────────────────────────────────────
  const switchTab = (tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === 'spending' ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  };

  // ── Expense handlers ──────────────────────────────────────────
  const handleTakeReceipt = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        setReceiptUri(photo.uri);
        setShowReceiptCamera(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Failed to capture receipt');
    }
  };

  const handleOpenReceiptCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan receipts');
        return;
      }
    }
    setShowReceiptCamera(true);
  };

  const handleAddExpense = () => {
    if (!newTitle.trim() || !newAmount.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const cat = EXPENSE_CATEGORIES.find(c => c.id === newCategory);
    const newExpense: TripExpense = {
      id: Crypto.randomUUID(),
      title: newTitle.trim(),
      amount: parseFloat(newAmount) || 0,
      paidBy: 'You',
      icon: cat?.icon || 'cube-outline',
      category: newCategory,
      date: new Date().toISOString(),
      splitWith: MEMBERS,
      receiptUri: receiptUri || undefined,
    };
    tripCtx.addExpense(newExpense);

    if (params.tripId && deviceId) {
      addActivityLog(params.tripId, {
        id: Crypto.randomUUID(),
        userId: deviceId,
        userName: 'You',
        actionType: 'expense_added',
        details: `added an expense: ${newTitle.trim()} (${currSymbol}${parseFloat(newAmount) || 0})`,
        emoji: '💰',
        createdAt: new Date().toISOString(),
      });
    }

    setNewTitle('');
    setNewAmount('');
    setReceiptUri(null);
    setShowAddExpenseModal(false);
  };

  // ── Booking handlers ──────────────────────────────────────────
  const resetBookingForm = () => {
    setBTitle('');
    setBConfCode('');
    setBFrom('');
    setBTo('');
    setBLocation('');
    setBStartDate('');
    setBStartTime('');
    setBEndDate('');
    setBEndTime('');
    setBProvider('');
    setBPrice('');
    setBNotes('');
    setBReturnFrom('');
    setBReturnTo('');
    setBReturnDate('');
    setBReturnTime('');
    setEditingBookingId(null);
    setBookingType('flight');
  };

  const openAddBooking = () => {
    resetBookingForm();
    setShowAddBookingModal(true);
  };

  const openEditBooking = useCallback((booking: BookingLocal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingBookingId(booking.id);
    setBookingType(booking.type);
    setBTitle(booking.title);
    setBConfCode(booking.confirmationCode || '');
    setBFrom(booking.from || '');
    setBTo(booking.to || '');
    setBLocation(booking.location || '');
    setBStartDate(booking.startDate);
    setBStartTime(booking.startTime || '');
    setBEndDate(booking.endDate || '');
    setBEndTime(booking.endTime || '');
    setBProvider(booking.provider || '');
    setBPrice(booking.totalPrice?.toString() || '');
    setBNotes(booking.notes || '');
    setBReturnFrom(booking.returnFrom || '');
    setBReturnTo(booking.returnTo || '');
    setBReturnDate(booking.returnDate || '');
    setBReturnTime(booking.returnTime || '');
    setShowAddBookingModal(true);
  }, []);

  const handleSaveBooking = async () => {
    if (!bTitle.trim() || !bStartDate.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const bookingData: BookingLocal = {
      id: editingBookingId || Crypto.randomUUID(),
      type: bookingType,
      title: bTitle.trim(),
      confirmationCode: bConfCode.trim() || undefined,
      from: bFrom.trim().toUpperCase() || undefined,
      to: bTo.trim().toUpperCase() || undefined,
      location: bLocation.trim() || undefined,
      startDate: bStartDate.trim(),
      startTime: bStartTime.trim() || undefined,
      endDate: bEndDate.trim() || undefined,
      endTime: bEndTime.trim() || undefined,
      provider: bProvider.trim() || undefined,
      totalPrice: bPrice ? parseFloat(bPrice) || undefined : undefined,
      currency: tripCtx.tripMeta.currency,
      notes: bNotes.trim() || undefined,
      returnFrom: bReturnFrom.trim().toUpperCase() || undefined,
      returnTo: bReturnTo.trim().toUpperCase() || undefined,
      returnDate: bReturnDate.trim() || undefined,
      returnTime: bReturnTime.trim() || undefined,
      addedBy: 'You',
      createdAt: editingBookingId
        ? bookings.find(b => b.id === editingBookingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    if (editingBookingId) {
      tripCtx.updateBooking(editingBookingId, bookingData);
    } else {
      tripCtx.addBooking(bookingData);
    }

    // Schedule reminders
    if (params.tripId) {
      if (editingBookingId) await cancelBookingReminders(editingBookingId);
      await scheduleBookingReminders(params.tripId, bookingData);
    }

    // Activity log
    if (params.tripId && deviceId) {
      addActivityLog(params.tripId, {
        id: Crypto.randomUUID(),
        userId: deviceId,
        userName: 'You',
        actionType: editingBookingId ? 'booking_updated' : 'booking_added',
        details: `${editingBookingId ? 'updated' : 'added'} a booking: ${bTitle.trim()}`,
        emoji: BOOKING_TYPES.find(t => t.id === bookingType)?.emoji || '📋',
        createdAt: new Date().toISOString(),
      });
    }

    resetBookingForm();
    setShowAddBookingModal(false);
  };

  const handleRemoveBooking = useCallback(async (bookingId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    tripCtx.removeBooking(bookingId);
    await cancelBookingReminders(bookingId);

    if (params.tripId && deviceId) {
      addActivityLog(params.tripId, {
        id: Crypto.randomUUID(),
        userId: deviceId,
        userName: 'You',
        actionType: 'booking_removed',
        details: 'removed a booking',
        emoji: '🗑️',
        createdAt: new Date().toISOString(),
      });
    }
  }, [params.tripId, deviceId, tripCtx]);

  // ── + button handler ──────────────────────────────────────────
  const handlePlusPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'spending') {
      setShowAddExpenseModal(true);
    } else {
      openAddBooking();
    }
  };

  // ── Render helpers ────────────────────────────────────────────

  const renderBookingCard = useCallback((booking: BookingLocal) => {
    const typeInfo = BOOKING_TYPES.find(t => t.id === booking.type);
    const gradientColors = BOOKING_GRADIENT_COLORS[booking.type];

    return (
      <Pressable
        key={booking.id}
        onPress={() => openEditBooking(booking)}
        onLongPress={() => {
          Alert.alert('Remove Booking', `Delete "${booking.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => handleRemoveBooking(booking.id) },
          ]);
        }}
        style={styles.bookingCard}
      >
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], gradientColors[0]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardGradientStrip}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{typeInfo?.emoji} {booking.title}</Text>
            {booking.confirmationCode && (
              <View style={[styles.confBadge, { backgroundColor: gradientColors[0] + '20' }]}>
                <Text style={[styles.confBadgeText, { color: gradientColors[0] }]}>{booking.confirmationCode}</Text>
              </View>
            )}
          </View>

          {/* Flight-specific route display */}
          {booking.type === 'flight' && booking.from && booking.to && (
            <View style={styles.routeContainer}>
              <View style={styles.routeCity}>
                <Text style={styles.cityCode}>{booking.from}</Text>
                <Text style={styles.cityLabel}>Departure</Text>
              </View>
              <View style={styles.routeLine}>
                <View style={styles.dottedLine} />
                <Text style={styles.planeIcon}>✈️</Text>
                <View style={styles.dottedLine} />
              </View>
              <View style={[styles.routeCity, { alignItems: 'flex-end' }]}>
                <Text style={styles.cityCode}>{booking.to}</Text>
                <Text style={styles.cityLabel}>Arrival</Text>
              </View>
            </View>
          )}

          {/* Info row */}
          <View style={styles.bookingInfoRow}>
            {booking.provider && (
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>{booking.type === 'flight' ? 'AIRLINE' : 'PROVIDER'}</Text>
                <Text style={styles.bookingInfoValue}>{booking.provider}</Text>
              </View>
            )}
            {booking.startDate && (
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>{booking.type === 'hotel' ? 'CHECK-IN' : 'DATE'}</Text>
                <Text style={styles.bookingInfoValue}>{booking.startDate}</Text>
              </View>
            )}
            {booking.startTime && (
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>TIME</Text>
                <Text style={styles.bookingInfoValue}>{booking.startTime}</Text>
              </View>
            )}
            {booking.endDate && booking.type === 'hotel' && (
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>CHECK-OUT</Text>
                <Text style={styles.bookingInfoValue}>{booking.endDate}</Text>
              </View>
            )}
            {booking.totalPrice != null && (
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>PRICE</Text>
                <Text style={styles.bookingInfoValue}>{currSymbol}{booking.totalPrice}</Text>
              </View>
            )}
          </View>

          {/* Hotel location */}
          {booking.location && (
            <Text style={styles.bookingLocation}>📍 {booking.location}</Text>
          )}

          {/* Return flight */}
          {booking.type === 'flight' && booking.returnFrom && (
            <View style={styles.returnSection}>
              <View style={styles.returnDivider}>
                <View style={styles.returnDividerLine} />
                <Text style={styles.returnLabel}>Return</Text>
                <View style={styles.returnDividerLine} />
              </View>
              <View style={styles.returnRoute}>
                <Text style={styles.returnRouteText}>{booking.returnFrom} → {booking.returnTo}</Text>
                <Text style={styles.returnTimeText}>{booking.returnDate} · {booking.returnTime}</Text>
              </View>
            </View>
          )}

          <Text style={styles.tapHint}>Tap to edit · long press to delete</Text>
        </View>
      </Pressable>
    );
  }, [openEditBooking, handleRemoveBooking, currSymbol]);

  // ── Tab indicator transform ───────────────────────────────────
  const tabWidth = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md * 2) / 2;
  const indicatorTranslateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Stash</Text>
        <Pressable onPress={handlePlusPress}>
          <Ionicons name="add" size={24} color={Colors.accent} />
        </Pressable>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabBar}>
        <Animated.View
          style={[
            styles.tabIndicator,
            { width: tabWidth, transform: [{ translateX: indicatorTranslateX }] },
          ]}
        />
        <Pressable style={styles.tabButton} onPress={() => switchTab('spending')}>
          <Ionicons name="wallet-outline" size={16} color={activeTab === 'spending' ? Colors.accent : Colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'spending' && styles.tabLabelActive]}>Spending</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => switchTab('bookings')}>
          <Ionicons name="airplane-outline" size={16} color={activeTab === 'bookings' ? Colors.accent : Colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'bookings' && styles.tabLabelActive]}>Bookings</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════ SPENDING TAB ═══════════ */}
          {activeTab === 'spending' && (
            <>
              {/* Total card */}
              <View style={styles.totalCard}>
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.totalGradient}
                >
                  <Text style={styles.totalLabel}>Total Group Spend</Text>
                  <Text style={styles.totalAmount}>{currSymbol}{totalSpent.toFixed(2)}</Text>
                  <Text style={styles.totalSub}>{expenses.length} expenses · {MEMBERS.length} people</Text>
                </LinearGradient>
              </View>

              {/* Balances */}
              <Text style={styles.sectionTitle}>Balances</Text>
              <View style={styles.balancesCard}>
                {MEMBERS.map(member => {
                  const bal = balances[member] || 0;
                  const isPositive = bal > 0;
                  return (
                    <View key={member} style={styles.balanceRow}>
                      <View style={[styles.balanceAvatar, { backgroundColor: isPositive ? Colors.sage : Colors.accent }]}>
                        <Text style={styles.balanceAvatarText}>{member.charAt(0)}</Text>
                      </View>
                      <Text style={styles.balanceName}>{member}</Text>
                      <Text style={[styles.balanceAmount, { color: isPositive ? Colors.sage : Colors.error }]}>
                        {isPositive ? '+' : ''}{currSymbol}{Math.abs(bal).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Scan Receipt */}
              <Pressable
                style={styles.scanButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowAddExpenseModal(true);
                }}
              >
                <View style={styles.scanButtonInner}>
                  <Ionicons name="camera-outline" size={32} color={Colors.accent} />
                  <View>
                    <Text style={styles.scanTitle}>Scan Receipt</Text>
                    <Text style={styles.scanSub}>Auto-detect amount & items</Text>
                  </View>
                </View>
              </Pressable>

              {/* Expense list */}
              <Text style={styles.sectionTitle}>Recent</Text>
              {expenses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="wallet-outline" size={48} color={Colors.accent} />
                  <Text style={styles.emptyStateTitle}>No expenses yet</Text>
                  <Text style={styles.emptyStateSub}>Tap + to add your first expense</Text>
                </View>
              ) : (
                expenses.map(expense => (
                  <ExpenseRow key={expense.id} expense={expense} currSymbol={currSymbol} />
                ))
              )}
            </>
          )}

          {/* ═══════════ BOOKINGS TAB ═══════════ */}
          {activeTab === 'bookings' && (
            <>
              {/* Upcoming */}
              {upcoming.length === 0 && past.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="airplane-outline" size={48} color={Colors.accent} />
                  <Text style={styles.emptyStateTitle}>No bookings yet</Text>
                  <Text style={styles.emptyStateSub}>Tap + to add flights, hotels & more</Text>
                </View>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Upcoming</Text>
                      {upcoming.map(renderBookingCard)}
                    </>
                  )}

                  {/* Past bookings (collapsed) */}
                  {past.length > 0 && (
                    <>
                      <Pressable
                        style={styles.pastHeader}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setShowPastBookings(!showPastBookings);
                        }}
                      >
                        <Text style={styles.sectionTitle}>Past ({past.length})</Text>
                        <Ionicons
                          name={showPastBookings ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={Colors.textMuted}
                        />
                      </Pressable>
                      {showPastBookings && past.map(renderBookingCard)}
                    </>
                  )}
                </>
              )}

              {/* Quick Links */}
              <Text style={styles.sectionTitle}>Quick Links</Text>
              <View style={styles.quickLinksGrid}>
                {QUICK_LINKS.map(link => (
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
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* ═══════════ ADD EXPENSE MODAL ═══════════ */}
      <Modal visible={showAddExpenseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Expense</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHAT FOR</Text>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Dinner at Kyoto"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>AMOUNT</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.catGrid}>
              {EXPENSE_CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewCategory(cat.id); }}
                  style={[styles.catChip, newCategory === cat.id && styles.catChipActive]}
                >
                  <Ionicons name={cat.icon} size={16} color={newCategory === cat.id ? Colors.accent : Colors.textSecondary} />
                  <Text style={[styles.catLabel, newCategory === cat.id && styles.catLabelActive]}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Receipt */}
            <View style={styles.receiptSection}>
              <Text style={styles.label}>RECEIPT (optional)</Text>
              <View style={styles.receiptRow}>
                <Pressable onPress={handleOpenReceiptCamera} style={styles.receiptButton}>
                  <Ionicons name="camera-outline" size={22} color={Colors.accent} />
                  <Text style={styles.receiptButtonText}>{receiptUri ? 'Retake' : 'Scan Receipt'}</Text>
                </Pressable>
                {receiptUri && (
                  <View style={styles.receiptPreview}>
                    <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                    <Pressable onPress={() => setReceiptUri(null)} style={styles.receiptRemove}>
                      <Ionicons name="close-circle" size={18} color={Colors.error} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAddExpenseModal(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddExpense} style={styles.saveButton}>
                <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.saveGradient}>
                  <Text style={styles.saveText}>Add Expense</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════ ADD/EDIT BOOKING MODAL ═══════════ */}
      <Modal visible={showAddBookingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingBookingId ? 'Edit Booking' : 'Add Booking'}</Text>

              {/* Booking type picker */}
              <Text style={styles.label}>TYPE</Text>
              <View style={styles.catGrid}>
                {BOOKING_TYPES.map(bt => (
                  <Pressable
                    key={bt.id}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBookingType(bt.id); }}
                    style={[styles.catChip, bookingType === bt.id && { borderColor: bt.color, backgroundColor: bt.color + '10' }]}
                  >
                    <Text style={{ fontSize: 14 }}>{bt.emoji}</Text>
                    <Text style={[styles.catLabel, bookingType === bt.id && { color: bt.color, fontFamily: Fonts.bodySemiBold }]}>{bt.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {bookingType === 'flight' ? 'AIRLINE & FLIGHT' : bookingType === 'hotel' ? 'HOTEL NAME' : 'TITLE'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={bTitle}
                  onChangeText={setBTitle}
                  placeholder={bookingType === 'flight' ? 'e.g. IndiGo 6E-2145' : bookingType === 'hotel' ? 'e.g. Taj Fort Aguada' : 'e.g. City Tour'}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Confirmation code */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRMATION CODE (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={bConfCode}
                  onChangeText={setBConfCode}
                  placeholder="e.g. ABC123"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              {/* Flight: from/to */}
              {(bookingType === 'flight' || bookingType === 'train') && (
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>FROM</Text>
                    <TextInput
                      style={styles.input}
                      value={bFrom}
                      onChangeText={setBFrom}
                      placeholder={bookingType === 'flight' ? 'DEL' : 'Delhi'}
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="characters"
                      maxLength={bookingType === 'flight' ? 4 : 30}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>TO</Text>
                    <TextInput
                      style={styles.input}
                      value={bTo}
                      onChangeText={setBTo}
                      placeholder={bookingType === 'flight' ? 'GOI' : 'Goa'}
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="characters"
                      maxLength={bookingType === 'flight' ? 4 : 30}
                    />
                  </View>
                </View>
              )}

              {/* Hotel/Activity: location */}
              {(bookingType === 'hotel' || bookingType === 'activity' || bookingType === 'car_rental') && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>LOCATION</Text>
                  <TextInput
                    style={styles.input}
                    value={bLocation}
                    onChangeText={setBLocation}
                    placeholder="e.g. Sinquerim Beach, Goa"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              )}

              {/* Provider */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PROVIDER (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={bProvider}
                  onChangeText={setBProvider}
                  placeholder={bookingType === 'flight' ? 'e.g. IndiGo' : bookingType === 'car_rental' ? 'e.g. Hertz' : 'e.g. Booking.com'}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Dates */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>{bookingType === 'hotel' ? 'CHECK-IN' : 'DATE'}</Text>
                  <TextInput
                    style={styles.input}
                    value={bStartDate}
                    onChangeText={setBStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>TIME (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={bStartTime}
                    onChangeText={setBStartTime}
                    placeholder="10:30 AM"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {(bookingType === 'hotel' || bookingType === 'car_rental') && (
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>{bookingType === 'hotel' ? 'CHECK-OUT' : 'RETURN DATE'}</Text>
                    <TextInput
                      style={styles.input}
                      value={bEndDate}
                      onChangeText={setBEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>TIME (optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={bEndTime}
                      onChangeText={setBEndTime}
                      placeholder="3:00 PM"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              )}

              {/* Flight return */}
              {bookingType === 'flight' && (
                <>
                  <View style={styles.optionalHeader}>
                    <View style={styles.optionalDivider} />
                    <Text style={styles.optionalLabel}>Return (optional)</Text>
                    <View style={styles.optionalDivider} />
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>FROM</Text>
                      <TextInput style={styles.input} value={bReturnFrom} onChangeText={setBReturnFrom} placeholder="GOI" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" maxLength={4} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>TO</Text>
                      <TextInput style={styles.input} value={bReturnTo} onChangeText={setBReturnTo} placeholder="DEL" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" maxLength={4} />
                    </View>
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>RETURN DATE</Text>
                      <TextInput style={styles.input} value={bReturnDate} onChangeText={setBReturnDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.label}>RETURN TIME</Text>
                      <TextInput style={styles.input} value={bReturnTime} onChangeText={setBReturnTime} placeholder="7:45 PM" placeholderTextColor={Colors.textMuted} />
                    </View>
                  </View>
                </>
              )}

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TOTAL PRICE (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={bPrice}
                  onChangeText={setBPrice}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NOTES (optional)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={bNotes}
                  onChangeText={setBNotes}
                  placeholder="Any additional details..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable onPress={() => { resetBookingForm(); setShowAddBookingModal(false); }} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSaveBooking} style={styles.saveButton}>
                  <LinearGradient
                    colors={[BOOKING_GRADIENT_COLORS[bookingType][0], BOOKING_GRADIENT_COLORS[bookingType][1]]}
                    style={styles.saveGradient}
                  >
                    <Text style={styles.saveText}>{editingBookingId ? 'Update' : 'Add'} Booking</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Receipt Camera Modal */}
      <Modal visible={showReceiptCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
            <View style={styles.cameraOverlay}>
              <Pressable onPress={() => setShowReceiptCamera(false)} style={styles.cameraCloseBtn}>
                <Ionicons name="close" size={28} color="#FFF" />
              </Pressable>
              <View style={styles.cameraGuide}>
                <View style={styles.cameraGuideFrame} />
                <Text style={styles.cameraGuideText}>Align receipt within frame</Text>
              </View>
              <View style={styles.cameraBottomBar}>
                <Pressable onPress={handleTakeReceipt} style={styles.captureBtn}>
                  <View style={styles.captureBtnInner} />
                </Pressable>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    zIndex: 1,
  },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.accent,
    fontFamily: Fonts.bodySemiBold,
  },
  tabIndicator: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    bottom: Spacing.xs,
    borderRadius: BorderRadius.lg - 2,
    backgroundColor: Colors.accent + '12',
  },

  // ── Spending ──
  totalCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xl },
  totalGradient: { padding: Spacing.xl, alignItems: 'center' },
  totalLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)' },
  totalAmount: { fontFamily: Fonts.heading, fontSize: 48, color: Colors.white, marginVertical: 4 },
  totalSub: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  balancesCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.card },
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  balanceAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  balanceAvatarText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
  balanceName: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: FontSizes.md, color: Colors.text },
  balanceAmount: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md },
  scanButton: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg, borderWidth: 1.5, borderColor: Colors.accent, borderStyle: 'dashed', ...Shadows.card },
  scanButtonInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: 14 },
  scanTitle: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.accent },
  scanSub: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 14, borderRadius: BorderRadius.md, marginBottom: 8, ...Shadows.card },
  expenseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseName: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.text },
  expenseMeta: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  expenseAmountCol: { alignItems: 'flex-end' },
  expenseAmount: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.text },
  expenseSplit: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted },
  expenseReceiptThumb: { width: 40, height: 40, borderRadius: 8, marginRight: 8 },
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadows.card },
  emptyStateTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text, marginTop: Spacing.md },
  emptyStateSub: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.xs },

  // ── Booking Cards ──
  bookingCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg, ...Shadows.card },
  cardGradientStrip: { height: 6, width: '100%' },
  cardContent: { padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  cardTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text, flex: 1 },
  confBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.pill },
  confBadgeText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xs, letterSpacing: 0.5 },
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg, paddingVertical: Spacing.sm },
  routeCity: { alignItems: 'flex-start' },
  cityCode: { fontFamily: Fonts.heading, fontSize: FontSizes.xxl, color: Colors.text },
  cityLabel: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md },
  dottedLine: { flex: 1, height: 1.5, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border },
  planeIcon: { fontSize: 18, marginHorizontal: 6 },
  bookingInfoRow: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.md },
  bookingInfoItem: { minWidth: 70 },
  bookingInfoLabel: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 4 },
  bookingInfoValue: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text },
  bookingLocation: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  returnSection: { marginTop: Spacing.md },
  returnDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  returnDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  returnLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textMuted, marginHorizontal: Spacing.sm, letterSpacing: 0.5 },
  returnRoute: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md },
  returnRouteText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.text },
  returnTimeText: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textSecondary },
  tapHint: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
  pastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },

  // ── Quick Links ──
  quickLinksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLinkCard: { width: '47%', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadows.card },
  quickLinkTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  quickLinkEmoji: { fontSize: 24 },
  quickLinkArrow: { fontSize: 16, color: Colors.textMuted, fontFamily: Fonts.body },
  quickLinkLabel: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.text, marginBottom: 2 },
  quickLinkSub: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted },

  // ── Modal (shared) ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(44,37,32,0.5)' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 14, fontFamily: Fonts.body, fontSize: FontSizes.md, color: Colors.text },
  amountInput: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xxl },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl },
  catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.border, gap: 4 },
  catChipActive: { borderColor: Colors.accent, backgroundColor: '#FDF6F0' },
  catLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: Colors.textSecondary },
  catLabelActive: { color: Colors.accent, fontFamily: Fonts.bodySemiBold },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  formField: { flex: 1 },
  optionalHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  optionalDivider: { flex: 1, height: 1, backgroundColor: Colors.border },
  optionalLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textMuted, marginHorizontal: 10 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, padding: 16, borderRadius: BorderRadius.xl, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.md, color: Colors.textSecondary },
  saveButton: { flex: 2, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
  receiptSection: { marginBottom: Spacing.lg },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.accent, borderStyle: 'dashed' as any },
  receiptButtonText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: Colors.accent },
  receiptPreview: { position: 'relative' },
  receiptThumb: { width: 48, height: 48, borderRadius: BorderRadius.sm },
  receiptRemove: { position: 'absolute', top: -6, right: -6 },

  // ── Camera ──
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraView: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  cameraCloseBtn: { alignSelf: 'flex-end', marginRight: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  cameraGuide: { alignItems: 'center' },
  cameraGuideFrame: { width: 280, height: 200, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 12 },
  cameraGuideText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 12 },
  cameraBottomBar: { alignItems: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF' },
});
