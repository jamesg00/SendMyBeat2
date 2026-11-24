import { Image } from 'expo-image';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

// The launch art drawn by the app itself, on top of everything until the app is ready.
// It matches the native splash exactly (app.json: #0A0A0A, splash-icon.png at 200 wide), so in a
// build the hand-off is invisible, and in Expo Go, which shows the plain icon instead of the native
// splash, you still see it. It then fades and lifts away.

export const SPLASH_BG = '#0A0A0A';
const SPLASH_SIZE = 200; // app.json "imageWidth"
const MIN_VISIBLE_MS = 700;

let appReady = false;
const listeners = new Set<() => void>();

/** Call once fonts and sign-in are loaded; the splash then fades out. */
export function markAppReady() {
  if (appReady) return;
  appReady = true;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function LaunchSplash() {
  const ready = useSyncExternalStore(subscribe, () => appReady);
  const [gone, setGone] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt));
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setGone(true));
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, fade, mountedAt]);

  if (gone) return null;
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] });
  return (
    <Animated.View pointerEvents={ready ? 'none' : 'auto'} style={[styles.fill, { opacity: fade }]} accessibilityLabel="SendMyBeat is loading">
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={require('@/assets/images/splash-icon.png')} style={styles.art} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center' },
  art: { width: SPLASH_SIZE, height: SPLASH_SIZE },
});
