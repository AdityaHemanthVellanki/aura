import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../components/ThemeProvider';
import { loadProfile, ensureDefaultConnections, getUserToken } from '../lib/localStore';
import { api } from '../lib/api';

export default function Profile({ navigation }: any) {
  const t = useTheme();
  const [name, setName] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const prof = await loadProfile();
      setName(prof?.name || '');
      setPhotoUri(prof?.photoUri);
      try {
        const uid = await getUserToken();
        if (uid) {
          const res = await api.post('/api/getProfile', { id: uid });
          const p = res?.data?.profile;
          if (p?.photo_url) setPhotoUri(String(p.photo_url));
          if (p?.name) setName(String(p.name));
        }
      } catch {}
      await ensureDefaultConnections();
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}> 
      <Text style={[styles.brand, { color: t.colors.textPrimary }]}>aura</Text>
      <View style={styles.avatarWrap}>
        <LinearGradient colors={["#aef", "#222"]} style={styles.ringOuter} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.ringInner}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: '#ddd' }]} />
            )}
          </View>
        </LinearGradient>
      </View>
      <Text style={[styles.name, { color: t.colors.textPrimary }]}>{name || 'your name'}</Text>
      <Text style={[styles.role, { color: t.colors.textMuted }]}>myself</Text>
      <Text style={[styles.tag, { color: t.colors.textMuted }]}>genuine & true</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={[styles.statVal, { color: t.colors.textPrimary }]}>0</Text><Text style={[styles.statLabel, { color: t.colors.textMuted }]}>posts</Text></View>
        <View style={styles.stat}><Text style={[styles.statVal, { color: t.colors.textPrimary }]}>30%</Text><Text style={[styles.statLabel, { color: t.colors.textMuted }]}>energy</Text></View>
      </View>
      <View style={styles.ctaRow}>
        <TouchableOpacity style={styles.ctaDark} onPress={() => navigation.navigate('Connections')}><Text style={styles.ctaDarkText}>connections</Text></TouchableOpacity>
        <TouchableOpacity style={styles.ctaLight} onPress={() => navigation.navigate('ChatThread', { userId: 'self', name: name || 'myself' })}><Text style={styles.ctaLightText}>chat</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.ctaLight, { marginTop: 8 }]} onPress={() => navigation.navigate('EditPersonality')}><Text style={styles.ctaLightText}>edit personality</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 24 },
  brand: { fontSize: 40, fontWeight: '700', marginBottom: 12 },
  avatarWrap: { marginVertical: 12 },
  ringOuter: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 160, height: 160, borderRadius: 80 },
  name: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  role: { fontSize: 16, marginTop: 4 },
  tag: { fontSize: 16, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 48, marginTop: 16 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 14 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ctaDark: { backgroundColor: '#000', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 18 },
  ctaDarkText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaLight: { backgroundColor: '#f4f4f4', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 18 },
  ctaLightText: { color: '#000', fontSize: 16, fontWeight: '600' },
});
