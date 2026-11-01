import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { FEEDBACK_STATUS_LABEL, type FeedbackKind } from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { AppIcon, Button, Segmented } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Report a bug or suggest a feature. The app adds its version and the phone model, so a report
// is useful without the producer having to know them. Admins read these in Admin · Feedback.

const SCREENS = ['Workflow', 'Upload Studio', 'Spotlight', 'Analytics', 'Pros', 'Profile', 'Plans', 'Other'];

const COPY: Record<FeedbackKind, { prompt: string; placeholder: string; thanks: string }> = {
  bug: {
    prompt: 'What went wrong?',
    placeholder: 'What did you tap, what did you expect, and what happened instead?',
    thanks: 'Thanks for the report. We’ll look into it.',
  },
  idea: {
    prompt: 'What would you like to see?',
    placeholder: 'Describe the feature and how it would help your uploads.',
    thanks: 'Thanks for the idea. We read every one.',
  },
};

export default function FeedbackScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const mine = useRequest(api.myFeedback);
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [screen, setScreen] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const ready = message.trim().length >= 5;
  const copy = COPY[kind];

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendFeedback({
        kind,
        message: message.trim(),
        screen: screen ?? undefined,
        app_version: Constants.expoConfig?.version,
        platform: Platform.OS,
        device: [Device.manufacturer, Device.modelName, Device.osVersion && `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Device.osVersion}`]
          .filter(Boolean)
          .join(' · ')
          .slice(0, 120),
      });
      setSent(true);
      setMessage('');
      setScreen(null);
      void mine.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send that. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={s.head}>
          <AppIcon size={48} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.title}>Help make SendMyBeat better</Text>
            <Text style={s.sub}>Found a bug or want something added? Tell us here.</Text>
          </View>
        </View>

        {sent ? (
          <View style={s.thanks} accessibilityLiveRegion="polite">
            <Text style={s.thanksTitle}>✓ Sent</Text>
            <Text style={s.sub}>{copy.thanks}</Text>
            <Button title="Send another" variant="secondary" size="md" onPress={() => setSent(false)} />
          </View>
        ) : (
          <>
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'bug', label: 'Report a bug' },
                { value: 'idea', label: 'Suggest a feature' },
              ]}
            />

            <View style={{ gap: 8 }}>
              <Text style={s.label}>{kind === 'bug' ? 'WHERE DID IT HAPPEN?' : 'WHERE WOULD IT GO?'} (OPTIONAL)</Text>
              <View style={s.chips}>
                {SCREENS.map((name) => {
                  const on = screen === name;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setScreen(on ? null : name)}
                      style={[s.chip, on && { borderColor: C.acc, backgroundColor: C.accSoft }]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}>
                      <Text style={[s.chipText, on && { color: C.acc }]}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={s.label}>{copy.prompt.toUpperCase()}</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={copy.placeholder}
                placeholderTextColor={C.t3}
                multiline
                maxLength={4000}
                style={s.input}
                textAlignVertical="top"
                accessibilityLabel={copy.prompt}
              />
              <Text style={s.fine}>We’ll include your app version and phone model. No passwords or personal details, please.</Text>
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}
            <Button title={busy ? 'Sending…' : kind === 'bug' ? 'Send report' : 'Send idea'} onPress={ready && !busy ? () => void send() : undefined} variant={ready ? 'primary' : 'secondary'} />
          </>
        )}

        {mine.data?.items.length ? (
          <View style={{ gap: 8 }}>
            <Text style={s.label}>WHAT YOU’VE SENT</Text>
            <View style={s.list}>
              {mine.data.items.map((item, i) => (
                <View key={item.id} style={[s.row, i === 0 && { borderTopWidth: 0 }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.rowKind}>{item.kind === 'bug' ? 'Bug' : 'Idea'}</Text>
                    <Text style={s.rowText} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                  <Text style={[s.status, item.status === 'fixed' && { color: C.acc, borderColor: C.accLine }]}>{FEEDBACK_STATUS_LABEL[item.status]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  topAction: { color: C.t2, fontSize: 15, ...font() },
  scroll: { paddingHorizontal: 20, gap: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { color: C.text, fontSize: 22, lineHeight: 26, ...display },
  sub: { color: C.t2, fontSize: 14, lineHeight: 20, ...font() },
  label: { color: C.t3, fontSize: 11, letterSpacing: 0.6, fontFamily: F.monoMedium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipText: { color: C.t2, fontSize: 13, ...font('500') },
  input: {
    minHeight: 140,
    padding: 14,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    color: C.text,
    fontSize: 15,
    lineHeight: 21,
    ...font(),
  },
  fine: { color: C.t3, fontSize: 12, lineHeight: 17, ...font() },
  error: { color: C.danger, fontSize: 13, ...font() },
  thanks: { gap: 10, padding: 16, borderRadius: R.card, borderWidth: 1, borderColor: C.accLine, backgroundColor: C.accSoft },
  thanksTitle: { color: C.acc, fontSize: 17, ...font('600') },
  list: { borderRadius: R.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.lineSoft },
  rowKind: { color: C.t3, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  rowText: { color: C.text, fontSize: 14, lineHeight: 19, ...font() },
  status: {
    color: C.t2,
    fontSize: 11,
    fontFamily: F.monoMedium,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
}));
