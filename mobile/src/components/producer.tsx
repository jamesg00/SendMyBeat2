import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/api/auth';
import type { Producer } from '@/api/endpoints';
import { followersOf, likesOf, toggleFollow, toggleLike, useSocial } from '@/state/social';
import { C, F, font } from '@/theme';

// Producers the Spotlight tab already loaded, so a profile can open instantly before its stats arrive.
const known = new Map<string, Producer>();
export const rememberProducers = (list: Producer[]) => list.forEach((p) => known.set(p.user_id, p));
export const knownProducer = (id: string) => known.get(id);

export const isVerified = (p: Producer) => p.verification_status === 'approved';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

// Heart with the in-app like count. Your own profile shows the count without the button.
export function LikeButton({ producer, size = 'sm' }: { producer: Producer; size?: 'sm' | 'md' }) {
  const social = useSocial();
  const { user } = useAuth();
  const mine = user?.id === producer.user_id;
  const liked = social.liked.has(producer.user_id);
  const count = likesOf(social, producer);
  const h = size === 'md' ? 34 : 30;
  return (
    <Pressable
      onPress={mine ? undefined : () => void toggleLike(producer)}
      disabled={mine}
      accessibilityRole="button"
      accessibilityState={{ selected: liked, disabled: mine }}
      accessibilityLabel={`${liked ? 'Unlike' : 'Like'} ${producer.username}, ${count} likes`}
      hitSlop={6}
      style={({ pressed }) => [s.pill, { height: h }, liked && s.pillOn, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Text style={{ color: liked ? C.danger : C.t2, fontSize: 13 }}>{liked ? '♥' : '♡'}</Text>
      <Text style={[s.count, liked && { color: C.text }]}>{compact.format(count)}</Text>
    </Pressable>
  );
}

export function FollowButton({ producer }: { producer: Producer }) {
  const social = useSocial();
  const { user } = useAuth();
  if (user?.id === producer.user_id) return null;
  const following = social.following.has(producer.user_id);
  return (
    <Pressable
      onPress={() => void toggleFollow(producer)}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? `Unfollow ${producer.username}` : `Follow ${producer.username}`}
      style={({ pressed }) => [
        s.follow,
        following ? { backgroundColor: C.card2, borderWidth: 1, borderColor: '#2A2A2A' } : { backgroundColor: C.primary },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}>
      <Text style={[s.followText, { color: following ? C.text : C.onPrimary }]}>{following ? 'Following' : 'Follow'}</Text>
    </Pressable>
  );
}

export const followerCount = (social: ReturnType<typeof useSocial>, p: Producer) => followersOf(social, p);


export function Avatar({ producer, size, ring }: { producer: Producer; size: number; ring?: string }) {
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(ring ? { borderWidth: 2, borderColor: ring } : null),
  };
  if (producer.avatar_url) {
    return <Image source={{ uri: producer.avatar_url }} style={[s.avatar, box]} contentFit="cover" accessibilityLabel={producer.username} />;
  }
  return (
    <View style={[s.avatar, box]} accessibilityLabel={producer.username} accessibilityRole="image">
      <Text style={{ color: C.t2, fontSize: size * 0.38, ...font('600') }}>{producer.username.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <View style={[s.badge, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel="Verified" accessibilityRole="image">
      <Text style={{ color: C.bg, fontSize: size * 0.7, lineHeight: size, ...font('700') }}>✓</Text>
    </View>
  );
}

// Direct audio files can play in the app; YouTube, BeatStars and other pages open in the browser.
const playable = (url: string) => /\.(mp3|m4a|wav|aac|ogg)(\?|$)/i.test(url);

export function TopBeat({ url, title = 'Top beat' }: { url: string; title?: string }) {
  if (!playable(url)) {
    return (
      <Pressable onPress={() => Linking.openURL(url)} style={({ pressed }) => [s.beat, pressed && { opacity: 0.7 }]} accessibilityRole="link">
        <View style={s.play}>
          <Text style={s.playIcon}>↗</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.beatTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.beatMeta} numberOfLines={1}>
            {url.replace(/^https?:\/\/(www\.)?/, '')}
          </Text>
        </View>
      </Pressable>
    );
  }
  return <PlayableBeat url={url} title={title} />;
}

const PREVIEW_SECONDS = 30;

function PlayableBeat({ url, title }: { url: string; title: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const t = Math.floor(status.currentTime);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // A preview, not the whole beat.
  useEffect(() => {
    if (status.playing && status.currentTime >= PREVIEW_SECONDS) {
      player.pause();
      void player.seekTo(0);
    }
  }, [status.playing, status.currentTime, player]);

  return (
    <View style={s.beat}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={[s.play, { backgroundColor: C.primary }]}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause top beat' : 'Play top beat'}>
        <Text style={[s.playIcon, { color: C.onPrimary }]}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.beatTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.beatMeta}>{status.playing || t > 0 ? `0:${String(t).padStart(2, '0')} / 0:${PREVIEW_SECONDS}` : `${PREVIEW_SECONDS}s preview`}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: C.card2,
  },
  pillOn: { borderColor: 'rgba(255,107,107,0.4)', backgroundColor: 'rgba(255,107,107,0.08)' },
  count: { color: C.t2, fontSize: 12.5, fontFamily: F.mono },
  follow: { height: 34, paddingHorizontal: 14, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  followText: { fontSize: 13, ...font('600') },
  avatar: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' },
  beat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.lineSoft,
    backgroundColor: C.card2,
  },
  play: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: C.text, fontSize: 12, ...font('700') },
  beatTitle: { color: C.text, fontSize: 13, ...font('500') },
  beatMeta: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
});
