import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { addChatMessage, loadChatMessages, addActivityLog } from '../../src/services/tripService';
import { getDeviceId } from '../../src/services/deviceUser';
import type { ChatMessageLocal, ActivityLogEntry } from '../../src/services/storageCache';

const AVATAR_COLORS = ['#B07A50', '#5E8A5A', '#8B6DB5', '#C75450', '#4A8BA8', '#D4A574'];

function getColorForUser(name: string): string {
  let hash = 0;
  for (const ch of name) hash += ch.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
  } catch {
    return '';
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string; tripName?: string }>();
  const tripId = params.tripId || '';
  const tripName = params.tripName || 'Trip';

  const [messages, setMessages] = useState<ChatMessageLocal[]>([]);
  const [text, setText] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadMessages = useCallback(async () => {
    if (!tripId) return;
    const msgs = await loadChatMessages(tripId);
    setMessages(msgs);
  }, [tripId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useFocusEffect(useCallback(() => { loadMessages(); }, [loadMessages]));

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !tripId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg: ChatMessageLocal = {
      id: Crypto.randomUUID(),
      userId: deviceId,
      userName: 'You',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);
    setText('');
    await addChatMessage(tripId, msg);

    // Log activity
    addActivityLog(tripId, {
      id: Crypto.randomUUID(),
      userId: deviceId,
      userName: 'You',
      actionType: 'trip_updated',
      details: `sent a message in group chat`,
      emoji: '💬',
      createdAt: new Date().toISOString(),
    });

    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Group Chat</Text>
          <Text style={styles.headerSubtitle}>{tripName}</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Messages */}
      <Animated.View style={[styles.messagesArea, { opacity: fadeIn }]}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySubtext}>
                Chat with your squad about the trip!
              </Text>
            </View>
          )}

          {messages.map((msg, idx) => {
            const isMe = msg.userId === deviceId || msg.userName === 'You';
            const showAvatar = idx === 0 || messages[idx - 1].userId !== msg.userId;

            return (
              <View key={msg.id} style={[styles.messageRow, isMe && styles.messageRowMe]}>
                {!isMe && showAvatar && (
                  <View style={[styles.avatar, { backgroundColor: getColorForUser(msg.userName) }]}>
                    <Text style={styles.avatarText}>{msg.userName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                {!isMe && !showAvatar && <View style={{ width: 36 }} />}

                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  {!isMe && showAvatar && (
                    <Text style={styles.senderName}>{msg.userName}</Text>
                  )}
                  <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.timestamp, isMe && styles.timestampMe]}>
                    {formatTime(msg.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 10 }} />
        </ScrollView>
      </Animated.View>

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <Pressable
          onPress={handleSend}
          style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color={Colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.lg, color: Colors.text },
  headerSubtitle: { fontFamily: Fonts.body, fontSize: FontSizes.xs, color: Colors.textMuted },
  messagesArea: { flex: 1 },
  messagesContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: 8,
  },
  messageRowMe: { justifyContent: 'flex-end' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.white },
  bubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: Colors.sage,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadows.card,
  },
  senderName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    marginBottom: 2,
  },
  messageText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  messageTextMe: { color: Colors.white },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampMe: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
