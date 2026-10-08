import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { ApiError, setApiLocale } from '@/api/client';
import { useI18n } from '@/i18n';
import { createRepositories, Repositories, SignInInput, SignUpInput } from '@/services/repositories';
import { safeStorage } from '@/services/storage/safeStorage';
import { Account } from '@/types/domain';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: AuthStatus;
  account: Account | null;
  repos: Repositories;
  signIn(input: SignInInput): Promise<Account>;
  signUp(input: SignUpInput): Promise<Account>;
  signOut(): Promise<void>;
  setAccount(account: Account): void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [account, setAccountState] = useState<Account | null>(null);
  const expire = useRef(() => undefined as void);
  const repos = useMemo(() => createRepositories(() => expire.current()), []);

  const setAccount = useCallback((next: Account | null) => {
    setAccountState(next);
    setStatus(next ? 'signedIn' : 'signedOut');
    if (next) safeStorage.set('account', next).catch(() => undefined); else safeStorage.remove('account').catch(() => undefined);
  }, []);

  expire.current = () => { queryClient.clear(); setAccount(null); };

  // Content (catalog, stories, achievements) is localized by HealthyMe: refetch it when the language changes.
  const { language } = useI18n();
  const previousLanguage = useRef(language);
  setApiLocale(language);
  useEffect(() => {
    if (previousLanguage.current === language) return;
    previousLanguage.current = language;
    queryClient.invalidateQueries();
  }, [language, queryClient]);

  useEffect(() => {
    repos.auth.restore()
      .then((restored) => setAccount(restored))
      .catch(async (error) => {
        // Offline with a stored session: keep the user in, screens show retryable errors.
        const cached = error instanceof ApiError && error.kind === 'network' ? await safeStorage.get<Account | null>('account', null) : null;
        setAccount(cached);
      });
  }, [repos, setAccount]);

  const value = useMemo<SessionValue>(() => ({
    status,
    account,
    repos,
    async signIn(input) { const next = await repos.auth.signIn(input); queryClient.clear(); setAccount(next); return next; },
    async signUp(input) { const next = await repos.auth.signUp(input); queryClient.clear(); setAccount(next); return next; },
    async signOut() {
      // Stop pushes to this device for the old account while the session is still valid.
      await repos.gym.unregisterDevice().catch(() => undefined);
      await repos.auth.signOut(); queryClient.clear(); setAccount(null);
    },
    setAccount: (next) => setAccount(next),
  }), [account, queryClient, repos, setAccount, status]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

export const useRepos = () => useSession().repos;
