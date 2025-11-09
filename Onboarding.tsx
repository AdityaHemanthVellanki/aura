import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { indexMemory, api } from './src/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './src/components/ThemeProvider';
import { saveProfile, saveUserToken } from './src/lib/localStore';

export default function Onboarding({ navigation }: any) {
  const t = useTheme();
  const [userId, setUserId] = useState('demo-user');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [personality, setPersonality] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem('userId');
      if (existing) setUserId(existing);
      else {
        const newId = `user-${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem('userId', newId);
        setUserId(newId);
      }
    })();
  }, []);

  const onSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();
    const trimmedPersonality = personality.trim();
    if (!trimmedName) {
      Alert.alert('Please add your name', 'Enter a name to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const cu = await api.post('/api/createUser', { name: trimmedName }).catch(() => ({ data: null }));
      const newUserId = cu?.data?.user?.id || userId;
      if (newUserId) await saveUserToken(newUserId);
      // Save profile fields to Supabase (best-effort)
      await api.post('/api/saveProfile', { id: newUserId, name: trimmedName, bio: trimmedBio, personality: trimmedPersonality }).catch(() => {});
      // Local cache for quick UI
      await saveProfile({ name: trimmedName });
    } catch (e) {
      // Non-fatal: continue navigation even if server write fails
      console.warn('Onboarding submit error', e);
    } finally {
      setSubmitting(false);
      navigation.navigate('AddPhoto');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: t.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[styles.title, { color: t.colors.textPrimary }]}>who are you?!</Text>
      <View style={styles.fieldWrap}>
        <TextInput placeholder="name" value={name} onChangeText={setName} style={[styles.input, { color: t.colors.textPrimary }]} placeholderTextColor={t.colors.textMuted} />
      </View>
      <View style={styles.fieldWrapLarge}>
        <TextInput placeholder="vibe check... tell us about urself" value={bio} onChangeText={setBio} style={[styles.inputLarge, { color: t.colors.textPrimary }]} placeholderTextColor={t.colors.textMuted} multiline />
      </View>
      <View style={styles.fieldWrap}>
        <TextInput placeholder="personality (optional)" value={personality} onChangeText={setPersonality} style={[styles.input, { color: t.colors.textPrimary }]} placeholderTextColor={t.colors.textMuted} />
      </View>
      <TouchableOpacity style={[styles.cta, submitting ? { opacity: 0.6 } : null]} onPress={onSubmit} activeOpacity={0.85}>
        <Text style={styles.ctaText}>let's go ✨</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, alignItems: 'stretch', justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  fieldWrap: { backgroundColor: '#F6F7F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E8EF' },
  fieldWrapLarge: { backgroundColor: '#F6F7F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E8EF', minHeight: 140 },
  input: { fontSize: 18 },
  inputLarge: { fontSize: 18, flex: 1 },
  cta: { marginTop: 8, backgroundColor: '#777', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
