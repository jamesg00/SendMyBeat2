import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import * as api from '@/api/endpoints';

// A notification when a job finishes, so you can leave the app while it works. The server sends
// them through Expo's push service; while the app is open the job card already shows it, so they
// stay quiet then.

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Where tapping a finished job takes you.
const JOB_SCREENS: Record<string, Href> = {
  tag_generation: '/',
  tag_join: '/',
  plan_assist: '/',
  youtube_upload: '/studio',
  beat_analysis: '/studio',
  beat_fix: '/studio',
  thumbnail_check: '/studio',
  channel_analytics: '/analytics',
};

let token: string | null = null;

/** Ask once for permission and tell the server where to send job notifications. */
async function register() {
  // Push needs a real phone and a development or store build (not Expo Go on Android).
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('jobs', { name: 'Finished jobs', importance: AndroidImportance.DEFAULT });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return;
  token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.registerPushToken(token, Platform.OS);
}

/** Before signing out: this phone stops getting that account's notifications. */
export async function unregisterPush() {
  if (!token) return;
  const t = token;
  token = null;
  await api.removePushToken(t).catch(() => {});
}

/** While signed in: register this phone, and open the right screen when a notification is tapped. */
export function useJobNotifications() {
  useEffect(() => {
    void register().catch(() => {});

    const open = (n: Notifications.Notification) => {
      const type = n.request.content.data?.type;
      const screen = typeof type === 'string' ? JOB_SCREENS[type] : undefined;
      if (screen) router.push(screen);
      Notifications.clearLastNotificationResponse();
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) open(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);
}
