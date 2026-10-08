import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { ApiErrorBody, ApiTokens } from './contracts';

export type ApiErrorKind = 'network' | 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'validation' | 'rate-limited' | 'server';

/** One error type for the whole app so screens never parse axios errors. */
export class ApiError extends Error {
  constructor(public kind: ApiErrorKind, message: string, public status?: number, public requestId?: string) {
    super(message);
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const axiosError = error as AxiosError<ApiErrorBody>;
  if (!axiosError.response) return new ApiError('network', 'Network unavailable');
  const { status, data } = axiosError.response;
  const message = data?.error?.message ?? axiosError.message;
  const requestId = data?.error?.requestId;
  const kind: ApiErrorKind = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 404 ? 'not-found' : status === 409 ? 'conflict' : status === 429 ? 'rate-limited' : status === 400 || status === 422 ? 'validation' : 'server';
  return new ApiError(kind, message, status, requestId);
}

/** Content language sent to HealthyMe; catalog, stories and achievements come back localized. */
let apiLocale = 'en';
export const setApiLocale = (locale: string) => { apiLocale = locale; };

export { resolveMediaUrl } from './media';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; _skipAuth?: boolean };

/**
 * HealthyMe HTTP client: bearer auth, single-flight refresh-token rotation and normalised errors.
 * `onSessionExpired` lets the session store sign the user out when refresh fails.
 */
export function createApiClient(baseURL: string, onSessionExpired: () => void): AxiosInstance {
  const client = axios.create({ baseURL: `${baseURL.replace(/\/$/, '')}/v1`, timeout: 15000 });
  let refreshing: Promise<string | null> | null = null;

  const refresh = async () => {
    const tokens = await tokenStorage.getTokens();
    if (!tokens?.refreshToken) return null;
    try {
      // Plain axios: the refresh call must not pass through the 401 interceptor below.
      const { data } = await axios.post<ApiTokens>(`${client.defaults.baseURL}/auth/refresh`, { refreshToken: tokens.refreshToken }, { timeout: 15000 });
      await tokenStorage.saveTokens(data);
      return data.accessToken;
    } catch {
      await tokenStorage.clearTokens();
      return null;
    }
  };

  client.interceptors.request.use(async (config: RetriableConfig) => {
    config.headers['Accept-Language'] = apiLocale;
    if (config._skipAuth) return config;
    const tokens = await tokenStorage.getTokens();
    if (tokens?.accessToken) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return config;
  });

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && config && !config._retried && !config._skipAuth) {
      config._retried = true;
      refreshing ??= refresh().finally(() => { refreshing = null; });
      const accessToken = await refreshing;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        return client.request(config);
      }
      onSessionExpired();
    }
    throw toApiError(error);
  });

  return client;
}

/** Marks a request as public (login, register, password reset) so no stale token is attached. */
export const publicRequest = { _skipAuth: true } as Record<string, unknown>;
