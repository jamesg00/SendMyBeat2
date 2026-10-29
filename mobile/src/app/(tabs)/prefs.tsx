import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/api/auth';
import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, ListGroup, ListRow, Screen, SectionLabel } from '@/components/ui';

export default function PrefsScreen() {
  const { user, signOut } = useAuth();
  const sub = useRequest(api.subscriptionStatus);
  const yt = useRequest(api.youtubeStatus);

  const plan = sub.data ? sub.data.plan.charAt(0).toUpperCase() + sub.data.plan.slice(1) : '…';

  return (
    <Screen title="Prefs">
      <SectionLabel>Account</SectionLabel>
      <ListGroup>
        <ListRow title="Username" value={user?.username} />
        <ListRow title="Plan" value={plan} onPress={() => WebBrowser.openBrowserAsync('https://www.sendmybeat.com/dashboard')} />
        <ListRow
          title="YouTube"
          value={yt.loading ? '…' : yt.data?.connected ? 'Connected' : 'Not connected'}
          onPress={() => WebBrowser.openBrowserAsync('https://www.sendmybeat.com/dashboard')}
          last
        />
      </ListGroup>

      <SectionLabel>About</SectionLabel>
      <ListGroup>
        <ListRow title="Privacy policy" onPress={() => WebBrowser.openBrowserAsync('https://www.sendmybeat.com/privacy-policy')} />
        <ListRow title="Terms" onPress={() => WebBrowser.openBrowserAsync('https://www.sendmybeat.com/terms')} last />
      </ListGroup>

      <Button title="Sign out" variant="secondary" size="md" onPress={signOut} />
    </Screen>
  );
}
