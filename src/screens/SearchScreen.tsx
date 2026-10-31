import React, { useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomNavBar, { BottomTabId } from '../components/BottomNavBar';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../components/ui';
import {
  communities, recentSearches, searchTabs, titles, trendingSearches,
} from '../data/mock';
import { BackIcon, FlameIcon, MicIcon, TrashIcon } from '../components/icons';
import { colors, gradients } from '../theme/tokens';

const Chip = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </Pressable>
);

export default function SearchScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState(recentSearches);
  const [tab, setTab] = useState(0);

  const filtered = q.trim()
    ? titles.filter(t => t.title.toLowerCase().includes(q.trim().toLowerCase()))
    : titles;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => nav.goBack()} style={{ marginRight: 8 }}>
          <BackIcon size={28} />
        </Pressable>
        <View style={styles.field}>
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Search movies, series..."
            placeholderTextColor="#7b7f96"
            style={styles.input}
            selectionColor={colors.secondary}
            returnKeyType="search"
          />
          <Pressable>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Search</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <Pressable style={{ marginLeft: 12 }}><MicIcon size={26} /></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        {recent.length > 0 && !q ? (
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>Recent</Text>
              <Pressable style={styles.clear} onPress={() => setRecent([])}>
                <TrashIcon size={17} />
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {recent.map(r => <Chip key={r} label={r} onPress={() => setQ(r)} />)}
            </View>
          </View>
        ) : null}

        {!q ? (
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <FlameIcon size={20} />
              <Text style={[styles.blockTitle, { marginLeft: 6 }]}>Everyone is searching</Text>
            </View>
            <View style={styles.chips}>
              {trendingSearches.map(t => <Chip key={t} label={t} onPress={() => setQ(t)} />)}
            </View>
          </View>
        ) : null}

        <View style={styles.tabsRow}>
          {searchTabs.map((t, i) => (
            <Pressable key={t} onPress={() => setTab(i)} style={styles.tabWrap}>
              <Text style={[styles.tab, i === tab ? styles.tabOn : null]}>{t}</Text>
              {i === tab ? <View style={styles.tabLine} /> : <View style={[styles.tabLine, { backgroundColor: 'transparent' }]} />}
            </Pressable>
          ))}
        </View>

        {tab === 4 ? (
          <View style={{ paddingHorizontal: 16 }}>
            {communities.map(c => (
              <Pressable
                key={c.id}
                style={styles.commRow}
                onPress={() => toast('Community spaces are coming soon', 'info')}
                accessibilityRole="button"
                accessibilityLabel={`${c.name} community`}
              >
                <LinearGradient colors={gradients.brand} style={styles.commAvatar}>
                  <Text style={styles.commInitial}>{c.name[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowMeta}>{c.members}</Text>
                  <Text style={styles.rowTag}>{c.tags}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : tab !== 0 ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
            <Text style={styles.emptyNote}>
              No {searchTabs[tab].toLowerCase()} in the catalogue yet.{'\n'}Switch to Movie to keep searching.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {filtered.length === 0 ? <Text style={styles.empty}>No results found</Text> : null}
            {filtered.map((t, i) => (
              <Pressable
                key={t.id}
                style={styles.row}
                onPress={() => nav.navigate('MovieView', { title: t.title, year: t.year, genre: t.genre, image: t.poster })}
                accessibilityRole="button"
                accessibilityLabel={`Open ${t.title}`}
              >
                <View style={[styles.rank, i < 3 ? styles.rankTop : null]}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Image source={t.poster} style={styles.rowImg} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text numberOfLines={1} style={styles.rowTitle}>{t.title}</Text>
                  <Text style={styles.rowMeta}>{t.year} | {t.genre}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNavBar
        active="search"
        onPress={(id: BottomTabId) => { if (id === 'home') nav.goBack(); if (id === 'search') nav.navigate('Dramas'); if (id === 'downloads') nav.navigate('Downloads'); if (id === 'mine') nav.navigate('Me'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyNote: { color: '#9CA3AF', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 54 },
  field: {
    flex: 1, height: 42, borderRadius: 21, backgroundColor: '#1b1d27', flexDirection: 'row',
    alignItems: 'center', paddingLeft: 16, paddingRight: 5,
  },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 0, height: 42 },
  searchBtn: { height: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  block: { paddingHorizontal: 16, marginTop: 18 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  blockTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  clear: { flexDirection: 'row', alignItems: 'center' },
  clearText: { color: '#9a9db0', fontSize: 14, marginLeft: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#1b1d27', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9 },
  chipText: { color: '#dfe1ee', fontSize: 14 },
  tabsRow: { flexDirection: 'row', marginTop: 24, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#171a26' },
  tabWrap: { paddingHorizontal: 10, alignItems: 'center' },
  tab: { color: '#8a8fa8', fontSize: 16, fontWeight: '600', paddingVertical: 10 },
  tabOn: { color: '#fff', fontWeight: '800' },
  tabLine: { height: 3, width: 26, borderRadius: 2, backgroundColor: '#fff', marginBottom: -1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rank: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#1b1d27', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankTop: { backgroundColor: '#6C63FF' },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  rowImg: { width: 62, height: 90, borderRadius: 8 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowMeta: { color: '#9a9db0', fontSize: 13, marginTop: 4 },
  rowTag: { color: '#00D2FF', fontSize: 12.5, marginTop: 4 },
  commRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  commAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  commInitial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  empty: { color: '#8a8fa8', textAlign: 'center', marginTop: 30 },
});
