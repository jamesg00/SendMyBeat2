import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import * as api from '@/api/endpoints';
import type { TagRun, YouTubeUploadOptions } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { DescriptionEditor, TagEditor } from '@/components/editors';
import { usePlan } from '@/components/pros';
import { Button, ListGroup, ListRow, Segmented } from '@/components/ui';
import { openPaywall, requirePro, useSubscription } from '@/state/billing';
import { useDraft } from '@/state/draft';
import { FIT, clampTransform, useStudio, type FileSlot, type Transform } from '@/state/studio';
import {
  COLOURS,
  COLOURS_2,
  VIZ_STYLES,
  hasCenter,
  iconUrl,
  isLegacyStyle,
  lookOf,
  type CenterFill,
} from '@/state/visualizer';
import { F, R, font, makeStyles, useColors } from '@/theme';

// The five sections of Upload Studio's sheet, the same ones the website has
// (frontend/src/components/UploadStudio.js): Details, Image, Video, Visualizer and AI checks.

export type Tab = 'details' | 'image' | 'video' | 'viz' | 'ai';
type Aspect = YouTubeUploadOptions['aspectRatio'];
type Privacy = YouTubeUploadOptions['privacy'];

export const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'viz', label: 'Visualizer' },
  { id: 'ai', label: 'AI checks' },
];

/** The symbol on each section button. */
export function TabIcon({ tab, color, size = 22 }: { tab: Tab; color: string; size?: number }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {tab === 'details' ? (
        <>
          <Path d="M5 7V5h14v2M12 5v14M9 19h6" {...p} />
        </>
      ) : tab === 'image' ? (
        <>
          <Rect x={3} y={4.5} width={18} height={15} rx={3} {...p} />
          <Circle cx={9} cy={10} r={1.8} {...p} />
          <Path d="M21 15.5l-4.8-4.8L6.5 19.5" {...p} />
        </>
      ) : tab === 'video' ? (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={3} {...p} />
          <Path d="M3 9.5h18M3 14.5h18M8 5v4.5M16 5v4.5M8 14.5V19M16 14.5V19" {...p} />
        </>
      ) : tab === 'viz' ? (
        <>
          <Path d="M4 10v4M8 6.5v11M12 9v6M16 4v16M20 8.5v7" {...p} strokeWidth={2.2} />
        </>
      ) : (
        <>
          <Path d="M10.5 3.5l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" {...p} />
          <Path d="M17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" {...p} />
        </>
      )}
    </Svg>
  );
}

// ---------------------------------------------------------------- Details

const PRIVACY: { value: Privacy; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone can find and watch it.' },
  { value: 'unlisted', label: 'Unlisted', hint: 'Only people with the link can watch it.' },
  { value: 'private', label: 'Private', hint: 'Only you can watch it.' },
];

// "MOONWALK_142bpm.mp3" -> "MOONWALK": the beat's name for its title.
export function beatNameOf(fileName?: string) {
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

export function DetailsTab() {
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
  const choose = (r: TagRun | null) => {
    setRun(r);
    setPickRun(false);
  };
  const text = studio.descText ?? description.content;
  const privacy = PRIVACY.find((p) => p.value === studio.privacy) ?? PRIVACY[0];

  return (
    <>
      <View style={s.panel}>
        <FileRow label="Beat" hint="mp3 · wav · m4a · flac · ogg" slot={studio.audio} onPick={studio.pickAudio} />
        <FileRow label="Artwork" hint="jpg · png · webp · gif" slot={studio.image} onPick={studio.pickImage} last />
      </View>

      <Field label="Title" right={`${studio.title.length}/100`}>
        <TextInput
          value={studio.title}
          onChangeText={(t) => studio.set({ title: t })}
          maxLength={100}
          style={s.input}
          placeholder="FREE Type Beat “Name”"
          placeholderTextColor={C.t3}
          accessibilityLabel="Video title"
        />
      </Field>

      <TitleChecks title={studio.title} runId={run?.id} />

      {run ? <TitleIdeas runId={run.id} beatName={beatNameOf(studio.audio?.name)} onPick={(title) => studio.set({ title })} /> : null}

      <View style={s.panel}>
        <PickRow label="Description" value={description.title} onPress={() => toggle('desc')} open={open === 'desc'} />
        <PickRow
          label="Tags"
          value={run ? `${run.query} · ${run.tags.length}` : 'None'}
          onPress={() => toggle('tags')}
          open={open === 'tags'}
          last
        />
      </View>

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

      <Field
        label="This video’s description"
        right={studio.descText !== null ? 'Edited' : undefined}
        action={studio.descText !== null ? { label: 'Use template', onPress: () => studio.set({ descText: null }) } : undefined}>
        <TextInput
          value={text}
          onChangeText={(t) => studio.set({ descText: t })}
          multiline
          style={[s.input, s.multiline]}
          placeholder="Description"
          placeholderTextColor={C.t3}
          accessibilityLabel="This video's description"
        />
      </Field>

      <View style={s.two}>
        <Field label="BPM" style={{ flex: 1 }}>
          <TextInput
            value={studio.bpm}
            onChangeText={(t) => studio.set({ bpm: t.replace(/[^0-9.]/g, '').slice(0, 6) })}
            keyboardType="decimal-pad"
            style={s.input}
            placeholder="140"
            placeholderTextColor={C.t3}
            accessibilityLabel="BPM"
          />
        </Field>
        <Field label="Key" style={{ flex: 1.4 }}>
          <TextInput
            value={studio.musicKey}
            onChangeText={(t) => studio.set({ musicKey: t.slice(0, 24) })}
            style={s.input}
            placeholder="F minor"
            placeholderTextColor={C.t3}
            accessibilityLabel="Key"
          />
        </Field>
      </View>
      {studio.bpm || studio.musicKey ? <Text style={s.hint}>Added to the end of the description as “{[studio.bpm && `BPM: ${studio.bpm}`, studio.musicKey && `Key: ${studio.musicKey}`].filter(Boolean).join(' | ')}”.</Text> : null}

      <Field label="Visibility">
        <Segmented value={studio.privacy} onChange={(privacy) => studio.set({ privacy })} options={PRIVACY} />
      </Field>
      <Text style={s.hint}>{privacy.hint}</Text>

      {studio.active ? <Button title="Start over" variant="plain" size="sm" onPress={studio.reset} /> : null}
    </>
  );
}

// Title ideas from the chosen tag run's best keywords; tap one to use it.
function TitleIdeas({ runId, beatName, onPick }: { runId: string; beatName: string; onPick: (title: string) => void }) {
  const s = useStyles();
  const [ideas, setIdeas] = useState<api.TitleIdea[] | null>(null);
  const [error, setError] = useState(false);
  // A title step from your plan ("Lead 3 titles with ...") shows here, where titles are written.
  const { plan } = usePlan();
  const titleStep = plan?.steps.find((st) => (st.kind === 'title_formula' || st.kind === 'title_pair') && !st.done);

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
      <Text style={s.label}>Title ideas · tap to use</Text>
      {titleStep ? (
        <Text style={s.planHint}>
          {plan!.pro_name}’s move: {titleStep.text} · {titleStep.count ?? 0}/{titleStep.target}
        </Text>
      ) : null}
      <View style={s.panel}>
        {ideas.map((idea, i) => (
          <Pressable
            key={idea.title}
            onPress={() => onPick(idea.title)}
            style={({ pressed }) => [s.idea, i < ideas.length - 1 && s.divider, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityHint="Uses this as the video title">
            <Text style={s.ideaTitle}>{idea.title}</Text>
            <Text style={s.mono}>
              {idea.score != null ? `Score ${idea.score} · ` : ''}
              {idea.keywords.length} keyword{idea.keywords.length === 1 ? '' : 's'} · {idea.length}/100
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Live checks on the typed title, a moment after typing stops: artist first, length,
// the run's top keyword, the beat name. Hidden until there is a title, and if the server can't score it.
function TitleChecks({ title, runId }: { title: string; runId?: string }) {
  const C = useColors();
  const s = useStyles();
  // Keep the last good result on screen while a new check is on its way, so it doesn't flicker.
  const [result, setResult] = useState<api.TitleScore | null>(null);
  const trimmed = title.trim();

  useEffect(() => {
    if (!trimmed) return;
    let alive = true;
    const timer = setTimeout(() => {
      api.scoreTitle(trimmed, runId).then(
        (r) => alive && setResult(r),
        () => alive && setResult(null),
      );
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [trimmed, runId]);

  if (!trimmed || !result?.checks) return null;
  const misses = result.checks.filter((c) => !c.ok);
  return (
    <View style={[s.panel, s.checks]} accessibilityLabel={`Title score ${result.score}`}>
      <Text style={s.checkScore}>
        Title score <Text style={s.checkScoreNum}>{result.score}</Text>
        {misses.length ? '' : ' · looks good'}
      </Text>
      {result.checks.map((c) => (
        <View key={c.id} style={s.checkRow}>
          <Text style={[s.checkMark, { color: c.ok ? C.acc : C.t3 }]}>{c.ok ? '✓' : '·'}</Text>
          <Text style={[s.checkText, { color: c.ok ? C.t3 : C.text }]}>{c.message}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- Image

type Undo = { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void; begin: () => void };

/**
 * Move, size, rotate and flip the artwork, like the website's free transform. Dragging and
 * pinching in the preview does the same; `fill` is the size that covers the whole frame.
 */
export function ImageTab({ undo, fill }: { undo: Undo; fill: number }) {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const [locked, setLocked] = useState(() => Math.abs(studio.scaleX - studio.scaleY) < 0.001);
  const t: Transform = { scaleX: studio.scaleX, scaleY: studio.scaleY, posX: studio.posX, posY: studio.posY, rotation: studio.rotation, flipH: studio.flipH, flipV: studio.flipV };
  const apply = (patch: Partial<Transform>) => studio.set(clampTransform({ ...t, ...patch }));
  const now = (patch: Partial<Transform>) => {
    undo.begin();
    apply(patch);
  };
  const size = (v: number) => {
    const ratio = studio.scaleX > 0 ? studio.scaleY / studio.scaleX : 1;
    apply({ scaleX: v, scaleY: v * ratio });
  };

  return (
    <>
      <View style={s.headRow}>
        <Text style={s.hint}>{studio.image ? 'Drag the art in the preview to move it. Pinch to size it, twist to rotate.' : 'Add artwork in Details first.'}</Text>
        <IconButton label="Undo" disabled={!undo.canUndo} onPress={undo.undo} d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />
        <IconButton label="Redo" disabled={!undo.canRedo} onPress={undo.redo} d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" />
      </View>
      <View style={s.grid4}>
        <Chip label="Fit" on={false} onPress={() => now(FIT)} />
        <Chip label="Fill" on={false} onPress={() => now({ ...FIT, scaleX: fill, scaleY: fill })} />
        <Chip label="Flip ↔" on={studio.flipH} onPress={() => now({ flipH: !studio.flipH })} />
        <Chip label="Flip ↕" on={studio.flipV} onPress={() => now({ flipV: !studio.flipV })} />
      </View>
      {locked ? (
        <SliderField label="Size" value={studio.scaleX} display={`${studio.scaleX.toFixed(2)}×`} min={0.1} max={3} step={0.01} onStart={undo.begin} onChange={size} />
      ) : (
        <View style={s.two}>
          <SliderField half label="Width" value={studio.scaleX} display={`${studio.scaleX.toFixed(2)}×`} min={0.1} max={3} step={0.01} onStart={undo.begin} onChange={(v) => apply({ scaleX: v })} />
          <SliderField half label="Height" value={studio.scaleY} display={`${studio.scaleY.toFixed(2)}×`} min={0.1} max={3} step={0.01} onStart={undo.begin} onChange={(v) => apply({ scaleY: v })} />
        </View>
      )}
      <ToggleRow
        label="Keep proportions"
        value={locked}
        onChange={(v) => {
          setLocked(v);
          if (v && studio.scaleX !== studio.scaleY) now({ scaleY: studio.scaleX });
        }}
      />
      <SliderField label="Rotation" value={studio.rotation} display={`${Math.round(studio.rotation)}°`} min={-180} max={180} step={1} onStart={undo.begin} onChange={(v) => apply({ rotation: v })} />
      <View style={s.two}>
        <SliderField half label="Left / right" value={studio.posX} display={`${Math.round(studio.posX * 50)}%`} min={-1} max={1} step={0.01} onStart={undo.begin} onChange={(v) => apply({ posX: v })} />
        <SliderField half label="Down / up" value={-studio.posY} display={`${Math.round(-studio.posY * 50)}%`} min={-1} max={1} step={0.01} onStart={undo.begin} onChange={(v) => apply({ posY: -v })} />
      </View>
      {studio.posX || studio.posY ? <Button title="Center the art" variant="plain" size="sm" onPress={() => now({ posX: 0, posY: 0 })} /> : null}
      {!studio.image ? null : <Text style={[s.hint, { color: C.t3 }]}>The video uses exactly this layout.</Text>}
    </>
  );
}

// ---------------------------------------------------------------- Video

const SHAPES: { value: Aspect; label: string; sub: string; w: number; h: number }[] = [
  { value: '16:9', label: '16:9', sub: 'YouTube', w: 22, h: 12.4 },
  { value: '9:16', label: '9:16', sub: 'Shorts', w: 9.6, h: 17 },
  { value: '1:1', label: '1:1', sub: 'Square', w: 15, h: 15 },
  { value: '4:5', label: '4:5', sub: 'Portrait', w: 13, h: 16.25 },
];

export function VideoTab() {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const sub = useSubscription();
  const paid = !sub || sub.is_subscribed;
  const animated = /\.gif$/i.test(studio.image?.name ?? '');
  const fpsNote = studio.viz.enabled
    ? 'The visualizer renders at 30 or 60 fps.'
    : animated && studio.fps === '2'
      ? 'Animated artwork looks choppy at 2 fps. Use 30 or 60.'
      : !animated && studio.fps !== '2'
        ? 'Still artwork looks the same at 2 fps and uploads much faster.'
        : studio.fps === '2'
          ? 'Fastest. Best for still cover art.'
          : 'Smooth motion for animated artwork.';

  return (
    <>
      <Text style={s.label}>Shape</Text>
      <View style={s.grid4}>
        {SHAPES.map((sh) => {
          const on = studio.format === sh.value;
          return (
            <Pressable
              key={sh.value}
              onPress={() => studio.set({ format: sh.value })}
              style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { opacity: 0.7 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${sh.label} ${sh.sub}`}>
              <View style={{ height: 22, justifyContent: 'center' }}>
                <View style={{ width: sh.w, height: sh.h, borderRadius: 2.5, borderWidth: 1.6, borderColor: on ? C.acc : C.t2 }} />
              </View>
              <Text style={[s.tileLabel, on && { color: C.text }]}>{sh.label}</Text>
              <Text style={s.tileSub}>{sh.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.label}>Background</Text>
      <View style={s.grid3}>
        {(['black', 'white', 'blurred'] as const).map((bg) => {
          const on = studio.bg === bg;
          return (
            <Pressable
              key={bg}
              onPress={() => studio.set({ bg })}
              style={({ pressed }) => [s.tile, s.bgTile, on && s.tileOn, pressed && { opacity: 0.7 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={bg === 'blurred' ? 'Blurred art' : bg}>
              <View style={[s.swatch, { backgroundColor: bg === 'white' ? '#FFFFFF' : '#000000' }]}>
                {bg === 'blurred' && studio.image ? <Image source={{ uri: studio.image.uri }} style={{ flex: 1 }} contentFit="cover" blurRadius={8} /> : null}
                {bg === 'blurred' && !studio.image ? <View style={{ flex: 1, backgroundColor: '#3b2f6b' }} /> : null}
              </View>
              <Text style={[s.tileLabel, on && { color: C.text }]}>{bg === 'blurred' ? 'Blurred art' : bg === 'white' ? 'White' : 'Black'}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field label="Frame rate">
        <Segmented
          value={studio.viz.enabled && studio.fps === '2' ? '30' : studio.fps}
          onChange={(fps) => studio.set({ fps: studio.viz.enabled && fps === '2' ? '30' : fps })}
          options={[
            { value: '2', label: '2 fps' },
            { value: '30', label: '30 fps' },
            { value: '60', label: '60 fps' },
          ]}
        />
      </Field>
      <Text style={s.hint}>{fpsNote}</Text>

      <ToggleRow
        label="Remove watermark"
        sub={paid ? 'No “Upload your beats online” line on the video.' : 'Plus and Pro plans.'}
        value={paid && studio.noWatermark}
        onChange={(v) => {
          if (v && !paid) {
            openPaywall('needs_plan', 'Removing the watermark needs a Plus or Pro plan.');
            return;
          }
          studio.set({ noWatermark: v });
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------- Visualizer

export function VizTab() {
  const C = useColors();
  const s = useStyles();
  const studio = useStudio();
  const sub = useSubscription();
  const { viz, setViz } = studio;
  const proAllowed = !sub || sub.is_subscribed;
  const current = VIZ_STYLES.find((st) => st.mode === viz.mode) ?? VIZ_STYLES[0];
  const legacy = isLegacyStyle(viz.mode);
  const look = lookOf(viz);
  const center = hasCenter(viz.mode);

  return (
    <>
      <ToggleRow
        label="Visualizer"
        sub={viz.enabled ? `${current.name}${current.pro ? ' · premium' : ''}` : 'Bars that move with your beat, rendered on your phone.'}
        value={viz.enabled}
        onChange={(v) => setViz({ enabled: v })}
      />
      {!viz.enabled ? null : (
        <>
          {[false, true].map((pro) => (
            <View key={String(pro)} style={{ gap: 8 }}>
              <Text style={s.label}>{pro ? (proAllowed ? 'Premium' : 'Premium · Plus and Pro') : 'Free'}</Text>
              <View style={s.vizGrid}>
                {VIZ_STYLES.filter((st) => st.pro === pro).map((st) => {
                  const active = st.mode === viz.mode;
                  return (
                    <Pressable
                      key={st.mode}
                      onPress={() => studio.pickVizStyle(st.mode)}
                      style={({ pressed }) => [s.vizTile, active && s.tileOn, pressed && { opacity: 0.7 }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${st.name}${st.pro && !proAllowed ? ', premium style' : ''}`}>
                      {st.icon ? <Image source={{ uri: iconUrl(st.mode) }} style={s.vizIcon} contentFit="contain" /> : <View style={s.vizIcon} />}
                      <Text style={[s.vizName, active && { color: C.text }]} numberOfLines={1}>
                        {st.name}
                      </Text>
                      {st.pro && !proAllowed ? (
                        <View style={s.lock}>
                          <Svg width={9} height={10} viewBox="0 0 12 14">
                            <Path d="M3 6V4a3 3 0 016 0v2M2 6h8v7H2z" fill="none" stroke={C.t2} strokeWidth={1.6} strokeLinejoin="round" />
                          </Svg>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Text style={s.hint}>
            Picking a style resets it to its recommended look.
            {current.pro && !proAllowed ? ' You can try premium styles here; uploading with one needs Plus or Pro.' : ''}
          </Text>

          <Group title="Look">
            {legacy ? <ToggleRow label="Rainbow colours" sub="Colour follows loudness" value={look.rainbow} onChange={(rainbow) => setViz({ rainbow })} /> : null}
            {!(legacy && look.rainbow) ? (
              <>
                <Text style={s.label}>{current.pro ? 'Main colour' : 'Colour'}</Text>
                <ColourRow colours={COLOURS} value={viz.color} onChange={(color) => setViz({ color })} />
              </>
            ) : null}
            {current.pro || legacy ? (
              <>
                <Text style={s.label}>{current.pro ? 'Second colour' : 'Glow colour'}</Text>
                <ColourRow colours={COLOURS_2} value={viz.color2} onChange={(color2) => setViz({ color2 })} />
              </>
            ) : null}
            <SliderField label="Reactivity" value={viz.intensity} display={`${viz.intensity.toFixed(2)}×`} min={0.5} max={2} step={0.05} onChange={(intensity) => setViz({ intensity })} />
          </Group>

          {center ? (
            <Group title="Logo">
              <Segmented<CenterFill>
                compact
                value={look.center}
                onChange={(c) => setViz({ center: c })}
                options={[
                  { value: 'image', label: 'Picture' },
                  { value: 'color', label: 'Colour' },
                  { value: 'transparent', label: 'See-through' },
                ]}
              />
              {look.center === 'image' ? (
                <View style={s.headRow}>
                  <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>
                    {studio.logo ? studio.logo.name : 'Your artwork'}
                  </Text>
                  {studio.logo ? <Button title="Use artwork" variant="plain" size="sm" onPress={() => studio.set({ logo: null })} /> : null}
                  <Button title={studio.logo ? 'Change' : 'Choose logo'} variant="secondary" size="sm" onPress={studio.pickLogo} />
                </View>
              ) : null}
              {look.center === 'color' ? (
                <>
                  <Text style={s.label}>Fill colour</Text>
                  <ColourRow colours={COLOURS} value={look.centerColor} onChange={(centerColor) => setViz({ centerColor })} />
                </>
              ) : null}
              {look.center !== 'transparent' ? <ToggleRow label="Outline around the logo" value={look.outline} onChange={(outline) => setViz({ outline })} /> : null}
            </Group>
          ) : null}

          <Group title="Effects">
            {legacy ? (
              <>
                <ToggleRow label="Stars" sub="Fly toward you, faster on bass" value={look.stars} onChange={(stars) => setViz({ stars })} />
                <SliderField label="Shake" value={look.shake} display={look.shake ? `${look.shake.toFixed(2)}×` : 'Off'} min={0} max={2} step={0.05} onChange={(shake) => setViz({ shake })} />
                <ToggleRow label="Flash on hard hits" value={look.flash} onChange={(flash) => setViz({ flash })} />
              </>
            ) : null}
            <SliderField label="Artwork zoom on the kick" value={look.zoom} display={look.zoom ? `${Math.round(look.zoom * 100)}%` : 'Off'} min={0} max={1} step={0.05} onChange={(zoom) => setViz({ zoom })} />
            <ToggleRow label="Dark corners" value={look.vignette} onChange={(vignette) => setViz({ vignette })} />
            <SliderField label="Artwork brightness" value={look.brightness} display={`${Math.round(look.brightness * 100)}%`} min={0.2} max={1} step={0.05} onChange={(brightness) => setViz({ brightness })} />
          </Group>
          <Text style={s.hint}>The video renders on your phone before it uploads. Keep the app open; it takes about as long as the beat.</Text>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- AI checks

export type AiResults = { analysis: api.BeatAnalysis | null; thumb: api.ThumbnailCheck | null };

export function AiTab({ results, setResults }: { results: AiResults; setResults: (r: AiResults) => void }) {
  const s = useStyles();
  const studio = useStudio();
  const { run } = useDraft();
  const yt = useRequest(api.youtubeStatus);
  const [busy, setBusy] = useState<'analysis' | 'thumb' | null>(null);
  const [error, setError] = useState<{ which: 'analysis' | 'thumb'; message: string } | null>(null);
  const title = studio.title.trim();
  const tags = run?.tags ?? [];
  const description = studio.finalDescription.trim();

  const analysisNeeds = !title ? 'Add a title first.' : !tags.length ? 'Pick a tag set in Details first.' : null;
  const thumbNeeds = studio.image?.status !== 'ready' ? 'Add artwork first.' : !title ? 'Add a title first.' : !tags.length ? 'Pick a tag set in Details first.' : !description ? 'Add a description first.' : null;

  const analyse = async () => {
    if (analysisNeeds || busy || !requirePro()) return;
    setBusy('analysis');
    setError(null);
    try {
      const analysis = await api.analyzeBeat({ title, tags, description, channel_name: yt.data?.name ?? '' });
      setResults({ ...results, analysis });
    } catch (e) {
      setError({ which: 'analysis', message: e instanceof Error ? e.message : 'The check failed. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  const checkThumb = async () => {
    if (thumbNeeds || busy || !studio.image?.fileId) return;
    setBusy('thumb');
    setError(null);
    try {
      const thumb = await api.checkThumbnail({ imageFileId: studio.image.fileId, title, tags, description });
      setResults({ ...results, thumb });
    } catch (e) {
      setError({ which: 'thumb', message: e instanceof Error ? e.message : 'The check failed. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  const a = results.analysis;
  const t = results.thumb;
  return (
    <>
      <View style={s.panelPad}>
        <View style={s.headRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.cardTitle}>Title and tags</Text>
            <Text style={s.hint}>Scores your packaging against your channel. Pro.</Text>
          </View>
          {a ? <Score value={a.overall_score} /> : null}
        </View>
        {a ? (
          <View style={{ gap: 10 }}>
            {a.predicted_performance ? <Fact label="Likely" value={a.predicted_performance} /> : null}
            {a.title_diagnosis ? <Text style={s.body}>{a.title_diagnosis}</Text> : null}
            {a.better_title_angles?.length ? (
              <View style={{ gap: 6 }}>
                <Text style={s.label}>Better titles · tap to use</Text>
                {a.better_title_angles.slice(0, 4).map((angle) => (
                  <Pressable key={angle} onPress={() => studio.set({ title: angle.slice(0, 100) })} style={({ pressed }) => [s.suggestion, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityHint="Uses this as the video title">
                    <Text style={s.body}>{angle}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Bullets items={a.suggestions} />
            {a.tag_strategy ? <Fact label="Tags" value={a.tag_strategy} /> : null}
          </View>
        ) : null}
        {error?.which === 'analysis' ? <Text style={s.error}>{error.message}</Text> : null}
        {analysisNeeds ? <Text style={s.hint}>{analysisNeeds}</Text> : null}
        <Button title={busy === 'analysis' ? 'Checking…' : a ? 'Check again' : 'Check title and tags'} variant="secondary" size="md" onPress={analysisNeeds || busy ? undefined : analyse} />
      </View>

      <View style={s.panelPad}>
        <View style={s.headRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.cardTitle}>Thumbnail</Text>
            <Text style={s.hint}>How your artwork works as a thumbnail for this title.</Text>
          </View>
          {t ? <Score value={t.score} /> : null}
        </View>
        {t ? (
          <View style={{ gap: 10 }}>
            {t.verdict ? <Text style={s.body}>{t.verdict}</Text> : null}
            {t.ctr_risk ? <Fact label="Click risk" value={t.ctr_risk} /> : null}
            <Bullets items={t.issues} />
            <Bullets items={t.suggestions} />
            {t.text_overlay_suggestion ? <Fact label="Text on it" value={t.text_overlay_suggestion} /> : null}
          </View>
        ) : null}
        {error?.which === 'thumb' ? <Text style={s.error}>{error.message}</Text> : null}
        {thumbNeeds ? <Text style={s.hint}>{thumbNeeds}</Text> : null}
        <Button title={busy === 'thumb' ? 'Checking…' : t ? 'Check again' : 'Check thumbnail'} variant="secondary" size="md" onPress={thumbNeeds || busy ? undefined : checkThumb} />
      </View>
      {busy ? <ActivityIndicator style={{ alignSelf: 'center' }} /> : null}
    </>
  );
}

function Score({ value }: { value: number }) {
  const C = useColors();
  const s = useStyles();
  const tone = value >= 75 ? C.acc : value >= 50 ? C.warn : C.danger;
  return (
    <View style={[s.score, { borderColor: tone }]}>
      <Text style={[s.scoreText, { color: tone }]}>{Math.round(value)}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <Text style={s.body}>
      <Text style={{ ...font('600') }}>{label}: </Text>
      {value}
    </Text>
  );
}

function Bullets({ items }: { items?: string[] }) {
  const s = useStyles();
  if (!items?.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {items.slice(0, 5).map((it) => (
        <View key={it} style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={s.body}>•</Text>
          <Text style={[s.body, { flex: 1 }]}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- Small controls

function FileRow({ label, hint, slot, onPick, last }: { label: string; hint: string; slot: FileSlot | null; onPick: () => void; last?: boolean }) {
  const C = useColors();
  const s = useStyles();
  const value = !slot ? hint : slot.status === 'uploading' ? 'Uploading…' : slot.status === 'error' ? (slot.error ?? 'Upload failed') : slot.name;
  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${slot ? value : 'choose a file'}`}
      style={({ pressed }) => [s.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: C.card2 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowMono, !slot && { color: C.t3 }, slot?.status === 'error' && { color: C.danger }]} numberOfLines={1}>
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

function PickRow({ label, value, onPress, open, last }: { label: string; value: string; onPress: () => void; open: boolean; last?: boolean }) {
  const C = useColors();
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [s.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: C.card2 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[s.chevron, open && { transform: [{ rotate: '90deg' }] }]}>›</Text>
    </Pressable>
  );
}

function Field({ label, right, action, children, style }: { label: string; right?: string; action?: { label: string; onPress: () => void }; children: ReactNode; style?: object }) {
  const s = useStyles();
  return (
    <View style={[{ gap: 6 }, style]}>
      <View style={s.fieldHead}>
        <Text style={s.label}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
              <Text style={s.link}>{action.label}</Text>
            </Pressable>
          ) : null}
          {right ? <Text style={s.mono}>{right}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, on && s.tileOn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ label, d, onPress, disabled }: { label: string; d: string; onPress: () => void; disabled?: boolean }) {
  const C = useColors();
  const s = useStyles();
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}>
      <Svg width={15} height={15} viewBox="0 0 24 24">
        <Path d={d} fill="none" stroke={disabled ? C.t3 : C.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

export function ToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const C = useColors();
  const s = useStyles();
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.body}>{label}</Text>
        {sub ? <Text style={s.hint}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: C.card2, true: C.acc }} thumbColor="#FFFFFF" ios_backgroundColor={C.card2} accessibilityLabel={label} />
    </View>
  );
}

function ColourRow({ colours, value, onChange }: { colours: string[]; value: string; onChange: (c: string) => void }) {
  const C = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      {colours.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Colour ${c}`}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: on ? 2.5 : 1, borderColor: on ? C.text : C.line }}
          />
        );
      })}
    </View>
  );
}

function SliderField(props: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  half?: boolean;
  onStart?: () => void;
  onChange: (v: number) => void;
}) {
  const C = useColors();
  return (
    <View style={[{ gap: 2 }, props.half ? { flex: 1 } : null]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.t2, fontSize: 12.5, ...font() }}>{props.label}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontFamily: F.mono }}>{props.display}</Text>
      </View>
      <Slider
        value={Math.min(props.max, Math.max(props.min, props.value))}
        minimumValue={props.min}
        maximumValue={props.max}
        step={props.step}
        onSlidingStart={props.onStart}
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
  panel: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, overflow: 'hidden' },
  panelPad: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  rowLabel: { width: 84, color: C.t2, fontSize: 14, ...font() },
  rowValue: { flex: 1, color: C.text, fontSize: 15, ...font() },
  rowMono: { flex: 1, color: C.text, fontSize: 13, fontFamily: F.mono },
  chevron: { color: C.t3, fontSize: 16, width: 14, textAlign: 'center' },
  choose: { color: C.text, fontSize: 13, ...font('500') },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.acc },
  fieldHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.t2, fontSize: 12.5, ...font('500') },
  link: { color: C.text, fontSize: 12.5, textDecorationLine: 'underline', ...font('500') },
  mono: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  input: {
    minHeight: 46,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
    color: C.text,
    paddingHorizontal: 12,
    fontSize: 16,
    ...font(),
  },
  multiline: { minHeight: 120, maxHeight: 220, paddingTop: 12, paddingBottom: 12, fontSize: 14.5, lineHeight: 20, textAlignVertical: 'top' },
  two: { flexDirection: 'row', gap: 10 },
  hint: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1, ...font() },
  body: { color: C.text, fontSize: 14, lineHeight: 20, ...font() },
  error: { color: C.danger, fontSize: 12.5, lineHeight: 17, ...font() },
  planHint: { color: C.acc, fontSize: 12.5, lineHeight: 17, ...font() },
  idea: { paddingHorizontal: 14, paddingVertical: 11, gap: 3 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  ideaTitle: { color: C.text, fontSize: 14.5, lineHeight: 20, ...font() },
  checks: { paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  checkScore: { color: C.t2, fontSize: 13, ...font() },
  checkScoreNum: { color: C.text, fontSize: 13, fontFamily: F.mono },
  checkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  checkMark: { width: 14, fontSize: 13, lineHeight: 18, fontFamily: F.mono },
  checkText: { flex: 1, fontSize: 12.5, lineHeight: 18, ...font() },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid4: { flexDirection: 'row', gap: 8 },
  grid3: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, height: 40, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: C.text, fontSize: 13, ...font('500') },
  iconBtn: { width: 34, height: 34, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2 },
  tileOn: { borderColor: C.acc, backgroundColor: C.accSoft },
  tileLabel: { color: C.t2, fontSize: 12.5, ...font('500') },
  tileSub: { color: C.t3, fontSize: 10.5, ...font() },
  bgTile: { paddingVertical: 8 },
  swatch: { width: 44, height: 26, borderRadius: 6, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  group: { gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.lineSoft },
  groupTitle: { color: C.text, fontSize: 15, ...font('600') },
  vizGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vizTile: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '24%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
  },
  vizIcon: { width: 44, height: 28 },
  vizName: { color: C.t2, fontSize: 11, ...font('500') },
  lock: { position: 'absolute', top: 5, right: 5 },
  cardTitle: { color: C.text, fontSize: 15, ...font('600') },
  suggestion: { padding: 10, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  score: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 16, fontFamily: F.monoMedium },
}));
