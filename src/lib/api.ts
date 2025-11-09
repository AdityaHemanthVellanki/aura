import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './firebaseClient';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

function deriveCandidates(): string[] {
  const envUrl = process.env.EXPO_PUBLIC_SERVER_URL?.trim();
  const hostFromExpo = (Constants as any)?.expoConfig?.hostUri?.split(':')[0] || (Constants as any)?.expoGoConfig?.debuggerHost?.split(':')[0];
  const candidates: string[] = [];
  if (envUrl) candidates.push(envUrl);
  if (hostFromExpo) candidates.push(`http://${hostFromExpo}:3000`);
  if (Platform.OS === 'android') candidates.push('http://10.0.2.2:3000');
  candidates.push('http://localhost:3000');
  return Array.from(new Set(candidates));
}

const CANDIDATES = deriveCandidates();
let idx = 0;
export const api = axios.create({ baseURL: CANDIDATES[idx] });

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const message: string = (error?.message || '').toLowerCase();
    const cfg = error?.config;
    // Retry on network errors with next candidate baseURL
    if (cfg && (message.includes('network error') || message.includes('failed')) && idx < CANDIDATES.length - 1) {
      idx += 1;
      const next = CANDIDATES[idx];
      api.defaults.baseURL = next;
      return api.request({ ...cfg, baseURL: next });
    }
    throw error;
  }
);

export async function uploadAudio(fileUri: string, filename: string, userId: string) {
  if (!storage) {
    throw new Error('Firebase Storage not configured. Set EXPO_PUBLIC_FIREBASE_* envs.');
  }
  const blob = await (await fetch(fileUri)).blob();
  const path = `voices/${userId}/${Date.now()}.wav`;
  const storageRef = ref(storage, path);
  await uploadBytesResumable(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  const res = await api.post('/api/upload', { userId, path, url });
  return res.data as { id: string; url: string };
}

export async function transcribe(url: string, userId: string) {
  const res = await api.post('/api/transcribe', { url, userId });
  return res.data as { text: string };
}

export async function createVoice(sampleUrls: string[], name: string, userId: string) {
  const res = await api.post('/api/createVoice', { sampleUrls, name, userId });
  return res.data as { voice_id: string };
}

export async function generateReply(message: string, userId: string, voice_id?: string) {
  const res = await api.post('/api/generateReply', { message, userId, voice_id });
  return res.data as { text: string; audioUrl?: string };
}

export async function indexMemory(userId: string, text: string, source?: string) {
  const res = await api.post('/api/indexMemory', { userId, text, source });
  return res.data as { ok: boolean };
}

export async function deleteData(userId: string) {
  const res = await api.post('/api/deleteData', { userId });
  return res.data as { ok: boolean };
}
