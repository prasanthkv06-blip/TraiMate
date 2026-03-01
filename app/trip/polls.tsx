import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { savePolls, loadPolls, addActivityLog } from '../../src/services/tripService';
import type { PollLocal, ActivityLogEntry } from '../../src/services/storageCache';

type Poll = PollLocal;

export default function PollsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; destination?: string }>();
  const tripId = params.tripId || '';
  const [polls, setPolls] = useState<Poll[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);

  const contentOpacity = useRef(new Animated.Value(0)).current;

  const loadPollData = useCallback(async () => {
    if (!tripId) return;
    const saved = await loadPolls(tripId);
    if (saved.length > 0) setPolls(saved);
  }, [tripId]);

  useEffect(() => {
    loadPollData();
    Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [loadPollData]);

  useFocusEffect(useCallback(() => { loadPollData(); }, [loadPollData]));

  // Persist polls whenever they change
  const persistPolls = useCallback((updated: Poll[]) => {
    setPolls(updated);
    if (tripId) savePolls(tripId, updated);
  }, [tripId]);

  const handleVote = (pollId: string, optionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMyVotes((prev) => ({ ...prev, [pollId]: optionId }));
    const updated = polls.map((poll) => {
      if (poll.id !== pollId) return poll;
      return {
        ...poll,
        options: poll.options.map((opt) => ({
          ...opt,
          votes: opt.id === optionId
            ? [...opt.votes.filter((v) => v !== 'You'), 'You']
            : opt.votes.filter((v) => v !== 'You'),
        })),
      };
    });
    persistPolls(updated);

    // Log activity
    if (tripId) {
      const poll = polls.find(p => p.id === pollId);
      const option = poll?.options.find(o => o.id === optionId);
      addActivityLog(tripId, {
        id: Crypto.randomUUID(),
        userId: 'you',
        userName: 'You',
        actionType: 'poll_voted',
        details: `Voted "${option?.text}" on "${poll?.question}"`,
        emoji: '🗳️',
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleCreatePoll = () => {
    if (!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newPoll: Poll = {
      id: Crypto.randomUUID(),
      question: newQuestion.trim(),
      emoji: '📊',
      createdBy: 'You',
      isActive: true,
      createdAt: new Date().toISOString(),
      options: newOptions
        .filter(o => o.trim())
        .map((text, i) => ({ id: `opt-${i}`, text: text.trim(), votes: [] })),
    };
    persistPolls([newPoll, ...polls]);
    setNewQuestion('');
    setNewOptions(['', '']);
    setShowCreatePoll(false);

    // Log activity
    if (tripId) {
      addActivityLog(tripId, {
        id: Crypto.randomUUID(),
        userId: 'you',
        userName: 'You',
        actionType: 'poll_created',
        details: `Created poll "${newQuestion.trim()}"`,
        emoji: '📊',
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Polls</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreatePoll(true); }}><Ionicons name="add" size={24} color={Colors.accent} /></Pressable>
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {polls.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No polls yet</Text>
              <Text style={styles.emptySubtext}>Create a poll to get your squad's opinion</Text>
              <Pressable
                onPress={() => setShowCreatePoll(true)}
                style={({ pressed }) => [styles.createPollBtn, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.createPollBtnText}>+ Create first poll</Text>
              </Pressable>
            </View>
          )}
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
            const myVote = myVotes[poll.id];

            return (
              <View key={poll.id} style={styles.pollCard}>
                <View style={styles.pollHeader}>
                  <Text style={styles.pollEmoji}>{poll.emoji}</Text>
                  <View style={styles.pollHeaderText}>
                    <Text style={styles.pollQuestion}>{poll.question}</Text>
                    <Text style={styles.pollMeta}>by {poll.createdBy} · {totalVotes} votes</Text>
                  </View>
                  {poll.isActive && <View style={styles.liveBadge}><Text style={styles.liveText}>Live</Text></View>}
                </View>

                {poll.options.map((option) => {
                  const pct = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                  const isVoted = myVote === option.id;
                  const isWinning = option.votes.length === Math.max(...poll.options.map((o) => o.votes.length)) && option.votes.length > 0;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => poll.isActive && handleVote(poll.id, option.id)}
                      style={[styles.optionRow, isVoted && styles.optionVoted]}
                    >
                      <View style={[styles.optionBar, { width: `${pct}%` }, isWinning && styles.optionBarWinning]} />
                      <View style={styles.optionContent}>
                        <Text style={[styles.optionText, isVoted && styles.optionTextVoted]}>
                          {option.text}
                        </Text>
                        <View style={styles.optionRight}>
                          <Text style={styles.optionPct}>{Math.round(pct)}%</Text>
                          {option.votes.length > 0 && (
                            <View style={styles.voterDots}>
                              {option.votes.slice(0, 3).map((v, i) => (
                                <View key={i} style={[styles.voterDot, { marginLeft: i > 0 ? -6 : 0 }]}>
                                  <Text style={styles.voterDotText}>{v.charAt(0)}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Create Poll Modal */}
      <Modal visible={showCreatePoll} transparent animationType="slide" onRequestClose={() => setShowCreatePoll(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowCreatePoll(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Create Poll</Text>
            <Text style={styles.sheetSubtitle}>Ask your squad anything</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>QUESTION</Text>
              <TextInput
                style={styles.formInput}
                value={newQuestion}
                onChangeText={setNewQuestion}
                placeholder="e.g., Where should we eat tonight?"
                placeholderTextColor={Colors.textMuted}
                maxLength={120}
              />

              <Text style={styles.formLabel}>OPTIONS</Text>
              {newOptions.map((opt, i) => (
                <View key={i} style={styles.optionInputRow}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={opt}
                    onChangeText={(text) => {
                      const updated = [...newOptions];
                      updated[i] = text;
                      setNewOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={Colors.textMuted}
                    maxLength={60}
                  />
                  {i >= 2 && (
                    <Pressable
                      onPress={() => setNewOptions(prev => prev.filter((_, idx) => idx !== i))}
                      style={styles.removeOptionBtn}
                    >
                      <Text style={styles.removeOptionText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              {newOptions.length < 4 && (
                <Pressable
                  onPress={() => setNewOptions(prev => [...prev, ''])}
                  style={styles.addOptionBtn}
                >
                  <Text style={styles.addOptionText}>+ Add option</Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleCreatePoll}
                disabled={!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2}
                style={({ pressed }) => [
                  styles.createBtn,
                  (!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2) && styles.createBtnDisabled,
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.createBtnText}>Create Poll</Text>
              </Pressable>

              <Pressable onPress={() => setShowCreatePoll(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <View style={{ height: 30 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
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
  pollCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card },
  pollHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  pollEmoji: { fontSize: 28, marginRight: 12 },
  pollHeaderText: { flex: 1 },
  pollQuestion: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text },
  pollMeta: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  liveBadge: { backgroundColor: Colors.sage, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  liveText: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.white },
  optionRow: { position: 'relative', borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: 8, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: 'transparent' },
  optionVoted: { borderColor: Colors.accent },
  optionBar: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: 'rgba(176,122,80,0.1)', borderRadius: BorderRadius.md },
  optionBarWinning: { backgroundColor: 'rgba(94,138,90,0.15)' },
  optionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, zIndex: 1 },
  optionText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.sm, color: Colors.text, flex: 1 },
  optionTextVoted: { fontFamily: Fonts.bodySemiBold, color: Colors.accent },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionPct: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.textSecondary },
  voterDots: { flexDirection: 'row' },
  voterDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  voterDotText: { fontFamily: Fonts.bodySemiBold, fontSize: 9, color: Colors.white },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text, marginBottom: 8 },
  emptySubtext: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: 'center' as const, marginBottom: 24 },
  createPollBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.xl, paddingHorizontal: 24, paddingVertical: 14 },
  createPollBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(44,37,32,0.45)', justifyContent: 'flex-end' as const },
  sheetContainer: { backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 24, maxHeight: '80%' as const },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center' as const, marginBottom: 16 },
  sheetTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text, marginBottom: 4 },
  sheetSubtitle: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 18 },
  formLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.xs, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  formInput: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 14, fontFamily: Fonts.body, fontSize: FontSizes.md, color: Colors.text },
  optionInputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  removeOptionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border, alignItems: 'center' as const, justifyContent: 'center' as const },
  removeOptionText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' as const },
  addOptionBtn: { paddingVertical: 12, alignItems: 'center' as const },
  addOptionText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.accent },
  createBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.xl, paddingVertical: 16, alignItems: 'center' as const, marginTop: 24 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.md, color: Colors.white },
  cancelBtn: { alignItems: 'center' as const, paddingVertical: 14, marginBottom: 8 },
  cancelBtnText: { fontFamily: Fonts.bodyMedium, fontSize: FontSizes.md, color: Colors.textMuted },
});
