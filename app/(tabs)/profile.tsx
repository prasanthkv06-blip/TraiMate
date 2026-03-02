import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';
import { useAuth } from '../../src/contexts/AuthContext';
import { fetchTrips } from '../../src/services/tripService';
import {
  loadDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  DOCUMENT_TYPE_CONFIG,
  type TravelDocument,
  type DocumentType,
} from '../../src/services/storageCache';

const USER_NAME_KEY = '@traimate_user_name';
const ONBOARDING_KEY = '@traimate_onboarded';
const AVATAR_EMOJI_KEY = '@traimate_avatar_emoji';

const AVATAR_EMOJIS = [
  '✈️', '🌍', '🏔️', '🌊', '🏖️', '🗺️', '🧳', '🚀',
  '🌴', '🏕️', '⛩️', '🗼', '🎒', '🧭', '⛵', '🚂',
  '🌸', '🦋', '🌙', '⭐', '🔥', '🌈', '💎', '🎯',
  '🐻', '🦊', '🐢', '🦜', '🐬', '🦁', '🐼', '🦄',
];

const DOC_TYPES: DocumentType[] = ['passport', 'visa', 'national_id', 'insurance', 'emergency_contact'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user, isGuest, signOut, deleteAccount } = useAuth();
  const [userName, setUserName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [realTripCount, setRealTripCount] = useState(0);

  // Document state
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TravelDocument | null>(null);
  const [docType, setDocType] = useState<DocumentType>('passport');
  const [docLabel, setDocLabel] = useState('');
  const [docFields, setDocFields] = useState<Record<string, string>>({});

  const loadStats = useCallback(async () => {
    try {
      const entries = await fetchTrips();
      setRealTripCount(entries.length);
    } catch {}
  }, []);

  const loadDocs = useCallback(async () => {
    const docs = await loadDocuments();
    setDocuments(docs);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((name) => {
      if (name) setUserName(name);
    });
    AsyncStorage.getItem(AVATAR_EMOJI_KEY).then((emoji) => {
      if (emoji) setAvatarEmoji(emoji);
    });
    loadStats();
    loadDocs();
  }, [loadStats, loadDocs]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadDocs();
    }, [loadStats, loadDocs])
  );

  const handleOpenPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmoji(avatarEmoji);
    setShowEmojiPicker(true);
  };

  const handleSaveEmoji = async () => {
    if (selectedEmoji) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem(AVATAR_EMOJI_KEY, selectedEmoji);
      setAvatarEmoji(selectedEmoji);
    }
    setShowEmojiPicker(false);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          await signOut();
          router.replace('/onboarding/welcome');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            router.replace('/onboarding/welcome');
          },
        },
      ],
    );
  };

  const handleCreateAccount = () => {
    router.push('/auth');
  };

  // Document handlers
  const openAddDoc = (type: DocumentType) => {
    setEditingDoc(null);
    setDocType(type);
    setDocLabel(DOCUMENT_TYPE_CONFIG[type].label);
    setDocFields({});
    setShowDocModal(true);
  };

  const openEditDoc = (doc: TravelDocument) => {
    setEditingDoc(doc);
    setDocType(doc.type);
    setDocLabel(doc.label);
    setDocFields({ ...doc.fields });
    setShowDocModal(true);
  };

  const handleSaveDoc = async () => {
    const now = new Date().toISOString();
    if (editingDoc) {
      await updateDocument(editingDoc.id, { label: docLabel || DOCUMENT_TYPE_CONFIG[docType].label, fields: docFields });
    } else {
      await addDocument({
        id: Crypto.randomUUID(),
        type: docType,
        label: docLabel || DOCUMENT_TYPE_CONFIG[docType].label,
        fields: docFields,
        createdAt: now,
        updatedAt: now,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDocModal(false);
    await loadDocs();
  };

  const handleDeleteDoc = (doc: TravelDocument) => {
    Alert.alert('Delete Document', `Remove "${doc.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDocument(doc.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadDocs();
        },
      },
    ]);
  };

  const currentSchema = DOCUMENT_TYPE_CONFIG[docType];

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Pressable onPress={handleOpenPicker} style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {avatarEmoji ? (
                <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
              ) : (
                <Text style={styles.avatarText}>
                  {(userName || 'T').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="create-outline" size={12} color={Colors.white} />
            </View>
          </Pressable>
          <Text style={styles.name}>{userName || 'Traveler'}</Text>
          <Text style={styles.memberSince}>Member since {new Date().getFullYear()}</Text>
        </View>

        {/* Emoji avatar picker modal */}
        <Modal
          visible={showEmojiPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowEmojiPicker(false)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Pick your vibe</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.emojiGrid}>
                  {AVATAR_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedEmoji(emoji);
                      }}
                      style={[
                        styles.emojiCell,
                        selectedEmoji === emoji && styles.emojiCellSelected,
                      ]}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Pressable onPress={handleSaveEmoji} style={styles.saveButton}>
                <LinearGradient
                  colors={['#5E8A5A', '#3D6B39']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </LinearGradient>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <View style={styles.statsRow}>
          {[
            { value: String(realTripCount + SAMPLE_TRIPS.length), label: 'Trips', icon: 'compass-outline' },
            { value: String(new Set(SAMPLE_TRIPS.map(t => t.destination.split(',').pop()?.trim())).size), label: 'Countries', icon: 'globe-outline' },
            { value: String(SAMPLE_TRIPS.reduce((sum, t) => sum + (t.memberCount - 1), 0)), label: 'Friends', icon: 'people-outline' },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Ionicons name={stat.icon as any} size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Travel Documents ────────────────────────────── */}
        <View style={styles.docsSection}>
          <View style={styles.docsSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="document-text-outline" size={20} color={Colors.sage} />
              <Text style={styles.docsSectionTitle}>Travel Documents</Text>
            </View>
          </View>

          {documents.length > 0 && documents.map((doc) => {
            const cfg = DOCUMENT_TYPE_CONFIG[doc.type];
            return (
              <Pressable key={doc.id} onPress={() => openEditDoc(doc)} style={styles.docCard}>
                <View style={styles.docCardLeft}>
                  <Text style={styles.docCardEmoji}>{cfg.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docCardLabel}>{doc.label}</Text>
                    <Text style={styles.docCardType}>{cfg.label}</Text>
                  </View>
                </View>
                <Pressable onPress={() => handleDeleteDoc(doc)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </Pressable>
              </Pressable>
            );
          })}

          {/* Add document buttons */}
          <View style={styles.addDocGrid}>
            {DOC_TYPES.map((type) => {
              const cfg = DOCUMENT_TYPE_CONFIG[type];
              return (
                <Pressable key={type} onPress={() => openAddDoc(type)} style={styles.addDocBtn}>
                  <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
                  <Text style={styles.addDocBtnLabel}>{cfg.label}</Text>
                  <Ionicons name="add-circle-outline" size={16} color={Colors.sage} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Document add/edit modal */}
        <Modal visible={showDocModal} transparent animationType="slide" onRequestClose={() => setShowDocModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDocModal(false)}>
            <Pressable style={[styles.docModalContent, { paddingBottom: insets.bottom + Spacing.lg }]} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {editingDoc ? 'Edit' : 'Add'} {currentSchema.emoji} {currentSchema.label}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput
                  style={styles.docInput}
                  value={docLabel}
                  onChangeText={setDocLabel}
                  placeholder="Label (optional)"
                  placeholderTextColor={Colors.textMuted}
                />
                {currentSchema.fields.map((field) => (
                  <TextInput
                    key={field.key}
                    style={styles.docInput}
                    value={docFields[field.key] || ''}
                    onChangeText={(val) => setDocFields(prev => ({ ...prev, [field.key]: val }))}
                    placeholder={field.label}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={field.secure}
                    autoCapitalize={field.secure ? 'none' : 'words'}
                  />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                <Pressable onPress={() => setShowDocModal(false)} style={styles.docCancelBtn}>
                  <Text style={styles.docCancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSaveDoc} style={styles.docSaveBtn}>
                  <LinearGradient colors={['#5E8A5A', '#3D6B39']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.docSaveBtnGradient}>
                    <Text style={styles.docSaveBtnText}>Save</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Auth Status */}
        <View style={styles.authSection}>
          {session ? (
            <>
              <View style={styles.authStatusCard}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.sage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authStatusLabel}>Signed in</Text>
                  <Text style={styles.authStatusEmail}>{user?.email}</Text>
                </View>
                {user?.user_metadata?.avatar_url && (
                  <View style={styles.providerBadge}>
                    <Text style={styles.providerBadgeText}>
                      {(user.app_metadata?.provider || 'email').charAt(0).toUpperCase() +
                        (user.app_metadata?.provider || 'email').slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                style={styles.resetButton}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSignOut(); }}
              >
                <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.resetText}>Sign Out</Text>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDeleteAccount(); }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={styles.deleteText}>Delete Account</Text>
              </Pressable>
            </>
          ) : isGuest ? (
            <>
              <View style={styles.authStatusCard}>
                <Ionicons name="person-outline" size={18} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authStatusLabel}>Guest mode</Text>
                  <Text style={styles.authStatusEmail}>Create an account to sync your data</Text>
                </View>
              </View>

              <Pressable
                style={styles.createAccountButton}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleCreateAccount(); }}
              >
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createAccountGradient}
                >
                  <Ionicons name="person-add-outline" size={18} color={Colors.white} />
                  <Text style={styles.createAccountText}>Create Account</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.createAccountButton}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleCreateAccount(); }}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createAccountGradient}
              >
                <Ionicons name="log-in-outline" size={18} color={Colors.white} />
                <Text style={styles.createAccountText}>Sign In</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    alignItems: 'center',
    ...BorderRadius.card,
    ...Shadows.card,
    marginBottom: Spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  avatarText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.white,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  memberSince: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
    marginBottom: Spacing.xl,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  authSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  authStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  authStatusLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  authStatusEmail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  providerBadge: {
    backgroundColor: `${Colors.sage}20`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  providerBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  resetButton: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  resetText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
    gap: Spacing.sm,
  },
  deleteText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.error,
  },
  createAccountButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  createAccountGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  createAccountText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  // Emoji picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 32, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emojiCell: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  emojiCellSelected: {
    backgroundColor: `${Colors.accent}20`,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  emojiText: {
    fontSize: 28,
  },
  saveButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  // Travel Documents
  docsSection: {
    marginBottom: Spacing.xl,
  },
  docsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  docsSectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  docCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  docCardEmoji: {
    fontSize: 24,
  },
  docCardLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  docCardType: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addDocGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addDocBtnLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.text,
  },
  // Doc modal
  docModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    maxHeight: '80%',
  },
  docInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  docCancelBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  docCancelText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  docSaveBtn: {
    flex: 1,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  docSaveBtnGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
  },
  docSaveBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
