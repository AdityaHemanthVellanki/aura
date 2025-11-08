import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from './ThemeProvider';

type Props = {
  onRecorded: (uri: string) => void;
  maxDurationMs?: number;
};

export const MicRecordButton: React.FC<Props> = ({ onRecorded, maxDurationMs = 20000 }) => {
  const t = useTheme();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const start = async () => {
    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      timerRef.current = setTimeout(stop, maxDurationMs) as unknown as number;
    } catch (e) {
      // noop
    }
  };

  const stop = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (uri) onRecorded(uri);
    } catch (e) {
      // noop
    }
  };

  return (
    <TouchableOpacity
      onPress={recording ? stop : start}
      style={[styles.btn, { backgroundColor: t.colors.black, borderRadius: t.radii.md, paddingVertical: 10, paddingHorizontal: 16 }]}
    >
      <Text style={[styles.text, { color: '#fff', fontFamily: t.typography.font }]}>
        {recording ? 'Stop' : 'Hold to Record'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});

