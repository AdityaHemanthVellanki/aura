import { loadProfile } from './localStore';

function normalizeName(name: string): string {
  const base = (name || '').toLowerCase();
  return base.replace(/[^a-z0-9]+/g, '');
}

function randomSuffix(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function genUniqueUsername(name: string): Promise<string> {
  const base = normalizeName(name);
  let candidate = base ? `${base}${randomSuffix()}` : `user${randomSuffix()}`;
  const profile = await loadProfile();
  if (profile && profile.username) {
    if (profile.username === candidate) {
      // regenerate if conflict
      candidate = base ? `${base}${randomSuffix()}` : `user${randomSuffix()}`;
    }
  }
  return candidate;
}

