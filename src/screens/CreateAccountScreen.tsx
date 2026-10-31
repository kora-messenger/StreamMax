import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Field, GradientButton, GradientText, Lockup, OrDivider, OutlineButton, TopToast, useToast,
} from '../components/ui';
import { AppleLogo, BackIcon, GoogleG, LockIcon, MailIcon, UserIcon } from '../components/icons';
import * as auth from '../core/auth/authService';
import { googleSignInToken, isGoogleSdkReady } from '../core/auth/googleAuth';

/**
 * Create Account — refined 2026-10-31 to read as the same product as the
 * welcome screen: midnight-navy background with soft blue/purple ambient
 * light, the cinematic corner artwork, the StreamMax lockup (white "Stream"
 * + gradient "Max", no box), a left-aligned "Create Your Account" heading
 * with the brand gradient on "Account", navy fields with a gradient focus
 * border, the gradient pill CTA with arrow, matching Google/Apple buttons,
 * and a clickable legal footer.
 * All registration logic is unchanged (validate -> email code -> account).
 */
const BG = '#03051A';

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
      {/* ambient blue/purple light */}
      <View pointerEvents="none" style={[styles.glow, {
        width: W * 0.95, height: W * 0.95, borderRadius: W * 0.475,
        top: -W * 0.42, right: -W * 0.34, backgroundColor: 'rgba(108,99,255,0.13)',
      }]} />
      <View pointerEvents="none" style={[styles.glow, {
        width: W * 0.85, height: W * 0.85, borderRadius: W * 0.425,
        top: W * 0.52, left: -W * 0.45, backgroundColor: 'rgba(0,210,255,0.07)',
      }]} />

      {/* cinematic art, upper-right, blending into the dark */}
      <Image
        source={require('../assets/img/create_hero_corner.png')}
        style={{ position: 'absolute', top: -W * 0.062, right: 0, width: W * 0.45, height: W * 0.39 }}
        resizeMode="cover"
      />

      {/* back */}
      <Pressable
        onPress={() => nav.goBack()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ position: 'absolute', top: insets.top + 14, left: gutter, zIndex: 5 }}
      >
        <BackIcon size={24} color="#fff" />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.content,
              {
                paddingHorizontal: gutter,
                paddingTop: insets.top + 52,
                paddingBottom: Math.max(insets.bottom, 12) + 16,
              },
            ]}
          >
            <Lockup scale={0.92} />

            {/* heading */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>Create Your </Text>
              <GradientText text="Account" size={32} width={178} height={40} weight="800" />
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

            {/* primary CTA */}
            <GradientButton
              label="Create Account"
              loading={busy}
              height={52}
              fontSize={16}
              onPress={createAccount}
              style={{ marginTop: 18 }}
            />

            {/* or + socials */}
            <View style={{ marginTop: 16 }}>
              <OrDivider compact />
            </View>
            <View style={{ marginTop: 14 }}>
              <OutlineButton label="Continue with Google" icon={<GoogleG />} loading={gBusy} height={48} fontSize={15} onPress={googleCode} />
            </View>
            <View style={{ marginTop: 10 }}>
              <OutlineButton label="Continue with Apple" icon={<AppleLogo />} loading={aBusy} height={48} fontSize={15} onPress={appleSoon} />
            </View>

            {/* sign in + legal */}
            <View style={{ flexGrow: 1, minHeight: 14 }} />
            <View style={styles.signRow}>
              <Text style={styles.signText}>Already have an account? </Text>
              <Pressable onPress={() => nav.navigate('Login')} hitSlop={10} accessibilityRole="link">
                <Text style={styles.signLink}>Sign In</Text>
              </Pressable>
            </View>

            <View style={styles.legalRow}>
              <Text style={styles.legal}>By creating an account, you agree to our</Text>
              <View style={styles.legalLinks}>
                <Pressable onPress={() => nav.navigate('Browser', { doc: 'terms' })} hitSlop={8} accessibilityRole="link">
                  <GradientText text="Terms of Service" size={12.5} width={104} height={17} weight="600" colorsArr={['#3b82f6', '#8b5cf6']} />
                </Pressable>
                <Text style={styles.legalDot}>•</Text>
                <Pressable onPress={() => nav.navigate('Browser', { doc: 'privacy' })} hitSlop={8} accessibilityRole="link">
                  <GradientText text="Privacy Policy" size={12.5} width={84} height={17} weight="600" colorsArr={['#3b82f6', '#8b5cf6']} />
                </Pressable>
              </View>
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
  root: { flex: 1, backgroundColor: BG },
  glow: { position: 'absolute' },
  content: { flex: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: '#94a3b8', fontSize: 15, lineHeight: 22, marginTop: 8 },

  fieldStack: { marginTop: 18, gap: 10 },

  signRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 34 },
  signText: { color: '#d7d9ea', fontSize: 15 },
  signLink: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },

  legalRow: { alignItems: 'center', marginTop: 6 },
  legal: { color: '#8a90a5', fontSize: 12.5, lineHeight: 18 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  legalDot: { color: '#8a90a5', fontSize: 12.5, marginHorizontal: 8 },
});
