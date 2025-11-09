import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../components/ThemeProvider';

export default function Welcome({ navigation }: any) {
  const t = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <View style={styles.logoWrap}>
        <LinearGradient colors={["#10D1C1", "#9D87FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCircle}>
          <Text accessibilityRole="image" accessibilityLabel="Aura sparkle logo" style={styles.logoStar}>✦</Text>
        </LinearGradient>
      </View>
      <Text style={[styles.brand, { color: t.colors.textPrimary }]}>aura</Text>
      <Text style={[styles.subtitle, { color: t.colors.textMuted }]}>your digital twin</Text>
      <View style={styles.bottom}>
        <PrimaryButton title="get started" onPress={() => navigation.navigate('Onboarding')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoWrap: { marginBottom: 24 },
  logoCircle: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  brand: { fontSize: 48, fontWeight: '700', letterSpacing: -1, marginTop: 12 },
  subtitle: { fontSize: 18, marginTop: 8 },
  bottom: { width: '100%', marginTop: 24, paddingBottom: 40 },
  logoStar: { color: '#fff', fontSize: 64, lineHeight: 64 },
});
