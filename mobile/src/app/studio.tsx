import Slider from '@react-native-community/slider';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import type { YouTubeUploadOptions } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Button, Card, IconTile, JobProgress, ListGroup, ListRow, Pill, Segmented, styles as ui } from '@/components/ui';
import { DESCRIPTION_TEMPLATES } from '@/data/templates';
import { useDraft, type DraftDescription } from '@/state/draft';
import { useStudio, type FileSlot, type Phase } from '@/state/studio';
import { C, F, R } from '@/theme';

type Tool = 'details' | 'visualizer' | 'look';

const ASPECT: Record<YouTubeUploadOptions['aspectRatio'], number> = { '16:9': 16 / 9, '1:1': 1, '9:16': 9 / 16, '4:5': 4 / 5 };

export default function StudioScreen() {
  const insets = useSafeAreaInsets();
  const studio = useStudio();
  const [tool, setTool] = useState<Tool>('details');
  const { title, privacy, audio, image, format, fps, bg, scale, rotation, noWatermark, phase, missing, set } = studio;

  const busy = phase.kind === 'sending' || phase.kind === 'job';
  const summary = `MP4 · ${fps} fps · ${format} · ${bg} bg · ${privacy}`;

  const finish = () => {
    studio.reset();
    router.back();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 6 }]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.close} accessibilityRole="button" accessibilityLabel="Close Upload Studio">
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>✕</Text>
        </Pressable>
        <Text style={s.topTitle}>Upload Studio</Text>
        <Pill label={busy ? 'Working' : studio.active ? 'Saved' : 'New'} />
      </View>

      <Preview audio={audio} image={image} format={format} bg={bg} scale={scale} rotation={rotation} />

      <Segmented
        value={tool}
        onChange={setTool}
        options={[
          { value: 'details', label: 'Details' },
          { value: 'visualizer', label: 'Visualizer' },
          { value: 'look', label: 'Look' },
        ]}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {tool === 'details' && (
          <>
            <ListGroup>
              <FileRow label="Beat" hint="MP3 · WAV · M4A · FLAC · OGG" slot={audio} icon="♪" onPick={studio.pickAudio} />
              <FileRow label="Artwork" hint="JPG · PNG · WEBP · GIF" slot={image} icon="▣" onPick={studio.pickImage} last />
            </ListGroup>
            <View style={{ gap: 6 }}>
              <Text style={[ui.sectionLabel, { paddingHorizontal: 4 }]}>VIDEO TITLE</Text>
              <TextInput
                value={title}
                onChangeText={(t) => set({ title: t })}
                style={s.input}
                placeholder="Enter beat title here"
                placeholderTextColor={C.t3}
              />
            </View>
            <MetaPickers />
            <Text style={[ui.sectionLabel, { paddingHorizontal: 4 }]}>PRIVACY</Text>
            <Segmented
              value={privacy}
              onChange={(v) => set({ privacy: v })}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'unlisted', label: 'Unlisted' },
                { value: 'private', label: 'Private' },
              ]}
            />
            {studio.active && !busy ? (
              <Button title="Start over" variant="plain" size="sm" onPress={studio.reset} />
            ) : null}
          </>
        )}

        {tool === 'visualizer' && (
          <Card>
            <Text style={s.cardTitle}>Visualizer is website-only for now</Text>
            <Text style={s.muted}>
              The visualizer is recorded live in your browser before upload. Uploads from the app use your artwork as the
              video. For a visualizer video, upload from sendmybeat.com.
            </Text>
            <Button
              title="Open sendmybeat.com"
              variant="secondary"
              size="md"
              onPress={() => Linking.openURL('https://www.sendmybeat.com/dashboard')}
            />
          </Card>
        )}

        {tool === 'look' && (
          <Card>
            <Text style={ui.sectionLabel}>FORMAT</Text>
            <Segmented compact value={format} onChange={(v) => set({ format: v })} options={[
              { value: '16:9', label: '16:9' },
              { value: '1:1', label: '1:1' },
              { value: '9:16', label: '9:16' },
              { value: '4:5', label: '4:5' },
            ]} />
            <Text style={ui.sectionLabel}>FRAME RATE</Text>
            <Segmented compact value={fps} onChange={(v) => set({ fps: v })} options={[
              { value: '2', label: '2 · Fastest' },
              { value: '30', label: '30' },
              { value: '60', label: '60' },
            ]} />
            <Text style={s.muted}>2 fps is best for still cover art and uploads much faster. Use 30/60 for GIF artwork.</Text>
            <Text style={ui.sectionLabel}>BACKGROUND</Text>
            <Segmented compact value={bg} onChange={(v) => set({ bg: v })} options={[
              { value: 'black', label: 'Black' },
              { value: 'white', label: 'White' },
              { value: 'blurred', label: 'Blurred' },
            ]} />
            <View style={s.sliderGrid}>
              <SliderField label="Scale" value={scale} display={`${scale.toFixed(2)}x`} min={0.5} max={2} step={0.05} onChange={(v) => set({ scale: v })} />
              <SliderField label="Rotation" value={rotation} display={`${Math.round(rotation)}°`} min={-180} max={180} step={1} onChange={(v) => set({ rotation: v })} />
            </View>
            <Row label="Remove watermark">
              <Switch
                value={noWatermark}
                onValueChange={(v) => set({ noWatermark: v })}
                trackColor={{ false: C.card2, true: C.acc }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={C.card2}
              />
            </Row>
            <Text style={s.muted}>Watermark removal needs a paid plan.</Text>
          </Card>
        )}
      </ScrollView>

      <View style={{ gap: 8, paddingBottom: insets.bottom + 8 }}>
        <Status phase={phase} />
        {phase.kind === 'done' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {phase.url ? <Button title="Open on YouTube" style={{ flex: 1 }} onPress={() => Linking.openURL(phase.url!)} /> : null}
            <Button title="Done" variant="secondary" style={{ flex: 1 }} onPress={finish} />
          </View>
        ) : (
          <Button
            title={busy ? 'Uploading…' : missing ?? (phase.kind === 'error' ? 'Try again' : 'Upload to YouTube')}
            variant={missing && !busy ? 'secondary' : 'primary'}
            onPress={busy || missing ? undefined : studio.publish}
          />
        )}
        <Text style={s.summary}>{busy ? 'You can close the studio. The upload keeps going.' : summary}</Text>
      </View>
    </View>
  );
}

// Description and tags are chosen right here, so the studio never has to close.
function MetaPickers() {
  const { run, setRun, description, setDescription } = useDraft();
  const [open, setOpen] = useState<'desc' | 'tags' | null>(null);
  const saved = useRequest(api.descriptions);
  const history = useRequest(api.tagHistory);

  const descriptions: DraftDescription[] = [
    ...DESCRIPTION_TEMPLATES.map((t) => ({ id: t.id, title: t.name, content: t.content, saved: false })),
    ...(saved.data ?? []).map((d) => ({ id: d.id, title: d.title, content: d.content, saved: true })),
  ];
  const toggle = (which: 'desc' | 'tags') => setOpen((cur) => (cur === which ? null : which));
  const check = (on: boolean) => (on ? <Text style={{ color: C.acc, fontSize: 16 }}>✓</Text> : <View />);

  return (
    <View style={{ gap: 8 }}>
      <ListGroup>
        <ListRow title="Description" value={description.title} onPress={() => toggle('desc')} right={<Chevron open={open === 'desc'} />} />
        <ListRow
          title="Tags"
          value={run ? `${run.query} · ${run.tags.length}` : 'None'}
          onPress={() => toggle('tags')}
          right={<Chevron open={open === 'tags'} />}
          last
        />
      </ListGroup>

      {open === 'desc' && (
        <ListGroup>
          {descriptions.map((d, i) => (
            <ListRow
              key={d.id}
              title={d.title}
              subtitle={d.saved ? undefined : 'Template'}
              last={i === descriptions.length - 1}
              right={check(d.id === description.id)}
              onPress={() => {
                setDescription(d);
                setOpen(null);
              }}
            />
          ))}
        </ListGroup>
      )}

      {open === 'tags' && (
        <ListGroup>
          {history.loading ? (
            <ListRow title="Loading your tag runs…" last />
          ) : (history.data ?? []).length === 0 ? (
            <ListRow title="No tag runs yet" subtitle="Generate tags in Workflow first" last />
          ) : (
            [
              <ListRow
                key="none"
                title="No tags"
                right={check(!run)}
                onPress={() => {
                  setRun(null);
                  setOpen(null);
                }}
              />,
              ...(history.data ?? []).slice(0, 10).map((r, i, arr) => (
                <ListRow
                  key={r.id}
                  title={r.query}
                  subtitle={`${r.tags.length} tags`}
                  last={i === arr.length - 1}
                  right={check(r.id === run?.id)}
                  onPress={() => {
                    setRun(r);
                    setOpen(null);
                  }}
                />
              )),
            ]
          )}
        </ListGroup>
      )}
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <Text style={{ color: C.t3, fontSize: 18, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>;
}

function Status({ phase }: { phase: Phase }) {
  if (phase.kind === 'sending') {
    return (
      <View style={s.status}>
        <ActivityIndicator color={C.acc} />
        <Text style={s.muted}>Sending to SendMyBeat…</Text>
      </View>
    );
  }
  if (phase.kind === 'job') {
    return (
      <JobProgress
        title="Rendering and uploading"
        startedAt={phase.startedAt}
        expectedSec={120}
        progress={phase.job.progress ?? 0}
        message={phase.job.message ?? 'Rendering your video…'}
      />
    );
  }
  if (phase.kind === 'done') return <Text style={[s.muted, { color: C.acc, textAlign: 'center' }]}>{phase.message}</Text>;
  if (phase.kind === 'error') return <Text style={[s.muted, { color: C.danger, textAlign: 'center' }]}>{phase.message}</Text>;
  return null;
}

function FileRow({ label, hint, slot, icon, onPick, last }: { label: string; hint: string; slot: FileSlot | null; icon: string; onPick: () => void; last?: boolean }) {
  const subtitle = !slot ? hint : slot.status === 'uploading' ? 'Uploading…' : slot.status === 'error' ? slot.error : slot.name;
  return (
    <ListRow
      title={label}
      subtitle={subtitle}
      height={60}
      last={last}
      left={
        <IconTile tint={slot?.status === 'error' ? 'rgba(255,107,107,0.18)' : C.accSoft}>
          {slot?.status === 'uploading' ? (
            <ActivityIndicator color={C.acc} size="small" />
          ) : (
            <Text style={{ color: slot?.status === 'error' ? C.danger : C.acc, fontSize: 15 }}>{slot?.status === 'ready' ? '✓' : icon}</Text>
          )}
        </IconTile>
      }
      right={<Button title={slot ? 'Replace' : 'Choose'} variant="secondary" size="sm" onPress={onPick} />}
    />
  );
}

function Preview({ audio, image, format, bg, scale, rotation }: { audio: FileSlot | null; image: FileSlot | null; format: YouTubeUploadOptions['aspectRatio']; bg: YouTubeUploadOptions['background']; scale: number; rotation: number }) {
  const ratio = ASPECT[format];
  return (
    <View style={s.preview}>
      <View style={[s.frame, { aspectRatio: ratio, backgroundColor: bg === 'white' ? '#FFFFFF' : '#000000' }, ratio >= 1 ? { width: '100%' } : { height: '100%' }]}>
        {image && bg === 'blurred' ? <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} /> : null}
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{ width: '62%', aspectRatio: 1, transform: [{ scale }, { rotate: `${rotation}deg` }] }}
            contentFit="contain"
            accessibilityLabel="Artwork preview"
          />
        ) : (
          <Text style={s.empty}>Choose artwork to preview</Text>
        )}
      </View>
      <View style={s.badge}>
        <Text style={s.badgeText}>{format}</Text>
      </View>
      {audio ? <Playback key={audio.uri} uri={audio.uri} /> : null}
    </View>
  );
}

function clock(sec: number) {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// Plays the beat over the artwork, so the preview is what the rendered video will be.
function Playback({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Play through the iPhone's silent switch, like a video would.
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const duration = status.duration || 0;
  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (duration > 0 && status.currentTime >= duration - 0.2) void player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={s.player}>
      <Pressable onPress={toggle} style={s.playBtn} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause preview' : 'Play preview'}>
        <Text style={{ color: C.onAcc, fontSize: 13, fontWeight: '700' }}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <Slider
        style={{ flex: 1 }}
        value={status.currentTime}
        minimumValue={0}
        maximumValue={duration || 1}
        onSlidingComplete={(v) => void player.seekTo(v)}
        minimumTrackTintColor={C.acc}
        maximumTrackTintColor="rgba(255,255,255,0.25)"
        thumbTintColor="#FFFFFF"
        accessibilityLabel="Preview position"
      />
      <Text style={s.time}>
        {clock(status.currentTime)} / {clock(duration)}
      </Text>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: C.text, fontSize: 15 }}>{label}</Text>
      {children}
    </View>
  );
}

function SliderField(props: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <View style={{ width: '47%', gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.t2, fontSize: 12 }}>{props.label}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontFamily: F.mono }}>{props.display}</Text>
      </View>
      <Slider
        value={props.value}
        minimumValue={props.min}
        maximumValue={props.max}
        step={props.step}
        onValueChange={props.onChange}
        minimumTrackTintColor={C.acc}
        maximumTrackTintColor={C.card2}
        thumbTintColor="#FFFFFF"
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, gap: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  preview: {
    height: 220,
    borderRadius: R.card,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { maxWidth: '100%', maxHeight: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  empty: { color: C.t3, fontSize: 13 },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)' },
  badgeText: { color: C.text, fontSize: 11, fontFamily: F.mono },
  player: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  time: { color: C.text, fontSize: 11, fontFamily: F.mono, minWidth: 72, textAlign: 'right' },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  muted: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  input: { height: 44, paddingHorizontal: 14, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, color: C.text, fontSize: 15 },
  sliderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  summary: { textAlign: 'center', color: C.t3, fontSize: 11, fontFamily: F.mono },
});
