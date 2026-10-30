import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import * as api from '@/api/endpoints';
import type { Producer } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, Card, ListGroup, ListRow, Screen, SectionLabel, Segmented, styles as ui } from '@/components/ui';
import { C, F, font } from '@/theme';

type Filter = 'featured' | 'trending' | 'new';

export default function SpotlightScreen() {
  const [filter, setFilter] = useState<Filter>('featured');
  const { data, error, loading, reload } = useRequest(api.spotlight);

  const list: Producer[] =
    (filter === 'featured' ? data?.featured_producers : filter === 'trending' ? data?.trending_producers : data?.new_producers) ?? [];
  const [top, ...rest] = list;

  return (
    <Screen title="Spotlight">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'featured', label: 'Featured' },
          { value: 'trending', label: 'Trending' },
          { value: 'new', label: 'New' },
        ]}
      />

      {loading ? (
        <ActivityIndicator color={C.t2} style={{ alignSelf: 'flex-start' }} />
      ) : error ? (
        <Card>
          <Text style={{ color: C.danger, fontSize: 14, ...font() }}>{error}</Text>
          <Button title="Try again" variant="secondary" size="md" onPress={reload} />
        </Card>
      ) : !top ? (
        <Text style={s.meta}>No producers here yet.</Text>
      ) : (
        <>
          <Card style={{ gap: 14 }}>
            <Text style={ui.sectionLabel}>{filter === 'featured' ? 'Featured producer' : filter === 'trending' ? 'Trending now' : 'Newest producer'}</Text>
            <View style={s.featured}>
              <Avatar producer={top} size={56} />
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={s.name}>{top.username}</Text>
                <Text style={s.meta} numberOfLines={2}>
                  {top.bio || (top.tags ?? []).slice(0, 3).join(' · ') || `${top.spotlight_tier ?? 'Bronze'} tier`}
                </Text>
              </View>
            </View>
          </Card>

          {rest.length > 0 && (
            <>
              <SectionLabel>More producers</SectionLabel>
              <ListGroup>
                {rest.slice(0, 10).map((p, i, arr) => (
                  <ListRow
                    key={p.user_id}
                    title={p.username}
                    value={p.likes ? `${p.likes} likes` : undefined}
                    height={58}
                    last={i === arr.length - 1}
                    left={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={s.rank}>{i + 2}</Text>
                        <Avatar producer={p} size={36} />
                      </View>
                    }
                  />
                ))}
              </ListGroup>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function Avatar({ producer, size }: { producer: Producer; size: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (producer.avatar_url) {
    return <Image source={{ uri: producer.avatar_url }} style={[s.avatar, style]} contentFit="cover" accessibilityLabel={producer.username} />;
  }
  return (
    <View style={[s.avatar, style]}>
      <Text style={{ color: C.t2, fontSize: size * 0.38, ...font('600') }}>{producer.username.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  featured: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { color: C.text, fontSize: 17, ...font('600') },
  meta: { color: C.t2, fontSize: 13, ...font() },
  rank: { width: 18, color: C.t3, fontSize: 13, fontFamily: F.mono },
  avatar: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
});
