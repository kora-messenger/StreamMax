import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BottomNavBar, { BottomTabId } from '../components/BottomNavBar';
import { DownloadTrayIcon } from '../components/icons';

/**
 * Downloads — honest empty state.
 *
 * The Downloads tab used to do nothing at all (no screen existed), so the
 * button in the bottom bar was dead. Offline downloads are not implemented
 * yet, so this screen says exactly that instead of inventing a list of files.
 * When downloads ship, this is the screen that will list them.
 */
export default function DownloadsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { marginTop: insets.top + 18 }]}>Downloads</Text>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <DownloadTrayIcon size={44} />
        </View>
        <Text style={styles.empty}>No downloads yet</Text>
        <Text style={styles.emptySub}>
          Downloaded episodes will appear here so you can watch offline.{'\n'}
          Downloads are not available yet.
        </Text>
        <Pressable
          onPress={() => nav.navigate('Home')}
          accessibilityRole="button"
          accessibilityLabel="Browse dramas"
          style={({ pressed }) => [styles.browse, { width: Math.min(W - 48, 320) }, pressed && { opacity: 0.75 }]}
        >
          <Text style={styles.browseTxt}>Browse dramas</Text>
        </Pressable>
      </View>

      <BottomNavBar
        active="downloads"
        downloadsCount={0}
        onPress={(id: BottomTabId) => {
          if (id === 'home') nav.navigate('Home');
          if (id === 'search') nav.navigate('Dramas');
          if (id === 'mine') nav.navigate('Me');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05060D' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(108,99,255,0.10)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.35)',
  },
  empty: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20 },
  emptySub: { color: '#9CA3AF', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  browse: {
    marginTop: 22, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  browseTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
