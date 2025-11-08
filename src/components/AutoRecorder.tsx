import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useTheme } from './ThemeProvider';
import { requestAudioPermissions } from '../lib/audioPermissions';

type Props = {
  active: boolean;
  maxDurationSec?: number;
  onRecorded: (uri: string | null, durationSec: number) => void;
  listeningLabel?: string;
  muted?: boolean;
};

export const AutoRecorder: React.FC<Props> = ({ active, maxDurationSec = 20, onRecorded, listeningLabel = 'Listening…', muted = false }) => {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    (async () => {
      if (!active) return;
      const ok = await requestAudioPermissions();
      if (!ok) {
        onRecorded(null, 0);
        return;
      }
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        if (!muted) {
          Speech.speak('beep', { language: 'en-US', rate: 1.2 });
        }
        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        await rec.startAsync();
        setRecording(rec);
        const startedAt = Date.now();
        timerRef.current = setTimeout(async () => {
          try {
            if (!rec) return;
            await rec.stopAndUnloadAsync();
            const uri = rec.getURI();
            setRecording(null);
            const dur = Math.round((Date.now() - startedAt) / 1000);
            onRecorded(uri || null, dur);
          } catch {
            onRecorded(null, 0);
          }
        }, maxDurationSec * 1000);
      } catch (e) {
        onRecorded(null, 0);
      }
    })();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (recording) {
        (async () => {
          try { await recording.stopAndUnloadAsync(); } catch {}
        })();
      }
    };
  }, [active]);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <Animated.View style={[styles.glow, { transform: [{ scale: pulse }] }]} />
      <Text style={[styles.label, { color: t.colors.textSecondary }]}>{listeningLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(12, 165, 196, 0.25)',
    shadowColor: '#0CA5C4',
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  label: { marginTop: 16, fontSize: 16 },
});
