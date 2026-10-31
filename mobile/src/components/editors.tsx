import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import * as api from '@/api/endpoints';
import type { Description, ScoredTag, TagLevel, TagRun } from '@/api/endpoints';
import { Button, Card, ListGroup, ListRow, Meter, Segmented, SwipeToDelete, confirmAction } from '@/components/ui';
import { DESCRIPTION_TEMPLATES } from '@/data/templates';
import { useDraft, type DraftDescription } from '@/state/draft';
import { F, R, font, makeStyles, useColors } from '@/theme';

// The description and tag editors, shared by Workflow and Upload Studio.

// YouTube rejects tag lists longer than this. It joins tags with commas and wraps a tag that
// has a space in quotes, which count too (the server counts the same way).
export const TAG_CHAR_LIMIT = 500;
const tagCost = (t: string) => t.length + (t.includes(' ') ? 2 : 0);
export const tagChars = (tags: string[]) => (tags.length ? tags.reduce((n, t) => n + tagCost(t), 0) + tags.length - 1 : 0);

type Editing = { id?: string; title: string; content: string };

// Pick, write, edit and delete descriptions, like the website's description manager.
export function DescriptionEditor({
  saved,
  onSaved,
  onDeleted,
}: {
  saved: Description[];
  onSaved: (d: Description) => void;
  onDeleted: (id: string) => void;
}) {
  const C = useColors();
  const s = useStyles();
  const { description, setDescription } = useDraft();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: DraftDescription[] = [
    ...saved.map((d) => ({ id: d.id, title: d.title, content: d.content, saved: true })),
    ...DESCRIPTION_TEMPLATES.map((t) => ({ id: t.id, title: t.name, content: t.content, saved: false })),
  ];
  const current = options.find((o) => o.id === description.id) ?? options[0];

  const edit = (d: DraftDescription) =>
    // Templates aren't editable on the server, so editing one saves your own copy.
    setEditing(d.saved ? { id: d.id, title: d.title, content: d.content } : { title: `${d.title} (mine)`, content: d.content });

  const save = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      setError('Add a title and some text first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const d = editing.id
        ? await api.updateDescription(editing.id, editing.title.trim(), editing.content)
        : await api.createDescription(editing.title.trim(), editing.content);
      onSaved(d);
      setDescription({ id: d.id, title: d.title, content: d.content, saved: true });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the description.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSaved = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteDescription(id);
      onDeleted(id);
      if (description.id === id) {
        const t = DESCRIPTION_TEMPLATES[0];
        setDescription({ id: t.id, title: t.name, content: t.content, saved: false });
      }
      if (editing?.id === id) setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the description.');
    } finally {
      setBusy(false);
    }
  };
  const askToDelete = (d: { id?: string; title: string }) => {
    const id = d.id;
    if (!id) return;
    confirmAction(`Delete “${d.title}”?`, 'This description is removed. Uploads that already used it keep their text.', 'Delete', () => void deleteSaved(id));
  };

  if (editing) {
    return (
      <Card>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>{editing.id ? 'Edit description' : 'New description'}</Text>
          <Text style={[s.muted, { fontFamily: F.mono }]}>{editing.content.length} chars</Text>
        </View>
        <TextInput
          value={editing.title}
          onChangeText={(title) => setEditing({ ...editing, title })}
          placeholder="Name it, e.g. Dark trap template"
          placeholderTextColor={C.t3}
          style={s.input}
          accessibilityLabel="Description title"
        />
        <TextInput
          value={editing.content}
          onChangeText={(content) => setEditing({ ...editing, content })}
          placeholder={'Write your description.\nPurchase links, contact info, credits…'}
          placeholderTextColor={C.t3}
          style={[s.input, s.textArea]}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Description text"
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.row}>
          <Button title="Cancel" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => setEditing(null)} />
          {editing.id ? (
            <Button title="Delete" variant="secondary" size="md" style={{ flex: 1 }} onPress={busy ? undefined : () => askToDelete(editing)} />
          ) : null}
          <Button title={busy ? 'Saving…' : 'Save'} size="md" style={{ flex: 1 }} onPress={busy ? undefined : save} />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>Description</Text>
        <Button title="+ New" variant="secondary" size="sm" onPress={() => setEditing({ title: '', content: '' })} />
      </View>
      <ListGroup>
        {options.map((o, i) => {
          const row = (
            <ListRow
              title={o.title}
              subtitle={o.saved ? undefined : 'Template'}
              last={i === options.length - 1}
              onPress={() => setDescription(o)}
              right={o.id === current.id ? <Text style={{ color: C.acc, fontSize: 16, ...font() }}>✓</Text> : <View />}
            />
          );
          return o.saved ? (
            <SwipeToDelete key={o.id} onDelete={() => askToDelete(o)} label="Delete">
              <View style={{ backgroundColor: C.card }}>{row}</View>
            </SwipeToDelete>
          ) : (
            <View key={o.id}>{row}</View>
          );
        })}
      </ListGroup>
      {saved.length ? <Text style={s.hint}>Swipe a saved description left to delete it</Text> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Text style={s.description} numberOfLines={6}>
        {current.content}
      </Text>
      <Button title={current.saved ? 'Edit description' : 'Customize this template'} variant="secondary" size="md" onPress={() => edit(current)} />
    </Card>
  );
}

const keyOf = (t: string) => t.trim().toLowerCase();

const DEMAND: Record<TagLevel, string> = { high: 'High demand', medium: 'Some demand', low: 'Low demand', unknown: '' };
const COMPETITION: Record<TagLevel, string> = { low: 'Low competition', medium: 'Medium competition', high: 'High competition', unknown: '' };
// High demand is the good-news status, so it gets the mint dot; some demand is grey, low is a ring.
function DemandDot({ level }: { level: TagLevel }) {
  const C = useColors();
  const s = useStyles();
  if (level === 'unknown') return null;
  return <View style={[s.dot, level === 'high' && { backgroundColor: C.acc }, level === 'medium' && { backgroundColor: C.t2 }, level === 'low' && s.dotLow]} />;
}

const record = (entry: ScoredTag) => {
  const n = entry.signals?.record_videos ?? 0;
  if (entry.signals?.record === 'proven') return `Proven on ${n} uploads`;
  if (entry.signals?.record === 'weak') return `Underperforms on ${n} uploads`;
  return '';
};
const levels = (entry: ScoredTag) =>
  [DEMAND[entry.signals?.demand ?? 'unknown'], COMPETITION[entry.signals?.competition ?? 'unknown'], record(entry)].filter(Boolean).join(' · ');

// Remove tags with a tap, add your own, and save back to the run (the server learns from removals).
export function TagEditor({ run, onSaved }: { run: TagRun; onSaved: (r: TagRun) => void }) {
  const C = useColors();
  const s = useStyles();
  const [tags, setTags] = useState(run.tags);
  const [input, setInput] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [detail, setDetail] = useState<ScoredTag | null>(null);
  const [view, setView] = useState<'tags' | 'ranking'>('tags');

  const original = new Set(run.tags.map(keyOf));
  const scores = new Map((run.scored_tags ?? []).map((e) => [keyOf(e.tag), e]));
  const demandCounts = (['high', 'medium', 'low'] as const)
    .map((level) => [level, tags.filter((t) => scores.get(keyOf(t))?.signals?.demand === level).length] as const)
    .filter(([, n]) => n > 0);
  const current = new Set(tags.map(keyOf));
  const removed = run.tags.filter((t) => !current.has(keyOf(t)));
  const added = tags.filter((t) => !original.has(keyOf(t)));
  const dirty = removed.length > 0 || added.length > 0;
  const chars = tagChars(tags);
  const over = chars > TAG_CHAR_LIMIT;
  const visible = showAll ? tags : tags.slice(0, 24);

  // Tags that would push the list past YouTube's limit aren't added.
  const add = () => {
    const next = [...tags];
    const seen = new Set(next.map(keyOf));
    let used = tagChars(next);
    const skipped: string[] = [];
    for (const part of input.split(',')) {
      const t = part.trim();
      if (!t || seen.has(keyOf(t))) continue;
      const cost = tagCost(t) + (next.length ? 1 : 0);
      if (used + cost > TAG_CHAR_LIMIT) {
        skipped.push(t);
        continue;
      }
      next.push(t);
      seen.add(keyOf(t));
      used += cost;
    }
    setTags(next);
    setInput(skipped.join(', '));
    setNote(
      skipped.length
        ? { text: `${skipped.length === 1 ? 'That tag doesn’t' : `${skipped.length} tags don’t`} fit in YouTube’s ${TAG_CHAR_LIMIT} characters. Remove some first.`, error: true }
        : null,
    );
  };

  const save = async () => {
    if (!dirty || saving || tags.length === 0) return;
    if (over) {
      setNote({ text: `Remove tags until you’re under ${TAG_CHAR_LIMIT} characters, then save.`, error: true });
      return;
    }
    setSaving(true);
    setNote(null);
    try {
      const updated = await api.updateTags(run.id, tags, removed, added);
      onSaved(updated);
      setNote({ text: 'Tags saved ✓' });
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'Could not save tags.', error: true });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(tags.join(', '));
    setNote({ text: 'Copied ✓' });
  };

  const counts = [`${tags.length} tags`, removed.length && `${removed.length} removed`, added.length && `${added.length} added`]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: 16 }}>
      <View style={s.reviewHead}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.reviewTitle} numberOfLines={1}>
            {run.query}
          </Text>
          <Text style={s.sub}>{counts}</Text>
        </View>
        <Pressable onPress={copy} accessibilityRole="button" hitSlop={8}>
          <Text style={s.sub}>Copy all</Text>
        </Pressable>
      </View>

      <View style={{ gap: 6 }}>
        <Meter value={Math.min(1, chars / TAG_CHAR_LIMIT)} color={over ? C.warn : C.text} />
        <View style={s.meterHead}>
          <Text style={[s.muted, over && { color: C.warn }]}>
            {over ? 'Over the YouTube limit. Tap tags to remove some.' : 'YouTube tag limit'}
          </Text>
          <Text style={[s.mono, over && { color: C.warn }]}>
            {chars} / {TAG_CHAR_LIMIT}
          </Text>
        </View>
      </View>

      {scores.size ? (
        <Segmented
          compact
          value={view}
          onChange={setView}
          options={[
            { value: 'tags', label: 'Tags' },
            { value: 'ranking', label: 'Ranking' },
          ]}
        />
      ) : null}

      {view === 'ranking' && scores.size ? (
        <Ranking tags={tags} scores={scores} />
      ) : null}

      {view === 'tags' && demandCounts.length ? (
        <View style={s.legend}>
          {demandCounts.map(([level, n]) => (
            <View key={level} style={s.legendItem}>
              <DemandDot level={level} />
              <Text style={s.muted}>
                {n} {DEMAND[level].toLowerCase()}
              </Text>
            </View>
          ))}
          <Text style={s.muted}>Hold a tag for details</Text>
        </View>
      ) : null}

      {view === 'tags' && detail ? (
        <Pressable onPress={() => setDetail(null)} style={s.detail} accessibilityRole="button" accessibilityHint="Tap to close">
          <View style={s.meterHead}>
            <Text style={s.detailTag} numberOfLines={1}>
              {detail.tag}
            </Text>
            <Text style={s.mono}>{detail.score}/100</Text>
          </View>
          {levels(detail) ? <Text style={s.detailLevels}>{levels(detail)}</Text> : null}
          {detail.reason ? <Text style={s.muted}>{detail.reason}</Text> : null}
        </Pressable>
      ) : null}

      <View style={[s.chips, view === 'ranking' && { display: 'none' }]}>
        {visible.map((tag) => {
          const isNew = !original.has(keyOf(tag));
          const scored = scores.get(keyOf(tag));
          return (
            <Pressable
              key={tag}
              onPress={() => setTags(tags.filter((t) => t !== tag))}
              onLongPress={scored ? () => setDetail(scored) : undefined}
              style={({ pressed }) => [s.chip, isNew && s.chipNew, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag}`}
              accessibilityHint={scored ? `Score ${scored.score}. ${DEMAND[scored.signals?.demand ?? 'unknown']}. Hold for details.` : undefined}>
              {scored ? <DemandDot level={scored.signals?.demand ?? 'unknown'} /> : null}
              <Text style={[s.chipText, isNew && { color: C.acc }]}>{isNew ? `+ ${tag}` : tag}</Text>
              {scored ? <Text style={s.chipScore}>{scored.score}</Text> : null}
              <Text style={[s.chipX, isNew && { color: C.acc }]}>×</Text>
            </Pressable>
          );
        })}
        {tags.length > 24 ? (
          <Pressable onPress={() => setShowAll(!showAll)} style={s.chipMore} accessibilityRole="button">
            <Text style={s.sub}>{showAll ? 'Show less' : `Show ${tags.length - 24} more`}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Add tags, comma separated"
          placeholderTextColor={C.t3}
          style={s.inputBare}
          returnKeyType="done"
          onSubmitEditing={add}
          autoCapitalize="none"
          accessibilityLabel="Add tags"
        />
        <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Add tags">
          <Text style={s.kbd}>return</Text>
        </Pressable>
      </View>

      {note ? <Text style={[s.muted, { color: note.error ? C.danger : C.acc }]}>{note.text}</Text> : null}

      <View style={s.row}>
        <Button title="Undo" variant="secondary" size="md" style={{ flex: 1 }} onPress={dirty ? () => setTags(run.tags) : undefined} />
        <Button
          title={saving ? 'Saving…' : 'Save tags'}
          variant={dirty && !over ? 'primary' : 'secondary'}
          size="md"
          style={{ flex: 2 }}
          onPress={dirty && !saving ? save : undefined}
        />
      </View>
    </View>
  );
}

const RANK_ROW_H = 68;
const RANK_VISIBLE = 10;

// Every tag best to worst: rank, score bar and what the score is made of. Shows 10 at a time in its
// own scroll area; scroll inside it for the rest.
function Ranking({ tags, scores }: { tags: string[]; scores: Map<string, ScoredTag> }) {
  const C = useColors();
  const s = useStyles();
  const rows = tags
    .map((tag) => ({ tag, entry: scores.get(keyOf(tag)) }))
    .sort((a, b) => (b.entry?.score ?? -1) - (a.entry?.score ?? -1));
  const scrolls = rows.length > RANK_VISIBLE;
  return (
    <View style={{ gap: 8 }}>
      {scrolls ? (
        <Text style={s.muted}>
          {rows.length} tags · top {RANK_VISIBLE} shown, scroll for the rest
        </Text>
      ) : null}
      <ScrollView
        style={[s.rankBox, scrolls && { height: RANK_ROW_H * RANK_VISIBLE }]}
        scrollEnabled={scrolls}
        nestedScrollEnabled
        showsVerticalScrollIndicator={scrolls}>
        {rows.map(({ tag, entry }, i) => (
          <View
            key={tag}
            style={[s.rankRow, i === 0 && { borderTopWidth: 0 }]}
            accessible
            accessibilityLabel={entry ? `Number ${i + 1}, ${tag}, score ${entry.score}. ${levels(entry)}` : `${tag}, not scored yet`}>
            <Text style={s.rankNum}>{entry ? i + 1 : '–'}</Text>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={s.meterHead}>
                <Text style={s.rankTag} numberOfLines={1}>
                  {tag}
                </Text>
                <Text style={s.rankScore}>{entry ? entry.score : '–'}</Text>
              </View>
              {entry ? <Meter value={entry.score / 100} color={entry.signals?.demand === 'high' ? C.acc : C.text} /> : null}
              <Text style={s.muted} numberOfLines={1}>
                {entry ? levels(entry) || 'Scored on relevance' : 'Save to score this tag'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  rankBox: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft },
  rankRow: { height: RANK_ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.lineSoft },
  rankNum: { width: 22, color: C.t2, fontSize: 13, fontFamily: F.monoMedium },
  rankTag: { flex: 1, color: C.text, fontSize: 13.5, fontFamily: F.mono },
  rankScore: { color: C.text, fontSize: 13.5, fontFamily: F.monoMedium },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.t2, fontSize: 13, ...font('600') },
  usage: { flexDirection: 'row', gap: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meterValue: { color: C.text, fontSize: 13, fontFamily: F.mono },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { color: C.text, fontSize: 17, flexShrink: 1, ...font('600') },
  muted: { color: C.t3, fontSize: 12, lineHeight: 17, flexShrink: 1, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  hint: { color: C.t3, fontSize: 11.5, fontFamily: F.mono },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: R.ctl,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.line,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sub: { color: C.t2, fontSize: 13, ...font() },
  mono: { color: C.t2, fontSize: 12.5, fontFamily: F.mono },
  kbd: {
    color: C.t2,
    fontSize: 12,
    fontFamily: F.mono,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingLeft: 14,
    paddingRight: 7,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  inputBare: { flex: 1, height: '100%', color: C.text, fontSize: 15, ...font() },
  hairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderTopWidth: 1,
    borderTopColor: C.lineSoft,
  },
  hairLast: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  hairTitle: { flex: 1, color: C.text, fontSize: 15, ...font() },
  hairDate: { width: 64, textAlign: 'right', color: C.t3, fontSize: 13, ...font() },
  reviewHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  reviewTitle: { color: C.text, fontSize: 20, letterSpacing: -0.4, ...font('600') },
  chipMore: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: R.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.line,
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    color: C.text,
    fontSize: 15,
    ...font(),
  },
  textArea: { height: 220, paddingTop: 12, paddingBottom: 12, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: R.chip,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipNew: { borderColor: C.accLine, backgroundColor: C.accSoft },
  chipText: { color: C.text, fontFamily: F.mono, fontSize: 12.5 },
  chipX: { color: C.t3, fontSize: 14, marginTop: -1, ...font() },
  chipScore: { color: C.t3, fontFamily: F.mono, fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotLow: { borderWidth: 1, borderColor: C.t3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detail: { gap: 4, padding: 12, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2 },
  detailTag: { flex: 1, color: C.text, fontFamily: F.mono, fontSize: 13 },
  detailLevels: { color: C.text, fontSize: 13, ...font('500') },
  description: {
    padding: 14,
    borderRadius: R.ctl,
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.lineSoft,
    color: C.t2,
    fontSize: 14,
    lineHeight: 21,
    ...font(),
  },
}));
