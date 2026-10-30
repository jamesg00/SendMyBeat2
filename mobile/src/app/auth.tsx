import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import { Button, Card, Segmented, useUiStyles } from '@/components/ui';
import { R, font, makeStyles, useColors } from '@/theme';

type Mode = 'login' | 'register';

// Log in or sign up, opened as a sheet from the landing screen. Once signed in, the root
// layout's guard swaps the whole stack for the app.
export default function AuthScreen() {
  const C = useColors();
  const s = useStyles();
  const ui = useUiStyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(params.mode === 'register' ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await (mode === 'login' ? signIn : signUp)(username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.root, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.close} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={s.closeText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={ui.largeTitle} accessibilityRole="header">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={s.sub}>
            {mode === 'login' ? 'Log in to your SendMyBeat account.' : 'Free to start. No card needed.'}
          </Text>
        </View>

        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: 'login', label: 'Log in' },
            { value: 'register', label: 'Sign up' },
          ]}
        />

        <Card>
          <Text style={ui.sectionLabel}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            style={s.input}
            placeholder="producer name"
            placeholderTextColor={C.t3}
            accessibilityLabel="Username"
          />
          <Text style={ui.sectionLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            textContentType={mode === 'login' ? 'password' : 'newPassword'}
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={C.t3}
            onSubmitEditing={submit}
            returnKeyType="go"
            accessibilityLabel="Password"
          />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Button title={busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} onPress={busy ? undefined : submit} />
        </Card>

        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={s.switchBtn} accessibilityRole="button">
          <Text style={s.switch}>
            {mode === 'login' ? 'New here? ' : 'Have an account? '}
            <Text style={{ color: C.text, ...font('600') }}>{mode === 'login' ? 'Sign up free' : 'Log in'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((C) => ({
  root: { paddingHorizontal: 20, paddingTop: 8, gap: 22 },
  topBar: { flexDirection: 'row', height: 44, alignItems: 'center' },
  close: { minHeight: 44, justifyContent: 'center' },
  closeText: { color: C.t2, fontSize: 16, ...font() },
  sub: { color: C.t2, fontSize: 15, lineHeight: 21, ...font() },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    color: C.text,
    fontSize: 16,
    ...font(),
  },
  error: { color: C.danger, fontSize: 14, ...font() },
  switchBtn: { minHeight: 44, justifyContent: 'center' },
  switch: { color: C.t2, fontSize: 14, textAlign: 'center', ...font() },
}));
