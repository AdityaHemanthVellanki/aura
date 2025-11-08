import axios from 'axios';
import { storage } from './firebaseClient';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000'; // Set EXPO_PUBLIC_SERVER_URL in .env

export const api = axios.create({ baseURL });

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