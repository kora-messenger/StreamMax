import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { categories, heroBanners, rotatingSearch, titles, Title } from '../data/mock';
import { GradientText } from '../components/ui';
import { DownloadIcon, SearchIcon } from '../components/icons';
import { Alert } from 'react-native';
import { getCurrentUser, logout, AuthUser } from '../core/auth/authService';
import BottomNavBar, { BottomTabId } from '../components/BottomNavBar';
import Skeleton from '../components/Skeleton';
import { hasLoaded, markLoaded } from '../core/sessionLoad';
import { useToast } from '../components/ui';
import NetInfo from '@react-native-community/netinfo';
import { colors, gradients } from '../theme/tokens';

const BAR_H = 52;
const TABS_H = 44;

function RotatingPlaceholder() {
  const [i, setI] = useState(0);
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(y, { toValue: -18, duration: 220, useNativeDriver: true }).start(() => {
        setI(p => (p + 1) % rotatingSearch.length);
        y.setValue(18);
        Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(t);
  }, [y]);
  return (
    <View style={{ flex: 1, height: 22, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.Text numberOfLines={1} style={[styles.ph, { transform: [{ translateY: y }] }]}>
        {rotatingSearch[i]}
      </Animated.Text>
    </View>
  );
}

function TitleCard({ item, onPress }: { item: Title; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={item.poster} style={styles.cardImg} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>{item.year} | {item.genre}</Text>
      </View>
      <LinearGradient colors={gradients.brand} style={styles.dl} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <DownloadIcon size={17} />
      </LinearGradient>
    </Pressable>
  );
}

function Section({ heading, data }: { heading: string; data: Title[] }) {
  const nav = useNavigation<any>();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={styles.sectionTitle}>{heading}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={d => d.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <TitleCard item={item} onPress={() => nav.navigate('MovieView', { title: item.title, year: item.year, genre: item.genre, image: item.poster })} />
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  const heroCards: Title[] = heroBanners.map(h => {
    const [genre, year] = h.meta.split(' | ');
    return { id: h.id, title: h.title, year, genre, poster: h.image };
  });
  const nav = useNavigation<any>();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(1);
  /* Football (0) and Nollywood (3) have no titles in the catalogue yet */
  const emptyTab = tab === 0 || tab === 3;
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => !hasLoaded('home'));
  const [online, setOnline] = useState(true);
  useEffect(() => { getCurrentUser().then(setMe); }, []);
  /* network-driven loading — same as Dramas: offline keeps the skeleton up */
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    if (!loading) return;            // already loaded earlier this app run
    if (!online) return;
    const tm = setTimeout(() => { markLoaded('home'); setLoading(false); }, 1200);
    return () => clearTimeout(tm);
  }, [online, loading]);

  const signOut = () => {
    if (!me) return;
    Alert.alert('Sign out', `Sign out of ${me.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); toast('Signed out. See you soon!', 'info'); nav.reset({ index: 0, routes: [{ name: 'Welcome' }] }); } },
    ]);
  };
  const listRef = useRef<FlatList>(null);
  const heroH = width * 1.12;

  const idx = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      idx.current = (idx.current + 1) % heroBanners.length;
      listRef.current?.scrollToOffset({ offset: idx.current * width, animated: true });
    }, 4200);
    return () => clearInterval(t);
  }, [width]);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} stickyHeaderIndices={[]}>
        {loading ? (
          <View>
            <Skeleton style={{ width, height: heroH }} />
            <View style={{ marginTop: 22 }}>
              <Skeleton style={{ width: 140, height: 19, borderRadius: 5, marginLeft: 16, marginBottom: 14 }} />
              <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 16 }}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={styles.card}>
                    <Skeleton style={styles.cardImg} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Skeleton style={{ width: 110, height: 15, borderRadius: 3 }} />
                      <Skeleton style={{ width: 70, height: 12, borderRadius: 3, marginTop: 7 }} />
                    </View>
                    <Skeleton style={styles.dl} />
                  </View>
                ))}
              </View>
            </View>
            {[0, 1].map(sec => (
              <View key={sec} style={{ marginTop: 22 }}>
                <Skeleton style={{ width: 140, height: 19, borderRadius: 5, marginLeft: 16, marginBottom: 14 }} />
                <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 16 }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={styles.card}>
                      <Skeleton style={styles.cardImg} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Skeleton style={{ width: 96, height: 14, borderRadius: 3 }} />
                        <Skeleton style={{ width: 64, height: 12, borderRadius: 3, marginTop: 7 }} />
                      </View>
                      <Skeleton style={styles.dl} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
        <>
        {/* Hero banner sits behind the bar + tabs */}
        <View style={{ height: heroH }}>
          <FlatList
            ref={listRef}
            data={heroBanners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={h => h.id}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <Pressable style={{ width, height: heroH }} onPress={() => nav.navigate('MovieView', { title: item.title, year: item.meta.split(' | ')[1], genre: item.meta.split(' | ')[0], image: item.image })}>
                <Image source={item.image} style={{ width, height: heroH }} resizeMode="cover" />
              </Pressable>
            )}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(5,5,7,0.85)', 'rgba(5,5,7,0)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + BAR_H + TABS_H + 30 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(5,5,7,0)', 'rgba(5,5,7,0.7)', colors.bg]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: heroH * 0.42 }}
          />
        </View>

        <View style={{ marginTop: -50 }}>
          <View style={{ marginTop: 0 }}>
            <FlatList
              horizontal
              data={heroCards}
              keyExtractor={d => d.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <TitleCard item={item} onPress={() => nav.navigate('MovieView', { title: item.title, year: item.year, genre: item.genre, image: item.poster })} />
              )}
            />
          </View>
          {emptyTab ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabTitle}>Nothing in {categories[tab]} yet</Text>
              <Text style={styles.emptyTabSub}>
                {categories[tab] === 'Football'
                  ? 'Live football isn’t part of StreamMax yet. Switch to Trending to keep browsing.'
                  : 'No Nollywood titles have been added yet. Switch to Trending to keep browsing.'}
              </Text>
            </View>
          ) : (
            <>
              <Section heading={tab === 2 ? 'Movies' : 'Trending Now'} data={tab === 2 ? titles : titles.slice(0, 8)} />
              <Section heading="Popular Movies" data={titles.slice(4, 12)} />
              <Section heading="New Releases" data={[...titles].reverse().slice(0, 8)} />
            </>
          )}
        </View>
        </>
        )}
      </ScrollView>

      {/* floating round bottom button bar */}
      <BottomNavBar
        active="home"
        onPress={(id: BottomTabId) => { if (id === 'search') nav.navigate('Dramas'); if (id === 'downloads') nav.navigate('Downloads'); if (id === 'mine') nav.navigate('Me'); }}
      />

      {/* Fixed top bar + tabs (overlay) */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.bar}>
          <Image source={require('../assets/img/logo_soft.png')} style={styles.logo} resizeMode="contain" />
          <Pressable style={styles.pill} onPress={() => nav.navigate('Search')}>
            <SearchIcon size={19} color="#a9adc2" />
            <View style={{ width: 10 }} />
            <RotatingPlaceholder />
            <View style={styles.searchWord}>
              <GradientText text="Search" size={15} width={52} height={20} weight="700" colorsArr={gradients.brand} />
            </View>
          </Pressable>
          {/* Account avatar: tap to sign out */}
          <Pressable onPress={signOut} style={styles.avatarBtn}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{(me?.fullName || '?')[0].toUpperCase()}</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {categories.map((c, i) => (
            <Pressable key={c} onPress={() => setTab(i)} style={{ marginRight: 26 }}>
              <Text style={[styles.tab, i === tab ? styles.tabOn : null]}>{c}</Text>
              {i === tab ? (
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabLine} />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyTab: { marginTop: 34, paddingHorizontal: 24, alignItems: 'center' },
  emptyTabTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyTabSub: { color: '#9CA3AF', fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  root: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: { height: BAR_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  logo: { width: 40, height: 40, marginRight: 10 },
  pill: {
    flex: 1, height: 40, borderRadius: 20, backgroundColor: 'rgba(40,42,52,0.88)',
    flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4, marginRight: 12,
  },
  ph: { color: '#c7cadb', fontSize: 14.5 },
  searchWord: { paddingLeft: 12, paddingRight: 6 },
  tabs: { paddingHorizontal: 16, height: TABS_H, alignItems: 'center' },
  tab: { color: '#a9adc2', fontSize: 17, fontWeight: '500', paddingVertical: 6 },
  tabOn: { color: '#fff', fontWeight: '800' },
  tabLine: { height: 3, borderRadius: 2, marginTop: -1 },
  sectionTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginLeft: 16, marginBottom: 12 },
  card: {
    width: 232, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 14, padding: 10,
  },
  cardImg: { width: 58, height: 84, borderRadius: 8 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardMeta: { color: '#9a9db0', fontSize: 12.5, marginTop: 4 },
  dl: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
