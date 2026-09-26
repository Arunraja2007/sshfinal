import { supabase } from './client';

// In-memory cache for MP photo URLs mapped by normalized name and ID
let photoCache: Map<string, string> | null = null;
let fetchPromise: Promise<Map<string, string>> | null = null;

function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^hon'ble\s+mp\s+/i, '')
    .replace(/^mp\s+/i, '')
    .replace(/shri|smt\.|smt|dr\.|dr|shrimati|km\.|adv\.|adv|captain|col\./gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Fetch all MP photos from Supabase profiles (cached in memory)
 */
export async function getMpPhotosMap(): Promise<Map<string, string>> {
  if (photoCache) return photoCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, mp_name, full_name, photo_url')
        .eq('role', 'MP')
        .not('photo_url', 'is', null);

      const map = new Map<string, string>();
      if (!error && Array.isArray(data)) {
        for (const p of data) {
          if (!p.photo_url) continue;
          if (p.id) map.set(p.id, p.photo_url);
          if (p.mp_name) {
            map.set(p.mp_name.toUpperCase().trim(), p.photo_url);
            map.set(normalizeName(p.mp_name), p.photo_url);
          }
          if (p.full_name) {
            map.set(p.full_name.toUpperCase().trim(), p.photo_url);
            map.set(normalizeName(p.full_name), p.photo_url);
          }
        }
      }
      photoCache = map;
      return map;
    } catch (err) {
      console.warn('[mpPhotoService] Failed to load MP photos:', err);
      const emptyMap = new Map<string, string>();
      photoCache = emptyMap;
      return emptyMap;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Synchronously look up an MP's photo URL from cache if already loaded
 */
export function getCachedMpPhoto(mpNameOrId?: string | null): string | null {
  if (!mpNameOrId || !photoCache) return null;
  const trimmed = mpNameOrId.trim();
  return (
    photoCache.get(trimmed) ||
    photoCache.get(trimmed.toUpperCase()) ||
    photoCache.get(normalizeName(trimmed)) ||
    null
  );
}

/**
 * Update the in-memory cache and broadcast event
 */
export function setCachedMpPhoto(mpNameOrId: string, photoUrl: string): void {
  if (!photoCache) photoCache = new Map();
  const trimmed = mpNameOrId.trim();
  photoCache.set(trimmed, photoUrl);
  photoCache.set(trimmed.toUpperCase(), photoUrl);
  photoCache.set(normalizeName(trimmed), photoUrl);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mp-photo-updated', { detail: { mpNameOrId, photoUrl } }));
  }
}

/**
 * Update MP photo in Supabase profiles and local cache
 */
export async function updateMpPhotoInDb(profileId: string, mpName: string, photoUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: photoUrl })
      .eq('id', profileId);

    if (error) {
      console.warn('[mpPhotoService] Supabase profile photo update warning:', error.message);
    }
    setCachedMpPhoto(profileId, photoUrl);
    if (mpName) setCachedMpPhoto(mpName, photoUrl);
    return true;
  } catch (err) {
    console.warn('[mpPhotoService] Failed to update photo in DB:', err);
    setCachedMpPhoto(profileId, photoUrl);
    if (mpName) setCachedMpPhoto(mpName, photoUrl);
    return true;
  }
}
