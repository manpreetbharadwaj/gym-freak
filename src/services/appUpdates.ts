import axios from 'axios';
import Constants from 'expo-constants';
import { AppState, Linking, Platform } from 'react-native';
import { safeStorage } from '@/services/storage/safeStorage';

export interface UpdateFeature { id: string; title: string; description?: string | null; imageUrl?: string | null; icon?: string | null; order: number }
export interface AppUpdatePolicy {
  policyId: string; updateAvailable: boolean; mandatory: boolean; latestVersion: string; latestBuild: number;
  minimumSupportedBuild: number; title: string; description: string; features: UpdateFeature[]; storeUrl: string;
  reminderHours: number; publishedAt: string;
}
interface Cached { policy: AppUpdatePolicy; checkedAt: number; expiresAt: number }

const CACHE_KEY = 'app-update-policy-v1';
export const UPDATE_THROTTLE_MS = 15 * 60_000;
export const UPDATE_CACHE_MS = 24 * 60 * 60_000;

export function installedBuild() {
  const value = Constants.nativeBuildVersion ?? (Platform.OS === 'android' ? Constants.expoConfig?.android?.versionCode : Constants.expoConfig?.ios?.buildNumber);
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function checkForAppUpdate(language: string): Promise<{ policy: AppUpdatePolicy | null; cached: boolean }> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) return { policy: null, cached: false };
  try {
    const response = await axios.get<AppUpdatePolicy>(`${base}/v1/app/version-check`, {
      params: { platform: Platform.OS, appVersion: Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.0.0', build: installedBuild(), runtimeVersion: String(Constants.expoConfig?.runtimeVersion ?? '') },
      headers: { 'Accept-Language': language }, timeout: 10_000,
    });
    const policy = validatePolicy(response.data);
    if (!policy) throw new Error('Invalid update policy');
    if (policy.features) policy.features = policy.features.map((feature) => ({ ...feature, imageUrl: feature.imageUrl?.startsWith('/') ? `${base}${feature.imageUrl}` : feature.imageUrl }));
    await safeStorage.set(CACHE_KEY, { policy, checkedAt: Date.now(), expiresAt: Date.now() + UPDATE_CACHE_MS } satisfies Cached);
    return { policy, cached: false };
  } catch {
    const cached = await safeStorage.get<Cached | null>(CACHE_KEY, null);
    if (cached && cached.expiresAt > Date.now() && validatePolicy(cached.policy)) {
      if (cached.policy.updateAvailable && installedBuild() >= cached.policy.latestBuild) return { policy: null, cached: false };
      return { policy: cached.policy, cached: true };
    }
    return { policy: null, cached: false };
  }
}

export function optionalDismissKey(policy: AppUpdatePolicy) { return `update-dismissed.${Platform.OS}.${policy.latestBuild}`; }
export async function openVerifiedStoreUrl(url: string) {
  const parsed = /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(url);
  if (!parsed || !(await Linking.canOpenURL(url))) throw new Error('The store page is unavailable. Please try again later.');
  await Linking.openURL(url);
}
export function subscribeToForeground(run: () => void) {
  return AppState.addEventListener('change', (state) => { if (state === 'active') run(); });
}

function validatePolicy(value: AppUpdatePolicy): AppUpdatePolicy | null {
  if (!value || typeof value !== 'object' || typeof value.updateAvailable !== 'boolean' || typeof value.mandatory !== 'boolean') return null;
  if (!value.updateAvailable) return value;
  if (!Number.isSafeInteger(value.latestBuild) || !Number.isSafeInteger(value.minimumSupportedBuild) || value.minimumSupportedBuild > value.latestBuild) return null;
  if (!value.title || !value.latestVersion || !/^https:\/\//.test(value.storeUrl) || !Array.isArray(value.features)) return null;
  return value;
}
