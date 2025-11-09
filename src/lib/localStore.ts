import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
// Lightweight UUID generator that avoids Web Crypto requirements
function genId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `id_${t}_${r}`;
}

const KEYS = {
  profile: 'aura:profile',
  answers: 'aura:answers',
  audioFiles: 'aura:audioFiles',
  embeddings: 'aura:embeddings',
  progress: 'aura:progress',
  userToken: 'aura:userToken',
  connections: 'aura:connections',
};

const CONSENT_KEY = 'aura:consent';
const MUTE_KEY = 'aura:muted';
const CURRENT_Q_KEY = 'aura:currentQuestion';
// Resolve a safe base directory across platforms (documentDirectory may be undefined or missing in types)
const NATIVE_BASE: string = (((FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory) ?? '') as string;
const AUDIO_DIR: string = NATIVE_BASE ? `${NATIVE_BASE}aura_audio/` : '';

async function ensureAudioDir(): Promise<void> {
  try {
    if (!AUDIO_DIR) return; // no native directory available (e.g., web)
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
  // Merge with existing profile to avoid overwriting fields like name
  let existing: any = null;
  try {
    const raw = await AsyncStorage.getItem(KEYS.profile);
    existing = raw ? JSON.parse(raw) : null;
  } catch {}
  const toSave = { ...(existing || {}), ...(profile || {}), createdAt: (existing?.createdAt ?? profile?.createdAt ?? now) };
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
  const id = genId();
  const filename = `${id}.wav`;
  const dest = AUDIO_DIR ? `${AUDIO_DIR}${filename}` : tmpUri;
  if (AUDIO_DIR) {
    await FileSystem.copyAsync({ from: tmpUri, to: dest });
    // Attempt to delete the temp file (ignore errors)
    try { await FileSystem.deleteAsync(tmpUri, { idempotent: true }); } catch {}
  }
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
  await AsyncStorage.multiRemove([KEYS.profile, KEYS.answers, KEYS.audioFiles, KEYS.embeddings, KEYS.progress, KEYS.userToken, MUTE_KEY, CURRENT_Q_KEY]);
  try { await SecureStore.deleteItemAsync(CONSENT_KEY); } catch {}
  // Delete audio directory
  try {
    if (AUDIO_DIR) {
      const info = await FileSystem.getInfoAsync(AUDIO_DIR);
      if (info.exists) {
        await FileSystem.deleteAsync(AUDIO_DIR, { idempotent: true });
      }
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

export async function getCurrentQuestion(): Promise<number> {
  const raw = await AsyncStorage.getItem(CURRENT_Q_KEY);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

export async function setCurrentQuestion(index: number): Promise<void> {
  await AsyncStorage.setItem(CURRENT_Q_KEY, String(Math.max(0, index | 0)));
}

export async function saveProgress(obj: any): Promise<void> {
  await AsyncStorage.setItem(KEYS.progress, JSON.stringify(obj));
}

export async function loadProgress(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(KEYS.progress);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveUserToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.userToken, token);
}

export async function getUserToken(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEYS.userToken);
  return raw || null;
}

// Connections and Chat Threads
export type Connection = { id: string; name: string; avatarUri?: string; tags?: string[] };

export async function getConnections(): Promise<Connection[]> {
  const raw = await AsyncStorage.getItem(KEYS.connections);
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export async function addConnection(conn: Connection): Promise<Connection[]> {
  const list = await getConnections();
  const exists = list.find((c) => c.id === conn.id);
  const next = exists ? list.map((c) => (c.id === conn.id ? { ...c, ...conn } : c)) : [...list, conn];
  await AsyncStorage.setItem(KEYS.connections, JSON.stringify(next));
  return next;
}

function msgKey(userId: string) { return `aura:messages:${userId}`; }
export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; ts: number };

export async function getMessages(userId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(msgKey(userId));
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export async function appendMessage(userId: string, m: ChatMessage): Promise<ChatMessage[]> {
  const list = await getMessages(userId);
  const next = [...list, m];
  await AsyncStorage.setItem(msgKey(userId), JSON.stringify(next));
  return next;
}

export async function ensureDefaultConnections(): Promise<void> {
  const existing = await getConnections();
  if (existing.length) return;
  const seed: Connection[] = [
    { id: 'self', name: 'myself', avatarUri: 'https://api.dicebear.com/7.x/avataaars/png?seed=myself&radius=50', tags: ['genuine','true'] },
    { id: 'sarah', name: 'Sarah Chen', avatarUri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Sarah%20Chen&radius=50', tags: ['thoughtful','creative','expressive'] },
    { id: 'marcus', name: 'Marcus Johnson', avatarUri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Marcus%20Johnson&radius=50', tags: ['social','technical','playful'] },
    { id: 'zoe', name: 'Zoe Martinez', avatarUri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Zoe%20Martinez&radius=50', tags: ['artistic','relaxed','empathetic'] },
    { id: 'jordan', name: 'Jordan Lee', avatarUri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Jordan%20Lee&radius=50', tags: ['ambitious','energetic','leader'] },
  ];
  await AsyncStorage.setItem(KEYS.connections, JSON.stringify(seed));
}
