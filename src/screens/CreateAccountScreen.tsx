import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Field, GradientButton, GradientText, Lockup, OrDivider, OutlineButton, TopToast, useToast } from '../components/ui';
import { AppleLogo, BackIcon, GoogleG, LockIcon, MailIcon, UserIcon } from '../components/icons';
import { colors } from '../theme/tokens';
import * as auth from '../core/auth/authService';
import { googleSignInToken, isGoogleSdkReady } from '../core/auth/googleAuth';

/**
 * Create Account — rebuilt on a flowing flex column inside a ScrollView.
 * Same StreamMax design language (corner hero art fading to black, gradient
 * heading, pill CTA) but content flows with a fixed spacing rhythm, so the
 * button, socials, sign-in row and legal footer can never drift or clip —
 * the screen simply scrolls when the keyboard is open.
 */
export default function CreateAccountScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [banner, setBanner] = useState('');
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const fix = (field: string) => () => { setBanner(''); setBad(b => ({ ...b, [field]: false })); };

  const createAccount = async () => {
    setBusy(true);
    const pre = await auth.precheckRegister({ fullName: name, email, password: pw, confirm: pw2 });
    if (!pre.ok) {
      setBusy(false);
      setBanner(pre.message || 'Something went wrong');
      setBad({ [pre.field || 'email']: true });
      return;
    }
    const r = await auth.requestCode(email, 'signup');
    setBusy(false);
    if (!r.ok) {
      setBanner(r.message || 'Could not send the verification code');
      return;
    }
    toast('Verification code sent to your email.', 'info');
    nav.navigate('EnterCode', { email: email.trim().toLowerCase(), purpose: 'signup', fullName: name, password: pw, confirm: pw2 });
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
    <View style={styles.root}>
      {/* corner graphic, top-right, fading into the black bg */}
      <Image
        source={require('../assets/img/create_hero_corner.png')}
        style={{ position: 'absolute', top: -W * 0.062, right: 0, width: W * 0.45, height: W * 0.39 }}
        resizeMode="cover"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.content, { paddingHorizontal: gutter, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14 }]}>

            <Lockup scale={1.05} />

            {/* heading + sub */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>Create Your </Text>
              <GradientText text="Account" size={32} width={175} height={40} weight="800" />
            </View>
            <Text style={styles.sub}>
              Join StreamMax and get unlimited access to your favorite movies, TV shows and more.
            </Text>

            {/* fields */}
            <View style={styles.fieldStack}>
              <Field h={50} fs={16} error={bad.name} icon={<UserIcon />} placeholder="Full name" value={name} onChangeText={v => { setName(v); fix('name')(); }} />
              <Field h={50} fs={16} error={bad.email} icon={<MailIcon />} placeholder="Email address" value={email} onChangeText={v => { setEmail(v); fix('email')(); }} keyboardType="email-address" autoCapitalize="none" />
              <Field h={50} fs={16} error={bad.password} icon={<LockIcon />} placeholder="Password" value={pw} onChangeText={v => { setPw(v); fix('password')(); }} secure />
              <Field h={50} fs={16} error={bad.confirm} icon={<LockIcon />} placeholder="Confirm password" value={pw2} onChangeText={v => { setPw2(v); fix('confirm')(); }} secure />
            </View>

            {/* primary button directly under the field stack */}
            <GradientButton
              label="Create Account"
              arrow={false}
              loading={busy}
              height={52}
              fontSize={16}
              onPress={createAccount}
              style={{ marginTop: 22 }}
            />

            {/* or + social */}
            <View style={{ marginTop: 20 }}>
              <OrDivider compact />
            </View>
            <View style={{ marginTop: 16 }}>
              <OutlineButton label="Continue with Google" icon={<GoogleG />} loading={gBusy} height={48} fontSize={15} onPress={googleCode} />
            </View>
            <View style={{ marginTop: 12 }}>
              <OutlineButton label="Continue with Apple" icon={<AppleLogo />} loading={aBusy} height={48} fontSize={15} onPress={appleSoon} />
            </View>

            {/* sign in + legal anchored to the bottom of whatever space is left */}
            <View style={{ flexGrow: 1 }} />
            <View style={styles.signRow}>
              <Text style={styles.signText}>Already have an account? </Text>
              <Pressable onPress={() => nav.navigate('Login')} hitSlop={10}>
                <Text style={styles.signLink}>Sign In</Text>
              </Pressable>
            </View>
            <Text style={styles.legal}>
              By creating an account, you agree to our{'\n'}
              <Text style={styles.legalLink}>Terms of Service</Text>  •  <Text style={styles.legalLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* errors pop up at the top */}
      <TopToast message={banner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: '#94a3b8', fontSize: 15, lineHeight: 22, marginTop: 10 },
  fieldStack: { marginTop: 26, gap: 12 },
  signRow: { flexDirection: 'row', justifyContent: 'center', minHeight: 36, alignItems: 'center' },
  signText: { color: '#d7d9ea', fontSize: 15 },
  signLink: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  legal: { color: '#8a90a5', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  legalLink: { color: '#3b82f6' },
});
