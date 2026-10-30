import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Field, GradientButton, GradientText, Lockup, OrDivider, OutlineButton, TopToast, useToast } from '../components/ui';
import { AppleLogo, CheckIcon, GoogleG, LockIcon, MailIcon } from '../components/icons';

import * as auth from '../core/auth/authService';
import { googleSignInToken, isGoogleSdkReady } from '../core/auth/googleAuth';

/**
 * Login — rebuilt on a flowing flex column inside a ScrollView.
 * Same StreamMax design language (pure black, hero collage fading to black,
 * blue-violet bottom glow, gradient heading) but content flows top to bottom
 * with a fixed spacing rhythm, so nothing overlaps and the keyboard can
 * never bury the fields.
 */
export default function LoginScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [banner, setBanner] = useState('');
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const fix = (field: string) => () => { setBanner(''); setBad(b => ({ ...b, [field]: false })); };

  const doLogin = async () => {
    setBusy(true);
    const chk = await auth.checkPassword(email, pw);
    if (!chk.ok) {
      setBusy(false);
      setBanner(chk.message || 'Something went wrong');
      setBad({ [chk.field || 'email']: true });
      return;
    }
    const r = await auth.requestCode(email, 'login');
    setBusy(false);
    if (!r.ok) {
      setBanner(r.message || 'Could not send the login code');
      return;
    }
    toast('Login code sent to your email.', 'info');
    nav.navigate('EnterCode', { email: email.trim().toLowerCase(), purpose: 'login', password: pw, remember });
  };

  const [gBusy, setGBusy] = useState(false);
  const [aBusy, setABusy] = useState(false);
  const appleSoon = async () => {
    if (aBusy) return;
    setABusy(true);
    await new Promise(r => { setTimeout(() => r(undefined), 900); });
    setABusy(false);
    toast('Apple sign-in is coming soon.', 'info');
  };
  const googleCode = async () => {
    if (gBusy) return;
    if (isGoogleSdkReady()) {
      setGBusy(true);   // logo -> spinner until the picker + verification finish
      try {
        const g = await googleSignInToken();
        if (!g.ok) { if (g.message) setBanner(g.message); return; }
        const r = await auth.googleTokenLogin(g.idToken!, { googleId: g.googleId, photo: g.photo });
        if (!r.ok) { setBanner(r.message || 'Google sign-in failed. Try again.'); return; }
        nav.reset({ index: 0, routes: [{ name: 'Home' }] });
      } finally {
        setGBusy(false);
      }
      return;
    }
    // SDK not configured: fall back to the emailed Google code
    const e = email.trim().toLowerCase();
    if (!/^([^\s@]+@[^\s@]+\.[^\s@]{2,})$/.test(e)) {
      setBanner('Enter your email address first — we send a Google sign-in code to it.');
      setBad({ email: true });
      return;
    }
    const r = await auth.requestCode(e, 'google');
    if (!r.ok) { setBanner(r.message || 'Could not send the code'); return; }
    toast('Google sign-in code sent to your email.', 'info');
    nav.navigate('EnterCode', { email: e, purpose: 'google' });
  };

  const gutter = Math.min(44, Math.max(24, Math.round(W * 0.066)));

  return (
    <View style={[styles.root, { backgroundColor: '#000000' }]}>
      {/* darkened collage: visible at the center, fading to black on both sides */}
      <Image
        source={require('../assets/img/login_hero_fade.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }}
        resizeMode="cover"
      />
      {/* designed bottom glow: deep blue-violet rising from the bottom edge */}
      <Image
        source={require('../assets/img/login_bottom_glow.png')}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14%' }}
        resizeMode="stretch"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.content, { paddingHorizontal: gutter, paddingTop: insets.top + 28, paddingBottom: 16 }]}>

            {/* logo + app name + tagline */}
            <Lockup scale={1.05} />

            {/* heading + sub */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>Welcome </Text>
              <GradientText text="Back" size={32} width={110} height={40} weight="800" colorsArr={['#3A78FF', '#A044FF']} />
            </View>
            <Text style={styles.sub}>
              Log in to continue watching your favorite movies and shows.
            </Text>

            {/* fields */}
            <View style={styles.fieldStack}>
              <Field h={50} fs={16} error={bad.email} icon={<MailIcon />} placeholder="Email address" value={email} onChangeText={v => { setEmail(v); fix('email')(); }} keyboardType="email-address" autoCapitalize="none" focused />
              <Field h={50} fs={16} error={bad.password} icon={<LockIcon />} placeholder="Password" value={pw} onChangeText={v => { setPw(v); fix('password')(); }} secure />
            </View>

            {/* remember / forgot */}
            <View style={styles.rememberRow}>
              <Pressable style={styles.remember} onPress={() => setRemember(r => !r)}>
                <View style={[styles.check, remember ? styles.checkOn : null]}>
                  {remember ? <CheckIcon size={14} /> : null}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>
              <Pressable onPress={() => nav.navigate('ForgotPassword', { email })} hitSlop={10}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            </View>

            {/* log in */}
            <GradientButton
              label="Log In"
              loading={busy}
              height={52}
              fontSize={16}
              onPress={doLogin}
              style={{ marginTop: 26 }}
            />

            {/* or + social */}
            <View style={{ marginTop: 22 }}>
              <OrDivider compact />
            </View>
            <View style={{ marginTop: 18 }}>
              <OutlineButton label="Continue with Google" icon={<GoogleG />} loading={gBusy} height={48} fontSize={15} onPress={googleCode} />
            </View>
            <View style={{ marginTop: 14 }}>
              <OutlineButton label="Continue with Apple" icon={<AppleLogo />} loading={aBusy} height={48} fontSize={15} onPress={appleSoon} />
            </View>

            {/* sign up row pinned towards the bottom of whatever space is left */}
            <View style={{ flexGrow: 1 }} />
            <View style={styles.signRow}>
              <Text style={styles.signText}>Don't have an account? </Text>
              <Pressable onPress={() => nav.navigate('CreateAccount')} hitSlop={10}>
                <Text style={styles.signLink}>Sign Up</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* errors pop up at the top */}
      <TopToast message={banner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: '#9CA3AF', fontSize: 15, lineHeight: 22, marginTop: 10 },
  fieldStack: { marginTop: 26, gap: 14 },
  rememberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, paddingHorizontal: 2,
  },
  remember: { flexDirection: 'row', alignItems: 'center' },
  check: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#3a4268',
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#7B2CBF', borderColor: '#7B2CBF' },
  rememberText: { color: '#e4e6f5', fontSize: 15, marginLeft: 10 },
  forgot: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  signRow: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 6, minHeight: 40, alignItems: 'center' },
  signText: { color: '#d7d9ea', fontSize: 15 },
  signLink: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },
});
