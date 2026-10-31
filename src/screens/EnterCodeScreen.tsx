import React, { useEffect, useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { GradientText, Lockup, TopToast, useCountingDots, useToast } from '../components/ui';
import { BackIcon, ClockIcon, MessageLockIcon } from '../components/icons';
import { gradients } from '../theme/tokens';
import * as auth from '../core/auth/authService';

/**
 * Enter Code — rebuilt 2026-10-24 for reliable tapping.
 * The boxes are pure display; a single transparent number-pad TextInput
 * overlays the whole box row, so tapping ANY box taps the input itself
 * and the standard OS keyboard always opens (no focus() dance, no custom
 * keypad). The code auto-verifies the moment the sixth digit is typed.
 */
const CODE_LEN = 6;
const RESEND_SECONDS = 83; // 01:23

export default function EnterCodeScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const route = useRoute<any>();
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const k = W / 683;

  const email: string = route.params?.email || '';
  const purpose: 'reset' | 'signup' | 'login' | 'google' = route.params?.purpose || 'reset';
  const pending: { fullName?: string; password?: string; confirm?: string; remember?: boolean } = {
    fullName: route.params?.fullName, password: route.params?.password,
    confirm: route.params?.confirm, remember: route.params?.remember,
  };
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(RESEND_SECONDS);
  const submitting = useRef(false);
  const vDots = useCountingDots(busy);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    const t = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = Math.floor(left / 60).toString().padStart(2, '0');
  const ss = (left % 60).toString().padStart(2, '0');

  const verify = async (full: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    const v = await auth.checkCode(email, purpose, full);
    if (!v.ok) {
      setBusy(false);
      submitting.current = false;
      setCode('');
      setErr(v.message || 'Incorrect code. Please try again.');
      return;
    }
    if (purpose === 'reset') {
      nav.navigate('NewPassword', { email });
      return;
    }
    if (purpose === 'signup') {
      const r = await auth.register({
        fullName: pending.fullName || '', email, password: pending.password || '', confirm: pending.confirm || '',
      });
      if (r.ok) { nav.reset({ index: 0, routes: [{ name: 'Home' }] }); return; }
      setBusy(false); submitting.current = false;
      setErr(r.message || 'Could not create your account');
      return;
    }
    if (purpose === 'login') {
      const r = await auth.login({ email, password: pending.password || '', remember: !!pending.remember });
      if (r.ok) { nav.reset({ index: 0, routes: [{ name: 'Home' }] }); return; }
      setBusy(false); submitting.current = false;
      setErr(r.message || 'Could not sign you in');
      return;
    }
    // google
    const r = await auth.googleVerified(email);
    if (r.ok) { nav.reset({ index: 0, routes: [{ name: 'Home' }] }); return; }
    setBusy(false); submitting.current = false;
    setErr(r.message || 'Could not sign you in');
  };

  const onChangeCode = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, CODE_LEN);
    setCode(clean);
    setErr('');
    if (clean.length === CODE_LEN) verify(clean);   // auto-verify on the final digit
  };

  const resend = async () => {
    if (left > 0 || busy) return;
    const r = await auth.requestCode(email, purpose);
    if (!r.ok) { setErr(r.message || 'Could not resend the code'); return; }
    setCode(''); setErr('');
    setLeft(RESEND_SECONDS);
    toast('Code sent to your email.', 'info');
  };

  const gap = 10;
  const boxW = Math.floor((W - 56 - 5 * gap) / 6);
  const boxH = Math.round(boxW * 1.12);
  const circleSize = Math.round(k * 186);
  const active = code.length < CODE_LEN ? code.length : CODE_LEN - 1;

  return (
    <View style={styles.root}>
      <Image source={require('../assets/img/forgot_bg.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 30 }]}>

            {/* back arrow */}
            <Pressable onPress={() => nav.goBack()} hitSlop={10} style={{ position: 'absolute', top: insets.top + 12, left: 22, zIndex: 2 }}>
              <BackIcon size={Math.round(k * 26)} color="#fff" />
            </Pressable>

            <View style={{ flexGrow: 1 }} />
            <Lockup scale={Math.max(0.78, k * 0.9)} />

            {/* message bubble with padlock, in glowing gradient ring */}
            <View style={{ width: circleSize, height: circleSize, marginTop: 26 }}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: circleSize / 2, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={['rgba(108,99,255,0.45)', 'rgba(0,210,255,0.38)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, margin: Math.round(k * 15), borderRadius: (circleSize - k * 30) / 2, padding: Math.round(k * 7) }}
              >
                <View style={{ flex: 1, borderRadius: (circleSize - k * 44) / 2, backgroundColor: '#0b0f2b', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageLockIcon size={Math.round(k * 74)} color="#fff" />
                </View>
              </LinearGradient>
            </View>

            {/* heading */}
            <View style={styles.titleRow}>
              <Text style={styles.titleWhite}>Enter </Text>
              <GradientText
                text={purpose === 'reset' ? 'Reset Code' : 'Code'}
                size={32}
                width={purpose === 'reset' ? 215 : 105}
                height={40}
                weight="800"
                colorsArr={gradients.wordmark}
              />
            </View>
            <Text style={styles.sub}>
              We&apos;ve sent a 6-digit code to your email address.{'\n'}
              {purpose === 'reset' ? 'Enter the code below to reset your password.' : 'Enter the code below to continue.'}
            </Text>

            {/* six code boxes + the transparent input overlaying the whole row.
                Tapping a box taps the input directly — the OS keyboard always opens. */}
            <View style={styles.boxRowWrap}>
              <View style={[styles.boxRow, { gap }]}>
                {Array.from({ length: CODE_LEN }).map((_, i) => {
                  const isActive = i === active;
                  const box = (
                    <View style={[styles.box, isActive ? styles.boxActive : null, { width: boxW, height: boxH }]}>
                      <Text style={styles.digit}>{code[i] || ''}</Text>
                    </View>
                  );
                  if (!isActive) return <View key={i}>{box}</View>;
                  return (
                    <LinearGradient
                      key={i}
                      colors={gradients.brand}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ borderRadius: Math.round(k * 18), padding: Math.round(k * 2.5) }}
                    >
                      {box}
                    </LinearGradient>
                  );
                })}
              </View>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={onChangeCode}
                keyboardType="number-pad"
                maxLength={CODE_LEN}
                autoFocus
                caretHidden
                editable={!busy}
                style={styles.rowInput}
                textContentType="oneTimeCode"
              />
            </View>

            {/* resend: a real Pressable with a generous hit area. While the
                countdown runs, tapping still responds (with a hint toast) so
                the control never feels dead. */}
            <Pressable
              onPress={left > 0 ? () => toast(`You can request a new code in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}.`, 'info') : resend}
              disabled={busy}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={left > 0 ? `Resend code available in ${Math.floor(left / 60)} minutes ${left % 60} seconds` : 'Resend code'}
              style={({ pressed }) => [styles.timerRow, styles.resendTap, pressed && { opacity: 0.6 }]}
            >
              {left > 0 ? (
                <View style={styles.timerInner}>
                  <ClockIcon size={16} color="#00D2FF" />
                  <Text style={styles.timerText}>  Resend code in </Text>
                  <Text style={styles.timerTime}>{mm}:{ss}</Text>
                </View>
              ) : (
                <Text style={styles.resendLink}>Resend code</Text>
              )}
            </Pressable>

            {busy ? <Text style={styles.verifying}>{`Verifying${'.'.repeat(vDots)}`}</Text> : null}

            <View style={{ flexGrow: 1 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* errors pop up at the top */}
      <TopToast message={err} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070a' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  titleWhite: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: '#b0b0b0', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 10 },
  boxRowWrap: { position: 'relative', marginTop: 26 },
  boxRow: { flexDirection: 'row', justifyContent: 'center' },
  // the transparent input covers the full box row: every tap opens the OS keyboard
  rowInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent', backgroundColor: 'transparent' },
  box: { backgroundColor: '#0b1026', borderWidth: 2, borderColor: '#2d3348', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderWidth: 2, borderColor: 'transparent' },
  digit: { color: '#fff', fontSize: 26, fontWeight: '700' },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, minHeight: 20 },
  resendTap: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  timerInner: { flexDirection: 'row', alignItems: 'center' },
  timerText: { color: '#d8dce8', fontSize: 14 },
  timerTime: { color: '#00D2FF', fontSize: 14, fontWeight: '600' },
  resendLink: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  verifying: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 14, opacity: 0.9 },
});
