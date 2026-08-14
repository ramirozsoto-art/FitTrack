// Adaptador de almacenamiento para que Supabase persista la sesión con
// expo-secure-store en vez de AsyncStorage.
//
// expo-secure-store tiene un límite de ~2048 bytes por valor, pero el
// access_token + refresh_token que guarda Supabase suele superarlo.
// Por eso partimos el valor en "chunks" numerados antes de guardarlo.
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

async function getChunkCount(key: string): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(`${key}_chunks`);
  return raw ? parseInt(raw, 10) : null;
}

export const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const count = await getChunkCount(key);
    if (count === null) {
      // Compatibilidad con un valor guardado sin chunking.
      return SecureStore.getItemAsync(key);
    }
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}_${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk))
    );
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    const count = await getChunkCount(key);
    if (count !== null) {
      await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`))
      );
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};
