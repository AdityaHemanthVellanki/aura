import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from './ThemeProvider';

type Props = {
  text: string;
  onDone?: () => void;
  speakingLabel?: string;
  muted?: boolean;
};

export const VoicePlayer: React.FC<Props> = ({ text, onDone, speakingLabel = 'Speaking…', muted = false }) => {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    if (!muted) {
      Speech.stop();
      Speech.speak(text, {
        language: 'en-US',
        rate: 1.0,
        onDone: () => onDone && onDone(),
      });
    }
    return () => {
      try { Speech.stop(); } catch {}
    };
  }, [text, muted]);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <Animated.View style={[styles.glow, { transform: [{ scale: pulse }] }]} />
      <Text style={[styles.label, { color: t.colors.textSecondary }]}>{speakingLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(103, 80, 164, 0.25)',
    shadowColor: '#6750A4',
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  label: { marginTop: 16, fontSize: 16 },
});
