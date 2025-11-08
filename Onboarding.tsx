import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { indexMemory, deleteData } from './src/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './src/components/ThemeProvider';

export default function Onboarding({ navigation }: any) {
  const t = useTheme();
  const [consent, setConsent] = useState(false);
  const [userId, setUserId] = useState('demo-user');
  const [description, setDescription] = useState('');
  const [samples, setSamples] = useState<string[]>(['', '', '', '', '']);

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem('userId');
      if (existing) setUserId(existing);
      else {
        const newId = `user-${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem('userId', newId);
        setUserId(newId);
      }
      const c = await AsyncStorage.getItem(`consent:${userId}`);
      setConsent(c === 'true');
    })();
  }, []);

  const onConsent = () => {
    Alert.alert(
      'Consent',
      'By recording or uploading audio, you consent to AI use of your voice for personalized responses. You may delete your data anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I Agree', onPress: async () => { setConsent(true); await AsyncStorage.setItem(`consent:${userId}`, 'true'); navigation.navigate('RecordVoice', { consent: true }); } },
      ]
    );
  };

  const savePersonality = async () => {
    try {
      if (description.trim().length > 0) {
        await indexMemory(userId, description.trim(), 'profile');
      }
      for (const s of samples) {
        if (s.trim().length > 0) {
          await indexMemory(userId, s.trim(), 'sample');
        }
      }
      Alert.alert('Saved', 'Personality text indexed. You can now record your voice.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save personality');
    }
  };

  const onDeleteData = async () => {
    try {
      await deleteData(userId);
      await AsyncStorage.removeItem(`consent:${userId}`);
      await AsyncStorage.removeItem(`chat:${userId}`);
      setConsent(false);
      Alert.alert('Deleted', 'Your data has been deleted.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete data');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: t.colors.background }]}
      style={{ backgroundColor: t.colors.background }}
    >
      <Text style={styles.title}>Welcome to Aura</Text>
      <Text style={styles.subtitle}>Create your AI "digital twin" with text and voice.</Text>
      <Text style={styles.label}>Describe yourself</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="e.g., I code at 2 AM and love matcha" style={styles.input} multiline />
      <Text style={styles.label}>Paste 5 sample messages</Text>
      {samples.map((val, i) => (
        <TextInput key={i} value={val} onChangeText={(t) => setSamples((prev) => prev.map((p, idx) => (idx === i ? t : p)))} placeholder={`Sample ${i + 1}`} style={styles.input} />
      ))}
      <View style={{ height: 12 }} />
      <Button title="Save Personality" onPress={savePersonality} />
      <View style={{ height: 12 }} />
      <Button title={consent ? 'Record Your Voice' : 'Consent + Record Voice'} onPress={onConsent} />
      <View style={{ height: 24 }} />
      <Button title="Delete My Data" color="#c00" onPress={onDeleteData} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, alignItems: 'stretch', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, marginBottom: 8 },
});