import Slider from '@react-native-community/slider';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { TagRun, YouTubeUploadOptions } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { DescriptionEditor, TagEditor } from '@/components/editors';
import { Button, Card, ListGroup, ListRow, Meter, PlayPauseIcon, Segmented, useUiStyles } from '@/components/ui';
import { useDraft } from '@/state/draft';
import { useStudio, type FileSlot, type Phase } from '@/state/studio';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

type Tool = 'details' | 'look';
type Privacy = YouTubeUploadOptions['privacy'];

const ASPECT: Record<YouTubeUploadOptions['aspectRatio'], number> = { '16:9': 16 / 9, '1:1': 1, '9:16': 9 / 16, '4:5': 4 / 5 };
const RESOLUTION: Record<YouTubeUploadOptions['aspectRatio'], string> = { '16:9': '1920×1080', '1:1': '1080×1080', '9:16': '1080×1920', '4:5': '1080×1350' };
const PRIVACY: Privacy[] = ['public', 'unlisted', 'private'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Server progress milestones for a YouTube upload job (backend/server.py): encoding starts at 41,
// the YouTube upload at 65, done at 100.
const STAGES = ['Sent', 'Render', 'YouTube', 'Live'] as const;
const stageOf = (p: number) => (p >= 100 ? 3 : p >= 65 ? 2 : 1);

function clock(sec: number) {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function useNow(ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function StudioScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const studio = useStudio();
  const { phase } = studio;
  const working = phase.kind === 'sending' || phase.kind === 'job';

  return (
    <View style={[s.root, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 }]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close Upload Studio" hitSlop={10}>
          <Text style={s.topAction}>Close</Text>
        </Pressable>
        <Text style={s.topTitle}>Upload Studio</Text>
        <Text style={s.topStatus}>{!working && studio.active ? 'Draft saved' : ''}</Text>
      </View>

      {working ? <RenderView phase={phase} title={studio.title} /> : phase.kind === 'done' ? <DoneView phase={phase} /> : <Editor />}
    </View>
  );
}

// "MOONWALK_142bpm.mp3" -> "MOONWALK": the beat's name for its title.
function beatNameOf(fileName?: string) {
  if (!fileName) return '';
  let name = fileName.replace(/\.[a-z0-9]{2,4}$/i, '');
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep it as it is
  }
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{2,3}\s?bpm\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Title ideas from the chosen tag run's best keywords; tap one to use it.
function TitleIdeas({ runId, beatName, onPick }: { runId: string; beatName: string; onPick: (title: string) => void }) {
  const s = useStyles();
  const ui = useUiStyles();
  const [ideas, setIdeas] = useState<api.TitleIdea[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api.titleIdeas(runId, beatName).then(
      (r) => {
        if (!alive) return;
        setIdeas(r.titles);
        setError(false);
      },
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, [runId, beatName]);

  if (error || !ideas?.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.sectionLabel}>Title ideas · tap to use</Text>
      <View style={s.panel}>
        {ideas.map((idea, i) => (
          <Pressable
            key={idea.title}
            onPress={() => onPick(idea.title)}
            style={({ pressed }) => [s.idea, i < ideas.length - 1 && s.ideaDivider, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityHint="Uses this as the video title">
            <Text style={s.ideaTitle}>{idea.title}</Text>
            <Text style={s.ideaMeta}>
              {idea.keywords.length} keyword{idea.keywords.length === 1 ? '' : 's'} · {idea.length}/100
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Editor() {
  const C = useColors();
  const s = useStyles();
  const ui = useUiStyles();
  const studio = useStudio();
  const [tool, setTool] = useState<Tool>('details');
  const { audio, image, format, fps, bg, scale, rotation, noWatermark, phase, missing, set } = studio;

  return (
    <>
      <Preview image={image} format={format} fps={fps} bg={bg} scale={scale} rotation={rotation} />
      {audio ? <Player key={audio.uri} uri={audio.uri} /> : null}

      <Segmented
        value={tool}
        onChange={setTool}
        options={[
          { value: 'details', label: 'Details' },
          { value: 'look', label: 'Look' },
        ]}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {tool === 'details' && <DetailsForm />}

        {tool === 'look' && (
          <Card>
            <Text style={ui.sectionLabel}>Format</Text>
            <Segmented compact value={format} onChange={(v) => set({ format: v })} options={[
              { value: '16:9', label: '16:9' },
              { value: '1:1', label: '1:1' },
              { value: '9:16', label: '9:16' },
              { value: '4:5', label: '4:5' },
            ]} />
            <Text style={ui.sectionLabel}>Frame rate</Text>
            <Segmented compact value={fps} onChange={(v) => set({ fps: v })} options={[
              { value: '2', label: '2 · Fastest' },
              { value: '30', label: '30' },
              { value: '60', label: '60' },
            ]} />
            <Text style={s.muted}>2 fps is best for still cover art and uploads much faster. Use 30/60 for GIF artwork.</Text>
            <Text style={ui.sectionLabel}>Background</Text>
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

      <View style={{ gap: 8 }}>
        {phase.kind === 'error' ? <Text style={[s.muted, { color: C.danger, textAlign: 'center' }]}>{phase.message}</Text> : null}
        <Button
          title={missing ?? (phase.kind === 'error' ? 'Try again' : 'Upload to YouTube')}
          variant={missing ? 'secondary' : 'primary'}
          onPress={missing ? undefined : studio.publish}
        />
        <Text style={s.summary}>
          mp4 · {RESOLUTION[format]} · {fps} fps · {studio.privacy}
        </Text>
      </View>
    </>
  );
}

// One panel of label/value rows, like a settings form. Description and tags open their editors in place.
function DetailsForm() {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const { run, setRun, description } = useDraft();
  const [open, setOpen] = useState<'desc' | 'tags' | null>(null);
  const [pickRun, setPickRun] = useState(false);
  const saved = useRequest(api.descriptions);
  const history = useRequest(api.tagHistory);

  const toggle = (which: 'desc' | 'tags') => setOpen((cur) => (cur === which ? null : which));
  const check = (on: boolean) => (on ? <Text style={{ color: C.text, fontSize: 15, fontFamily: F.mono }}>✓</Text> : <View />);
  const nextPrivacy = () => studio.set({ privacy: PRIVACY[(PRIVACY.indexOf(studio.privacy) + 1) % PRIVACY.length] });
  const choose = (r: TagRun | null) => {
    setRun(r);
    setPickRun(false);
  };

  return (
    <>
      <View style={s.panel}>
        <FileField label="Beat" hint="mp3 · wav · m4a · flac · ogg" slot={studio.audio} onPick={studio.pickAudio} />
        <FileField label="Artwork" hint="jpg · png · webp · gif" slot={studio.image} onPick={studio.pickImage} />
        <View style={s.field}>
          <Text style={s.fieldLabel}>Title</Text>
          <TextInput
            value={studio.title}
            onChangeText={(t) => studio.set({ title: t })}
            style={s.fieldInput}
            placeholder="Video title"
            placeholderTextColor={C.t3}
            accessibilityLabel="Video title"
          />
        </View>
        <Field label="Desc." value={description.title} onPress={() => toggle('desc')} open={open === 'desc'} />
        <Field
          label="Tags"
          value={run ? run.query : 'None'}
          detail={run ? `· ${run.tags.length}` : undefined}
          onPress={() => toggle('tags')}
          open={open === 'tags'}
        />
        <Field label="Privacy" value={cap(studio.privacy)} onPress={nextPrivacy} cycle last />
      </View>

      {run ? <TitleIdeas runId={run.id} beatName={beatNameOf(studio.audio?.name)} onPick={(title) => studio.set({ title })} /> : null}

      {open === 'desc' && (
        <DescriptionEditor
          saved={saved.data ?? []}
          onSaved={(d) => saved.setData((cur) => [d, ...(cur ?? []).filter((x) => x.id !== d.id)])}
          onDeleted={(id) => saved.setData((cur) => (cur ?? []).filter((x) => x.id !== id))}
        />
      )}

      {open === 'tags' && (
        <View style={{ gap: 12 }}>
          {run && !pickRun ? (
            <>
              <TagEditor
                key={run.id}
                run={run}
                onSaved={(r) => {
                  setRun(r);
                  history.setData((cur) => (cur ?? []).map((x) => (x.id === r.id ? r : x)));
                }}
              />
              <Button title="Use a different tag set" variant="plain" size="sm" onPress={() => setPickRun(true)} />
            </>
          ) : (
            <ListGroup>
              {history.loading ? (
                <ListRow title="Loading your tag runs…" last />
              ) : (history.data ?? []).length === 0 ? (
                <ListRow title="No tag runs yet" subtitle="Generate tags in Workflow first" last />
              ) : (
                [
                  <ListRow key="none" title="No tags" right={check(!run)} onPress={() => choose(null)} />,
                  ...(history.data ?? []).slice(0, 10).map((r, i, arr) => (
                    <ListRow
                      key={r.id}
                      title={r.query}
                      subtitle={`${r.tags.length} tags`}
                      last={i === arr.length - 1}
                      right={check(r.id === run?.id)}
                      onPress={() => choose(r)}
                    />
                  )),
                ]
              )}
            </ListGroup>
          )}
        </View>
      )}

      {studio.active ? <Button title="Start over" variant="plain" size="sm" onPress={studio.reset} /> : null}
    </>
  );
}

function Field({
  label,
  value,
  detail,
  onPress,
  open,
  cycle,
  last,
}: {
  label: string;
  value: string;
  detail?: string;
  onPress: () => void;
  open?: boolean;
  cycle?: boolean;
  last?: boolean;
}) {
  const C = useColors();
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [s.field, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: C.card2 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue} numberOfLines={1}>
        {value}
        {detail ? <Text style={s.fieldDetail}> {detail}</Text> : null}
      </Text>
      {cycle ? (
        <Svg width={10} height={16} viewBox="0 0 10 16" accessibilityElementsHidden importantForAccessibility="no">
          <Path d="M2 6l3-3 3 3M2 10l3 3 3-3" fill="none" stroke={C.t3} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <Text style={[s.chevron, open && { transform: [{ rotate: '90deg' }] }]}>›</Text>
      )}
    </Pressable>
  );
}

function FileField({ label, hint, slot, onPick }: { label: string; hint: string; slot: FileSlot | null; onPick: () => void }) {
  const C = useColors();
  const s = useStyles();
  const value = !slot ? hint : slot.status === 'uploading' ? 'Uploading…' : slot.status === 'error' ? (slot.error ?? 'Upload failed') : slot.name;
  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${slot ? value : 'choose a file'}`}
      style={({ pressed }) => [s.field, pressed && { backgroundColor: C.card2 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text
        style={[s.fieldMono, !slot && { color: C.t3 }, slot?.status === 'error' && { color: C.danger }]}
        numberOfLines={1}>
        {value}
      </Text>
      {slot?.status === 'uploading' ? (
        <ActivityIndicator color={C.t2} size="small" />
      ) : slot?.status === 'ready' ? (
        <View style={s.dot} accessibilityLabel="Uploaded" />
      ) : (
        <Text style={s.choose}>{slot ? 'Retry' : 'Choose'}</Text>
      )}
    </Pressable>
  );
}

function Preview({
  image,
  format,
  fps,
  bg,
  scale,
  rotation,
}: {
  image: FileSlot | null;
  format: YouTubeUploadOptions['aspectRatio'];
  fps: string;
  bg: YouTubeUploadOptions['background'];
  scale: number;
  rotation: number;
}) {
  const s = useStyles();
  const ratio = ASPECT[format];
  return (
    <View style={s.preview}>
      <View style={[s.frame, { aspectRatio: ratio, backgroundColor: bg === 'white' ? '#FFFFFF' : '#000000' }, ratio >= 1 ? { width: '100%' } : { height: '100%' }]}>
        {image && bg === 'blurred' ? <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} /> : null}
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{ height: '78%', aspectRatio: 1, transform: [{ scale }, { rotate: `${rotation}deg` }] }}
            contentFit="contain"
            accessibilityLabel="Artwork preview"
          />
        ) : (
          <Text style={s.empty}>Choose artwork to preview</Text>
        )}
      </View>
      <View style={s.badge}>
        <Text style={s.badgeText}>
          {format} · {fps} fps
        </Text>
      </View>
    </View>
  );
}

// A stable, made-up waveform per file (the app has no decoded audio to draw from); played bars turn white.
function bars(seed: string, n: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const wave = 0.55 + 0.25 * Math.sin(i / 3) + 0.2 * ((h % 1000) / 1000);
    return Math.max(0.2, Math.min(1, wave));
  });
}

// Plays the beat under the preview, so it sounds and looks like the finished video.
function Player({ uri }: { uri: string }) {
  const C = useColors();
  const s = useStyles();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [width, setWidth] = useState(0);
  const [heights] = useState(() => bars(uri, 44));

  useEffect(() => {
    // Play through the iPhone's silent switch, like a video would.
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const duration = status.duration || 0;
  const played = duration > 0 ? status.currentTime / duration : 0;
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
        <PlayPauseIcon playing={status.playing} />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <Pressable
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onPress={(e) => duration > 0 && width > 0 && void player.seekTo((e.nativeEvent.locationX / width) * duration)}
          accessibilityRole="adjustable"
          accessibilityLabel="Preview position"
          accessibilityValue={{ text: `${clock(status.currentTime)} of ${clock(duration)}` }}
          style={s.wave}>
          {heights.map((h, i) => (
            <View
              key={i}
              style={[s.waveBar, { height: `${h * 100}%`, backgroundColor: i / heights.length < played ? C.text : C.wave }]}
            />
          ))}
        </Pressable>
        <View style={s.timeRow}>
          <Text style={[s.time, { color: C.text }]}>{clock(status.currentTime)}</Text>
          <Text style={s.time}>{clock(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

// While the server renders and uploads: stage, time, progress and a timestamped log, like a deploy.
function RenderView({ phase, title }: { phase: Extract<Phase, { kind: 'sending' } | { kind: 'job' }>; title: string }) {
  const C = useColors();
  const s = useStyles();
  const now = useNow();
  const job = phase.kind === 'job' ? phase : null;
  const started = job?.startedAt ?? now;
  const elapsed = (now - started) / 1000;
  const server = job?.job.progress ?? 0;
  // Server progress moves in jumps, so ease forward between reports (capped below done).
  const pct = Math.min(99, Math.max(server, 95 * (1 - Math.exp(-elapsed / 90))));
  const stage = job ? stageOf(server) : 0;
  const left = Math.max(0, 150 - elapsed);
  const log = job?.log ?? [];

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={{ gap: 6, paddingTop: 8 }}>
        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: C.warn }]} />
          <Text style={s.sub}>{stage <= 1 ? 'Rendering' : 'Uploading to YouTube'}</Text>
          <Text style={s.monoSub}>· {clock(elapsed)}</Text>
        </View>
        <Text style={s.renderTitle} numberOfLines={2}>
          {title || 'Untitled beat'}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <View style={s.timeRow}>
          <Text style={s.monoSub}>{Math.round(pct)}%</Text>
          <Text style={s.monoSub}>{left > 1 ? `~${clock(left)} left` : 'finishing'}</Text>
        </View>
        <Meter value={pct / 100} height={4} />
      </View>

      <View style={s.stages}>
        {STAGES.map((name, i) => (
          <View key={name} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 2, backgroundColor: i < stage ? C.acc : i === stage ? C.warn : C.line }} />
            <Text style={[s.stageText, i === stage && { color: C.text, ...font('600') }, i > stage && { color: C.t3 }]}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={s.logPanel}>
        <View style={s.logHead}>
          <Text style={[s.sub, { color: C.text, ...font('500') }]}>Log</Text>
          {job ? <Text style={s.monoSub}>job {job.job.id.slice(0, 6)}…</Text> : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 7 }}>
          {log.length === 0 ? <Text style={s.logText}>Sending files…</Text> : null}
          {log.map((l, i) => (
            <View key={`${l.at}-${i}`} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={s.logTime}>{new Date(l.at).toLocaleTimeString('en-GB')}</Text>
              <Text style={[s.logText, i === log.length - 1 && { color: C.text }]}>{l.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Text style={s.sub}>Safe to close. The upload keeps running and shows on Workflow.</Text>
      <Button title="Close" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

function DoneView({ phase }: { phase: Extract<Phase, { kind: 'done' }> }) {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const finish = () => {
    studio.reset();
    router.back();
  };
  return (
    <View style={{ flex: 1, gap: 18, paddingTop: 8 }}>
      <View style={s.statusRow}>
        <View style={[s.statusDot, { backgroundColor: C.acc }]} />
        <Text style={s.sub}>Live on YouTube</Text>
      </View>
      <Text style={s.renderTitle}>{studio.title || 'Your beat'}</Text>
      <Text style={s.sub}>{phase.message}</Text>
      <View style={{ flex: 1 }} />
      {phase.url ? <Button title="Open on YouTube" onPress={() => Linking.openURL(phase.url!)} /> : null}
      <Button title="Done" variant="secondary" onPress={finish} />
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const C = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: C.text, fontSize: 15, ...font() }}>{label}</Text>
      {children}
    </View>
  );
}

function SliderField(props: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const C = useColors();
  return (
    <View style={{ width: '47%', gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.t2, fontSize: 12, ...font() }}>{props.label}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontFamily: F.mono }}>{props.display}</Text>
      </View>
      <Slider
        value={props.value}
        minimumValue={props.min}
        maximumValue={props.max}
        step={props.step}
        onValueChange={props.onChange}
        minimumTrackTintColor={C.text}
        maximumTrackTintColor={C.card2}
        thumbTintColor="#FFFFFF"
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  topAction: { color: C.t2, fontSize: 16, width: 90, ...font() },
  topTitle: { color: C.text, fontSize: 17, ...display },
  idea: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  ideaDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  ideaTitle: { color: C.text, fontSize: 14.5, lineHeight: 20, ...font() },
  ideaMeta: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  topStatus: { color: C.t3, fontSize: 12, width: 90, textAlign: 'right', ...font() },
  preview: {
    aspectRatio: 16 / 9,
    borderRadius: R.card,
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.lineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { maxWidth: '100%', maxHeight: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  empty: { color: C.t3, fontSize: 13, fontFamily: F.mono },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  badgeText: { color: C.t2, fontSize: 11, fontFamily: F.mono },
  player: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  wave: { height: 30, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { flex: 1, borderRadius: 1 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: C.t3, fontSize: 11, fontFamily: F.mono },
  panel: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 50,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.lineSoft,
  },
  fieldLabel: { width: 64, color: C.t2, fontSize: 14, ...font() },
  fieldValue: { flex: 1, color: C.text, fontSize: 15, ...font() },
  fieldDetail: { color: C.t3, fontSize: 13, fontFamily: F.mono },
  fieldMono: { flex: 1, color: C.text, fontSize: 13, fontFamily: F.mono },
  fieldInput: { flex: 1, height: '100%', color: C.text, fontSize: 15, ...font() },
  chevron: { color: C.t3, fontSize: 16, width: 14, textAlign: 'center' },
  choose: { color: C.text, fontSize: 13, ...font('500') },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.acc },
  cardTitle: { color: C.text, fontSize: 17, ...font('600') },
  muted: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1, ...font() },
  sub: { color: C.t2, fontSize: 13, lineHeight: 19, ...font() },
  monoSub: { color: C.t3, fontSize: 13, fontFamily: F.mono },
  sliderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  summary: { textAlign: 'center', color: C.t3, fontSize: 11, fontFamily: F.mono },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  renderTitle: { color: C.text, fontSize: 24, lineHeight: 30, letterSpacing: -0.6, ...font('600') },
  stages: { flexDirection: 'row', gap: 4 },
  stageText: { color: C.t2, fontSize: 11, ...font() },
  logPanel: { flex: 1, minHeight: 120, borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: 'hidden' },
  logHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.lineSoft,
  },
  logTime: { color: C.t3, fontSize: 12, lineHeight: 17, fontFamily: F.mono },
  logText: { flex: 1, color: C.t2, fontSize: 12, lineHeight: 17, fontFamily: F.mono },
}));
