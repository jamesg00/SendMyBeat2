import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/api/auth';
import type { PickedFile, Producer, TopBeat as TopBeatData } from '@/api/endpoints';
import { followersOf, likesOf, toggleFollow, toggleLike, useSocial } from '@/state/social';
import { C, F, font } from '@/theme';

// Producers the Spotlight tab already loaded, so a profile can open instantly before its stats arrive.
const known = new Map<string, Producer>();
export const rememberProducers = (list: Producer[]) => list.forEach((p) => known.set(p.user_id, p));
export const knownProducer = (id: string) => known.get(id);

export const isVerified = (p: Producer) => p.verification_status === 'approved';

/** Pick and crop a profile picture or banner. */
export async function pickProfileImage(aspect: [number, number]): Promise<PickedFile | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.85,
    // The server takes JPG, PNG or WEBP; this makes iOS hand back a JPEG instead of HEIC.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (res.canceled) return null;
  const a = res.assets[0];
  const mimeType = a.mimeType === 'image/png' || a.mimeType === 'image/webp' ? a.mimeType : 'image/jpeg';
  return { uri: a.uri, name: `image.${mimeType.split('/')[1].replace('jpeg', 'jpg')}`, mimeType, file: a.file };
}


/** Open a link from a producer profile, but only real web pages, never tel:, intent: or app links. */
export function openWebLink(url: string | null | undefined) {
  if (url && /^https?:\/\/[^\s]+$/i.test(url.trim())) void Linking.openURL(url.trim());
}

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

const isYouTube = (url: string) => /(?:youtube\.com|youtu\.be)\//i.test(url);
const isAudioFile = (url: string) => /\.(mp3|m4a|wav|aac|ogg|flac)(\?|$)/i.test(url);

/** The producer's top beat, from the structured field or, for older profiles, the plain link. */
export function topBeatOf(p: Producer): TopBeatData | null {
  if (p.top_beat?.url) return p.top_beat;
  const url = p.top_beat_url?.trim();
  if (!url) return null;
  return { kind: isYouTube(url) ? 'youtube' : isAudioFile(url) ? 'audio' : 'link', url, title: 'Top beat' };
}

function clock(sec: number) {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// YouTube top beats show their thumbnail and open in YouTube; uploaded audio plays right here.
export function TopBeat({ beat }: { beat: TopBeatData }) {
  if (beat.kind === 'audio' && (isAudioFile(beat.url) || beat.file_id || /\/top-beat\/audio/.test(beat.url))) {
    return <PlayableBeat url={beat.url} title={beat.title || 'Top beat'} />;
  }
  return (
    <Pressable
      onPress={() => openWebLink(beat.url)}
      style={({ pressed }) => [s.beat, pressed && { opacity: 0.7 }]}
      accessibilityRole="link"
      accessibilityLabel={`${beat.title || 'Top beat'}, opens ${beat.kind === 'youtube' ? 'YouTube' : 'link'}`}>
      {beat.thumbnail ? (
        <Image source={{ uri: beat.thumbnail }} style={s.thumb} contentFit="cover" />
      ) : (
        <View style={s.play}>
          <Text style={s.playIcon}>↗</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.beatTitle} numberOfLines={2}>
          {beat.title || 'Top beat'}
        </Text>
        <Text style={s.beatMeta} numberOfLines={1}>
          {beat.kind === 'youtube' ? 'YouTube ↗' : beat.url.replace(/^https?:\/\/(www\.)?/, '')}
        </Text>
      </View>
    </Pressable>
  );
}

function PlayableBeat({ url, title }: { url: string; title: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || 0;
  const played = duration > 0 ? status.currentTime / duration : 0;

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const toggle = () => {
    if (status.playing) return player.pause();
    if (duration > 0 && status.currentTime >= duration - 0.2) void player.seekTo(0);
    player.play();
  };

  return (
    <View style={s.beat}>
      <Pressable
        onPress={toggle}
        style={[s.play, { backgroundColor: C.primary }]}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? `Pause ${title}` : `Play ${title}`}>
        <Text style={[s.playIcon, { color: C.onPrimary }]}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={s.beatTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={s.track}>
          <View style={[s.trackFill, { width: `${played * 100}%` }]} />
        </View>
      </View>
      <Text style={s.beatMeta}>{duration > 0 ? `${clock(status.currentTime)} / ${clock(duration)}` : status.isBuffering ? 'Loading…' : ''}</Text>
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
  thumb: { width: 72, height: 40, borderRadius: 6, backgroundColor: '#1A1A1A' },
  track: { height: 2, backgroundColor: C.line, overflow: 'hidden' },
  trackFill: { height: 2, backgroundColor: C.text },
  playIcon: { color: C.text, fontSize: 12, ...font('700') },
  beatTitle: { color: C.text, fontSize: 13, ...font('500') },
  beatMeta: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
});
