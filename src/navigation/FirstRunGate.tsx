import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { AuthFlow, AuthMode } from '@/features/auth/AuthFlow';
import { IntroScreen } from '@/features/intro/IntroScreen';
import { preloadOnboarding } from '@/features/intro/useOnboardingCards';
import { LanguageScreen } from '@/features/language/LanguageScreen';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PlanReadyScreen } from '@/features/onboarding/PlanReadyScreen';
import { SplashScreen } from '@/features/splash/SplashScreen';
import { UpgradeView } from '@/features/subscription/UpgradeScreen';
import { applyLayoutDirection, useI18n } from '@/i18n';
import { localState } from '@/services/storage/localState';
import { captureLink } from '@/services/storage/pendingLink';
import { useSession } from '@/store/session';
import { firstRunTheme } from '@/components/firstRun';
import { OnboardingAnswers } from '@/types/domain';
import { RootNavigator } from './RootNavigator';
import { useDialog } from '@/components/dialogs/DialogProvider';

type Stage = 'splash' | 'intro' | 'language' | 'onboarding' | 'auth' | 'planReady' | 'upgrade' | 'app';

/**
 * First-launch flow: splash → intro → language → onboarding → sign-up → plan saved → trial → app.
 * Onboarding answers are kept as a local draft until the account exists, then saved to HealthyMe.
 */
export function FirstRunGate() {
  const dialog = useDialog();
  const { status, repos, setAccount } = useSession();
  const { dictionary, language } = useI18n();
  const [stage, setStage] = useState<Stage>('splash');
  const [splashDone, setSplashDone] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signUp');
  const [resetToken, setResetToken] = useState<string>();
  const [draft, setDraft] = useState<OnboardingAnswers | null>(null);
  const routed = useRef(false);

  // Installs that haven't seen the intro fetch its (admin-managed) cards while the splash plays.
  useEffect(() => {
    localState.firstRun().then((firstRun) => { if (!firstRun.introSeen) preloadOnboarding(repos.gym); }).catch(() => undefined);
  }, [repos]);

  // Decide where to go once the splash has played and the stored session is resolved.
  useEffect(() => {
    if (!splashDone || status === 'restoring' || routed.current) return;
    routed.current = true;
    (async () => {
      const [firstRun, saved] = await Promise.all([localState.firstRun(), localState.draft()]);
      setDraft(saved);
      if (status === 'signedIn') setStage(firstRun.onboardingSaved ? 'app' : saved ? 'planReady' : 'onboarding');
      else if (!firstRun.introSeen) setStage('intro');
      else { setAuthMode(saved ? 'signUp' : 'signIn'); setStage('auth'); }
    })();
  }, [splashDone, status]);

  // Signing out (or an expired refresh token) from inside the app returns to sign-in.
  useEffect(() => { if (status === 'signedOut' && stage === 'app') { setAuthMode('signIn'); setStage('auth'); } }, [stage, status]);

  const handleLink = useCallback(async (url: string | null) => {
    if (!url) return;
    // Shared exercise / invite links: remembered through sign-in, opened by the navigator when ready.
    await captureLink(url, { signedIn: status === 'signedIn' }).catch(() => undefined);
    const { path, queryParams } = Linking.parse(url);
    const value = (key: string) => (typeof queryParams?.[key] === 'string' ? (queryParams[key] as string) : undefined);
    if (path === 'reset-password' && value('token')) { setResetToken(value('token')); setAuthMode('reset'); routed.current = true; setStage('auth'); }
    if (path === 'verify-email' && value('code')) {
      try { await repos.auth.verifyEmail(value('code')!); setAccount(await repos.auth.me()); void dialog.showSuccess({ title: dictionary.auth.verified }); }
      catch { void dialog.showError({ title: dictionary.auth.errors.tokenInvalid }); }
    }
  }, [dialog, dictionary.auth.errors.tokenInvalid, dictionary.auth.verified, repos, setAccount, status]);

  useEffect(() => {
    Linking.getInitialURL().then(handleLink);
    const sub = Linking.addEventListener('url', ({ url }) => handleLink(url));
    return () => sub.remove();
  }, [handleLink]);

  const afterAuth = async (isNewAccount: boolean) => {
    const saved = await localState.draft();
    setDraft(saved);
    if (saved) setStage('planReady');
    else if (isNewAccount) setStage('onboarding');
    else { await localState.setFirstRun({ onboardingSaved: true }); setStage('app'); }
  };

  switch (stage) {
    case 'splash': return <SplashScreen onDone={() => setSplashDone(true)} />;
    case 'intro': return <IntroScreen onDone={() => { localState.setFirstRun({ introSeen: true }); setStage('language'); }} />;
    case 'language': return <LanguageScreen firstRun onContinue={async () => {
      await localState.setFirstRun({ languageChosen: true });
      // Arabic: switch to right-to-left now (the app reloads and resumes at onboarding).
      if (!applyLayoutDirection(language)) setStage('onboarding');
    }} />;
    case 'onboarding': return <OnboardingScreen onExit={status === 'signedIn' ? undefined : () => setStage('language')} onComplete={async (answers) => {
      await localState.saveDraft(answers);
      setDraft(answers);
      if (status === 'signedIn') setStage('planReady'); else { setAuthMode('signUp'); setStage('auth'); }
    }} />;
    case 'auth': return <AuthFlow key={`${authMode}-${resetToken ?? ''}`} initialMode={authMode} resetToken={resetToken} onAuthenticated={afterAuth} />;
    case 'planReady': return draft ? <PlanReadyScreen profile={draft} save={() => repos.gym.saveOnboarding(draft)} onBack={() => setStage('onboarding')} onDone={async () => {
      await Promise.all([localState.clearDraft(), localState.setFirstRun({ onboardingSaved: true })]);
      // Show the offer only when admins enabled the paywall and there is something to offer.
      const access = await repos.gym.getAccess().catch(() => null);
      setStage(access && access.paywallEnabled && access.premiumVisible && !access.premium && (access.trialEligible || access.billingEnabled) ? 'upgrade' : 'app');
    }} /> : <View style={{ flex: 1, backgroundColor: firstRunTheme.background }} />;
    case 'upgrade': return <UpgradeView firstRun onContinue={() => setStage('app')} />;
    case 'app': return <RootNavigator />;
  }
}
