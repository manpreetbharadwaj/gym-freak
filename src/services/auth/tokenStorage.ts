import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
}

// Deliberately different keys from Healthy Me's app.auth.* namespace.
const ACCESS_TOKEN_KEY = 'gymfreak.auth.accessToken';
const REFRESH_TOKEN_KEY = 'gymfreak.auth.refreshToken';

/**
 * iOS keeps Keychain items when an app is deleted, but app storage is wiped. Without this marker a
 * reinstall would silently sign the previous user back in on a "fresh" install, so tokens are only
 * trusted when app storage shows they were written by this installation.
 */
const INSTALL_MARKER_KEY = 'gymfreak.auth.installMarker';
let installChecked: Promise<void> | null = null;
function dropTokensFromPreviousInstall() {
  installChecked ??= (async () => {
    if (await AsyncStorage.getItem(INSTALL_MARKER_KEY).catch(() => 'unknown')) return;
    await clearTokens();
    await AsyncStorage.setItem(INSTALL_MARKER_KEY, '1').catch(() => undefined);
  })();
  return installChecked;
}

async function getTokens(): Promise<StoredTokens | null> {
  await dropTokensFromPreviousInstall();
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  return accessToken ? { accessToken, refreshToken } : null;
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
  await dropTokensFromPreviousInstall();
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined),
  ]);
}

export const tokenStorage = { getTokens, saveTokens, clearTokens };
