import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { getMessages, appendMessage, ChatMessage, getConnections, getUserToken } from '../lib/localStore';
import { loadProfile } from '../lib/localStore';
import { api } from '../lib/api';

// Base URL is managed by api.ts with robust fallbacks

export default function ChatThread({ route }: any) {
  const { userId, name } = route.params as { userId: string; name?: string };
  const t = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const sendingRef = useRef(false);
  const [personality, setPersonality] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => { (async () => {
    setMessages(await getMessages(userId));
    const conns = await getConnections();
    const conn = conns.find((c) => c.id === userId);
    const prof = await loadProfile();
    const tags = conn?.tags || (prof?.personalitySummary ? prof.personalitySummary.split(/[,\s]+/).filter(Boolean).slice(0,6) : []);
    setPersonality(Array.isArray(tags) ? tags.join(', ') : undefined);
  })(); }, [userId]);

  // Load messages from Supabase if available (best-effort)
  useEffect(() => { (async () => {
    const uid = await getUserToken();
    if (!uid) return;
    try {
      const res = await api.post('/api/conversations/list', { userId: uid, conversationId: userId });
      const serverMsgs = (res?.data?.messages || []) as any[];
      if (serverMsgs.length) {
        const mapped: ChatMessage[] = serverMsgs.map((m: any) => ({ id: `${m.id}`, role: m.role === 'user' ? 'user' : 'assistant', text: m.content, ts: Date.parse(m.created_at) || Date.now() }));
        setMessages(mapped);
      }
    } catch {}
  })(); }, [userId]);

  const send = async () => {
    const text = input.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true; setInput(''); setLoading(true);
    const userMsg: ChatMessage = { id: `m-${Date.now()}`, role: 'user', text, ts: Date.now() };
    const next = await appendMessage(userId, userMsg); setMessages(next);
    try {
      const USE_MOCK_AI = process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true';
      let replyText = '';
      if (USE_MOCK_AI) {
        // Prefer server mock; fallback to local library if network fails
        try {
          await sleep(2800 + Math.floor(Math.random() * 500));
          const resp = await api.post('/api/mockReply', { context: text });
          replyText = String(resp?.data?.reply || '').trim();
        } catch {
          await sleep(2800 + Math.floor(Math.random() * 500));
          const localLib = {
            greetings: [
              'Hey there 👋 I’m Aura — excited to meet you!',
              'Hi! How are you feeling today?',
              'Hey, you sound great already — ready to dive in?'
            ],
            smalltalk: [
              'That’s really interesting! Tell me more.',
              'I get that — I’d probably feel the same way.',
              'Wow, that’s a unique perspective.',
              'Haha, you’ve got a good sense of humor.'
            ],
            reflective: [
              'Hmm, that makes sense. Why do you think that is?',
              'It sounds like you’ve really thought about this.',
              'That’s quite thoughtful — do you often feel that way?',
              'Interesting... do you think that’s changed over time?'
            ],
            positive_feedback: [
              'I love that energy!',
              'You’re doing amazing — keep going!',
              'That’s a beautiful way to see things.'
            ],
            farewell: [
              'It’s been awesome chatting — let’s pick this up again soon.',
              'Thanks for sharing — I feel like I know you a bit better now!',
              'You’ve got great vibes — see you next time ✨'
            ]
          } as Record<string, string[]>;
          const c = (text.toLowerCase().match(/hello|hi | hey|yo|sup/) ? 'greetings'
            : text.toLowerCase().match(/bye|see you|goodnight|later|take care/) ? 'farewell'
            : text.toLowerCase().match(/love|great|awesome|nice|good|thanks|thank you|cool|amazing/) ? 'positive_feedback'
            : text.toLowerCase().match(/why|think|feel|because|hmm|reflect|wonder/) ? 'reflective'
            : 'smalltalk');
          const pool = localLib[c] || localLib.smalltalk;
          replyText = pool[Math.floor(Math.random() * pool.length)];
          if (Math.random() < 0.1) replyText += [' 💫', ' 😊', ' ✨', ' — I’m listening'][Math.floor(Math.random() * 4)];
        }
      } else {
        const history = next.slice(-10).map((m) => ({ role: m.role, content: m.text }));
        const resp = await api.post('/api/auraChat', { messages: history, personality });
        const data = resp?.data || { text: '' };
        replyText = String(data?.text || '').trim();
      }
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', text: replyText || '...', ts: Date.now() };
      const next2 = await appendMessage(userId, aiMsg); setMessages(next2);
      // Persist messages to Supabase (best-effort)
      try {
        const uid2 = await getUserToken();
        if (uid2) {
          await api.post('/api/conversations/add', { userId: uid2, conversationId: userId, role: 'user', content: text });
          await api.post('/api/conversations/add', { userId: uid2, conversationId: userId, role: 'assistant', content: replyText || '...' });
        }
      } catch {}
    } catch (e: any) {
      // Fallback: generate a local mock reply instead of showing a network error
      await sleep(2800 + Math.floor(Math.random() * 500));
      const lc = text.toLowerCase();
      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
      const lib: Record<string, string[]> = {
        greetings: [
          'Hey there 👋 I’m Aura — excited to meet you!',
          'Hi! How are you feeling today?',
          'Hey, you sound great already — ready to dive in?'
        ],
        smalltalk: [
          'That’s really interesting! Tell me more.',
          'I get that — I’d probably feel the same way.',
          'Wow, that’s a unique perspective.',
          'Haha, you’ve got a good sense of humor.'
        ],
        reflective: [
          'Hmm, that makes sense. Why do you think that is?',
          'It sounds like you’ve really thought about this.',
          'That’s quite thoughtful — do you often feel that way?',
          'Interesting... do you think that’s changed over time?'
        ],
        positive_feedback: [
          'I love that energy!',
          'You’re doing amazing — keep going!',
          'That’s a beautiful way to see things.'
        ],
        farewell: [
          'It’s been awesome chatting — let’s pick this up again soon.',
          'Thanks for sharing — I feel like I know you a bit better now!',
          'You’ve got great vibes — see you next time ✨'
        ]
      };
      const cat = lc.match(/hello|hi | hey|yo|sup/) ? 'greetings'
        : lc.match(/bye|see you|goodnight|later|take care/) ? 'farewell'
        : lc.match(/love|great|awesome|nice|good|thanks|thank you|cool|amazing/) ? 'positive_feedback'
        : lc.match(/why|think|feel|because|hmm|reflect|wonder/) ? 'reflective'
        : 'smalltalk';
      let fallback = pick(lib[cat] || lib.smalltalk);
      if (Math.random() < 0.1) fallback += [' 💫', ' 😊', ' ✨', ' — I’m listening'][Math.floor(Math.random() * 4)];
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', text: fallback, ts: Date.now() };
      const next3 = await appendMessage(userId, aiMsg); setMessages(next3);
    } finally { sendingRef.current = false; setLoading(false); }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      <Text style={styles.bubbleText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: t.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[styles.header, { color: t.colors.textPrimary }]}>{name || userId}</Text>
      <FlatList data={messages} keyExtractor={(m) => m.id} renderItem={renderItem} contentContainerStyle={{ padding: 16, gap: 8 }} ListFooterComponent={loading ? (
        <View style={[styles.bubble, styles.aiBubble]}><Text style={styles.bubbleText}>...</Text></View>
      ) : null} />
      <View style={styles.inputRow}>
        <TextInput value={input} onChangeText={setInput} placeholder="Message" style={[styles.input, { color: t.colors.textPrimary }]} placeholderTextColor={t.colors.textMuted} />
        <TouchableOpacity style={[styles.sendBtn, loading ? { opacity: 0.6 } : null]} onPress={send} disabled={loading}><Text style={styles.sendText}>{loading ? '...' : 'Send'}</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
  bubble: { maxWidth: '70%', borderRadius: 16, padding: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#cfe' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#eef' },
  bubbleText: { fontSize: 16 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { flex: 1, backgroundColor: '#F6F7F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtn: { backgroundColor: '#000', borderRadius: 16, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
});
