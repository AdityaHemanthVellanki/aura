import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { ChatBubble } from '../components/ChatBubble';
import { MicRecordButton } from '../components/MicRecordButton';
import { ConsentModal } from '../components/ConsentModal';
import questionsJson from '../data/aura_personality_questions.json';
import { appendAnswer, loadAnswers, saveAudioFromUri, saveProfile, loadProfile, listAudioFiles, setConsent } from '../lib/localStore';
import { genUniqueUsername } from '../lib/username';
import { api } from '../lib/api';

type QA = { id: string; category: string; question: string; follow_ups?: string[] };
type Message = { id: string; role: 'aura' | 'user'; text: string };

export default function AuraOnboarding({ navigation }: any) {
  const t = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [consentVisible, setConsentVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nameCaptured, setNameCaptured] = useState(false);
  const [voiceOptIn, setVoiceOptIn] = useState(true); // optional toggle
  const typingRef = useRef<number | null>(null);

  const questions: QA[] = useMemo(() => questionsJson as any, []);

  useEffect(() => {
    (async () => {
      const existingProfile = await loadProfile();
      const existingAnswers = await loadAnswers();
      const baseAnsweredIds = new Set((existingAnswers || []).map((a: any) => a.questionId).filter((id: string) => id && !String(id).includes(':follow')));
      setCurrentIndex(baseAnsweredIds.size);
      if (!existingProfile || !existingProfile.name) {
        pushAuraTypingThen("Hi, I’m Aura. Let’s get to know you. What’s your name?");
        setNameCaptured(false);
      } else {
        setNameCaptured(true);
        // Resume at next question
        if (baseAnsweredIds.size < questions.length) {
          askQuestion(baseAnsweredIds.size);
        } else {
          // Completed previously
          pushAuraTypingThen('Looks like onboarding is complete. Ready to talk!');
        }
      }
    })();
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [questions.length]);

  const pushAuraTypingThen = (text: string) => {
    const id = `m-${Date.now()}`;
    setMessages((prev) => [...prev, { id: `${id}-typing`, role: 'aura', text: '…' }]);
    typingRef.current = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== `${id}-typing`).concat({ id, role: 'aura', text }));
    }, 600) as unknown as number;
  };

  const askQuestion = (index: number) => {
    const q = questions[index];
    if (!q) {
      finalizeProfile();
      return;
    }
    pushAuraTypingThen(q.question);
  };

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, role: 'user', text }]);
    if (!nameCaptured) {
      await handleName(text);
      return;
    }
    await saveAnswerText(text);
  };

  const handleName = async (name: string) => {
    try {
      const username = await genUniqueUsername(name);
      await saveProfile({ name, username, createdAt: Date.now() });
      setNameCaptured(true);
      askQuestion(0);
    } catch (e) {
      Alert.alert('Error', 'Failed to save name');
    }
  };

  const saveAnswerText = async (answerText: string, audioId?: string) => {
    const q = questions[currentIndex];
    if (!q) return finalizeProfile();
    const record = { questionId: q.id, category: q.category, question: q.question, answerText, audioId, timestamp: Date.now() };
    await appendAnswer(record);
    // Optional follow-up 30%
    if (q.follow_ups && Math.random() < 0.3) {
      const f = q.follow_ups[Math.floor(Math.random() * q.follow_ups.length)];
      pushAuraTypingThen(f);
      // Wait for the next user message to be saved as follow-up
      setCurrentIndex((i) => i); // no increment yet
    } else {
      setCurrentIndex((i) => i + 1);
      askQuestion(currentIndex + 1);
    }
  };

  const onRecorded = async (uri: string) => {
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, role: 'user', text: '(voice reply)' }]);
    try {
      const entry = await saveAudioFromUri(uri);
      await saveAnswerText('', entry.id);
    } catch (e) {
      Alert.alert('Recording error', 'Could not save audio');
    }
  };

  const skipQuestion = async () => {
    const q = questions[currentIndex];
    if (!q) return finalizeProfile();
    const record = { questionId: q.id, category: q.category, question: q.question, answerText: null, skipped: true, timestamp: Date.now() };
    await appendAnswer(record);
    setCurrentIndex((i) => i + 1);
    askQuestion(currentIndex + 1);
  };

  const finalizeProfile = async () => {
    try {
      setLoading(true);
      const answers = await loadAnswers();
      let personalitySummary = '';
      try {
        // Optional server-based summary
        const res = await api.post('/api/extractProfile', { answers });
        personalitySummary = res.data?.personalitySummary || '';
      } catch {
        // Offline: simple concatenation of non-empty answers
        personalitySummary = (answers || [])
          .filter((a: any) => a.answerText)
          .slice(0, 6)
          .map((a: any) => `${a.category}: ${a.answerText}`)
          .join(' | ');
      }
      const audioIndex = await listAudioFiles();
      const profile = await loadProfile();
      const finalProfile = {
        name: profile?.name || '',
        username: profile?.username || '',
        personalitySummary,
        answers,
        audioIndex,
        createdAt: profile?.createdAt || Date.now(),
      };
      await saveProfile(finalProfile);
      setConsentVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to finalize profile');
    } finally {
      setLoading(false);
    }
  };

  const onConsentConfirm = async (evidenceTranscript: string, recordedUri?: string) => {
    try {
      let proofId: string | undefined = undefined;
      if (recordedUri) {
        const entry = await saveAudioFromUri(recordedUri);
        proofId = entry.id;
      }
      await setConsent(evidenceTranscript, proofId);
      setConsentVisible(false);
      if (voiceOptIn) {
        try {
          const audioIndex = await listAudioFiles();
          const ids = audioIndex.map((a) => a.id);
          await api.post('/api/createVoiceFromConversation', { audioFileIds: ids });
        } catch {
          // mark voice pending locally
          const profile = await loadProfile();
          await saveProfile({ ...profile, voicePending: true });
        }
      }
      Alert.alert('All set!', 'Onboarding complete.');
      navigation.navigate('TalkToAura');
    } catch (e) {
      Alert.alert('Error', 'Consent failed');
    }
  };

  const deleteLocalData = async () => {
    try {
      const { deleteAllData } = await import('../lib/localStore');
      await deleteAllData();
      Alert.alert('Data deleted', 'Local data has been wiped.');
      setMessages([]);
      setNameCaptured(false);
      setCurrentIndex(0);
      pushAuraTypingThen("Hi, I’m Aura. Let’s get to know you. What’s your name?");
    } catch {
      Alert.alert('Error', 'Failed to delete local data');
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <ChatBubble role={item.role} text={item.text} />
  );

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Aura Onboarding</Text>
        <TouchableOpacity onPress={deleteLocalData}>
          <Text style={{ color: t.colors.textMuted }}>Delete my data</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />

      {loading && (
        <View style={{ padding: 8 }}>
          <ActivityIndicator />
        </View>
      )}

      <View style={styles.footer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={nameCaptured ? 'Type your reply…' : 'Your name'}
          style={{ flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 8 }}
        />
        <MicRecordButton onRecorded={onRecorded} />
        <TouchableOpacity onPress={onSend} style={{ marginLeft: 8 }}>
          <Text style={{ color: t.colors.black, fontWeight: '700' }}>Send</Text>
        </TouchableOpacity>
        {nameCaptured && (
          <TouchableOpacity onPress={skipQuestion} style={{ marginLeft: 12 }}>
            <Text style={{ color: t.colors.textSecondary }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ConsentModal
        visible={consentVisible}
        onClose={() => setConsentVisible(false)}
        onConfirm={onConsentConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', flexDirection: 'row', alignItems: 'center' },
});
