import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { getUserToken, saveProfile } from '../lib/localStore';
import { api } from '../lib/api';

export default function EditPersonality({ navigation }: any) {
  const t = useTheme();
  const [summary, setSummary] = useState('');
  const [tagsText, setTagsText] = useState('');
  useEffect(() => { (async () => {
    try {
      const uid = await getUserToken();
      if (uid) {
        const res = await api.post('/api/getProfile', { id: uid });
        const p = res?.data?.profile;
        if (p?.personality_summary) setSummary(String(p.personality_summary));
        const tagsArr = Array.isArray(p?.tags) ? p.tags : [];
        setTagsText(tagsArr.join(', '));
      }
    } catch {}
  })(); }, []);

  const save = async () => {
    const tags = tagsText.split(/[\,\s]+/).filter(Boolean).slice(0, 12);
    try {
      const uid = await getUserToken();
      if (uid) {
        await api.post('/api/saveProfile', { id: uid, personality: tags.join(', '), bio: summary, tags });
        await saveProfile({ personalitySummary: summary });
        // Show a friendly mock confirmation
        try {
          const resp = await api.post('/api/mockReply', { category: 'positive_feedback', context: 'personality updated' });
          const msg = String(resp?.data?.reply || 'Personality updated ✨');
          alert(msg);
        } catch {
          alert('Personality updated ✨');
        }
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Try again later.');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: t.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[styles.title, { color: t.colors.textPrimary }]}>Edit Personality</Text>
      <Text style={[styles.label, { color: t.colors.textPrimary }]}>Summary</Text>
      <TextInput value={summary} onChangeText={setSummary} placeholder="Tell us in a few lines" style={[styles.inputLarge, { color: t.colors.textPrimary }]} placeholderTextColor={t.colors.textMuted} multiline />
      <Text style={[styles.label, { color: t.colors.textPrimary }]}>Tags (comma separated)</Text>
      <TextInput value={tagsText} onChangeText={setTagsText} placeholder="authentic, expressive" style={[styles.input, { color: t.colors.textPrimary }]} placeholderTextColor={t.colors.textMuted} />
      <TouchableOpacity style={styles.cta} onPress={save}><Text style={styles.ctaText}>Save</Text></TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  inputLarge: { backgroundColor: '#F6F7F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minHeight: 120 },
  input: { backgroundColor: '#F6F7F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  cta: { marginTop: 16, backgroundColor: '#000', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '600' },
});
