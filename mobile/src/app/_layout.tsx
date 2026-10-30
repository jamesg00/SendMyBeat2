import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/api/auth';
import { DraftProvider } from '@/state/draft';
import { StudioProvider } from '@/state/studio';
import { C, F } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.card, primary: C.text, text: C.text, border: C.line },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <DraftProvider>
        <StudioProvider>
          <RootStack />
        </StudioProvider>
      </DraftProvider>
    </AuthProvider>
  );
}

function RootStack() {
  const [fontsLoaded] = useFonts({
    [F.brand]: require('@/assets/fonts/karmatic-arcade.ttf'),
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const { ready, user } = useAuth();
  const loaded = fontsLoaded && ready;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="studio" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="producer/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
