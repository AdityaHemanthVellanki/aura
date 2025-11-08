import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  profile: 'aura:profile',
  answers: 'aura:answers',
  audioFiles: 'aura:audioFiles',
  embeddings: 'aura:embeddings',
};

const CONSENT_KEY = 'aura:consent';
const MUTE_KEY = 'aura:muted';
const AUDIO_DIR = `${FileSystem.documentDirectory}aura_audio/`;

async function ensureAudioDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
    }
  } catch (e) {
    // swallow
  }
}

export async function saveProfile(profile: any): Promise<any> {
  const now = Date.now();
  const toSave = { ...profile, createdAt: profile?.createdAt ?? now };
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(toSave));
  return toSave;
}

export async function loadProfile(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function appendAnswer(answer: any): Promise<any[]> {
  const existingRaw = await AsyncStorage.getItem(KEYS.answers);
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  const next = [...existing, { ...answer, timestamp: answer?.timestamp ?? Date.now() }];
  await AsyncStorage.setItem(KEYS.answers, JSON.stringify(next));
  return next;
}

export async function loadAnswers(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEYS.answers);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveAudioFromUri(tmpUri: string): Promise<{ id: string; uri: string; createdAt: number }> {
  await ensureAudioDir();
  const id = uuidv4();
  const filename = `${id}.wav`;
  const dest = `${AUDIO_DIR}${filename}`;
  await FileSystem.copyAsync({ from: tmpUri, to: dest });
  // Attempt to delete the temp file (ignore errors)
  try { await FileSystem.deleteAsync(tmpUri, { idempotent: true }); } catch {}
  const createdAt = Date.now();
  const entry = { id, uri: dest, createdAt };
  const indexRaw = await AsyncStorage.getItem(KEYS.audioFiles);
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  const next = [...index, entry];
  await AsyncStorage.setItem(KEYS.audioFiles, JSON.stringify(next));
  return entry;
}

export async function listAudioFiles(): Promise<Array<{ id: string; uri: string; createdAt: number }>> {
  const raw = await AsyncStorage.getItem(KEYS.audioFiles);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function deleteAudioFile(id: string): Promise<boolean> {
  const list = await listAudioFiles();
  const target = list.find((f) => f.id === id);
  if (target) {
    try { await FileSystem.deleteAsync(target.uri, { idempotent: true }); } catch {}
  }
  const next = list.filter((f) => f.id !== id);
  await AsyncStorage.setItem(KEYS.audioFiles, JSON.stringify(next));
  return !!target;
}

export async function setConsent(evidenceTranscript?: string, proofAudioId?: string): Promise<{ accepted: boolean; timestamp: number; evidenceTranscript?: string; proofAudioId?: string }> {
  const obj: { accepted: boolean; timestamp: number; evidenceTranscript?: string; proofAudioId?: string } = {
    accepted: true,
    timestamp: Date.now(),
  };
  if (evidenceTranscript) obj.evidenceTranscript = evidenceTranscript;
  if (proofAudioId) obj.proofAudioId = proofAudioId;
  await SecureStore.setItemAsync(CONSENT_KEY, JSON.stringify(obj));
  return obj;
}

export async function getConsent(): Promise<{ accepted: boolean; timestamp: number; evidenceTranscript?: string; proofAudioId?: string } | null> {
  const raw = await SecureStore.getItemAsync(CONSENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function addEmbedding(obj: any): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEYS.embeddings);
  const arr = raw ? JSON.parse(raw) : [];
  const next = [...arr, obj];
  await AsyncStorage.setItem(KEYS.embeddings, JSON.stringify(next));
  return next;
}

export async function loadEmbeddings(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEYS.embeddings);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function wipeLocalData(): Promise<void> {
  // Clear known keys
  await AsyncStorage.multiRemove([KEYS.profile, KEYS.answers, KEYS.audioFiles, KEYS.embeddings, MUTE_KEY]);
  try { await SecureStore.deleteItemAsync(CONSENT_KEY); } catch {}
  // Delete audio directory
  try {
    const info = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(AUDIO_DIR, { idempotent: true });
    }
  } catch {}
}

// Alias for deliverables naming
export const deleteAllData = wipeLocalData;

export async function getMute(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(MUTE_KEY);
  if (!raw) return false;
  try {
    return JSON.parse(raw) === true;
  } catch {
    return raw === 'true';
  }
}

export async function setMute(muted: boolean): Promise<void> {
  await AsyncStorage.setItem(MUTE_KEY, JSON.stringify(!!muted));
}
