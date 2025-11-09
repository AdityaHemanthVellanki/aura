import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Alert, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { writeAsStringAsync } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveProfile, loadProfile } from '../lib/localStore';
import { useTheme } from './ThemeProvider';

type Props = {
  text: string;
  emotion?: string;
  onDone?: () => void;
  onMeta?: (meta: { audioUrl?: string; localUri?: string; size?: number; emotionUsed?: string; error?: string }) => void;
  onStatus?: (status: any) => void;
  speakingLabel?: string;
  muted?: boolean;
  userId?: string;
};

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

export const VoicePlayer: React.FC<Props> = ({ text, emotion, onDone, onMeta, onStatus, speakingLabel = 'Speaking…', muted = false, userId }) => {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [diag, setDiag] = useState<{ audioUrl?: string; localUri?: string; size?: number; emotionUsed?: string; error?: string } | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  const playForText = async (inputText: string) => {
    if (!inputText) return;
    if (muted) {
      setDiag({ error: 'muted' });
      if (onDone) onDone();
      return;
    }
    const ts = new Date().toISOString();
    const normalized = inputText.replace(/\s+/g, ' ').trim();
    console.log(`[VoicePlayer:req:start] ${ts} len=${normalized.length}`);
    const resp = await fetch(`${BASE_URL}/api/hume/auraTalk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalized, emotion, userId }),
    });
    const json = await resp.json().catch(() => null as any);
    if (!resp.ok || !json || json.ok === false) {
      const errTxt = json?.message || 'Unknown error';
      console.warn('auraTalk error', errTxt, json?.details || '');
      const metaErr = { error: `server_error: ${errTxt}` };
      setDiag(metaErr);
      if (onMeta) onMeta(metaErr);
      Alert.alert('Audio error', 'We’re having trouble producing audio for Aura. Try again later or check connectivity.');
      return;
    }
    const audioUrl = json?.audioUrl as string | undefined;
    const audioBase64 = json?.audioBase64 as string | undefined;
    const bytes = json?.bytes as number | undefined;
    const emotionUsed = json?.emotionUsed as string | undefined;
    if (!audioUrl) {
      const metaMiss = { error: 'Missing audioUrl' };
      setDiag(metaMiss);
      if (onMeta) onMeta(metaMiss);
      console.warn('Missing audioUrl in auraTalk response');
      return;
    }
    const metaStart = { audioUrl, size: bytes, emotionUsed };
    setDiag(metaStart);
    if (onMeta) onMeta(metaStart);
    // Download to local file (native); on web, stream remote URL
    let localUri = audioUrl;
    let size = 0;
    const nativeDir = (((FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory) ?? null) as string | null;
    if (nativeDir) {
      const dest = `${nativeDir}aura_${Date.now()}.mp3`;
      try {
        const dl = await FileSystem.downloadAsync(audioUrl, dest);
        localUri = dl.uri;
        const info = await FileSystem.getInfoAsync(localUri);
        size = (info as any)?.size || 0;
        if (size < 512) {
          // Retry once
          const dl2 = await FileSystem.downloadAsync(audioUrl, dest);
          localUri = dl2.uri;
          const info2 = await FileSystem.getInfoAsync(localUri);
          size = (info2 as any)?.size || 0;
        }
        if (size <= 2048 && audioBase64) {
          // Enforce minimum size: fallback to base64 file
          try {
            await writeAsStringAsync(dest, audioBase64, { encoding: 'base64' as any });
            localUri = dest;
            const info3 = await FileSystem.getInfoAsync(localUri);
            size = (info3 as any)?.size || 0;
          } catch (e3: any) {
            console.warn('Base64 fallback failed', e3?.message);
          }
        }
      } catch (e: any) {
        console.warn('Download failed', e?.message);
        // Fallback to base64
        if (audioBase64) {
          try {
            await writeAsStringAsync(dest, audioBase64, { encoding: 'base64' as any });
            localUri = dest;
            const info3 = await FileSystem.getInfoAsync(localUri);
            size = (info3 as any)?.size || 0;
            const dmOk = { audioUrl, localUri, size };
            setDiag(dmOk);
            if (onMeta) onMeta(dmOk);
          } catch (e2: any) {
            const dmErr = { audioUrl, error: `base64_write_failed: ${e2?.message}` };
            setDiag(dmErr);
            if (onMeta) onMeta(dmErr);
            Alert.alert('Audio download failed', 'Try again or check connectivity.');
            return;
          }
        } else {
          const dm = { audioUrl, error: `download_failed: ${e?.message}` };
          setDiag(dm);
          if (onMeta) onMeta(dm);
          Alert.alert('Audio download failed', 'Try again or check connectivity.');
          return;
        }
      }
    }
    setDiag((d) => {
      const next = { ...(d || {}), localUri, size } as any;
      if (onMeta) onMeta(next);
      return next;
    });

    if (sound) { await sound.unloadAsync(); setSound(null); }
    // Ensure iOS plays audio even in silent mode and Android ducks properly
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {}
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: localUri }, { shouldPlay: true });
    setSound(newSound);
    try { await newSound.setStatusAsync({ volume: 1.0 }); } catch {}
    newSound.setOnPlaybackStatusUpdate((status: any) => {
      if (onStatus) onStatus(status);
      if ((status as any)?.error) {
        const errMsg = (status as any).error as string;
        console.warn('Playback error', errMsg);
        setDiag((d) => {
          const next = { ...(d || {}), error: `playback_error: ${errMsg}` } as any;
          if (onMeta) onMeta(next);
          return next;
        });
        // Fallback: base64 write if available
        if (audioBase64 && nativeDir) {
          (async () => {
            try {
              const fallback = `${nativeDir}aura_${Date.now()}_b64.mp3`;
              await writeAsStringAsync(fallback, audioBase64, { encoding: 'base64' as any });
              const { sound: fbSound } = await Audio.Sound.createAsync({ uri: fallback }, { shouldPlay: true });
              setSound(fbSound);
            } catch {}
          })();
        } else {
          Alert.alert(
            'Audio playback failed',
            'Please ensure iPhone Ring/Silent switch is not set to Silent, and volume is up. If using Expo Go, ensure the app is foregrounded. You can also try reinstalling.'
          );
        }
      }
      if (onDone && status?.didJustFinish) onDone();
    });
    await newSound.playAsync();
    // Cleanup local file after playback finishes
    if (nativeDir && localUri.startsWith(nativeDir)) {
      setTimeout(async () => {
        try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch {}
      }, 30_000);
    }
  };

  useEffect(() => { (async () => { if (muted || !text) return; await playForText(text); })(); }, [text, muted, userId]);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <Animated.View style={[styles.glow, { transform: [{ scale: pulse }] }]} />
      <Text style={[styles.label, { color: t.colors.textSecondary }]}>{speakingLabel}</Text>
      {!!diag && __DEV__ ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: t.colors.textMuted }}>
            emotion: {diag.emotionUsed} {'\n'} audioUrl: {diag.audioUrl} {'\n'} localUri: {diag.localUri} {'\n'} size: {diag.size} {'\n'} error: {diag.error}
          </Text>
          <TouchableOpacity onPress={() => playForText('This is a test voice for diagnostics.')} style={{ paddingVertical: 8 }}>
            <Text style={{ color: t.colors.textPrimary }}>Play Test Voice</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
