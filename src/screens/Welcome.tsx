import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlowCircleWebView from '../components/GlowCircle';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../components/ThemeProvider';

export default function Welcome({ navigation }: any) {
  const t = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <Text style={[styles.title, { color: t.colors.textPrimary, fontFamily: t.typography.font }]}>aura</Text>
      <View style={styles.center}>
        <GlowCircleWebView size={220} onPress={() => console.log('Shader tapped')} />
      </View>
      <View style={styles.bottom}>
        <PrimaryButton title="Get started" onPress={() => navigation.navigate('AuraOnboardingVoice')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  title: { fontSize: 40, fontWeight: '700', marginTop: 50, letterSpacing: -1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottom: { width: '100%', paddingBottom: 40 },
});
