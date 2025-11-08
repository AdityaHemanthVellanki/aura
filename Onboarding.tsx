import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';

export default function Onboarding({ navigation }: any) {
  const onConsent = () => {
    Alert.alert(
      'Consent',
      'By recording or uploading audio, you consent to AI use of your voice for personalized responses. You may delete your data anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I Agree', onPress: () => navigation.navigate('RecordVoice') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Aura</Text>
      <Text style={styles.subtitle}>Create your AI "digital twin" with text and voice.</Text>
      <Button title="Upload Text Samples (coming soon)" onPress={() => Alert.alert('TODO')} />
      <View style={{ height: 12 }} />
      <Button title="Record Your Voice" onPress={onConsent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 16, textAlign: 'center' },
});