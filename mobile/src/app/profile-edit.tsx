import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import type { Producer, TopBeat as TopBeatData } from '@/api/endpoints';
import { Avatar, markProfileEdited, pickProfileImage, rememberProducers, TopBeat, topBeatOf } from '@/components/producer';
import { Button, Segmented, styles as ui } from '@/components/ui';
import { C, F, R, display, font } from '@/theme';

const LINKS = [
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@yourchannel' },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/you' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@you' },
  { key: 'beatstars', label: 'BeatStars', placeholder: 'beatstars.com/you' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'soundcloud.com/you' },
] as const;

const withScheme = (url: string) => (!url.trim() ? '' : /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

// Edit your Spotlight profile: banner, picture, bio, tags, links and top beat.
export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<Producer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.myProducer().then(
      (p) => {
        setMe(p);
        setBio(p.bio ?? '');
        setTags((p.tags ?? []).join(', '));
        setLinks(Object.fromEntries(Object.entries(p.social_links ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string')));
      },
      (e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load your profile.'),
    );
  }, []);

  // Pictures and the top beat save right away; keep Spotlight's copy of you in step.
  const patchMe = (patch: Partial<Producer>) => {
    setMe((m) => {
      if (!m) return m;
      const next = { ...m, ...patch };
      rememberProducers([next]);
      return next;
    });
    markProfileEdited();
  };

  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const changeBanner = () =>
    run('banner', async () => {
      const f = await pickProfileImage([4, 1]);
      if (!f) return;
      const { banner_url } = await api.uploadBanner(f);
      patchMe({ banner_url });
    });

  const changeAvatar = () =>
    run('avatar', async () => {
      const f = await pickProfileImage([1, 1]);
      if (!f) return;
      const { avatar_url } = await api.uploadAvatar(f);
      patchMe({ avatar_url });
    });

  const save = () =>
    run('save', async () => {
      const social_links = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, withScheme(v)]));
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);
      const updated = await api.updateMyProducer({ bio: bio.trim(), tags: tagList, social_links });
      rememberProducers([updated]);
      markProfileEdited();
      router.back();
    });

  if (!me) {
    return (
      <View style={[s.root, s.center]}>
        {loadError ? <Text style={s.error}>{loadError}</Text> : <ActivityIndicator color={C.t2} />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topBar, { paddingTop: 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Cancel</Text>
        </Pressable>
        <Text style={s.topTitle}>Edit profile</Text>
        <Pressable onPress={busy ? undefined : save} hitSlop={10} accessibilityRole="button">
          <Text style={[s.topAction, { color: C.text, textAlign: 'right', ...font('600') }]}>{busy === 'save' ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={changeBanner} accessibilityRole="button" accessibilityLabel="Change banner">
          {me.banner_url ? <Image source={{ uri: me.banner_url }} style={s.banner} contentFit="cover" /> : <View style={s.banner} />}
          <View style={s.bannerHint}>
            {busy === 'banner' ? <ActivityIndicator color={C.text} size="small" /> : <Text style={s.hintText}>Change banner</Text>}
          </View>
        </Pressable>

        <View style={s.body}>
          <Pressable onPress={changeAvatar} style={s.avatarWrap} accessibilityRole="button" accessibilityLabel="Change profile picture">
            <View style={s.avatarRing}>
              <Avatar producer={me} size={84} />
            </View>
            <View style={s.avatarBadge}>
              {busy === 'avatar' ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Text style={s.avatarBadgeText}>Edit</Text>}
            </View>
          </Pressable>
          <Text style={s.note}>Pictures save as soon as you pick them. JPG, PNG or WEBP, up to 2 MB (banner 4 MB).</Text>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Field label="Bio">
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="What you make, who you've worked with"
              placeholderTextColor={C.t3}
              style={[s.input, s.area]}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={s.counter}>{bio.length}/300</Text>
          </Field>

          <Field label="Tags">
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="dark trap, pluggnb, drill"
              placeholderTextColor={C.t3}
              style={s.input}
              autoCapitalize="none"
            />
          </Field>

          <TopBeatEditor beat={topBeatOf(me)} onChange={(top_beat) => patchMe({ top_beat, top_beat_url: top_beat?.url ?? '' })} />

          <View style={{ gap: 8 }}>
            <Text style={ui.sectionLabel}>Links</Text>
            <View style={s.panel}>
              {LINKS.map((l, i) => (
                <View key={l.key} style={[s.linkRow, i === LINKS.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.linkLabel}>{l.label}</Text>
                  <TextInput
                    value={links[l.key] ?? ''}
                    onChangeText={(v) => setLinks((cur) => ({ ...cur, [l.key]: v }))}
                    placeholder={l.placeholder}
                    placeholderTextColor={C.t3}
                    style={s.linkInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    accessibilityLabel={`${l.label} link`}
                  />
                </View>
              ))}
            </View>
            <Text style={s.note}>Your YouTube link powers &ldquo;Latest uploads&rdquo; on your profile. If you leave it empty, the channel you connected for uploads is used.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const readableName = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

// Your top beat is either a YouTube video or an audio file you upload; it saves right away.
function TopBeatEditor({ beat, onChange }: { beat: TopBeatData | null; onChange: (b: TopBeatData | null) => void }) {
  const [mode, setMode] = useState<'youtube' | 'audio'>(beat?.kind === 'audio' ? 'audio' : 'youtube');
  const [url, setUrl] = useState(beat?.kind === 'youtube' ? beat.url : '');
  const [title, setTitle] = useState(beat?.title && beat.title !== 'Top beat' ? beat.title : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (fn: () => Promise<TopBeatData | null>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your top beat.');
    } finally {
      setBusy(false);
    }
  };

  const saveLink = () => go(async () => (await api.setTopBeatLink(url.trim(), title.trim() || undefined)).top_beat);
  const uploadAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    await go(async () =>
      (await api.uploadTopBeatAudio({ uri: a.uri, name: readableName(a.name), mimeType: a.mimeType ?? 'audio/mpeg', file: a.file }, title.trim())).top_beat,
    );
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={s.rowBetween}>
        <Text style={ui.sectionLabel}>Top beat</Text>
        {beat ? (
          <Pressable onPress={busy ? undefined : () => go(async () => (await api.clearTopBeat()).top_beat)} hitSlop={8} accessibilityRole="button">
            <Text style={[s.note, { color: C.danger }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      {beat ? <TopBeat key={beat.url} beat={beat} /> : <Text style={s.note}>Show off your best beat on your profile.</Text>}

      <Segmented
        compact
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: 'youtube', label: 'YouTube link' },
          { value: 'audio', label: 'Upload audio' },
        ]}
      />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={mode === 'youtube' ? 'Title (optional, uses the video title)' : 'Beat title (optional)'}
        placeholderTextColor={C.t3}
        style={s.input}
        maxLength={100}
      />
      {mode === 'youtube' ? (
        <>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="youtube.com/watch?v=… or youtu.be/…"
            placeholderTextColor={C.t3}
            style={s.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="YouTube video link"
          />
          <Button title={busy ? 'Saving…' : 'Use this video'} variant="secondary" size="md" onPress={busy || !url.trim() ? undefined : saveLink} />
        </>
      ) : (
        <>
          <Button title={busy ? 'Uploading…' : beat?.kind === 'audio' ? 'Replace audio file' : 'Choose audio file'} variant="secondary" size="md" onPress={busy ? undefined : uploadAudio} />
          <Text style={s.note}>MP3, M4A, WAV, OGG or FLAC, up to 25 MB. Anyone viewing your profile can play it.</Text>
        </>
      )}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  topAction: { color: C.t2, fontSize: 16, width: 80, ...font() },
  topTitle: { color: C.text, fontSize: 17, ...display },
  banner: { height: 120, backgroundColor: '#111111', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft },
  bannerHint: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  hintText: { color: C.text, fontSize: 12, ...font('500') },
  body: { paddingHorizontal: 20, gap: 22 },
  avatarWrap: { alignSelf: 'flex-start', marginTop: -42 },
  avatarRing: { borderRadius: 46, borderWidth: 4, borderColor: C.bg },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: 2,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: { color: C.onPrimary, fontSize: 12, ...font('600') },
  note: { color: C.t3, fontSize: 12, lineHeight: 17, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  input: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    color: C.text,
    fontSize: 15,
    ...font(),
  },
  area: { height: 96 },
  counter: { color: C.t3, fontSize: 11, fontFamily: F.mono, alignSelf: 'flex-end', marginTop: -2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panel: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  linkLabel: { width: 84, color: C.t2, fontSize: 14, ...font() },
  linkInput: { flex: 1, height: '100%', color: C.text, fontSize: 14, ...font() },
});
