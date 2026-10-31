import React, { useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { Field, GradientButton, GradientText, Lockup, TopToast, useToast } from '../components/ui';
import { BackIcon, LockIcon, MailIcon } from '../components/icons';
import * as auth from '../core/auth/authService';

/**
 * Forgot Password — rebuilt 2026-10-31.
 *
 * Keyboard fix (the real bug): the screen used absolute positioning and the
 * manifest forced android:windowSoftInputMode="adjustPan", so the OS panned
 * the window and the button/footer ended up behind the keyboard with no way
 * to scroll. The manifest is now adjustResize and this screen is a flowing
 * ScrollView column, so the window shrinks, the focused field is scrolled
 * into view and the CTA always stays reachable.
 *
 * Design: one continuous cinematic background (collage + navy scrim + blue/
 * purple ambient light, no hard edge), centred StreamMax lockup, a glowing
 * gradient-ringed padlock, "Forgot Password?" with the brand gradient, the
 * 6-digit-code wording that matches the backend, a navy email field with a
 * gradient focus ring, the gradient "Send Reset Code" pill, and a centred
 * "Remember your password? Sign In" footer.
 */
const BG = '#02051B';

export default function ForgotPasswordScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const route = useRoute<any>();
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState(route.params?.email || '');
  const [err, setErr] = useState('');
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<any>(null);

  const send = async () => {
    if (busy) return;
    const e = email.trim().toLowerCase();
    if (!e) { setBad(true); setErr('Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) {
      setBad(true); setErr('Enter a valid email address'); return;
    }
    setBusy(true);
    const exists = await auth.emailExists(e);
    if (!exists) {
      setBusy(false);
      setBad(true); setErr('No account found with this email'); return;
    }
    const r = await auth.requestCode(e, 'reset');
    setBusy(false);
    if (!r.ok) {
      setBad(true); setErr(r.message || 'Could not send the code'); return;
    }
    toast('Code sent to your email. It expires in 10 minutes.', 'info');
    nav.navigate('EnterCode', { email: e, purpose: 'reset' });
  };

  const gutter = Math.min(40, Math.max(24, Math.round(W * 0.075)));
  const lockSize = Math.round(Math.min(W * 0.245, 104));

  return (
    <View style={styles.root}>
      {/* ONE continuous cinematic background — artwork fills the screen and a
          navy scrim darkens it, so there is no hard horizontal edge */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require('../assets/img/forgot_bg.png')}
          style={{ width: '100%', height: '100%', opacity: 0.75 }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(2,5,27,0.55)', 'rgba(2,5,27,0.80)', 'rgba(2,5,27,0.96)', BG]}
          locations={[0, 0.3, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glow, {
          width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45,
          top: -W * 0.38, right: -W * 0.35, backgroundColor: 'rgba(155,48,255,0.13)',
        }]} />
        <View style={[styles.glow, {
          width: W * 0.8, height: W * 0.8, borderRadius: W * 0.4,
          bottom: -W * 0.3, left: -W * 0.35, backgroundColor: 'rgba(0,210,255,0.08)',
        }]} />
      </View>

      {/* back */}
      <Pressable
        onPress={() => nav.goBack()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ position: 'absolute', top: insets.top + 12, left: gutter, zIndex: 5 }}
      >
        <BackIcon size={24} color="#fff" />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
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
                paddingTop: insets.top + 54,
                paddingBottom: Math.max(insets.bottom, 14) + 20,
              },
            ]}
          >
            <Lockup scale={0.95} />

            {/* glowing gradient-ringed padlock */}
            <View style={styles.lockWrap}>
              <LinearGradient
                colors={['#00E5FF', '#2979FF', '#9D4EDD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: lockSize, height: lockSize, borderRadius: lockSize / 2,
                  padding: 2, alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#8B5CF6', shadowOpacity: 0.55, shadowRadius: 18,
                  shadowOffset: { width: 0, height: 0 }, elevation: 12,
                }}
              >
                <View style={{
                  flex: 1, alignSelf: 'stretch', borderRadius: lockSize / 2,
                  backgroundColor: '#0A1030', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LockIcon size={Math.round(lockSize * 0.42)} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </View>

            {/* heading — one line, centred */}
            <View style={styles.titleRow}>
              <Text style={styles.titleWhite}>Forgot </Text>
              <GradientText
                text="Password?"
                size={30}
                width={Math.round(W * 0.44)}
                height={38}
                weight="800"
                colorsArr={['#00E5FF', '#2979FF', '#7D2AE8']}
              />
            </View>

            <Text style={styles.sub}>
              No worries! Enter your email address and we&apos;ll send you a{'\n'}
              6-digit code to reset your password.
            </Text>

            {/* email field */}
            <View style={styles.fieldWrap}>
              <Field
                h={54}
                radius={16}
                fs={16}
                error={bad}
                icon={<MailIcon size={22} color="#9EB4D8" />}
                placeholder="Email address"
                value={email}
                onChangeText={v => { setEmail(v); setBad(false); setErr(''); }}
                onSubmitEditing={send}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 220)}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="send"
              />
            </View>

            {/* CTA */}
            <View style={{ marginTop: 20 }}>
              <GradientButton label="Send Reset Code" loading={busy} height={56} fontSize={16} onPress={send} />
            </View>

            <View style={{ flexGrow: 1, minHeight: 24 }} />

            {/* footer */}
            <View style={styles.footer}>
              <Text style={styles.footText}>Remember your password? </Text>
              <Pressable onPress={() => nav.navigate('Login')} hitSlop={12} accessibilityRole="link">
                <GradientText
                  text="Sign In"
                  size={15}
                  width={52}
                  height={20}
                  weight="700"
                  colorsArr={['#2979FF', '#9D4EDD']}
                />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* errors / info pop up at the top */}
      <TopToast message={err} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  glow: { position: 'absolute' },
  content: { flex: 1, alignItems: 'center' },

  lockWrap: { marginTop: 18, alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  titleWhite: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.3 },

  sub: { color: '#C3CADF', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12 },

  fieldWrap: { alignSelf: 'stretch', marginTop: 26 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 30 },
  footText: { color: '#D8E1F4', fontSize: 15 },
});
