import { createMockRepositories } from '@/services/mock/mockRepository';
import { createApiRepositories } from './apiRepository';
import { Repositories } from './types';

/**
 * `EXPO_PUBLIC_GYM_DATA_MODE=api` + `EXPO_PUBLIC_API_URL=https://…` talks to the shared HealthyMe backend.
 * Anything else uses the offline mock so the app runs without a server.
 */
export function createRepositories(onSessionExpired: () => void): Repositories {
  const mode = process.env.EXPO_PUBLIC_GYM_DATA_MODE ?? 'mock';
  const baseURL = process.env.EXPO_PUBLIC_API_URL;
  return mode === 'api' && baseURL ? createApiRepositories(baseURL, onSessionExpired) : createMockRepositories();
}

export { ActiveSessionConflict } from './types';
export type { AuthRepository, GymRepository, Repositories, SignInInput, SignUpInput } from './types';
export type { SupportRepository } from './support';
