import React, { useEffect, useState } from 'react';
import {
  Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BottomNavBar, { BottomTabId } from '../components/BottomNavBar';
import { useToast } from '../components/ui';
import { getCurrentUser, logout, AuthUser } from '../core/auth/authService';
import { gradients } from '../theme/tokens';

/* Me (profile) screen — built from Ijezie's mock:
   dark purple→black gradient background, profile header (avatar with
   purple ring + camera button, name, email, Premium crown pill, gear),
   stats row (Watch History / Favorites / Downloads), grouped rounded
   settings containers with colored icon tiles + secondary descriptions,
   trailing values (Language: English, About: v1.0.0), and a purple
   Log Out button at the bottom. Rows are placeholders until their
   screens exist. */

/* ---------- icons (inline SVG glyphs, stroke style) ---------- */
type IP = { size?: number; color?: string };
const G = ({ size = 20, color = '#fff', d, fill }: IP & { d: string; fill?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={fill ? 'none' : color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Path d={d} />
  </Svg>
);
const PersonIcon = (p: IP) => <G {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0" />;
const CrownIcon = (p: IP) => <G {...p} fill d="M3 17h18v3H3v-3ZM4 16l1.4-8L9 12l3-7 3 7 3.6-4 1.4 8H4Z" />;
const ShieldIcon = (p: IP) => <G {...p} d="M12 3l7.5 3v6c0 4.4-3 8.2-7.5 9.5C7.5 20.2 4.5 16.4 4.5 12V6L12 3Z" />;
const BellIcon = (p: IP) => <G {...p} d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2.5H4.5L6 16ZM10 20.5a2 2 0 0 0 4 0" />;
const PaletteIcon = (p: IP) => <G {...p} d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.9 2-2 0-1.2-1-1.6-1-2.7 0-.8.7-1.3 1.6-1.3H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM8 8.5h.01M8 13h.01M13 7.5h.01" />;
const DownloadIcon = (p: IP) => <G {...p} d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />;
const GlobeIcon = (p: IP) => <G {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 9h17M3.5 15h17M12 3c-2.5 2.4-3.8 5.6-3.8 9s1.3 6.6 3.8 9c2.5-2.4 3.8-5.6 3.8-9S14.5 5.4 12 3Z" />;
const HelpIcon = (p: IP) => <G {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7M12 16.6h.01" />;
const InfoIcon = (p: IP) => <G {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.5h.01" />;
const GearIcon = (p: IP) => <G {...p} d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1A2 2 0 1 1 7 3.9l.1.1a1.7 1.7 0 0 0 2.9-1.2 2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1Z" />;
const CamIcon = ({ size = 14 }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
    <Path d="M4 8h3l2-3h6l2 3h3v12H4V8Zm8 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
  </Svg>
);
const LogoutIcon = ({ size = 18 }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9d6bff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9" />
  </Svg>
);

const CHEV = 'M9 5l7 7-7 7';
const Chevron = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#7A8296" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d={CHEV} />
  </Svg>
);

/* ---------- settings model ---------- */
type Row = { key: string; title: string; desc: string; tint: string; icon: React.FC<IP>; value?: string };
const GROUPS: Row[][] = [
  [
    { key: 'account', title: 'Account', desc: 'Manage your account details', tint: '#8B5CF6', icon: PersonIcon },
    { key: 'subscription', title: 'Subscription', desc: 'View your plan and benefits', tint: '#F5A623', icon: CrownIcon },
    { key: 'privacy', title: 'Privacy & Security', desc: 'Keep your account safe', tint: '#3B82F6', icon: ShieldIcon },
  ],
  [
    { key: 'notifications', title: 'Notifications', desc: 'Manage your alerts', tint: '#22C55E', icon: BellIcon },
    { key: 'appearance', title: 'Appearance', desc: 'Choose your theme', tint: '#EC4899', icon: PaletteIcon },
    { key: 'downloads', title: 'Downloads', desc: 'Manage offline content', tint: '#EF4444', icon: DownloadIcon },
    { key: 'language', title: 'Language', desc: 'Select your preferred language', tint: '#38BDF8', icon: GlobeIcon, value: 'English' },
  ],
  [
    { key: 'help', title: 'Help & Support', desc: 'Get help or contact us', tint: '#8B5CF6', icon: HelpIcon },
    { key: 'about', title: 'About', desc: 'App version and credits', tint: '#6B7280', icon: InfoIcon, value: 'v1.0.0' },
  ],
];

/* ---------- row components ---------- */
function SettingsRow({ row, last, onRow }: { row: Row; last?: boolean; onRow: (r: Row) => void }) {
  const Icon = row.icon;
  return (
    <Pressable style={styles.row} onPress={() => onRow(row)}>
      <View style={[styles.tile, { backgroundColor: row.tint }]}>
        <Icon size={19} color="#fff" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        <Text style={styles.rowDesc}>{row.desc}</Text>
      </View>
      {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
      <View style={{ marginLeft: 8 }}><Chevron /></View>
    </Pressable>
  );
}

function Group({ rows, onRow }: { rows: Row[]; onRow: (r: Row) => void }) {
  return (
    <View style={styles.group}>
      {rows.map((r, i) => (
        <React.Fragment key={r.key}>
          {i > 0 ? <View style={styles.rowSep} /> : null}
          <SettingsRow row={r} last={i === rows.length - 1} onRow={onRow} />
        </React.Fragment>
      ))}
    </View>
  );
}

function Stat({ label, count, first, last }: { label: string; count: number | string; first?: boolean; last?: boolean }) {
  return (
    <View style={styles.statWrap}>
      {!first ? <View style={styles.statDiv} /> : null}
      <View style={[styles.stat, !first && { marginLeft: 18 }]}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statCount}>{count}</Text>
      </View>
      {!last ? <View style={[styles.statDiv, { marginLeft: 18 }]} /> : null}
    </View>
  );
}

/* ---------- screen ---------- */
export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const toast = useToast();
  const { width: W } = useWindowDimensions();
  const [me, setMe] = useState<AuthUser | null>(null);

  useEffect(() => { getCurrentUser().then(setMe).catch(() => {}); }, []);

  const name = me?.fullName?.trim() || 'Guest';
  const email = me?.email || 'Sign in to sync your profile';
  const initial = name[0].toUpperCase();

  const onRow = (r: Row) => {
    if (r.key === 'about') { nav.navigate('About'); return; }
    toast(`${r.title} is coming soon`, 'info');
  };

  const onLogout = () => {
    Alert.alert('Log out', `Log out of ${me?.email ?? 'your account'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => { await logout(); toast('Signed out. See you soon!', 'info'); nav.reset({ index: 0, routes: [{ name: 'Welcome' }] }); },
      },
    ]);
  };

  return (
    <LinearGradient colors={['#1e0d35', '#0d0b10']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }} style={[styles.root, { paddingTop: insets.top + 14 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ---------- header ---------- */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={gradients.brand} style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            </LinearGradient>
            <Pressable style={styles.camBtn} onPress={() => toast('Profile photo coming soon', 'info')}>
              <CamIcon size={13} />
            </Pressable>
          </View>
          <Pressable hitSlop={12} style={styles.gear} onPress={() => nav.navigate('Settings')}>
            <GearIcon size={24} color="#B9BCCB" />
          </Pressable>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.premium}>
              <CrownIcon size={13} color="#fff" />
              <Text style={styles.premiumTxt}>Premium</Text>
            </View>
          </View>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* ---------- stats ---------- */}
        <View style={styles.stats}>
          <Stat label="Watch History" count={0} first />
          <Stat label="Favorites" count={0} />
          <Stat label="Downloads" count={0} last />
        </View>

        {/* ---------- groups ---------- */}
        <View style={{ marginTop: 22 }}>
          {GROUPS.map((g, i) => <Group key={i} rows={g} onRow={onRow} />)}
        </View>

        {/* ---------- logout ---------- */}
        <Pressable style={[styles.logoutBtn, { width: W - 32 }]} onPress={onLogout}>
          <LogoutIcon size={18} />
          <Text style={styles.logoutTxt}>Log Out</Text>
        </Pressable>
      </ScrollView>
      <BottomNavBar active="mine" onPress={(id: BottomTabId) => { if (id === 'home') nav.navigate('Home'); if (id === 'search') nav.navigate('Dramas'); if (id === 'downloads') nav.navigate('Downloads'); }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 16, marginTop: 6 },
  avatarWrap: { position: 'relative' },
  avatarRing: { width: 84, height: 84, borderRadius: 42, padding: 3 },
  avatar: { flex: 1, borderRadius: 39, backgroundColor: '#171325', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  camBtn: {
    position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#150f24',
  },
  gear: { position: 'absolute', right: 18, top: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  name: { color: '#fff', fontSize: 20, fontWeight: '700' },
  premium: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.9)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
  },
  premiumTxt: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  email: { color: '#a0a3b1', fontSize: 13, marginTop: 4 },
  stats: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, marginHorizontal: 16, backgroundColor: '#1a1b26', borderRadius: 16, paddingVertical: 14,
  },
  statWrap: { flexDirection: 'row', alignItems: 'center' },
  stat: { alignItems: 'center' },
  statDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },
  statLabel: { color: '#a0a3b1', fontSize: 12 },
  statCount: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 3 },
  group: { marginHorizontal: 16, backgroundColor: '#1a1b26', borderRadius: 16, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  tile: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { color: '#fff', fontSize: 15.5, fontWeight: '600' },
  rowDesc: { color: '#a0a3b1', fontSize: 12.5, marginTop: 1.5 },
  rowValue: { color: '#8a8ea3', fontSize: 12.5 },
  rowSep: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 62 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1a1b26', borderRadius: 16, paddingVertical: 15, marginTop: 22, marginHorizontal: 16,
  },
  logoutTxt: { color: '#9d6bff', fontSize: 15.5, fontWeight: '700' },
});
