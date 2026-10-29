import { NativeTabs } from 'expo-router/native-tabs';

import { C } from '@/theme';

// Native tab bar: Liquid Glass on iOS 26, Material on Android.
export default function TabLayout() {
  return (
    <NativeTabs tintColor={C.acc} backgroundColor={C.card} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Workflow</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label>Analytics</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spotlight">
        <NativeTabs.Trigger.Label>Spotlight</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="scope" md="target" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="prefs">
        <NativeTabs.Trigger.Label>Prefs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
