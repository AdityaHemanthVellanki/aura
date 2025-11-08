import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { generateReply, createVoice } from './src/lib/api';

export default function Chat({ route }: any) {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [voiceId, setVoiceId] = useState<string | undefined>();
  const [userId] = useState('demo-user');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (route?.params?.initialText) {
      setMessage(route.params.initialText);
    }
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

  const onSend = async () => {
    const res = await generateReply(message, userId, voiceId);
    setReply(res.text);
    setAudioUrl(res.audioUrl);
  };

  const onCreateVoice = async () => {
    const res = await createVoice([], 'aura-user', userId);
    setVoiceId(res.voice_id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat with your Aura</Text>
      <TextInput value={message} onChangeText={setMessage} placeholder="Type a message" style={styles.input} />
      <Button title="Send" onPress={onSend} />
      <View style={{ height: 12 }} />
      <Button title="Create Voice" onPress={onCreateVoice} />
      {reply ? <Text style={styles.reply}>Aura: {reply}</Text> : null}
      {audioUrl ? <Text>Audio URL: {audioUrl}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, marginBottom: 12 },
  reply: { marginTop: 16, fontSize: 16 },
});