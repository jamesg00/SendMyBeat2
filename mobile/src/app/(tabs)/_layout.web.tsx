import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { font, makeStyles, useColors } from '@/theme';

// Web has no system tab bar, so draw the floating pill from the design.
export default function WebTabLayout() {
  const styles = useStyles();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View style={styles.bar}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Workflow</TabButton>
          </TabTrigger>
          <TabTrigger name="analytics" href="/analytics" asChild>
            <TabButton>Analytics</TabButton>
          </TabTrigger>
          <TabTrigger name="spotlight" href="/spotlight" asChild>
            <TabButton>Spotlight</TabButton>
          </TabTrigger>
          <TabTrigger name="prefs" href="/prefs" asChild>
            <TabButton>Profile</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

// `ref` is typed for View, not Pressable, so it is dropped; the trigger only needs onPress.
function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  const C = useColors();
  const styles = useStyles();
  return (
    <Pressable {...props} style={[styles.item, isFocused && { backgroundColor: C.card2 }]}>
      <Text style={[styles.label, { color: isFocused ? C.text : C.t2 }]}>{children}</Text>
    </Pressable>
  );
}

// backdropFilter is web-only CSS, so React Native's style types don't know it.
const blur = { backdropFilter: 'blur(24px) saturate(180%)' } as ViewStyle;

const useStyles = makeStyles((C) => ({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    height: 56,
    padding: 5,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 2,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    ...blur,
  },
  item: { flex: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, ...font('600') },
}));
