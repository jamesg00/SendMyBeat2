import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api/endpoints';
import { useRequest } from '@/api/use-request';
import { Checklist } from '@/components/checklist';
import { VerifiedBadge } from '@/components/producer';
import { Button } from '@/components/ui';
import { F, R, display, font, makeStyles, useColors } from '@/theme';

// Ask for the verified check on your Spotlight profile. Opened from Profile, or from a Pros page
// ("Are you …?"), which claims that producer's profile too. An admin reviews every request.

const MIN_REASON = 20;

export default function VerifyScreen() {
  const s = useStyles();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { pro: proId } = useLocalSearchParams<{ pro?: string }>();
  const me = useRequest(api.myProducer);
  const pro = useRequest(() => (proId ? api.pro(proId) : Promise.resolve(null)));
  const status = me.data?.verification_status ?? 'none';

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <Text style={s.topAction}>Close</Text>
        </Pressable>
        <Text style={s.topTitle}>Verification</Text>
        <View style={{ width: 60 }} />
      </View>
      {me.loading && !me.data ? (
        <ActivityIndicator color={C.t2} style={{ marginTop: 40 }} />
      ) : status === 'approved' ? (
        <View style={s.state}>
          <VerifiedBadge size={44} />
          <Text style={s.stateTitle}>You’re verified</Text>
          <Text style={s.sub}>Your Spotlight profile shows the check next to your name.</Text>
        </View>
      ) : status === 'pending' ? (
        <View style={s.state}>
          <View style={s.pendingDot} />
          <Text style={s.stateTitle}>Under review</Text>
          <Text style={s.sub}>We’re checking your request. Your profile gets the check as soon as it’s approved.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ApplyForm
            claim={pro.data ?? null}
            rejectedNote={status === 'rejected' ? (me.data?.verification_note ?? 'Your last request wasn’t approved.') : null}
            onSent={me.reload}
            bottom={insets.bottom}
          />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function ApplyForm({ claim, rejectedNote, onSent, bottom }: { claim: api.ProDetail | null; rejectedNote: string | null; onSent: () => void; bottom: number }) {
  const s = useStyles();
  const C = useColors();
  const [stageName, setStageName] = useState(claim?.name ?? '');
  const [link, setLink] = useState(claim?.channel_url ?? '');
  const [notable, setNotable] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkOk = /^https?:\/\/\S+\.\S+/.test(link.trim());
  const reasonOk = reason.trim().length >= MIN_REASON;
  const ready = !!stageName.trim() && linkOk && reasonOk;

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.applyForVerification({
        stage_name: stageName.trim(),
        main_platform_url: link.trim(),
        notable_work: notable.trim() || undefined,
        reason: reason.trim(),
        pro_id: claim?.id,
      });
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Text style={s.title}>{claim ? `Are you ${claim.name}?` : 'Get the verified check'}</Text>
        <Text style={s.sub}>
          {claim
            ? `Claim ${claim.name}’s profile on SendMyBeat. Once we confirm it’s you, the Pros page links to your profile and you get the verified check.`
            : 'The check shows producers and artists that your profile is really you. We review every request by hand.'}
        </Text>
      </View>
      {rejectedNote ? <Text style={s.notice}>{rejectedNote} You can send a new request.</Text> : null}

      <Field label="Producer name" value={stageName} onChange={setStageName} placeholder="The name you release under" />
      <Field
        label="Main channel or page"
        value={link}
        onChange={setLink}
        placeholder="https://youtube.com/@you"
        keyboardType="url"
        hint={link && !linkOk ? 'Paste a full link starting with https://' : 'YouTube, BeatStars, Instagram: where people know you from.'}
      />
      <Field label="Notable work (optional)" value={notable} onChange={setNotable} placeholder="Placements, artists you’ve worked with" multiline />
      <Field
        label="How can we tell it’s you?"
        value={reason}
        onChange={setReason}
        placeholder="e.g. DM us from your Instagram, or add “SendMyBeat” to your channel’s About"
        multiline
        hint={reasonOk ? undefined : `${Math.max(0, MIN_REASON - reason.trim().length)} more characters`}
      />

      <Checklist
        title="BEFORE YOU SEND"
        items={[
          { label: 'Producer name', done: !!stageName.trim() },
          { label: 'Link', done: linkOk },
          { label: 'How to confirm', done: reasonOk },
          { label: 'Notable work', done: !!notable.trim(), optional: true },
        ]}
      />
      {error ? <Text style={{ color: C.danger, fontSize: 13, ...font() }}>{error}</Text> : null}
      <Button title={busy ? 'Sending…' : 'Send request'} variant={ready ? 'primary' : 'secondary'} onPress={ready && !busy ? () => void send() : undefined} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
  keyboardType?: 'url';
}) {
  const s = useStyles();
  const C = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.t3}
        style={[s.input, multiline && s.textArea]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'url'}
        keyboardType={keyboardType ?? 'default'}
        accessibilityLabel={label}
      />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  topAction: { color: C.t2, fontSize: 16, width: 60, ...font() },
  topTitle: { color: C.text, fontSize: 16, ...font('600') },
  title: { color: C.text, fontSize: 24, ...display },
  sub: { color: C.t2, fontSize: 14, lineHeight: 20, textAlign: 'left', ...font() },
  notice: { color: C.text, fontSize: 13, lineHeight: 18, padding: 12, borderRadius: R.ctl, backgroundColor: C.dangerSoft, ...font() },
  state: { alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 60 },
  stateTitle: { color: C.text, fontSize: 22, marginTop: 6, ...display },
  pendingDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: C.acc, borderStyle: 'dashed' },
  label: { color: C.t3, fontSize: 11, letterSpacing: 0.4, fontFamily: F.monoMedium },
  hint: { color: C.t3, fontSize: 12, ...font() },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, color: C.text, fontSize: 15, ...font() },
  textArea: { minHeight: 92, paddingTop: 10 },
}));
