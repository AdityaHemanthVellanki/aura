import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000'; // Set EXPO_PUBLIC_SERVER_URL in .env

export const api = axios.create({ baseURL });

export async function uploadAudio(fileUri: string, filename: string, userId: string) {
  const form = new FormData();
  // @ts-ignore - React Native FormData accepts any
  form.append('file', { uri: fileUri, name: filename, type: 'audio/m4a' });
  form.append('userId', userId);
  const res = await api.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { url: string; storagePath: string };
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