import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

import { AI_GUIDE_DB, AI_SUGGESTIONS_DB } from '../constants/aiData';
import { chatWithGuide, chatWithGuideContextual, type ChatMessage, type LiveContext } from '../lib/gemini';

const DEFAULT_SUGGESTIONS = [
  '🍜 Best local restaurants nearby',
  '🚇 How to get around',
  '🏛️ Hidden gems to visit',
  '💬 Useful local phrases',
  '🚨 Emergency numbers',
  '💰 Budget tips',
];

function getContextualSuggestions(context?: LiveContext): string[] {
  if (!context?.weather) return DEFAULT_SUGGESTIONS;

  const suggestions: string[] = ['🤔 What should I do right now?'];

  // Weather-aware suggestions
  const { temp, condition, alert } = context.weather;
  if (alert?.toLowerCase().includes('rain') || condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
    suggestions.push('🌧️ Indoor activities nearby?');
  }
  if (temp && temp >= 33) {
    suggestions.push('❄️ Where to cool down?');
  }
  if (temp && temp <= 10) {
    suggestions.push('☕ Cozy warm spots nearby?');
  }
  if (context.sunset) {
    suggestions.push('🌅 Best sunset viewpoint?');
  }
  if (context.aqi && (context.aqi.label === 'Poor' || context.aqi.label === 'Very Poor')) {
    suggestions.push('😷 Air quality is bad — safe activities?');
  }

  // Always include these
  suggestions.push('🍜 Best local food nearby');
  suggestions.push('💰 Budget tips for today');

  return suggestions.slice(0, 6);
}

function getDestKey(destination: string): string {
  const d = destination.toLowerCase();
  if (d.includes('bali') || d.includes('ubud')) return 'bali';
  if (d.includes('paris')) return 'paris';
  if (d.includes('tokyo') || d.includes('kyoto') || d.includes('japan')) return 'tokyo';
  if (d.includes('dubai')) return 'dubai';
  if (d.includes('goa')) return 'goa';
  if (d.includes('bangkok') || d.includes('thai')) return 'bangkok';
  return 'bali'; // default
}

function getAIResponse(input: string, destination?: string): string {
  const lower = input.toLowerCase();
  const destKey = getDestKey(destination || 'bali');
  const guide = AI_GUIDE_DB[destKey];
  const suggestions = AI_SUGGESTIONS_DB[destKey] || [];

  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat') || lower.includes('near me')) {
    const foodSpots = suggestions.filter(s => s.stype === 'food').slice(0, 3);
    if (foodSpots.length > 0) {
      const list = foodSpots.map(s => `${s.stype === 'food' ? '🍽️' : '🎯'} **${s.tl}** (${s.l}) — ${s.desc}\n   💡 ${s.ai}`).join('\n\n');
      return `Great picks near you:\n\n${list}\n\nWant me to add any to your itinerary?`;
    }
    return "I'd recommend asking locals for their favorite spots — that's always the best bet! Street food stalls with long queues from locals are usually amazing.";
  }

  if (lower.includes('metro') || lower.includes('transport') || lower.includes('get around') || lower.includes('taxi') || lower.includes('bus')) {
    if (guide) {
      const tip = guide.dailyTips.find(t => t.toLowerCase().includes('transport') || t.toLowerCase().includes('metro') || t.toLowerCase().includes('taxi') || t.toLowerCase().includes('grab'));
      return tip || `Getting around ${destination || 'your destination'}:\n\n🚕 Ride-hailing apps are usually the easiest option\n🚌 Public transport is cheap and efficient\n🛵 Scooter rentals offer flexibility\n\nAlways negotiate taxi fares before getting in!`;
    }
    return "For transport, I'd recommend using ride-hailing apps, public transit, or asking your hotel for the best local options!";
  }

  if (lower.includes('hidden') || lower.includes('gem') || lower.includes('secret') || lower.includes('offbeat')) {
    if (guide?.hiddenSpots.length) {
      const list = guide.hiddenSpots.map((s, i) => `${i + 1}. 📍 **${s.name}** (${s.area}) — ${s.desc}\n   ⭐ ${s.rating}/5 · ${s.price}`).join('\n\n');
      return `Hidden gems most tourists miss:\n\n${list}\n\nShall I add any of these to your itinerary?`;
    }
    return "Ask your hotel staff or local guides for off-the-beaten-path recommendations — they know the best spots!";
  }

  if (lower.includes('phrase') || lower.includes('language') || lower.includes('say') || lower.includes('hello') || lower.includes('thank')) {
    if (guide?.phrases) {
      const p = guide.phrases;
      return `Essential phrases:\n\n👋 Hello: **${p.hello}**\n🙏 Thank you: **${p.thanks}**\n🆘 Help: **${p.help}**\n💰 How much: **${p.howMuch}**\n\nLocals really appreciate when tourists try the local language!`;
    }
    return "Learning basic greetings in the local language goes a long way — locals always appreciate the effort!";
  }

  if (lower.includes('emergency') || lower.includes('police') || lower.includes('hospital') || lower.includes('ambulance')) {
    if (guide?.emergencyNumbers) {
      const n = guide.emergencyNumbers;
      return `Emergency contacts:\n\n🚨 Police: **${n.police}**\n🚑 Ambulance: **${n.ambulance}**\n🔥 Fire: **${n.fire}**\n📱 Tourist helpline: **${n.tourist}**\n\nSave your hotel address & phone in your notes!`;
    }
    return "Keep your hotel's address and phone number saved. In most countries, 112 is the universal emergency number.";
  }

  if (lower.includes('budget') || lower.includes('cheap') || lower.includes('save') || lower.includes('cost') || lower.includes('money')) {
    if (guide?.dailyTips) {
      const tip = guide.dailyTips.find(t => t.toLowerCase().includes('cash') || t.toLowerCase().includes('money') || t.toLowerCase().includes('price'));
      return tip || `Budget tips:\n\n🍜 Eat where locals eat — half price, double the flavor\n🚌 Use public transport over taxis\n🌅 Free activities: beaches, parks, temple visits, walking tours\n🛍️ Always negotiate at markets\n\nSplitting costs with your group saves a lot!`;
    }
    return "Eat where locals eat, use public transport, and visit free attractions in the mornings for the best budget experience!";
  }

  if (lower.includes('safe') || lower.includes('danger') || lower.includes('night') || lower.includes('scam')) {
    if (guide?.alerts.length) {
      const warnings = guide.alerts.map(a => `${a.emoji} ${a.text}`).join('\n');
      return `Safety tips:\n\n${warnings}\n\nStay in well-lit areas after dark and keep valuables secure.`;
    }
    return "Standard travel safety: keep valuables secure, stay in well-lit areas at night, and use licensed transport. Your hotel can advise on specific areas.";
  }

  // Default response
  const dest = destination || 'your destination';
  return `I'm your AI Local Guide for ${dest}! I can help with:\n\n📍 Hidden gems & local spots\n🍽️ Restaurant recommendations\n🚇 Transport & getting around\n💬 Local phrases & customs\n🚨 Emergency numbers\n💰 Budget tips & deals\n\nAsk me anything specific!`;
}

interface AIGuideProps {
  destination?: string;
  liveContext?: LiveContext;
}

export default function AIGuide({ destination, liveContext }: AIGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: "Hey! I'm your AI Local Guide 🧭\n\nI can help with recommendations, translations, navigation tips, and local insights. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const fabScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for FAB
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(true);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(false);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = liveContext
        ? await chatWithGuideContextual(messageText, destination || 'your destination', chatHistory, liveContext)
        : await chatWithGuide(messageText, destination || 'your destination', chatHistory);
      setChatHistory(prev => [
        ...prev,
        { role: 'user', text: messageText },
        { role: 'model', text: response },
      ]);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Gemini failed — fall back to keyword matching
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(messageText, destination),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Pressable
          onPress={handleOpen}
          style={styles.fabContainer}
        >
          <Animated.View style={[styles.fabPulse, { transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={styles.fabGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color={Colors.white} />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      )}

      {/* Chat Modal */}
      <Modal visible={isOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleClose} />
          <View style={styles.chatContainer}>
            {/* Chat header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatAvatar}>
                  <Ionicons name="sparkles" size={22} color={Colors.white} />
                </View>
                <View>
                  <Text style={styles.chatName}>AI Local Guide</Text>
                  <View style={styles.onlineRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={handleClose} hitSlop={20}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.isUser ? styles.userText : styles.aiText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}

              {isTyping && (
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              )}

              {/* Quick suggestions */}
              {messages.length <= 1 && (
                <View style={styles.suggestions}>
                  {getContextualSuggestions(liveContext).map((s, i) => (
                    <Pressable
                      key={i}
                      onPress={() => handleSend(s)}
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                value={input}
                onChangeText={setInput}
                placeholder="Ask me anything..."
                placeholderTextColor={Colors.textMuted}
                returnKeyType="send"
                onSubmitEditing={() => handleSend()}
              />
              <Pressable
                onPress={() => handleSend()}
                style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={18} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 100,
  },
  fabPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    opacity: 0.2,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.cardHover,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,37,32,0.3)',
  },
  chatContainer: {
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.sage,
  },
  onlineText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.sage,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadows.card,
  },
  messageText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  aiText: {
    color: Colors.text,
  },
  typingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendIcon: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: '700',
  },
});
