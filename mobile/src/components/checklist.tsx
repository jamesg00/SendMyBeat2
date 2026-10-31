import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { F, font, makeStyles, useColors } from '@/theme';

// What a screen still needs before you submit: a segmented bar that fills as items get done,
// and one chip per item. Missing items are tappable, so the chip takes you straight to the fix.

export type CheckItem = { label: string; done: boolean; optional?: boolean; onPress?: () => void };

export function Checklist({ title, items }: { title?: string; items: CheckItem[] }) {
  const s = useStyles();
  const required = items.filter((i) => !i.optional);
  const left = required.filter((i) => !i.done);
  const summary = left.length ? `${required.length - left.length} of ${required.length} ready · add ${left[0].label.toLowerCase()}` : 'All set';

  return (
    <View style={s.wrap} accessibilityRole="summary" accessibilityLabel={`${title ?? 'Checklist'}: ${summary}`}>
      <View style={s.head}>
        <Text style={s.title}>{title ?? 'BEFORE YOU SUBMIT'}</Text>
        <Text style={[s.count, !left.length && s.countDone]}>{summary}</Text>
      </View>
      <View style={s.bar}>
        {required.map((i) => (
          <Segment key={i.label} done={i.done} />
        ))}
      </View>
      <View style={s.chips}>
        {items.map((i) => (
          <Chip key={i.label} item={i} />
        ))}
      </View>
    </View>
  );
}

function Segment({ done }: { done: boolean }) {
  const s = useStyles();
  const C = useColors();
  const fill = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(done ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [done, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={s.segment}>
      <Animated.View style={[s.segmentFill, { backgroundColor: C.acc }, style]} />
    </View>
  );
}

function Chip({ item }: { item: CheckItem }) {
  const s = useStyles();
  const C = useColors();
  const tappable = !item.done && !!item.onPress;
  return (
    <Pressable
      onPress={tappable ? item.onPress : undefined}
      disabled={!tappable}
      accessibilityRole={tappable ? 'button' : undefined}
      accessibilityState={{ checked: item.done }}
      accessibilityLabel={`${item.label}${item.optional ? ', optional' : ''}: ${item.done ? 'done' : 'missing'}`}
      style={({ pressed }) => [s.chip, item.done ? s.chipDone : !item.optional && s.chipTodo, pressed && { opacity: 0.6 }]}>
      <View style={[s.mark, item.done && { backgroundColor: C.acc, borderColor: C.acc }, !item.done && !item.optional && { borderColor: C.text }]}>
        {item.done ? <Text style={s.markText}>✓</Text> : null}
      </View>
      <Text style={[s.chipText, item.done && { color: C.t2 }]}>
        {item.label}
        {item.optional && !item.done ? <Text style={{ color: C.t3 }}> · optional</Text> : null}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((C) => ({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  title: { color: C.t3, fontSize: 10.5, letterSpacing: 0.5, fontFamily: F.monoMedium },
  count: { flexShrink: 1, color: C.t2, fontSize: 12, textAlign: 'right', ...font() },
  countDone: { color: C.acc, ...font('600') },
  bar: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: C.card2 },
  segmentFill: { height: 4, borderRadius: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.line },
  chipDone: { borderColor: C.lineSoft, backgroundColor: C.card },
  chipTodo: { borderColor: C.text, borderStyle: 'dashed' },
  mark: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  markText: { color: C.onAcc, fontSize: 8.5, ...font('700') },
  chipText: { color: C.text, fontSize: 12.5, ...font('500') },
}));
