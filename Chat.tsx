import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReply, createVoice } from './src/lib/api';
import { useTheme } from './src/components/ThemeProvider';

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

  const onSend = async () => {
    if (!message.trim()) return;
    const next = [...messages, { from: 'user' as const, text: message.trim() }];
    await persist(next);
    const res = await generateReply(message.trim(), userId, voiceId);
    const auraMsg = { from: 'aura' as const, text: res.text, audioUrl: res.audioUrl };
    setAudioUrl(res.audioUrl);
    await persist([...next, auraMsg]);
    setMessage('');
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