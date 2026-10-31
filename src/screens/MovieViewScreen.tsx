import React, { useState } from 'react';
import {
  Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from '../components/ui';
import { titles } from '../data/mock';
import {
  BackIcon, CheckIcon, ChevronDownIcon, CloseIcon, CrownIcon, DownloadIcon, FullscreenIcon,
  PauseIcon, PlayIcon, PlusCircleIcon, ShareIcon, StarIcon,
} from '../components/icons';
import { colors, gradients } from '../theme/tokens';
import VideoPlayer from '../components/VideoPlayer';

const EPISODES = [
  { ep: '01', name: 'The Engram', size: '158.2MB', dur: '01:05:06' },
  { ep: '02', name: 'Lattice', size: '142.7MB', dur: '59:41' },
  { ep: '03', name: 'Dispatches', size: '151.0MB', dur: '01:02:12' },
  { ep: '04', name: 'The Five', size: '147.3MB', dur: '01:00:58' },
  { ep: '05', name: 'Cold Static', size: '160.4MB', dur: '01:06:31' },
  { ep: '06', name: 'Nightfall', size: '149.8MB', dur: '01:01:47' },
];
const QUALITIES = [
  { q: '360P', premium: false },
  { q: '480P', premium: false },
  { q: '720P', premium: true },
  { q: '1080P', premium: true },
];
const COMMENTS = [
  { user: 'Micheal.O', when: '2 days ago', text: 'This one hits different on a big screen. Picture quality is unmatched.' },
  { user: 'tife_', when: '5 days ago', text: 'Rewatched the whole thing again. Season 2 when?' },
  { user: 'Amara', when: '1 week ago', text: 'Best series I have downloaded here. Subtitle sync is perfect.' },
];

function CircleCheck({ on }: { on: boolean }) {
  return (
    <View style={[styles.circ, on ? styles.circOn : null]}>
      {on ? <CheckIcon size={14} /> : null}
    </View>
  );
}

export default function MovieViewScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { title, year, genre, image } = route.params ?? {};

  const toast = useToast();
  const [inList, setInList] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [epTab, setEpTab] = useState(0); // 0 = All
  const [tab, setTab] = useState(0); // 0 = For you
  const [quality, setQuality] = useState(1);
  const [selected, setSelected] = useState<number[]>([0]);

  const toggleEp = (i: number) =>
    setSelected(s => (s.includes(i) ? s.filter(x => x !== i) : [...s, i]));

  const player = (
    <VideoPlayer
      title={title}
      subtitle={`${title} S01 E01`}
      onBack={() => nav.goBack()}
      onGoAdFree={() => setSheet(true)}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {player}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* Title + info */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Pressable><Text style={styles.infoLink}>Info ›</Text></Pressable>
        </View>

        {/* Meta line */}
        <View style={styles.metaRow}>
          <StarIcon size={13} />
          <Text style={styles.meta}>7.9</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{year}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>United States</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{genre}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>2 Seasons</Text>
        </View>

        {/* Action chips */}
        <View style={styles.chipRow}>
          {[
            { label: 'Add to list', icon: <PlusCircleIcon size={24} /> },
            { label: 'Share', icon: <ShareIcon size={24} /> },
            { label: 'Download', icon: <DownloadIcon size={24} /> },
            { label: 'View', icon: <PlayIcon size={24} /> },
          ].map((c, i) => (
            <Pressable
              key={c.label}
              style={styles.chipBtn}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              onPress={() => {
                if (i === 0) {
                  setInList(v => {
                    toast(v ? 'Removed from your list' : 'Added to your list', 'info');
                    return !v;
                  });
                } else if (i === 1) {
                  Share.share({ message: `${title} — watch on StreamMax` }).catch(() => {});
                } else if (i === 2) {
                  setSheet(true);
                } else {
                  nav.navigate('DramaPlayer', { title, episodes: 32, poster: image });
                }
              }}
            >
              {c.icon}
              <Text style={styles.chipLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Resource block */}
        <View style={styles.resBlock}>
          <View style={styles.resHead}>
            <Text style={styles.resTitle}>Resource</Text>
            <Text style={styles.resBy}>Uploaded by StreamMax</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={styles.drop}><Text style={styles.dropText}>Original Audio</Text><ChevronDownIcon /></View>
            <View style={styles.drop}><Text style={styles.dropText}>Season 01</Text><ChevronDownIcon /></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
            {[{ ep: 'All', size: '' }, ...EPISODES.map(e => ({ ep: e.ep, size: e.size }))].map((e, i) => (
              <Pressable key={e.ep} style={[styles.epChip, i === epTab ? styles.epChipOn : null]} onPress={() => setEpTab(i)}>
                <Text style={[styles.epChipText, i === epTab ? { color: '#fff' } : null]}>{e.ep === 'All' ? 'All' : `E${e.ep}`}</Text>
                {e.size ? <Text style={[styles.epChipSize, i === epTab ? { color: '#cfd3e8' } : null]}>{e.size}</Text> : null}
                <DownloadIcon size={13} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tabs: For you / Comments */}
        <View style={styles.tabsRow}>
          {['For you', 'Comments (99+)'].map((t, i) => (
            <Pressable key={t} onPress={() => setTab(i)} style={styles.tabBtn}>
              <Text style={[styles.tabText, tab === i ? styles.tabTextOn : null]}>{t}</Text>
              {tab === i ? <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabLine} /> : null}
            </Pressable>
          ))}
        </View>

        {tab === 0 ? (
          <View style={styles.grid}>
            {titles.slice(0, 9).map(t => (
              <Pressable key={t.id} style={styles.gridItem} onPress={() => nav.replace('MovieView', { title: t.title, year: t.year, genre: t.genre, image: t.poster })}>
                <Image source={t.poster} style={styles.gridImg} />
                <Text numberOfLines={1} style={styles.gridTitle}>{t.title}</Text>
                <Text style={styles.gridMeta}>{t.year} | {t.genre}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {COMMENTS.map((c, i) => (
              <View key={i} style={styles.comment}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{c.user[0].toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cUser}>{c.user} <Text style={styles.cWhen}>· {c.when}</Text></Text>
                  <Text style={styles.cText}>{c.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating download button */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => setSheet(true)}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fabGrad}>
          <DownloadIcon size={18} />
          <Text style={styles.fabText}>Download</Text>
        </LinearGradient>
      </Pressable>


      {/* Download sheet */}
      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Download</Text>
            <Pressable hitSlop={10} onPress={() => setSheet(false)}><CloseIcon size={22} /></Pressable>
          </View>

          <View style={styles.resCard}>
            <View style={styles.resHead}>
              <Text style={styles.resTitle}>Resources</Text>
              <Text style={styles.resBy}>Uploaded by StreamMax</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={styles.drop}><Text style={styles.dropText}>Original Audio</Text><ChevronDownIcon /></View>
              <View style={styles.drop}><Text style={styles.dropText}>Season 01</Text><ChevronDownIcon /></View>
            </View>
          </View>

          <View style={styles.qRow}>
            {QUALITIES.map((q, i) => (
              <Pressable key={q.q} style={[styles.qChip, quality === i ? styles.qChipOn : null]} onPress={() => setQuality(i)}>
                <Text style={[styles.qText, quality === i ? { color: '#fff' } : null]}>{q.q}</Text>
                {q.premium ? <CrownIcon /> : null}
              </Pressable>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
            {EPISODES.map((e, i) => (
              <Pressable key={e.ep} style={styles.epRow} onPress={() => toggleEp(i)}>
                <CircleCheck on={selected.includes(i)} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.epName}>S01 E{e.ep} · {e.name}</Text>
                  <Text style={styles.epMeta}>{e.size} · {e.dur}</Text>
                </View>
                <DownloadIcon size={18} />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sheetBar}>
            <Pressable onPress={() => setSelected(s => (s.length === EPISODES.length ? [] : EPISODES.map((_, i) => i)))}>
              <View style={styles.selAll}><CircleCheck on={selected.length === EPISODES.length} /><Text style={styles.selAllText}>Select All</Text></View>
            </Pressable>
            <Pressable
              onPress={() => {
                if (selected.length === 0) { toast('Select at least one episode', 'info'); return; }
                setSheet(false);
                toast('Downloads are not available yet.', 'info');
              }}
              accessibilityRole="button"
              accessibilityLabel="Download selected episodes"
            >
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dlAll}>
                <Text style={styles.dlAllText}>Download</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  playerShade: { position:'absolute',top:0,left:0,right:0,bottom:0, backgroundColor: 'rgba(0,0,0,0.18)' },
  back: { position: 'absolute', left: 12, top: 10, width: 36, height: 36, justifyContent: 'center' },
  hdPill: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', backgroundColor: 'rgba(10,10,14,0.72)', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5 },
  hdText: { color: '#e6e8f4', fontSize: 11.5, fontWeight: '600' },
  hdArrow: { color: '#8fd7ff', fontSize: 11.5, fontWeight: '800' },
  playBtn: { position: 'absolute', alignSelf: 'center', top: '42%', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(8,8,12,0.55)', alignItems: 'center', justifyContent: 'center' },
  playerBottom: { position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { color: '#d9dbe8', fontSize: 10.5 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  trackFill: { width: '3%', height: 3, borderRadius: 2, backgroundColor: '#00D2FF' },
  fsRoot: { position:'absolute',top:0,left:0,right:0,bottom:0, backgroundColor: '#000', justifyContent: 'center' },
  fsClose: { position: 'absolute', top: 14, right: 14, padding: 6 },
  fsCaption: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', backgroundColor: 'rgba(10,10,14,0.72)', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 14 },
  title: { color: '#fff', fontSize: 21, fontWeight: '800', flex: 1 },
  infoLink: { color: '#00D2FF', fontSize: 14, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginTop: 7, flexWrap: 'wrap' },
  meta: { color: '#9aa3bd', fontSize: 12.5 },
  metaDot: { color: '#565a72', fontSize: 12.5 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 18, paddingHorizontal: 10 },
  chipBtn: { alignItems: 'center', gap: 7 },
  chipLabel: { color: '#c6c9dd', fontSize: 12.5 },
  resBlock: { marginHorizontal: 16, marginTop: 22, backgroundColor: '#101219', borderRadius: 14, padding: 14 },
  resCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#101219', borderRadius: 14, padding: 14 },
  resHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  resTitle: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  resBy: { color: '#7d8299', fontSize: 11.5 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#191c26', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  dropText: { color: '#c9cbe0', fontSize: 12.5 },
  epChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#191c26', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  epChipOn: { backgroundColor: '#2a2e42' },
  epChipText: { color: '#c9cbe0', fontSize: 12.5, fontWeight: '600' },
  epChipSize: { color: '#7d8299', fontSize: 10.5 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 24, gap: 26 },
  tabBtn: {},
  tabText: { color: '#8a8fa5', fontSize: 16, fontWeight: '600', marginBottom: 7 },
  tabTextOn: { color: '#fff', fontWeight: '800' },
  tabLine: { height: 3, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 14, gap: 12 },
  gridItem: { width: '30.6%', alignItems: 'center' },
  gridImg: { width: '100%', aspectRatio: 0.69, borderRadius: 10 },
  gridTitle: { color: '#fff', fontSize: 12.5, fontWeight: '600', marginTop: 7, textAlign: 'center' },
  gridMeta: { color: '#7d8299', fontSize: 10.5, marginTop: 2, textAlign: 'center' },
  comment: { flexDirection: 'row', gap: 11, marginTop: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#8f95f0', fontSize: 15, fontWeight: '800' },
  cUser: { color: '#e8eaf5', fontSize: 13.5, fontWeight: '700' },
  cWhen: { color: '#7d8299', fontWeight: '400', fontSize: 12 },
  cText: { color: '#b9bdd2', fontSize: 13, lineHeight: 19, marginTop: 3 },
  fab: { position: 'absolute', left: 24, right: 24 },
  fabGrad: { height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#0d0f16', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 16 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  qRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  qChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#171a24', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8 },
  qChipOn: { backgroundColor: '#2a2e42' },
  qText: { color: '#c9cbe0', fontSize: 12.5, fontWeight: '600' },
  epRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  epName: { color: '#e8eaf5', fontSize: 14, fontWeight: '600' },
  epMeta: { color: '#7d8299', fontSize: 11.5, marginTop: 2 },
  circ: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.6, borderColor: '#3a4059', alignItems: 'center', justifyContent: 'center' },
  circOn: { backgroundColor: '#7a3cff', borderColor: '#7a3cff' },
  sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  selAll: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  selAllText: { color: '#c9cbe0', fontSize: 14, fontWeight: '600' },
  dlAll: { borderRadius: 24, paddingHorizontal: 30, paddingVertical: 13 },
  dlAllText: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
