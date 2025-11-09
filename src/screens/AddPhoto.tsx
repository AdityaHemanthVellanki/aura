import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../components/ThemeProvider';
import { saveProfile, getUserToken } from '../lib/localStore';
import { api } from '../lib/api';
const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

async function isServerReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`).catch(() => null as any);
    return !!(res && res.ok);
  } catch { return false; }
}

export default function AddPhoto({ navigation }: any) {
  const t = useTheme();
  const [previewUri, setPreviewUri] = useState<string | undefined>(undefined);
  const [previewBase64, setPreviewBase64] = useState<string | undefined>(undefined);

  const saveAndNext = async (uri?: string, base64?: string) => {
    try {
      await saveProfile({ photoUri: uri, photoBase64: base64 });
      const userId = await getUserToken();
      const reachable = await isServerReachable();
      if (reachable && userId && base64) {
        try {
          const up = await api.post('/api/uploadProfilePhoto', { id: userId, photoBase64: base64 });
          const url = up?.data?.url;
          if (url) await saveProfile({ photoUri: url });
        } catch (e) {
          // Non-fatal: keep local photo and continue
          console.warn('Profile photo upload failed:', (e as any)?.message || e);
        }
      }
      navigation.navigate('MainTabs');
    } catch (e: any) {
      // Graceful fallback: continue without blocking the user
      console.warn('Save failed:', e?.message || e);
      navigation.navigate('MainTabs');
    }
  };

  const openCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow camera access.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8, allowsEditing: true, aspect: [1,1] });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      setPreviewUri(asset?.uri);
      setPreviewBase64(asset?.base64);
    } catch (e: any) {
      Alert.alert('Camera error', e?.message || 'Could not open camera');
    }
  };

  const uploadPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.9, allowsEditing: true, aspect: [1,1] });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      setPreviewUri(asset?.uri);
      setPreviewBase64(asset?.base64);
    } catch (e: any) {
      Alert.alert('Upload error', e?.message || 'Could not open gallery');
    }
  };

  const takePhotoMobile = async () => {
    // On mobile, use the same camera flow; on web, fallback to upload
    if (Platform.OS === 'web') return uploadPhoto();
    return openCamera();
  };

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}> 
      <Text style={[styles.title, { color: t.colors.textPrimary }]}>add your photo</Text>
      <Text style={[styles.subtitle, { color: t.colors.textMuted }]}>take a selfie or upload from gallery</Text>

      {previewUri ? (
        <>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image source={{ uri: previewUri }} style={styles.preview} />
          </View>
          <TouchableOpacity style={styles.primary} onPress={() => { saveAndNext(previewUri, previewBase64); navigation.navigate('MainTabs'); }} activeOpacity={0.85}>
            <Text style={styles.primaryText}>looks good ✨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => { setPreviewUri(undefined); setPreviewBase64(undefined); }} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>retake</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.primary} onPress={openCamera} activeOpacity={0.85}>
            <Text style={styles.primaryText}>open camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={uploadPhoto} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>upload photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={takePhotoMobile} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>take photo (mobile)</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, alignItems: 'stretch', justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  preview: { width: '90%', aspectRatio: 1, borderRadius: 24 },
  primary: { backgroundColor: '#000', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondary: { borderColor: '#E5E8EF', borderWidth: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  secondaryText: { color: '#000', fontSize: 18, fontWeight: '600' },
});
