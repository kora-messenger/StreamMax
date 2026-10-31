import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Image, Modal, PanResponder, Pressable, Share, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TEST_HLS } from '../components/VideoPlayer';
import { useToast } from '../components/ui';
import {
  BookmarkRibbonIcon, ChevronDownIcon, CrownIcon, DialIcon, DownloadTrayIcon, ShareIcon, StackIcon,
} from '../components/icons';

/* Drama player — MovieBox-style full-screen short-drama player.
   Per the reference recordings:
   - vertical episode feed: swiping up/down pages between episodes (EP01..EPn)
   - episodes beyond the free window are LOCKED for non-premium users:
     dimmed video, white padlock, gold "Premium Pro Unlock" pill
     (premium accounts see no lock at all)
   - every overlay auto-hides after 3s while playing
   - tap with overlays hidden brings them back; tap while visible pauses
   - the thin line at the very bottom is the ONLY seek surface */

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const ACCENT = '#00f2fe';
/* Future premium rules (not implemented yet, per Ijezie 2026-10-23):
   - when Premium launches, only the first 10 episodes are free
   - downloading a drama will require Premium
   - watching complete episodes will require Premium
   Nothing is gated until then — every episode plays for everyone. */

const pad2 = (n: number) => String(n).padStart(2, '0');

const BackChev = ({ size = 26, color = '#fff' }: { size?: number; color?: string }) => (
  <Text style={{ color, fontSize: size, lineHeight: size + 2, fontWeight: '300' }}>{'\u2039'}</Text>
);

const PlayTri = ({ size = 26 }: { size?: number }) => (
  <View
    style={{
      width: 0, height: 0, marginLeft: size * 0.06,
      borderLeftWidth: size * 0.42, borderRightWidth: 0,
      borderTopWidth: size * 0.25, borderBottomWidth: size * 0.25,
      borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent',
    }}
  />
);

export default function DramaPlayerScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const { title, episodes = 32, poster } = route.params ?? {};

  const [active, setActive] = useState(0); // episode index 0-based
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState(true);
  const [epPicker, setEpPicker] = useState(false);
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [scrub, setScrub] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expand, setExpand] = useState(false);
  const [speed, setSpeed] = useState(2); // 1x
  const [speedMenu, setSpeedMenu] = useState(false);
  const players = useRef<Record<number, any>>({});
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const epLabel = `EP${pad2(active + 1)}`;

  /* ---- overlay auto-hide: 3s, only while playing ---- */
  const armHide = useCallback(() => {
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setControls(false), 3000);
  }, []);
  useEffect(() => {
    armHide();
    return () => { if (hideT.current) clearTimeout(hideT.current); };
  }, [armHide]);
  useEffect(() => {
    if (paused && hideT.current) clearTimeout(hideT.current);
    if (paused) setControls(true);
  }, [paused]);
  useEffect(() => {
    Animated.timing(fade, { toValue: controls ? 1 : 0, duration: 240, useNativeDriver: true }).start();
  }, [controls, fade]);

  /* ---- vertical episode paging ---- */
  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ isViewable: boolean; index?: number }> }) => {
    const first = viewableItems.find(v => v.isViewable);
    if (first && typeof first.index === 'number' && first.index !== active) {
      setActive(first.index);
      setPos(0);
      setBuffering(true);
      setPaused(false);
      setControls(true);
      armHide();
    }
  }).current;
  const listRef = useRef<FlatList>(null);
  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  /* ---- single tap: hidden -> show overlays; visible -> pause/resume ---- */
  const onScreenTap = () => {
    if (!controls) { setControls(true); armHide(); return; }
    if (paused) { setPaused(false); armHide(); } else { setPaused(true); }
  };

  /* ---- the bottom line is the only seek surface ---- */
  const startX = useRef(0);
  const W = useWindowDimensions().width;
  const seek = (ratio: number) => {
    const r = Math.max(0, Math.min(0.999, ratio));
    const t = r * (duration || 0);
    setPos(t);
    players.current[active]?.seek?.(t);
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setScrub(true);
        startX.current = e.nativeEvent.locationX;
        seek(startX.current / W);
      },
      onPanResponderMove: (_e, g) => seek((startX.current + g.dx) / W),
      onPanResponderRelease: () => setScrub(false),
      onPanResponderTerminate: () => setScrub(false),
    }),
  ).current;

  const pct = duration > 0 ? Math.min(1, pos / duration) : 0;
  const data = useRef(Array.from({ length: episodes }, (_, i) => i)).current;

  return (
    <View style={styles.root}>
      {/* vertical episode feed */}
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={i => String(i)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => {
          const isActive = item === active;
          return (
            <View style={{ width: '100%', height: H }}>
              <Video
                ref={r => { players.current[item] = r; }}
                source={{ uri: TEST_HLS }}
                style={StyleSheet.absoluteFill}
                paused={!isActive || paused}
                rate={SPEEDS[speed]}
                resizeMode="cover"
                onProgress={isActive && !scrub ? (e: any) => { setPos(e.currentTime); setBuffering(false); } : undefined}
                onLoad={(e: any) => { if (isActive) { setDuration(e.duration); setBuffering(false); } }}
              />
              {isActive && buffering ? (
                <View style={styles.center} pointerEvents="none">
                  <ActivityIndicator color="#fff" />
                </View>
              ) : isActive && paused && controls ? (
                <View style={styles.center} pointerEvents="none">
                  <View style={styles.playBtn}>
                    <PlayTri size={30} />
                  </View>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {/* tap catcher */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onScreenTap} />

      {/* overlays */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="box-none">
        {/* top bar */}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.back} onPress={() => nav.goBack()}>
            <BackChev />
            <Text style={styles.epTitle}>{epLabel}</Text>
          </Pressable>
        </View>

        {/* subtitle */}
        <View style={styles.subWrap} pointerEvents="none">
          <Text style={styles.sub}>Oh come out</Text>
        </View>

        {/* right icon column */}
        <View style={styles.rightCol}>
          <Pressable
            style={styles.rBtn}
            onPress={() => toast('Downloads are not available yet.', 'info')}
            accessibilityRole="button"
            accessibilityLabel="Download this episode"
          >
            <DownloadTrayIcon size={23} />
          </Pressable>
          <Pressable style={styles.rBtn} onPress={() => setSaved(s => !s)}>
            <BookmarkRibbonIcon size={21} color={saved ? '#0FFFB0' : '#fff'} filled={saved} />
            <Text style={styles.rCount}>{saved ? 79 : 78}</Text>
          </Pressable>
          <Pressable
            style={styles.rBtn}
            onPress={() => {
              Share.share({ message: `${title} — ${epLabel} on StreamMax` }).catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityLabel="Share this drama"
          >
            <ShareIcon size={21} />
          </Pressable>
        </View>

        {/* bottom block */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 6 }]} pointerEvents="box-none">
          <View style={styles.metaRow}>
            <Image source={poster} style={styles.thumb} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text numberOfLines={1} style={styles.dTitle}>{title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text numberOfLines={expand ? 4 : 1} style={styles.dDesc}>
                  {epLabel} | {title}: a scholarship student by day, masked singer by night. Secrets stack up faster than she can sing them away.
                </Text>
                <Pressable style={styles.more} onPress={() => setExpand(x => !x)}>
                  <Text style={styles.moreTxt}>{expand ? 'Less ^' : 'More v'}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* episode selector pill */}
          <Pressable
            style={styles.epPill}
            onPress={() => setEpPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Choose episode, currently ${epLabel}`}
          >
            <StackIcon size={14} />
            <Text style={styles.epPillTxt}>{epLabel} / EP{episodes}</Text>
            <ChevronDownIcon size={13} color="#fff" />
          </Pressable>

          {/* speed popup */}
          {speedMenu ? (
            <View style={styles.speedMenu}>
              {SPEEDS.map((v, i) => (
                <Pressable key={v} style={styles.speedItem} onPress={() => { setSpeed(i); setSpeedMenu(false); }}>
                  <Text style={[styles.speedItemTxt, i === speed && { color: ACCENT }]}>{v}x</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* utility row */}
          <View style={styles.utilRow}>
            <Pressable
              style={styles.premium}
              onPress={() => toast('Premium is coming soon.', 'info')}
              accessibilityRole="button"
              accessibilityLabel="Premium Pro"
            >
              <CrownIcon size={11} color="#B8860B" />
              <Text style={styles.premiumTxt}>Premium Pro</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.speedWrap} onPress={() => setSpeedMenu(m => !m)}>
              <Text style={[styles.speedTxt, speedMenu && { color: ACCENT }]}>{SPEEDS[speed]}x</Text>
              <DialIcon size={15} color={speedMenu ? ACCENT : '#fff'} />
            </Pressable>
            <View style={styles.qPill}>
              <Text style={styles.qTxt}>HD 480P</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* episode picker — jumps the vertical feed to the chosen episode */}
      <Modal visible={epPicker} transparent animationType="fade" onRequestClose={() => setEpPicker(false)}>
        <Pressable style={styles.epBackdrop} onPress={() => setEpPicker(false)} />
        <View style={[styles.epSheet, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.epSheetTitle}>{title} · {episodes} episodes</Text>
          <FlatList
            data={Array.from({ length: episodes }, (_, i) => i)}
            keyExtractor={(i) => String(i)}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const on = item === active;
              return (
                <Pressable
                  style={[styles.epItem, on && styles.epItemOn]}
                  onPress={() => {
                    setEpPicker(false);
                    setActive(item);
                    try { listRef.current?.scrollToIndex({ index: item, animated: true }); } catch {}
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Episode ${item + 1}${on ? ', playing' : ''}`}
                >
                  <Text style={[styles.epItemTxt, on && { color: ACCENT }]}>EP{pad2(item + 1)}</Text>
                  {on ? <Text style={[styles.epItemTxt, { color: ACCENT }]}>Playing</Text> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      {/* seek line — always tappable, the only way to forward */}
      <View style={[styles.seekZone, { bottom: insets.bottom + 6 }]} {...pan.panHandlers}>
        <View style={[styles.track, scrub && styles.trackScrub]}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        <View style={[styles.handle, { left: `${pct * 100}%` }, scrub && styles.handleScrub]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  epBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  epSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#0B0F24', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  epSheetTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  epItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10,
  },
  epItemOn: { backgroundColor: 'rgba(0,242,254,0.10)' },
  epItemTxt: { color: '#E5E7F0', fontSize: 14, fontWeight: '600' },
  root: { flex: 1, backgroundColor: '#000' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  playBtn: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row' },
  back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 14, paddingLeft: 10 },
  epTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  subWrap: { position: 'absolute', left: 0, right: 0, bottom: '34%', alignItems: 'center' },
  sub: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 4 },
  rightCol: { position: 'absolute', right: 10, bottom: '31%', alignItems: 'center' },
  rBtn: { alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6 },
  rCount: { color: '#fff', fontSize: 10, marginTop: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingTop: 10, paddingHorizontal: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 42, height: 42, borderRadius: 6, backgroundColor: '#222' },
  dTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dDesc: { color: '#B9BFCF', fontSize: 10.5, flex: 1, lineHeight: 14 },
  more: { backgroundColor: '#3A3F4B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  moreTxt: { color: '#E5E8F0', fontSize: 9.5, fontWeight: '600' },
  epPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(51,51,51,0.92)', borderRadius: 15, height: 30,
    paddingHorizontal: 10, marginTop: 10, gap: 6,
  },
  epPillTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  speedMenu: {
    position: 'absolute', right: 104, bottom: 66, width: 84,
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 16, paddingVertical: 4,
  },
  speedItem: { alignItems: 'center', paddingVertical: 7 },
  speedItemTxt: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  utilRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 26 },
  premium: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD700',
    borderRadius: 13, height: 26, paddingHorizontal: 10, gap: 4,
  },
  premiumTxt: { color: '#111', fontSize: 11.5, fontWeight: '800' },
  speedWrap: { flexDirection: 'row', alignItems: 'center', marginRight: 10, gap: 4, paddingVertical: 4, paddingLeft: 4 },
  speedTxt: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  qPill: {
    borderWidth: 1, borderColor: '#6B7180', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  qTxt: { color: '#fff', fontSize: 10.5, fontWeight: '600' },
  seekZone: { position: 'absolute', left: 0, right: 0, height: 16, justifyContent: 'center' },
  track: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 1.5 },
  trackScrub: { height: 5 },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 1.5 },
  handle: {
    position: 'absolute', width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#fff',
    marginLeft: -5, top: 2.5,
  },
  handleScrub: { width: 15, height: 15, borderRadius: 7.5, marginLeft: -7, top: 0.5 },
});
