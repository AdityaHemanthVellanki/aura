import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadProfile, saveProfile } from './src/lib/localStore';
import { generateReply, createVoice } from './src/lib/api';
import { useTheme } from './src/components/ThemeProvider';

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

export default function Chat({ route }: any) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ from: 'user' | 'aura'; text: string; audioUrl?: string }>>([]);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [voiceId, setVoiceId] = useState<string | undefined>();
  const [userId, setUserId] = useState<string>('demo-user');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const t = useTheme();

  useEffect(() => {
    (async () => {
      // user identity
      const existing = await AsyncStorage.getItem('userId');
      if (existing) setUserId(existing);
      else {
        const newId = `user-${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem('userId', newId);
        setUserId(newId);
      }
      // hydrate cached messages
      const cacheKey = `chat:${userId}`;
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setMessages(parsed);
        } catch {}
      }
      if (route?.params?.initialText) {
        setMessage(route.params.initialText);
      }
      // resolve voiceId from profile or confirm default
      try {
        const prof = await loadProfile();
        if (prof?.voiceId) {
          setVoiceId(prof.voiceId);
        } else {
          const resp = await fetch(`${BASE_URL}/api/voiceCheck`);
          const data = await resp.json();
          if (data?.ok && data.voiceId) {
            const accepted = await new Promise<boolean>((resolve) => {
              Alert.alert('Use default voice?', `Voice not set — using default voice id: ${data.voiceId}`, [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Use Default', onPress: () => resolve(true) },
              ]);
            });
            if (accepted) {
              setVoiceId(data.voiceId);
              await saveProfile({ ...(prof || {}), voiceId: data.voiceId, voicePending: false });
            }
          }
        }
      } catch {}
    })();
  }, [route?.params?.initialText]);

  useEffect(() => {
    (async () => {
      if (audioUrl) {
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
        setSound(newSound);
        await newSound.playAsync();
      }
    })();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [audioUrl]);

  const persist = async (items: Array<{ from: 'user' | 'aura'; text: string; audioUrl?: string }>) => {
    const lastFive = items.slice(-5);
    setMessages(lastFive);
    await AsyncStorage.setItem(`chat:${userId}`, JSON.stringify(lastFive));
  };

  const playAuraTTS = async (text: string, voiceId?: string) => {
    // Skip playback if muted
    const muted = (await AsyncStorage.getItem('aura:muted')) === 'true';
    if (muted) return;
    const vid = voiceId || (await (async () => voiceId)());
    if (!vid) {
      Alert.alert('Voice not set', 'Please set a voice in Onboarding.');
      return;
    }

    // Strip newlines for TTS
    const normalized = text.replace(/\s+/g, ' ').trim();
    const resp = await fetch(`${BASE_URL}/api/auraTalk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalized, voiceId: vid, userId }),
    });
    if (!resp.ok) {
      console.warn('auraTalk failed', await resp.text());
      Alert.alert('Audio error', 'We’re having trouble producing audio for your selected Aura voice. Try again later or pick a different voice in settings.');
      return;
    }
    const data = await resp.json();
    const fileUri = data?.audioUrl as string | undefined;
    if (!fileUri) {
      console.warn('Missing audioUrl in auraTalk response');
      return;
    }
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: fileUri });
    setSound(newSound);
    await newSound.playAsync();
    setAudioUrl(fileUri);
  };

  const onSend = async () => {
    if (!message.trim()) return;
    const next = [...messages, { from: 'user' as const, text: message.trim() }];
    await persist(next);
    // Call /api/auraChat
    const chatResp = await fetch(`${BASE_URL}/api/auraChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: message.trim() }] }),
    });
    const chatJson = await chatResp.json();
    const replyText = chatJson.text || '';
    const auraMsg = { from: 'aura' as const, text: replyText };
    await persist([...next, auraMsg]);
    setMessage('');
    // Play via /api/auraTalk
    await playAuraTTS(replyText, voiceId);
  };

  const onCreateVoice = async () => {
    const consent = await AsyncStorage.getItem(`consent:${userId}`);
    if (consent !== 'true') {
      Alert.alert('Consent required', 'Please provide consent in Onboarding before creating your voice.');
      return;
    }
    const res = await createVoice([], 'aura-user', userId);
    setVoiceId(res.voice_id);
  };

  useEffect(() => {
    (async () => {
      // Voice identity check on first load
      try {
        const resp = await fetch(`${BASE_URL}/api/voiceCheck`);
        if (!resp.ok) {
          console.warn('⚠️ Aura voice not found in ElevenLabs. Using fallback voice.');
        } else {
          const data = await resp.json();
          console.log('Voice:', data.voiceName || data.voiceId);
        }
      } catch (e) {
        console.warn('voiceCheck error', (e as any)?.message);
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }] }>
      <Text style={styles.title}>Chat with your Aura</Text>
      <ScrollView style={styles.messages} contentContainerStyle={{ paddingVertical: 8 }}>
        {messages.map((m, idx) => (
          <View key={idx} style={[styles.bubble, m.from === 'user' ? styles.userBubble : styles.auraBubble]}>
            <Text style={styles.sender}>{m.from === 'user' ? 'You' : 'Aura'}</Text>
            <Text>{m.text}</Text>
            {m.audioUrl ? <Text style={styles.audioUrl}>Audio: {m.audioUrl}</Text> : null}
          </View>
        ))}
      </ScrollView>
      <TextInput value={message} onChangeText={setMessage} placeholder="Type a message" style={styles.input} />
      <Button title="Send" onPress={onSend} />
      <View style={{ height: 12 }} />
      <Button title="Create Voice" onPress={onCreateVoice} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  messages: { flex: 1, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, marginBottom: 12 },
  bubble: { padding: 10, marginBottom: 8, borderRadius: 8 },
  userBubble: { backgroundColor: '#e7f1ff', alignSelf: 'flex-end', maxWidth: '80%' },
  auraBubble: { backgroundColor: '#f4f4f4', alignSelf: 'flex-start', maxWidth: '80%' },
  sender: { fontWeight: '600', marginBottom: 4 },
  audioUrl: { fontSize: 12, color: '#666', marginTop: 4 },
});
