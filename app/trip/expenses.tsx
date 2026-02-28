import { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  icon: string;
  category: string;
  date: string;
  splitWith: string[];
  receiptUri?: string;
}

const CATEGORIES = [
  { id: 'food', icon: 'restaurant-outline' as const, label: 'Food' },
  { id: 'transport', icon: 'car-outline' as const, label: 'Transport' },
  { id: 'stay', icon: 'bed-outline' as const, label: 'Stay' },
  { id: 'activity', icon: 'ticket-outline' as const, label: 'Activity' },
  { id: 'shopping', icon: 'bag-outline' as const, label: 'Shopping' },
  { id: 'other', icon: 'cube-outline' as const, label: 'Other' },
];

const MEMBERS = ['Alex', 'Sam', 'Jordan', 'Riley'];

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('food');
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const contentOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate balances
  const balances: Record<string, number> = {};
  MEMBERS.forEach((m) => { balances[m] = 0; });
  expenses.forEach((e) => {
    const share = e.amount / e.splitWith.length;
    balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount;
    e.splitWith.forEach((m) => {
      balances[m] = (balances[m] || 0) - share;
    });
  });

  const handleTakeReceipt = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        setReceiptUri(photo.uri);
        setShowReceiptCamera(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
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
    const cat = CATEGORIES.find((c) => c.id === newCategory);
    const newExpense: Expense = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      amount: parseFloat(newAmount) || 0,
      paidBy: 'You',
      icon: cat?.icon || 'cube-outline',
      category: newCategory,
      date: 'Today',
      splitWith: MEMBERS,
      receiptUri: receiptUri || undefined,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    setNewTitle('');
    setNewAmount('');
    setReceiptUri(null);
    setShowAddModal(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Expenses</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}>
          <Ionicons name="add" size={24} color={Colors.accent} />
        </Pressable>
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Total card */}
          <View style={styles.totalCard}>
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.totalGradient}
            >
              <Text style={styles.totalLabel}>Total Group Spend</Text>
              <Text style={styles.totalAmount}>${totalSpent.toFixed(2)}</Text>
              <Text style={styles.totalSub}>{expenses.length} expenses · {MEMBERS.length} people</Text>
            </LinearGradient>
          </View>

          {/* Balances */}
          <Text style={styles.sectionTitle}>Balances</Text>
          <View style={styles.balancesCard}>
            {MEMBERS.map((member) => {
              const bal = balances[member] || 0;
              const isPositive = bal > 0;
              return (
                <View key={member} style={styles.balanceRow}>
                  <View style={[styles.balanceAvatar, { backgroundColor: isPositive ? Colors.sage : Colors.accent }]}>
                    <Text style={styles.balanceAvatarText}>{member.charAt(0)}</Text>
                  </View>
                  <Text style={styles.balanceName}>{member}</Text>
                  <Text style={[styles.balanceAmount, { color: isPositive ? Colors.sage : Colors.error }]}>
                    {isPositive ? '+' : ''}{bal.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Receipt scanner button */}
          <Pressable
            style={styles.scanButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddModal(true);
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
            expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={styles.expenseIcon}>
                  <Ionicons name={expense.icon as any} size={22} color={Colors.accent} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseName}>{expense.title}</Text>
                  <Text style={styles.expenseMeta}>
                    Paid by {expense.paidBy} · {expense.date}
                  </Text>
                </View>
                {expense.receiptUri && (
                  <Image source={{ uri: expense.receiptUri }} style={styles.expenseReceiptThumb} />
                )}
                <View style={styles.expenseAmountCol}>
                  <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                  <Text style={styles.expenseSplit}>
                    ÷{expense.splitWith.length}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
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
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setNewCategory(cat.id)}
                  style={[styles.catChip, newCategory === cat.id && styles.catChipActive]}
                >
                  <Ionicons name={cat.icon} size={16} color={newCategory === cat.id ? Colors.accent : Colors.textSecondary} />
                  <Text style={[styles.catLabel, newCategory === cat.id && styles.catLabelActive]}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Receipt Capture */}
            <View style={styles.receiptSection}>
              <Text style={styles.label}>RECEIPT (optional)</Text>
              <View style={styles.receiptRow}>
                <Pressable onPress={handleOpenReceiptCamera} style={styles.receiptButton}>
                  <Ionicons name="camera-outline" size={22} color={Colors.accent} />
                  <Text style={styles.receiptButtonText}>
                    {receiptUri ? 'Retake' : 'Scan Receipt'}
                  </Text>
                </Pressable>
                {receiptUri && (
                  <View style={styles.receiptPreview}>
                    <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                    <Pressable
                      onPress={() => setReceiptUri(null)}
                      style={styles.receiptRemove}
                    >
                      <Ionicons name="close-circle" size={18} color={Colors.error} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAddModal(false)} style={styles.cancelButton}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  backArrow: { fontSize: 24, color: Colors.text },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text },
  addButton: { fontSize: 24, color: Colors.accent, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl },
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
  emptyState: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadows.card },
  emptyStateTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text, marginTop: Spacing.md },
  emptyStateSub: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  expenseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseName: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.text },
  expenseMeta: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  expenseAmountCol: { alignItems: 'flex-end' },
  expenseAmount: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.text },
  expenseSplit: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted },
  // Modal
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
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, padding: 16, borderRadius: BorderRadius.xl, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.md, color: Colors.textSecondary },
  saveButton: { flex: 2, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
  // Receipt section in modal
  receiptSection: { marginBottom: Spacing.lg },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.accent,
    borderStyle: 'dashed' as any,
  },
  receiptButtonText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: Colors.accent },
  receiptPreview: { position: 'relative' },
  receiptThumb: { width: 48, height: 48, borderRadius: BorderRadius.sm },
  receiptRemove: { position: 'absolute', top: -6, right: -6 },
  expenseReceiptThumb: { width: 40, height: 40, borderRadius: 8, marginRight: 8 },
  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraView: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  cameraCloseBtn: {
    alignSelf: 'flex-end', marginRight: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  cameraGuide: { alignItems: 'center' },
  cameraGuideFrame: {
    width: 280, height: 200, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
  },
  cameraGuideText: {
    fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
  },
  cameraBottomBar: { alignItems: 'center' },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF' },
});
