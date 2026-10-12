import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import { ApiError } from '@/api/client';
import { AppLogo } from '@/components';
import { I18nProvider } from '@/i18n';
import { FirstRunGate } from '@/navigation/FirstRunGate';
import { SessionProvider } from '@/store/session';
import { DialogProvider } from '@/components/dialogs/DialogProvider';
import { AppUpdateGate } from '@/features/updates/AppUpdateGate';

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
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  useEffect(() => () => queryClient.clear(), [queryClient]);
  // Fonts are bundled, so this is a frame or two; the colour matches the splash so there is no flash.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}><AppLogo size={144} glow /></View>;
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <DialogProvider>
            <AppUpdateGate>
              <SessionProvider queryClient={queryClient}>
                <FirstRunGate />
              </SessionProvider>
            </AppUpdateGate>
          </DialogProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>;
}
