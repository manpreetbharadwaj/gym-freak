import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { ApiError } from '@/api/client';
import { AppLogo } from '@/components';
import { I18nProvider } from '@/i18n';
import { FirstRunGate } from '@/navigation/FirstRunGate';
import { SessionProvider } from '@/store/session';

// Refetch stale data when the app returns to the foreground.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        // Retry flaky networks, never retry definitive answers (401/403/404/422).
        retry: (count, error) => count < 2 && (!(error instanceof ApiError) || error.kind === 'network' || error.kind === 'server'),
      },
    },
  });
}

export default function App() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Sora_600SemiBold, Sora_700Bold });
  useEffect(() => () => queryClient.clear(), [queryClient]);
  // Fonts are bundled, so this is a frame or two; the colour matches the splash so there is no flash.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}><AppLogo size={144} glow /></View>;
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <SessionProvider queryClient={queryClient}>
            <FirstRunGate />
          </SessionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>;
}
