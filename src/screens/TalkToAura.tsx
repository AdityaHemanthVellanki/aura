import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, Switch } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, uploadAudio } from '../lib/api';
import { useTheme } from '../components/ThemeProvider';
import { PrimaryButton } from '../components/PrimaryButton';

type Message = { id: string; role: 'assistant' | 'user'; text: string };

export default function TalkToAura({ navigation }: any) {
  const t = useTheme();
  const [userId, setUserId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [clips, setClips] = useState<string[]>([]); // storage paths/urls
  const [consentVisible, setConsentVisible] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentText, setConsentText] = useState(
    'I consent to Aura creating a synthetic voice using my recorded audio. I confirm these recordings are my voice and I give permission for the app to create a voice clone. I understand I can delete my data and voice clone at any time.'
  );
  const [conversationId] = useState(() => `conv-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const existing = await AsyncStorage.getItem('userId');
      const id = existing || `user-${Math.random().toString(36).slice(2)}`;
      if (!existing) await AsyncStorage.setItem('userId', id);
      setUserId(id);
      // Start onboarding conversation
      const resp = await api.post('/api/chatMessage', { userId: id, conversationId });
      const { replyText } = resp.data;
      setMessages([{ id: String(Date.now()), role: 'assistant', text: replyText }]);
    })();
  }, [conversationId]);

  const startRecording = async () => {
    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      Alert.alert('Recording error', (e as any)?.message || 'Failed to start');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;

      const filename = `clip-${Date.now()}.m4a`;
      const up = await uploadAudio(uri, filename, userId);
      const fileId = (up as any).id || (up as any).url;
      setClips((prev) => [...prev, fileId]);

      const resp = await api.post('/api/chatMessage', { userId, audioFileId: fileId, conversationId });
      const { replyText, askForAudio } = resp.data;
      setMessages((prev) => [...prev, { id: `${Date.now()}u`, role: 'user', text: '(voice reply)' }, { id: `${Date.now()}a`, role: 'assistant', text: replyText }]);

      // Show consent after 3 clips or when assistant suggests
      if (clips.length + 1 >= 3) setConsentVisible(true);
    } catch (e) {
      Alert.alert('Recording error', (e as any)?.message || 'Failed to stop');
    }
  };

  const onGiveConsent = async () => {
    if (!consentChecked) {
      Alert.alert('Consent required', 'Please check the box to agree.');
      return;
    }
    await api.post('/api/consent', { userId, consent: true, evidenceTranscript: consentText });
    setConsentVisible(false);
    // Create voice from collected clips
    const res = await api.post('/api/createVoiceFromConversation', { userId, audioFileIds: clips });
    const { voiceId } = res.data;
    // Extract profile
    await api.post('/api/extractProfile', { userId });
    // Navigate to main chat
    navigation.navigate('Chat');
  };

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'assistant' ? styles.assistant : styles.user]}>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />

      <View style={styles.footer}>
        <PrimaryButton title={recording ? 'Stop Recording' : 'Hold to Record'} onPress={recording ? stopRecording : startRecording} />
      </View>

      <Modal visible={consentVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: t.colors.background }]}>
            <Text style={styles.modalTitle}>Voice Cloning Consent</Text>
            <Text style={styles.modalText}>{consentText}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
              <Switch value={consentChecked} onValueChange={setConsentChecked} />
              <Text style={{ marginLeft: 8 }}>I agree</Text>
            </View>
            <PrimaryButton title="Create my voice" onPress={onGiveConsent} disabled={!consentChecked || clips.length < 1} />
            <TouchableOpacity onPress={() => setConsentVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: t.colors.textMuted }}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: { padding: 12, borderRadius: 12, marginVertical: 6, maxWidth: '80%' },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#f2f2f2' },
  user: { alignSelf: 'flex-end', backgroundColor: '#e8f4ff' },
  text: { fontSize: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#333' },
});