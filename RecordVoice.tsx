import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { uploadAudio, transcribe } from './src/lib/api';

export default function RecordVoice({ navigation }: any) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [userId] = useState('demo-user'); // replace with real auth later

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    })();
  }, []);

  const startRecording = async () => {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start recording', e);
    }
  };

  const stopRecording = async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      if (!uri) return;

      const filename = `voice-${Date.now()}.m4a`;
      const { url } = await uploadAudio(uri, filename, userId);
      const { text } = await transcribe(url, userId);
      navigation.navigate('Chat', { initialText: text });
    } catch (e) {
      console.error('Failed to stop recording', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record your voice</Text>
      <Button title={isRecording ? 'Stop Recording' : 'Start Recording'} onPress={isRecording ? stopRecording : startRecording} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});