import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { refreshSubscription } from '@/state/billing';
import { useColors } from '@/theme';

// Where Stripe sends you back (sendmybeat://billing). The in-app browser usually catches it; when
// the link opens the app instead, check your plan with Stripe and go back to where you were.
export default function BillingReturn() {
  const C = useColors();
  useEffect(() => {
    void refreshSubscription(true).finally(() => (router.canGoBack() ? router.back() : router.replace('/')));
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator color={C.t2} />
    </View>
  );
}
