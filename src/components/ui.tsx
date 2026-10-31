import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGrad, Stop, Text as SvgText, Circle } from 'react-native-svg';
import { colors, gradients } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, EyeIcon, EyeOffIcon, ToastCheckIcon, ToastWarnIcon } from './icons';

// counting dots for loading labels: "Loading." -> "Loading.." -> "Loading..."
export const useCountingDots = (active: boolean, ms = 400) => {
  const [n, setN] = useState(1);
  useEffect(() => {
    if (!active) {
      setN(1);
      return;
    }
    const t = setInterval(() => setN(v => (v % 3) + 1), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return n;
};

export const GradientButton = ({
  label, onPress, arrow = true, style, height, fontSize, loading,
}: {
  label: string; onPress?: () => void; arrow?: boolean; style?: ViewStyle;
  height?: number; fontSize?: number; loading?: boolean;
}) => {
  const dots = useCountingDots(!!loading);
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [{ opacity: loading ? 0.75 : pressed ? 0.88 : 1 }, style]}>
      <LinearGradient
        colors={gradients.button}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[s.gradBtn, height ? { height, borderRadius: height / 2 } : null]}>
        <Text style={[s.gradBtnText, fontSize ? { fontSize } : null]}>
          {loading ? `Loading${'.'.repeat(dots)}` : label}
        </Text>
        {arrow && !loading ? <ArrowRight size={fontSize ? fontSize + 4 : 22} color="#fff" /> : null}
      </LinearGradient>
    </Pressable>
  );
};

export const OutlineButton = ({
  label, icon, onPress, height, fontSize, loading,
}: { label: string; icon: React.ReactNode; onPress?: () => void; height?: number; fontSize?: number; loading?: boolean }) => (
  <Pressable
    disabled={loading}
    onPress={onPress}
    style={({ pressed }) => [s.outlineBtn, height ? { height, borderRadius: height / 2 } : null, { opacity: loading ? 0.7 : pressed ? 0.8 : 1 }]}>
    {/* while loading the brand icon is replaced by a spinner (MarketScope AI behaviour) */}
    <View style={s.outlineIcon}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : icon}</View>
    <Text style={[s.outlineText, fontSize ? { fontSize } : null]}>{label}</Text>
  </Pressable>
);

/** Gradient-filled text via SVG. Width should be passed to size the canvas. */
export const GradientText = ({
  text, size, width, height, weight = '700', colorsArr = gradients.wordmark, anchor = 'start', x = 0,
}: {
  text: string; size: number; width: number; height?: number; weight?: string;
  colorsArr?: string[]; anchor?: 'start' | 'middle' | 'end'; x?: number;
}) => {
  const h = height ?? Math.round(size * 1.25);
  const id = 'gt' + text.replace(/\W/g, '');
  return (
    <Svg width={width} height={h}>
      <Defs>
        <SvgGrad id={id} x1="0" y1="0" x2="1" y2="0">
          {colorsArr.map((c, i) => (
            <Stop key={i} offset={String(i / (colorsArr.length - 1))} stopColor={c} />
          ))}
        </SvgGrad>
      </Defs>
      <SvgText
        x={x} y={size} fontSize={size} fontWeight={weight} fill={`url(#${id})`} textAnchor={anchor}>
        {text}
      </SvgText>
    </Svg>
  );
};

/* Android sometimes swallows TextInput's onBlur when focus jumps straight to
   another field, leaving the old field's glow stuck on. Track the one field
   the OS actually has focused at module level: only it glows. */
let focusedFieldId: object | null = null;

export const Field = ({
  icon, secure, style, focused, h, fs, error, radius, ...rest
}: TextInputProps & { icon: React.ReactNode; secure?: boolean; focused?: boolean; style?: ViewStyle; h?: number; fs?: number; error?: boolean; radius?: number }) => {
  const [hidden, setHidden] = useState(!!secure);
  const [isFocus, setFocus] = useState(false);
  const fieldId = useRef({});
  const active = focused || (isFocus && focusedFieldId === fieldId.current);
  const inner = (
    <View style={[s.field, active ? s.fieldActive : null, h ? { height: h, borderRadius: radius ?? Math.min(15, h / 3) } : null]}>
      <View style={s.fieldIcon}>{icon}</View>
      <TextInput
        {...rest}
        secureTextEntry={hidden}
        placeholderTextColor="#7b7f96"
        onFocus={() => { focusedFieldId = fieldId.current; setFocus(true); }}
        onBlur={() => { if (focusedFieldId === fieldId.current) focusedFieldId = null; setFocus(false); }}
        style={[s.fieldInput, h ? { height: h } : null, fs ? { fontSize: fs } : null]}
        selectionColor={colors.secondary}
      />
      {secure ? (
        <Pressable hitSlop={10} onPress={() => setHidden(h => !h)}>
          {hidden ? <EyeIcon color="#c9cbe0" /> : <EyeOffIcon color="#c9cbe0" />}
        </Pressable>
      ) : null}
    </View>
  );
  if (active) {
    return (
      <LinearGradient
        colors={['#00E5FF', '#2979FF', '#7D2AE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.fieldBorder, style]}>
        {inner}
      </LinearGradient>
    );
  }
  return <View style={[s.fieldBorderIdle, error && !active ? s.fieldBorderError : null, style]}>{inner}</View>;
};

export const OrDivider = ({ compact }: { compact?: boolean }) => (
  <View style={[s.orRow, compact ? { marginVertical: 0 } : null]}>
    <View style={s.orLine} />
    <Text style={s.orText}>or</Text>
    <View style={s.orLine} />
  </View>
);

/** Veltravia-style toast: dark pill below the status bar, slides in, auto-dismisses. */
/* App-wide toast: wrap the navigator once; any screen can call useToast()(...).
   Same dark pill + white text everywhere (error and info). */
type ToastFn = (message: string, kind?: 'error' | 'info') => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ message: string; kind: 'error' | 'info'; id: number } | null>(null);
  const show = useCallback<ToastFn>((message, kind = 'error') => {
    setState({ message, kind, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setState(null), 3600);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <ToastCtx.Provider value={show}>
      <View style={{ flex: 1 }}>
        {children}
        {state ? <TopToast key={state.id} message={state.message} kind={state.kind} /> : null}
      </View>
    </ToastCtx.Provider>
  );
}

export const TopToast = ({ message, kind = 'error' }: { message: string; kind?: 'error' | 'info' }) => {
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const D = 3200;

  useEffect(() => {
    // spring in with a little overshoot, drain the time bar, fade back up
    Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
    Animated.timing(bar, { toValue: 1, duration: D, useNativeDriver: false }).start();
    const t = setTimeout(
      () => Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }).start(),
      D,
    );
    return () => clearTimeout(t);
  }, [a, bar]);

  const isError = kind === 'error';
  const accent = isError ? '#FF5F6D' : '#00D2FF';
  const Icon = isError ? ToastWarnIcon : ToastCheckIcon;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: insets.top + 10, left: 16, right: 16, zIndex: 99, elevation: 99,
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] }) }],
      }}
    >
      <View style={[s.toastPill, { borderColor: isError ? 'rgba(255,95,109,0.28)' : 'rgba(0,210,255,0.28)', shadowColor: accent }]}>
        <View style={[s.toastIconRing, { backgroundColor: isError ? 'rgba(255,95,109,0.14)' : 'rgba(0,210,255,0.14)' }]}>
          <Icon size={16} color={accent} />
        </View>
        <Text style={[s.toastText, { flexShrink: 1 }]} numberOfLines={2}>
          {message}
        </Text>
        {/* time bar drains over the toast's lifetime */}
        <View style={s.toastBarTrack}>
          <Animated.View
            style={{
              height: 2, borderRadius: 1,
              backgroundColor: accent,
              alignSelf: 'stretch',
              opacity: 0.85,
              transform: [{ scaleX: bar.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }],
              transformOrigin: 'right',
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
};

/** Logo + wordmark lockup. `stacked` = logo above, else side-by-side like auth screens. */
export const Lockup = ({ stacked = false, scale = 1 }: { stacked?: boolean; scale?: number }) => {
  const logo = require('../assets/img/logo_soft.png');
  if (stacked) {
    return (
      <View style={{ alignItems: 'center' }}>
        <Image source={logo} style={{ width: 150 * scale, height: 150 * scale }} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image source={logo} style={{ width: 92 * scale, height: 92 * scale, marginRight: -6 * scale }} resizeMode="contain" />
        <View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[s.wmWhite, { fontSize: 38 * scale }]}>Stream</Text>
            <GradientText text="Max" size={38 * scale} width={Math.round(78 * scale)} height={46 * scale} />
          </View>
          <Text style={[s.wmTag, { fontSize: 16 * scale }]}>Your Movies. Your Way.</Text>
        </View>
      </View>
    </View>
  );
};

export const Wordmark = ({ size = 56 }: { size?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
    <Text style={{ color: '#fff', fontSize: size, fontWeight: '800', letterSpacing: -1.5 }}>Stream</Text>
    <GradientText text="Max" size={size} width={Math.round(size * 2.1)} height={size * 1.2} weight="800" />
  </View>
);

export const Spinner = ({ size = 50 }: { size?: number }) => {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    a.start();
    return () => a.stop();
  }, [rot]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <Animated.View style={{ transform: [{ rotate: spin }], width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGrad id="spin" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#00d2ff" />
            <Stop offset="1" stopColor="#b300ff" />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#161a33" strokeWidth={3.5} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#spin)" strokeWidth={3.5} fill="none"
          strokeLinecap="round" strokeDasharray={`${c * 0.7} ${c}`}
        />
      </Svg>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  toastPill: {
    alignSelf: 'center', maxWidth: '92%', position: 'relative', overflow: 'hidden',
    backgroundColor: 'rgba(17,19,28,0.97)', borderRadius: 999,
    paddingVertical: 11, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  toastIconRing: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'left' },
  toastBarTrack: {
    position: 'absolute', left: 20, right: 20, bottom: 4, height: 2,
  },

  gradBtn: {
    height: 58, borderRadius: 29, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, alignSelf: 'stretch',
  },
  gradBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  outlineBtn: {
    height: 56, borderRadius: 28, borderWidth: 1.3, borderColor: '#3a4268',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#070810',
  },
  outlineIcon: { marginRight: 14 },
  outlineText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fieldBorder: { borderRadius: 16, padding: 1.4 },
  fieldBorderIdle: {
    borderRadius: 16, borderWidth: 1.2, borderColor: '#2A2E3D', overflow: 'hidden',
  },
  fieldBorderError: { borderColor: '#ff4d6d' },
  field: {
    height: 56, borderRadius: 15, backgroundColor: '#12141C',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
  },
  fieldActive: { backgroundColor: '#0E1220' },
  fieldIcon: { width: 34 },
  fieldInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 0, height: 56 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#262a42' },
  orText: { color: '#8a8fa8', marginHorizontal: 18, fontSize: 14 },
  wmWhite: { color: '#fff', fontWeight: '800', letterSpacing: -1 },
  wmTag: { color: '#c9cbe0', marginTop: -6, marginLeft: 2 },
});
