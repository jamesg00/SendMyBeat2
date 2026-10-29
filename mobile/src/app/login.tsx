import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/api/auth';
import { Button, Card, Segmented, styles as ui } from '@/components/ui';
import { C, F, R, font } from '@/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.root, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ gap: 10 }}>
          <Text style={s.brand}>SENDMYBEAT</Text>
          <Text style={ui.largeTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
          <Text style={s.sub}>Tags, descriptions and YouTube uploads for your beats.</Text>
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
          <Text style={ui.sectionLabel}>USERNAME</Text>
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
          <Text style={ui.sectionLabel}>PASSWORD</Text>
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

        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} accessibilityRole="button">
          <Text style={s.switch}>
            {mode === 'login' ? 'New here? ' : 'Have an account? '}
            <Text style={{ color: C.acc, ...font('600') }}>{mode === 'login' ? 'Sign up free' : 'Log in'}</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, gap: 20 },
  brand: { fontFamily: F.brand, fontSize: 14, letterSpacing: 3, color: C.acc },
  sub: { color: C.t2, fontSize: 15, lineHeight: 21, ...font() },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: R.ctl,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card2,
    color: C.text,
    fontSize: 16,
    ...font(),
  },
  error: { color: C.danger, fontSize: 14, ...font() },
  switch: { color: C.t2, fontSize: 14, textAlign: 'center', ...font() },
});
