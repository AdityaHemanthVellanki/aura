import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../components/ThemeProvider';
import { VoicePlayer } from '../components/VoicePlayer';
import { AutoRecorder } from '../components/AutoRecorder';
import { ActivateButton } from '../components/ActivateButton';
import { ReadyIndicator } from '../components/ReadyIndicator';
import { MuteProvider, MuteToggle, useMute } from '../components/MuteToggle';
import questionsJson from '../data/aura_personality_questions.json';
import { appendAnswer, saveAudioFromUri, saveProfile, loadProfile, setConsent } from '../lib/localStore';
import { genUniqueUsername } from '../lib/username';

type QA = { id: string; category: string; question: string; follow_ups?: string[] };

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

async function transcribeUpload(uri: string): Promise<string> {
  try {
    const form = new FormData();
    form.append('file', { uri, name: 'clip.wav', type: 'audio/wav' } as any);
    const res = await fetch(`${BASE_URL}/api/transcribe`, { method: 'POST', body: form });
    const data = await res.json();
    return (data?.text || '').trim();
  } catch {
    return '';
  }
}

function ScreenInner({ navigation }: any) {
  const t = useTheme();
  const { muted, setMuted } = useMute();
  const [phase, setPhase] = useState<'speaking' | 'listening' | 'processing'>('speaking');
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [totalRecSec, setTotalRecSec] = useState(0);
  const [beepToken, setBeepToken] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [manualRecordingActive, setManualRecordingActive] = useState(false);
  const questions: QA[] = useMemo(() => questionsJson as any, []);

  useEffect(() => {
    (async () => {
      const idxRaw = await AsyncStorage.getItem('aura:currentQuestionIndex_voice');
      const idx = idxRaw ? parseInt(idxRaw, 10) : 0;
      setCurrentIndex(Number.isFinite(idx) ? idx : 0);
      const prof = await loadProfile();
      if (prof?.name) {
        setName(prof.name);
        setUsername(prof.username || '');
        setIntroDone(true);
      } else {
        setIntroDone(false);
      }
    })();
  }, []);

  const speakIntro = () => {
    setPhase('speaking');
    setIntroDone(false);
  };

  const onIntroSpoken = async () => {
    setIntroDone(true);
    await speakText("What's your name?");
  };

  const speakText = async (text: string) => {
    // VoicePlayer handles TTS; we just control phase
    setPhase('speaking');
    // After speaking finishes, AutoRecorder will run on active state
  };

  const afterSpeak = () => {
    setPhase('listening');
    setBeepToken((x) => x + 1);
  };

  const processName = async (uri: string | null, dur: number) => {
    try {
      setPhase('processing');
      if (uri) {
        setTotalRecSec((s) => s + dur);
        const entry = await saveAudioFromUri(uri);
        let text = await transcribeUpload(entry.uri);
        if (!text) text = await transcribeUpload(entry.uri); // retry
        if (!text) {
          Alert.alert('I didn’t catch that', 'Please say your name again.');
          return restartName();
        }
        const base = text.split(/\s+/).slice(0, 3).join(' ');
        const uname = await genUniqueUsername(base);
        setName(base);
        setUsername(uname);
        await saveProfile({ name: base, username: uname, createdAt: Date.now() });
        await AsyncStorage.setItem('aura:currentQuestionIndex_voice', '0');
        await speakNextQuestion(0);
      } else {
        Alert.alert('Microphone error', 'Could not record name.');
      }
    } catch {
      Alert.alert('Processing error', 'Failed to process name.');
    } finally {
      setPhase('speaking');
    }
  };

  const restartName = async () => {
    setPhase('speaking');
    await speakText("What's your name?");
  };

  const speakNextQuestion = async (index: number) => {
    if (index >= questions.length) return summarizeProfile();
    setCurrentIndex(index);
    await AsyncStorage.setItem('aura:currentQuestionIndex_voice', String(index));
    setPhase('speaking');
  };

  const handleAnswer = async (uri: string | null, dur: number) => {
    try {
      setPhase('processing');
      if (!uri) {
        await appendAnswer({ questionId: questions[currentIndex].id, question: questions[currentIndex].question, skipped: true, timestamp: Date.now() });
        return nextOrFinish();
      }
      setTotalRecSec((s) => s + dur);
      const entry = await saveAudioFromUri(uri);
      let text = await transcribeUpload(entry.uri);
      if (!text) text = await transcribeUpload(entry.uri); // retry
      const lower = text.toLowerCase();
      const skipped = lower.includes('skip');
      await appendAnswer({
        questionId: questions[currentIndex].id,
        category: questions[currentIndex].category,
        question: questions[currentIndex].question,
        answerText: skipped ? '' : text,
        audioId: entry.id,
        skipped,
        timestamp: Date.now(),
      });
      // 30% chance follow-up
      const fups = questions[currentIndex].follow_ups || [];
      if (!skipped && fups.length && Math.random() < 0.3) {
        await askFollowUp(fups[Math.floor(Math.random() * fups.length)], entry.uri);
      }
      nextOrFinish();
    } catch {
      Alert.alert('Error', 'Failed to process reply.');
      nextOrFinish();
    } finally {
      setPhase('speaking');
    }
  };

  const askFollowUp = async (follow: string, prevUri: string) => {
    setPhase('speaking');
    // speak follow-up via VoicePlayer
  };

  const nextOrFinish = async () => {
    if (totalRecSec > 300) {
      Alert.alert('Time limit', 'We’ve reached 5 minutes of recording.');
      return summarizeProfile();
    }
    const next = currentIndex + 1;
    if (next >= questions.length) return summarizeProfile();
    return speakNextQuestion(next);
  };

  const summarizeProfile = async () => {
    try {
      setPhase('processing');
      // Fallback summary: concatenate first 5 answers
      const raw = await AsyncStorage.getItem('aura:answers');
      const arr = raw ? JSON.parse(raw) : [];
      const summary = (arr.filter((a: any) => !a.skipped).slice(0, 5).map((a: any) => a.answerText).join(' • ')) || 'User profile created.';
      const prof = await loadProfile();
      await saveProfile({ ...(prof || {}), personalitySummary: summary, createdAt: Date.now() });
      await speakConsent();
    } catch {
      Alert.alert('Summary error', 'Failed to create profile summary.');
      await speakConsent();
    }
  };

  const speakConsent = async () => {
    setPhase('speaking');
  };

  const onConsentRecorded = async (uri: string | null) => {
    try {
      setPhase('processing');
      if (!uri) {
        Alert.alert('Consent required', 'Please try again.');
        return speakConsent();
      }
      const entry = await saveAudioFromUri(uri);
      let text = await transcribeUpload(entry.uri);
      if (!text) text = await transcribeUpload(entry.uri);
      const ok = text.toLowerCase().includes('i consent');
      if (!ok) {
        Alert.alert('Consent invalid', 'Please say: “I consent to Aura creating a digital version of my voice.”');
        return speakConsent();
      }
      await setConsent(text, entry.id);
      Alert.alert('All done — your Aura profile is ready.');
      navigation.navigate('TalkToAura');
    } catch {
      Alert.alert('Consent error', 'Failed to process consent.');
      speakConsent();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}> 
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Aura Voice Onboarding</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MuteToggle accessibilityLabel={muted ? 'Unmute Aura voice' : 'Mute Aura voice'} />
          <TouchableOpacity onPress={async () => { const { deleteAllData } = await import('../lib/localStore'); await deleteAllData(); Alert.alert('Local data deleted'); }}>
            <Text style={{ color: t.colors.textMuted, marginLeft: 12 }}>Delete local data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={{ padding: 8 }}><ActivityIndicator /></View>
      )}

      <View style={styles.center}> 
        {!isActivated && (
          <>
            <ReadyIndicator />
            <Text style={{ color: t.colors.textSecondary, marginTop: 16 }}>Activate Aura to begin voice onboarding.</Text>
            <View style={{ height: 16 }} />
            <ActivateButton onPress={() => setIsActivated(true)} />
          </>
        )}

        {isActivated && !introDone && (
          <VoicePlayer text={"Hey — I’m Aura. I’ll ask you a few questions. After each, answer when you hear the beep."} onDone={onIntroSpoken} muted={muted} />
        )}

        {isActivated && introDone && !name && phase === 'speaking' && (
          <VoicePlayer text={"What’s your name?"} onDone={afterSpeak} muted={muted} />
        )}

        {isActivated && introDone && !name && phase === 'listening' && (
          <>
            <ReadyIndicator />
            {(isActivated && !muted) && (
              <AutoRecorder active={true} maxDurationSec={20} onRecorded={processName} muted={muted} />
            )}
            {(muted) && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Record your answer" onPress={() => setManualRecordingActive(true)} style={{ marginTop: 16 }}>
                <Text style={{ color: t.colors.black, fontWeight: '700' }}>Record</Text>
              </TouchableOpacity>
            )}
            {manualRecordingActive && (
              <AutoRecorder active={true} maxDurationSec={20} onRecorded={(uri, dur) => { setManualRecordingActive(false); processName(uri, dur); }} muted={muted} />
            )}
          </>
        )}

        {isActivated && introDone && !!name && currentIndex < questions.length && phase === 'speaking' && (
          <VoicePlayer text={questions[currentIndex].question} onDone={afterSpeak} muted={muted} />
        )}

        {isActivated && introDone && !!name && phase === 'listening' && (
          <>
            <ReadyIndicator />
            {(isActivated && !muted) && (
              <AutoRecorder active={true} maxDurationSec={20} onRecorded={(uri, dur) => handleAnswer(uri, dur)} muted={muted} />
            )}
            {(muted) && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Record your answer" onPress={() => setManualRecordingActive(true)} style={{ marginTop: 16 }}>
                <Text style={{ color: t.colors.black, fontWeight: '700' }}>Record</Text>
              </TouchableOpacity>
            )}
            {manualRecordingActive && (
              <AutoRecorder active={true} maxDurationSec={20} onRecorded={(uri, dur) => { setManualRecordingActive(false); handleAnswer(uri, dur); }} muted={muted} />
            )}
          </>
        )}

        {isActivated && introDone && currentIndex >= questions.length && phase === 'speaking' && (
          <VoicePlayer text={"To continue, please say: ‘I consent to Aura creating a digital version of my voice.’"} onDone={afterSpeak} muted={muted} />
        )}

        {isActivated && introDone && currentIndex >= questions.length && phase === 'listening' && (
          <>
            <ReadyIndicator />
            {(isActivated && !muted) && (
              <AutoRecorder active={true} maxDurationSec={10} onRecorded={(uri) => onConsentRecorded(uri)} muted={muted} />
            )}
            {(muted) && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Record your consent" onPress={() => setManualRecordingActive(true)} style={{ marginTop: 16 }}>
                <Text style={{ color: t.colors.black, fontWeight: '700' }}>Record</Text>
              </TouchableOpacity>
            )}
            {manualRecordingActive && (
              <AutoRecorder active={true} maxDurationSec={10} onRecorded={(uri) => { setManualRecordingActive(false); onConsentRecorded(uri); }} muted={muted} />
            )}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={{ color: t.colors.textSecondary }}>
          {!isActivated ? 'Inactive' : phase === 'speaking' ? (muted ? 'Speaking… (muted)' : 'Speaking…') : phase === 'listening' ? (muted ? 'Ready — tap Record' : 'Listening…') : 'Processing…'}
        </Text>
        {!!name && <Text style={{ color: t.colors.textMuted, marginTop: 8 }}>Name: {name} • Username: {username}</Text>}
      </View>
    </View>
  );
}

export default function AuraOnboardingVoice(props: any) {
  return (
    <MuteProvider>
      <ScreenInner {...props} />
    </MuteProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 16, alignItems: 'center' },
});
