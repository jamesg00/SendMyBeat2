import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/api/auth';
import { ThemeTransition } from '@/components/theme-transition';
import { DraftProvider } from '@/state/draft';
import { StudioProvider } from '@/state/studio';
import { F, useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <Session />
    </AuthProvider>
  );
}

// Tag runs and the Upload Studio draft belong to whoever is signed in, so they start fresh
// whenever the account changes (auth clears another account's saved work before this).
function Session() {
  const { ready, user } = useAuth();
  if (!ready) return null;
  return (
    <DraftProvider key={user?.id ?? 'signed-out'}>
      <StudioProvider>
        <ThemeTransition>
          <RootStack />
        </ThemeTransition>
      </StudioProvider>
    </DraftProvider>
  );
}

function RootStack() {
  const C = useColors();
  const [fontsLoaded] = useFonts({
    [F.brand]: require('@/assets/fonts/karmatic-arcade.ttf'),
    [F.regular]: require('@/assets/fonts/Satoshi-Regular.otf'),
    [F.medium]: require('@/assets/fonts/Satoshi-Medium.otf'),
    [F.bold]: require('@/assets/fonts/Satoshi-Bold.otf'),
    [F.display]: require('@/assets/fonts/ClashGrotesk-Semibold.otf'),
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const { ready, user } = useAuth();
  const loaded = fontsLoaded && ready;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  const base = C.dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: C.bg, card: C.card, primary: C.text, text: C.text, border: C.line } };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={C.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        {/* Signed out, every app route lands on the landing screen (not the auth sheet). */}
        <Stack.Protected guard={!!user} redirectTo="/login">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="studio" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="producer/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="appearance" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pro/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pro-plan/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin-pros" options={{ presentation: 'modal' }} />
          <Stack.Screen name="verify" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin-verify" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
