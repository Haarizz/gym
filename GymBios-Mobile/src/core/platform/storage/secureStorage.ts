import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const memoryStore = new Map<string, string>();

const secureStorageImpl: SecureStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }

    return SecureStore.getItemAsync(key);
  },

  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {
        memoryStore.set(key, value);
      }
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key) {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {
        memoryStore.delete(key);
      }
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

export const secureStorage = secureStorageImpl;
