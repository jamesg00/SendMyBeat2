import Slider from '@react-native-community/slider';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import type { PickedFile, UploadJob, YouTubeUploadOptions } from '@/api/endpoints';
import { Button, Card, IconTile, ListGroup, ListRow, Meter, Pill, Segmented, styles as ui } from '@/components/ui';
import { useDraft } from '@/state/draft';
import { C, F, R } from '@/theme';

type Tool = 'details' | 'visualizer' | 'look';
type FileSlot = { name: string; uri: string; fileId?: string; status: 'uploading' | 'ready' | 'error'; error?: string };
type Phase = { kind: 'idle' } | { kind: 'sending' } | { kind: 'job'; job: UploadJob } | { kind: 'done'; url?: string; message: string } | { kind: 'error'; message: string };

const ASPECT: Record<YouTubeUploadOptions['aspectRatio'], number> = { '16:9': 16 / 9, '1:1': 1, '9:16': 9 / 16, '4:5': 4 / 5 };

export default function StudioScreen() {
  const insets = useSafeAreaInsets();
  const { run, description, setDescription } = useDraft();
  const [tool, setTool] = useState<Tool>('details');
  const [title, setTitle] = useState(run ? `${run.query} type beat` : '');
  const [privacy, setPrivacy] = useState<YouTubeUploadOptions['privacy']>('public');
  const [audio, setAudio] = useState<FileSlot | null>(null);
  const [image, setImage] = useState<FileSlot | null>(null);
  const [format, setFormat] = useState<YouTubeUploadOptions['aspectRatio']>('16:9');
  const [fps, setFps] = useState<YouTubeUploadOptions['renderFps']>('2');
  const [bg, setBg] = useState<YouTubeUploadOptions['background']>('black');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [noWatermark, setNoWatermark] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const jobId = phase.kind === 'job' ? phase.job.id : null;

  // Poll the render + upload job the same way the website does (every 3s).
  useEffect(() => {
    if (!jobId) return;
    const timer = setInterval(async () => {
      try {
        const { job } = await api.uploadJob(jobId);
        if (!job) return;
        if (job.status === 'succeeded') {
          setPhase({ kind: 'done', url: job.result?.video_url, message: job.result?.message ?? 'Video uploaded to YouTube.' });
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          setPhase({ kind: 'error', message: job.error ?? 'YouTube upload failed.' });
        } else {
          setPhase({ kind: 'job', job });
        }
      } catch {
        // keep polling through brief network drops
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [jobId]);

  const pickAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    const picked: PickedFile = { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'audio/mpeg', file: a.file };
    await send(picked, setAudio, api.uploadAudio);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    const name = a.fileName ?? `artwork.${(a.mimeType ?? 'image/jpeg').split('/')[1]}`;
    const picked: PickedFile = { uri: a.uri, name, mimeType: a.mimeType ?? 'image/jpeg', file: a.file };
    await send(picked, setImage, api.uploadImage);
  };

  const send = async (
    f: PickedFile,
    set: (s: FileSlot) => void,
    upload: (f: PickedFile) => Promise<api.UploadedFile>,
  ) => {
    set({ name: f.name, uri: f.uri, status: 'uploading' });
    try {
      const { file_id } = await upload(f);
      set({ name: f.name, uri: f.uri, fileId: file_id, status: 'ready' });
    } catch (e) {
      set({ name: f.name, uri: f.uri, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
    }
  };

  const missing = !title.trim()
    ? 'Add a video title'
    : audio?.status !== 'ready'
      ? 'Add your beat'
      : image?.status !== 'ready'
        ? 'Add artwork'
        : null;

  const publish = async () => {
    if (missing || !audio?.fileId || !image?.fileId) return;
    setPhase({ kind: 'sending' });
    try {
      // The upload endpoint needs a saved description; starter templates get saved on first use.
      let descriptionId = description.id;
      if (!description.saved) {
        const created = await api.createDescription(description.title, description.content);
        descriptionId = created.id;
        setDescription({ ...description, id: created.id, saved: true });
      }
      const res = await api.startYouTubeUpload({
        title: title.trim(),
        descriptionId,
        tagsId: run?.id,
        privacy,
        audioFileId: audio.fileId,
        imageFileId: image.fileId,
        aspectRatio: format,
        imageScale: scale,
        imageRotation: Math.round(rotation),
        background: bg,
        renderFps: fps,
        removeWatermark: noWatermark,
      });
      if (res.job?.id) setPhase({ kind: 'job', job: res.job });
      else setPhase({ kind: 'done', url: res.video_url, message: res.message ?? 'Upload started.' });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Upload failed.' });
    }
  };

  const busy = phase.kind === 'sending' || phase.kind === 'job';
  const summary = `MP4 · ${fps} fps · ${format} · ${bg} bg · ${privacy}`;

  return (
    <View style={[s.root, { paddingTop: insets.top + 6 }]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.close} accessibilityRole="button" accessibilityLabel="Close Upload Studio">
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>✕</Text>
        </Pressable>
        <Text style={s.topTitle}>Upload Studio</Text>
        <Pill label={busy ? 'Working' : 'Live'} />
      </View>

      <Preview image={image} format={format} bg={bg} scale={scale} rotation={rotation} />

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
              <FileRow label="Beat" hint="MP3 · WAV · M4A · FLAC · OGG" slot={audio} icon="♪" onPick={pickAudio} />
              <FileRow label="Artwork" hint="JPG · PNG · WEBP · GIF" slot={image} icon="▣" onPick={pickImage} last />
            </ListGroup>
            <View style={{ gap: 6 }}>
              <Text style={[ui.sectionLabel, { paddingHorizontal: 4 }]}>VIDEO TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} style={s.input} placeholder="Enter beat title here" placeholderTextColor={C.t3} />
            </View>
            <ListGroup>
              <ListRow title="Description" value={description.title} onPress={() => router.back()} />
              <ListRow title="Tags" value={run ? `${run.query} · ${run.tags.length}` : 'None'} onPress={() => router.back()} last />
            </ListGroup>
            <Text style={[ui.sectionLabel, { paddingHorizontal: 4 }]}>PRIVACY</Text>
            <Segmented
              value={privacy}
              onChange={setPrivacy}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'unlisted', label: 'Unlisted' },
                { value: 'private', label: 'Private' },
              ]}
            />
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
            <Segmented compact value={format} onChange={setFormat} options={[
              { value: '16:9', label: '16:9' },
              { value: '1:1', label: '1:1' },
              { value: '9:16', label: '9:16' },
              { value: '4:5', label: '4:5' },
            ]} />
            <Text style={ui.sectionLabel}>FRAME RATE</Text>
            <Segmented compact value={fps} onChange={setFps} options={[
              { value: '2', label: '2 · Fastest' },
              { value: '30', label: '30' },
              { value: '60', label: '60' },
            ]} />
            <Text style={s.muted}>2 fps is best for still cover art and uploads much faster. Use 30/60 for GIF artwork.</Text>
            <Text style={ui.sectionLabel}>BACKGROUND</Text>
            <Segmented compact value={bg} onChange={setBg} options={[
              { value: 'black', label: 'Black' },
              { value: 'white', label: 'White' },
              { value: 'blurred', label: 'Blurred' },
            ]} />
            <View style={s.sliderGrid}>
              <SliderField label="Scale" value={scale} display={`${scale.toFixed(2)}x`} min={0.5} max={2} step={0.05} onChange={setScale} />
              <SliderField label="Rotation" value={rotation} display={`${Math.round(rotation)}°`} min={-180} max={180} step={1} onChange={setRotation} />
            </View>
            <Row label="Remove watermark">
              <Switch
                value={noWatermark}
                onValueChange={setNoWatermark}
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
            <Button title="Done" variant="secondary" style={{ flex: 1 }} onPress={() => router.back()} />
          </View>
        ) : (
          <Button
            title={busy ? 'Uploading…' : missing ?? 'Upload to YouTube'}
            variant={missing && !busy ? 'secondary' : 'primary'}
            onPress={busy || missing ? undefined : publish}
          />
        )}
        <Text style={s.summary}>{summary}</Text>
      </View>
    </View>
  );
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
    const pct = Math.max(0, Math.min(100, phase.job.progress ?? 0));
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.muted} numberOfLines={1}>{phase.job.message ?? 'Rendering and uploading…'}</Text>
          <Text style={[s.muted, { fontFamily: F.mono }]}>{pct}%</Text>
        </View>
        <Meter value={pct / 100} />
      </View>
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

function Preview({ image, format, bg, scale, rotation }: { image: FileSlot | null; format: YouTubeUploadOptions['aspectRatio']; bg: YouTubeUploadOptions['background']; scale: number; rotation: number }) {
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
    height: 200,
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
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  muted: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  input: { height: 44, paddingHorizontal: 14, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, color: C.text, fontSize: 15 },
  sliderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  summary: { textAlign: 'center', color: C.t3, fontSize: 11, fontFamily: F.mono },
});
