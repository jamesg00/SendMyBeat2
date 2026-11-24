import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { F } from '@/theme';

// The intro that follows the native splash on a cold launch. It starts on exactly what the native
// splash shows (the S icon at 170 wide on #060D09, from app.json), so the hand-off is invisible.
// Then the icon glows and settles, the wordmark rises in under it, and the whole thing fades away
// into the app with the icon easing up a touch. Reduce Motion gets a short plain fade.
// It plays once per launch: remounts (sign in/out, theme changes) don't replay it.

const BG = '#060D09';
const ICON = 170; // must match expo-splash-screen's imageWidth in app.json
const GLOW = 260;
let played = false;

export function LaunchIntro({ onShown }: { onShown: () => void }) {
  const [visible, setVisible] = useState(!played);
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const word = useSharedValue(0);
  const cover = useSharedValue(1);

  useEffect(() => {
    if (!visible) onShown();
  }, [visible, onShown]);

  const start = () => {
    onShown();
    if (played) return;
    played = true;
    const done = () => setVisible(false);
    if (reduceMotion) {
      cover.value = withDelay(250, withTiming(0, { duration: 220 }, (ok) => ok && runOnJS(done)()));
      return;
    }
    const ease = Easing.out(Easing.cubic);
    scale.value = withSequence(
      withTiming(0.92, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.04, { duration: 420, easing: ease }),
      withDelay(320, withTiming(1.35, { duration: 380, easing: Easing.in(Easing.cubic) })),
    );
    glow.value = withSequence(withDelay(200, withTiming(1, { duration: 520, easing: ease })), withDelay(300, withTiming(0, { duration: 300 })));
    word.value = withDelay(380, withTiming(1, { duration: 460, easing: ease }));
    cover.value = withDelay(1020, withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }, (ok) => ok && runOnJS(done)()));
  };

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.55, transform: [{ scale: 0.8 + glow.value * 0.4 }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 10 }] }));
  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.fill, coverStyle]} onLayout={start}>
      <View style={styles.center}>
        <Animated.View style={[styles.glow, glowStyle]}>
          <Svg width={GLOW} height={GLOW}>
            <Defs>
              <RadialGradient id="g" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#6FE3D0" stopOpacity="0.9" />
                <Stop offset="0.45" stopColor="#4C8DFF" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#4C8DFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={GLOW} height={GLOW} fill="url(#g)" />
          </Svg>
        </Animated.View>
        <Animated.Image source={require('@/assets/images/splash-icon.png')} style={[styles.icon, iconStyle]} fadeDuration={0} />
      </View>
      <Animated.Text style={[styles.word, wordStyle]}>SENDMYBEAT</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: BG, zIndex: 1000 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  icon: { width: ICON, height: ICON },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  word: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: ICON * 0.36,
    textAlign: 'center',
    color: '#EDEDED',
    fontFamily: F.brand,
    fontSize: 15,
    letterSpacing: 4,
  },
});
