import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Platform, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureScreen } from 'react-native-view-shot';

import { setThemeTransition } from '@/theme';

// Theme changes cross-fade like the Clippr desktop app: a snapshot of the screen covers the app,
// the new colors are applied underneath, and the snapshot fades out (shorter with Reduce Motion).
// Where a snapshot isn't possible (web, or a build without the module) the switch is instant.
const FADE_MS = 420;
const REDUCED_FADE_MS = 140;

export function ThemeTransition({ children }: { children: ReactNode }) {
  const [shot, setShot] = useState<string | null>(null);
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const shown = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setThemeTransition(async (apply) => {
      let uri: string | null = null;
      try {
        uri = await captureScreen({ format: 'jpg', quality: 0.9 });
      } catch {
        uri = null;
      }
      if (!uri) {
        apply();
        return;
      }
      opacity.value = 1;
      // Wait for the snapshot to be on screen before the colors change under it.
      await new Promise<void>((resolve) => {
        shown.current = resolve;
        setShot(uri);
        setTimeout(resolve, 300);
      });
      apply();
      await new Promise((resolve) => setTimeout(resolve, 34));
      const duration = reduceMotion ? REDUCED_FADE_MS : FADE_MS;
      opacity.value = withTiming(0, { duration, easing: Easing.out(Easing.cubic) });
      setTimeout(() => setShot(null), duration + 60);
    });
    return () => setThemeTransition(null);
  }, [opacity, reduceMotion]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ flex: 1 }}>
      {children}
      {shot ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, fade]}>
          <Image source={{ uri: shot }} style={{ width: '100%', height: '100%' }} onLoad={() => shown.current?.()} fadeDuration={0} />
        </Animated.View>
      ) : null}
    </View>
  );
}
