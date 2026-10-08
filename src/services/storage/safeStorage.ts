import AsyncStorage from '@react-native-async-storage/async-storage';

/** All non-secret Gym Freak persistence is namespaced so it cannot collide with Healthy Me. */
const NAMESPACE = 'gymfreak.';

const keyFor = (key: string) => `${NAMESPACE}${key}`;

async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(keyFor(key));
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(keyFor(key), JSON.stringify(value));
}

async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(key));
}

export const safeStorage = { get, set, remove, namespace: NAMESPACE };
