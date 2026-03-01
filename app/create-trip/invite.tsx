import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  Share,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { createTrip } from '../../src/services/tripService';
import {
  createInvitation,
  generateShareMessage,
  generateWhatsAppUrl,
  generateEmailUrl,
} from '../../src/services/inviteService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ─────────────────────────────────────────────────────────────────
type MemberRole = 'organizer' | 'co-organizer' | 'member' | 'viewer';

interface InvitedMember {
  id: string;
  name: string;
  initial: string;
  color: string;
  role: MemberRole;
  method: 'manual' | 'whatsapp' | 'sms' | 'email' | 'link' | 'qr' | 'search';
  status: 'invited' | 'accepted' | 'pending';
  contact?: string; // email or phone
}

// ─── Constants ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#B07A50', '#5E8A5A', '#8B6DB5', '#C75450',
  '#4A8BA8', '#D4A574', '#7B68AE', '#4CAF50',
];

const ROLE_INFO: Record<MemberRole, { label: string; emoji: string; desc: string }> = {
  organizer:      { label: 'Organizer',    emoji: '👑', desc: 'Full control' },
  'co-organizer': { label: 'Co-organizer', emoji: '⭐', desc: 'Can edit trip' },
  member:         { label: 'Member',       emoji: '🎒', desc: 'Can vote & add' },
  viewer:         { label: 'Viewer',       emoji: '👁️', desc: 'View only' },
};

const ASSIGNABLE_ROLES: MemberRole[] = ['co-organizer', 'member', 'viewer'];

// Simulated contacts for "search by username" feature
const MOCK_CONTACTS = [
  { id: 'u1', name: 'Arjun Mehta',   username: 'arjun_m',   phone: '+91 98xxx xxxx0' },
  { id: 'u2', name: 'Priya Sharma',  username: 'priya.s',   phone: '+91 87xxx xxxx1' },
  { id: 'u3', name: 'Ravi Kumar',    username: 'ravi_k',    phone: '+91 76xxx xxxx2' },
  { id: 'u4', name: 'Sneha Patel',   username: 'sneha_p',   phone: '+91 99xxx xxxx3' },
  { id: 'u5', name: 'Karan Singh',   username: 'karan.s',   phone: '+91 85xxx xxxx4' },
  { id: 'u6', name: 'Ananya Gupta',  username: 'ananya_g',  phone: '+91 92xxx xxxx5' },
];

// ─── Helper ────────────────────────────────────────────────────────────────
function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatTripDate(isoStr?: string): string {
  if (!isoStr) return 'TBD';
  try {
    const d = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return isoStr;
  }
}

// ─── QR Code Component (real scannable QR) ──────────────────────────────────
function QRCodeDisplay({ code, size = 180 }: { code: string; size?: number }) {
  const deepLink = `traimate://join/${code}`;
  return (
    <View style={[qrStyles.container, { width: size + 24, height: size + 24 }]}>
      <QRCode
        value={deepLink}
        size={size}
        color={Colors.text}
        backgroundColor={Colors.white}
      />
    </View>
  );
}

// ─── Role Picker Modal ─────────────────────────────────────────────────────
function RolePicker({
  visible,
  memberName,
  currentRole,
  onSelect,
  onClose,
}: {
  visible: boolean;
  memberName: string;
  currentRole: MemberRole;
  onSelect: (role: MemberRole) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Set Role</Text>
          <Text style={modalStyles.subtitle}>for {memberName}</Text>

          {ASSIGNABLE_ROLES.map((role) => {
            const info = ROLE_INFO[role];
            const isActive = currentRole === role;
            return (
              <Pressable
                key={role}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(role);
                  onClose();
                }}
                style={[modalStyles.roleRow, isActive && modalStyles.roleRowActive]}
              >
                <Text style={modalStyles.roleEmoji}>{info.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.roleLabel, isActive && { color: Colors.accent }]}>
                    {info.label}
                  </Text>
                  <Text style={modalStyles.roleDesc}>{info.desc}</Text>
                </View>
                {isActive && <Text style={modalStyles.checkMark}>✓</Text>}
              </Pressable>
            );
          })}

          <Pressable onPress={onClose} style={modalStyles.cancelBtn}>
            <Text style={modalStyles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── QR Modal ──────────────────────────────────────────────────────────────
function QRModal({
  visible,
  inviteCode,
  tripName,
  onClose,
}: {
  visible: boolean;
  inviteCode: string;
  tripName: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.qrSheet, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={modalStyles.qrTitle}>Scan to Join</Text>
          <Text style={modalStyles.qrSubtitle}>{tripName}</Text>

          <View style={modalStyles.qrWrapper}>
            <QRCodeDisplay code={inviteCode} size={200} />
          </View>

          <View style={modalStyles.qrCodeRow}>
            <Text style={modalStyles.qrCodeLabel}>Invite Code</Text>
            <Text style={modalStyles.qrCodeValue}>{inviteCode.toUpperCase()}</Text>
          </View>

          <Text style={modalStyles.qrHint}>
            Ask your friends to scan this QR code or{'\n'}enter the invite code in TraiMate
          </Text>

          <Pressable onPress={onClose} style={modalStyles.qrCloseBtn}>
            <Text style={modalStyles.qrCloseBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function InviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams<{
    destination: string;
    tripName: string;
    startDate: string;
    endDate: string;
    currency: string;
    styles: string;
    tripType: string;
  }>();
  const { destination, tripName, startDate, endDate, currency, tripType } = routeParams;
  const tripStyles = routeParams.styles;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<InvitedMember[]>([]);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState<'quick' | 'search'>('quick');

  const inviteCode = useRef(generateInviteCode()).current;
  const inviteLink = `traimate.app/join/${inviteCode}`;

  // Animation
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(contentY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Add member helper
  const addMember = useCallback((
    name: string,
    method: InvitedMember['method'],
    contact?: string,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const member: InvitedMember = {
      id: Date.now().toString() + Math.random(),
      name,
      initial: name.charAt(0).toUpperCase(),
      color: AVATAR_COLORS[members.length % AVATAR_COLORS.length],
      role: 'member',
      method,
      status: 'invited',
      contact,
    };
    setMembers(prev => [...prev, member]);
    return member;
  }, [members.length]);

  const removeMember = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const updateRole = useCallback((id: string, role: MemberRole) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  }, []);

  // ── Share actions ──────────────────────────────────────
  const shareMessage = generateShareMessage({
    tripName: tripName || 'My Trip',
    destination: destination || '',
    startDate,
    endDate,
    inviteCode,
  });

  const handleCopyLink = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = generateWhatsAppUrl(shareMessage);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Clipboard.setStringAsync(shareMessage);
        await Share.share({ message: shareMessage, title: `Join ${tripName} on TraiMate` });
      }
    } catch {
      await Share.share({ message: shareMessage, title: `Join ${tripName} on TraiMate` });
    }
  };

  const handleSMS = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    try {
      await Linking.openURL(smsUrl);
    } catch {
      await Share.share({ message: shareMessage });
    }
  };

  const handleEmail = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const emailUrl = generateEmailUrl({
      subject: `Join "${tripName || 'My Trip'}" on TraiMate!`,
      body: shareMessage,
    });
    try {
      await Linking.openURL(emailUrl);
    } catch {
      await Share.share({ message: shareMessage });
    }
  };

  const handleNativeShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: shareMessage,
        title: `Join ${tripName} on TraiMate`,
      });
    } catch {
      // user cancelled
    }
  };

  const handleSearchAdd = (contact: typeof MOCK_CONTACTS[0]) => {
    addMember(contact.name, 'search', contact.phone);
    setSearchQuery('');
  };

  const handleManualAdd = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    addMember(trimmed, 'manual', trimmed.includes('@') ? trimmed : undefined);
    setSearchQuery('');
  };

  const handleCreateTrip = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Persist the trip
    const trip = await createTrip({
      name: tripName || 'My Trip',
      destination: destination || '',
      startDate: startDate || null,
      endDate: endDate || null,
      currency,
      tripType,
    });

    // Persist the invitation so it can be accepted by others
    await createInvitation({
      tripId: trip.id,
      tripName: tripName || 'My Trip',
      destination: destination || '',
      role: 'member',
    });

    // Dismiss the create-trip modal first, then push to trip screen
    // so the back button on trip screen returns to home
    router.dismissAll();
    router.push({
      pathname: '/trip/[id]',
      params: {
        id: trip.id,
        destination,
        tripName,
        startDate,
        endDate,
        currency,
        styles: tripStyles,
        tripType,
      },
    });
  };

  // ── Filtered contacts for search ──────────────────────
  const filteredContacts = searchQuery.trim().length > 0
    ? MOCK_CONTACTS.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
      ).filter(c => !members.find(m => m.name === c.name))
    : [];

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>
        <Pressable onPress={handleCreateTrip} hitSlop={16}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <Text style={styles.title}>Bring your{'\n'}squad 🤙</Text>

          {/* ── Trip preview card ─────────────────────────── */}
          <View style={styles.tripCard}>
            <View style={styles.tripCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripCardDest}>{destination}</Text>
                <Text style={styles.tripCardName}>{tripName}</Text>
                <Text style={styles.tripCardDates}>
                  {formatTripDate(startDate)} → {formatTripDate(endDate)}
                </Text>
              </View>
              <View style={styles.memberCountBadge}>
                <Text style={styles.memberCountNum}>{members.length + 1}</Text>
                <Text style={styles.memberCountLabel}>in</Text>
              </View>
            </View>

            {/* Invite link */}
            <View style={styles.linkRow}>
              <View style={styles.linkBox}>
                <Text style={styles.linkIcon}>🔗</Text>
                <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
              </View>
              <Pressable
                onPress={handleCopyLink}
                style={[styles.copyBtn, linkCopied && styles.copyBtnDone]}
              >
                <Text style={[styles.copyBtnText, linkCopied && { color: Colors.white }]}>
                  {linkCopied ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Quick share channels ─────────────────────── */}
          <Text style={styles.sectionLabel}>SHARE VIA</Text>
          <View style={styles.shareGrid}>
            <Pressable onPress={handleWhatsApp} style={styles.shareBtn}>
              <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
                <Text style={styles.shareIconText}>W</Text>
              </View>
              <Text style={styles.shareName}>WhatsApp</Text>
            </Pressable>

            <Pressable onPress={handleSMS} style={styles.shareBtn}>
              <View style={[styles.shareIcon, { backgroundColor: '#4A90D9' }]}>
                <Text style={styles.shareIconText}>💬</Text>
              </View>
              <Text style={styles.shareName}>SMS</Text>
            </Pressable>

            <Pressable onPress={handleEmail} style={styles.shareBtn}>
              <View style={[styles.shareIcon, { backgroundColor: '#EA4335' }]}>
                <Text style={styles.shareIconText}>✉️</Text>
              </View>
              <Text style={styles.shareName}>Email</Text>
            </Pressable>

            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowQR(true); }} style={styles.shareBtn}>
              <View style={[styles.shareIcon, { backgroundColor: Colors.text }]}>
                <Text style={styles.shareIconText}>⊞</Text>
              </View>
              <Text style={styles.shareName}>QR Code</Text>
            </Pressable>

            <Pressable onPress={handleNativeShare} style={styles.shareBtn}>
              <View style={[styles.shareIcon, { backgroundColor: Colors.accent }]}>
                <Text style={styles.shareIconText}>↗</Text>
              </View>
              <Text style={styles.shareName}>More</Text>
            </Pressable>
          </View>

          {/* ── Add by name/email/username ────────────────── */}
          <Text style={styles.sectionLabel}>ADD DIRECTLY</Text>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputRow}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Name, email, or @username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleManualAdd}
              />
              {searchQuery.trim().length > 0 && (
                <Pressable onPress={handleManualAdd} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              )}
            </View>

            {/* Search results from TraiMate users */}
            {filteredContacts.length > 0 && (
              <View style={styles.searchResults}>
                {filteredContacts.slice(0, 4).map((contact) => (
                  <Pressable
                    key={contact.id}
                    onPress={() => handleSearchAdd(contact)}
                    style={styles.searchResultRow}
                  >
                    <View style={[styles.contactAvatar, { backgroundColor: Colors.sage }]}>
                      <Text style={styles.contactAvatarText}>
                        {contact.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactUsername}>@{contact.username}</Text>
                    </View>
                    <Text style={styles.contactAddIcon}>+</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* ── Invited members list ─────────────────────── */}
          {members.length > 0 && (
            <View style={styles.membersSection}>
              <Text style={styles.sectionLabel}>
                THE SQUAD ({members.length + 1})
              </Text>

              {/* You (organizer) */}
              <View style={styles.memberRow}>
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDark]}
                  style={styles.memberAvatar}
                >
                  <Text style={styles.memberAvatarText}>Y</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>You</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {ROLE_INFO.organizer.emoji} {ROLE_INFO.organizer.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Other members */}
              {members.map((member) => {
                const roleInfo = ROLE_INFO[member.role];
                const methodIcons: Record<string, string> = {
                  whatsapp: '💬', sms: '📱', email: '✉️',
                  link: '🔗', qr: '⊞', search: '👤', manual: '✏️',
                };
                return (
                  <View key={member.id} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
                      <Text style={styles.memberAvatarText}>{member.initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <Text style={{ fontSize: 12 }}>{methodIcons[member.method]}</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setSelectedMemberId(member.id);
                          setShowRolePicker(true);
                        }}
                        style={styles.roleBadge}
                        hitSlop={8}
                      >
                        <Text style={styles.roleBadgeText}>
                          {roleInfo.emoji} {roleInfo.label}
                        </Text>
                        <Text style={styles.roleChevron}>▾</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => removeMember(member.id)} hitSlop={12}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty state */}
          {members.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🫂</Text>
              <Text style={styles.emptyTitle}>Squad's empty rn</Text>
              <Text style={styles.emptyDesc}>
                Share the link, drop it in the group chat,{'\n'}or add your people directly
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Create Trip button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleCreateTrip}
          style={({ pressed }) => [
            styles.createButton,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.sage, Colors.sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>
              {members.length > 0
                ? `Let's go! (${members.length + 1} people)`
                : "Let's go!"}
            </Text>
            <Text style={styles.createButtonEmoji}> 🚀</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Modals ──────────────────────────────────────── */}
      <RolePicker
        visible={showRolePicker}
        memberName={selectedMember?.name || ''}
        currentRole={selectedMember?.role || 'member'}
        onSelect={(role) => {
          if (selectedMemberId) updateRole(selectedMemberId, role);
        }}
        onClose={() => setShowRolePicker(false)}
      />

      <QRModal
        visible={showQR}
        inviteCode={inviteCode}
        tripName={tripName || ''}
        onClose={() => setShowQR(false)}
      />
    </View>
  );
}

// ─── QR Styles ─────────────────────────────────────────────────────────────
const qrStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  outerBorder: {
    padding: 4,
  },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 32, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleRowActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FDF6F0',
  },
  roleEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  roleLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  roleDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkMark: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelBtnText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  // QR modal
  qrSheet: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: Dimensions.get('window').width - 48,
    ...Shadows.cardHover,
  },
  qrTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: 4,
  },
  qrSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginBottom: 20,
  },
  qrCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  qrCodeLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  qrCodeValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.xl,
    color: Colors.accent,
    letterSpacing: 3,
  },
  qrHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  qrCloseBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 8,
  },
  qrCloseBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});

// ─── Main Styles ───────────────────────────────────────────────────────────
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
    width: 28,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: Colors.sage,
  },
  skipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 30,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.text,
    lineHeight: 44,
    marginBottom: Spacing.lg,
  },
  // ── Trip card ──────────────────────────
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  tripCardTop: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  tripCardDest: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tripCardName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginVertical: 2,
  },
  tripCardDates: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  memberCountBadge: {
    backgroundColor: '#EDF5EC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCountNum: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.sage,
  },
  memberCountLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.sage,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  linkBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  linkIcon: {
    fontSize: 14,
  },
  linkText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  copyBtn: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyBtnDone: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
  },
  copyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
  // ── Share grid ─────────────────────────
  sectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  shareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  shareBtn: {
    alignItems: 'center',
    gap: 6,
  },
  shareIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  shareIconText: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: '700',
  },
  shareName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  // ── Search / Add ───────────────────────
  searchContainer: {
    marginBottom: Spacing.xl,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingLeft: 14,
    ...Shadows.card,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: 14,
  },
  addBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 4,
  },
  addBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  searchResults: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  contactName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  contactUsername: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  contactAddIcon: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.sage,
  },
  // ── Members list ───────────────────────
  membersSection: {
    marginBottom: Spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    ...Shadows.card,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  memberName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
    marginTop: 4,
    gap: 4,
  },
  roleBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  roleChevron: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  removeBtn: {
    fontSize: 16,
    color: Colors.textMuted,
    padding: 4,
  },
  // ── Empty state ────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ── Footer ─────────────────────────────
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },
  createButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  createButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  createButtonEmoji: {
    fontSize: FontSizes.lg,
  },
});
