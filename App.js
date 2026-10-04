import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, useWindowDimensions,
  SafeAreaView, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

const C = { bg: '#14130f', paper: '#f3efe6', ink: '#1b1a17', accent: '#c0392b', dim: '#8a857a' };

/* ---------- 本棚 ---------- */
function Library({ books, onOpen, onImport }) {
  return (
    <SafeAreaView style={s.screen}>
      <Text style={s.logo}>SideBooks</Text>
      {books.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>漫画の画像を選んで読み始めよう</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          numColumns={2}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onOpen(item)}>
              <Image source={{ uri: item.pages[0] }} style={s.cover} contentFit="cover" />
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.cardSub}>{item.pages.length}ページ</Text>
            </Pressable>
          )}
        />
      )}
      <Pressable style={s.fab} onPress={onImport}>
        <Text style={s.fabText}>＋ 本を追加</Text>
      </Pressable>
    </SafeAreaView>
  );
}

/* ---------- リーダー(右開き) ---------- */
function Reader({ book, onClose }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [rtl, setRtl] = useState(true); // true: 右開き
  const [ui, setUi] = useState(true);
  const listRef = useRef(null);
  const total = book.pages.length;

  const go = useCallback((i) => {
    const n = Math.max(0, Math.min(total - 1, i));
    listRef.current?.scrollToIndex({ index: n, animated: true });
  }, [total]);

  const onScrollEnd = (e) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  // 画面タップ: 端=ページ送り / 中央=メニュー表示切替
  const onTap = (evt) => {
    const x = evt.nativeEvent.locationX;
    if (x < width * 0.3) go(rtl ? index + 1 : index - 1);       // 左端
    else if (x > width * 0.7) go(rtl ? index - 1 : index + 1);  // 右端
    else setUi((v) => !v);
  };

  return (
    <View style={[s.screen, { backgroundColor: '#000' }]}>
      {/* inverted にすると index 0 が右側に来る = 右開き */}
      <FlatList
        key={rtl ? 'rtl' : 'ltr'}
        ref={listRef}
        data={book.pages}
        horizontal
        inverted={rtl}
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <Pressable onPress={onTap} style={{ width, height }}>
            <Image source={{ uri: item }} style={{ width, height }} contentFit="contain" />
          </Pressable>
        )}
      />

      {ui && (
        <>
          <View style={s.topBar}>
            <Pressable onPress={onClose}><Text style={s.barBtn}>‹ 本棚</Text></Pressable>
            <Text style={s.barTitle} numberOfLines={1}>{book.title}</Text>
            <Pressable onPress={() => setRtl((v) => !v)}>
              <Text style={s.barBtn}>{rtl ? '右開き' : '左開き'}</Text>
            </Pressable>
          </View>
          <View style={s.bottomBar}>
            <Text style={s.barBtn}>{index + 1} / {total}</Text>
          </View>
        </>
      )}
    </View>
  );
}

/* ---------- ルート ---------- */
export default function App() {
  const [books, setBooks] = useState([]);
  const [current, setCurrent] = useState(null);

  const importBook = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('写真へのアクセスを許可してください');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      quality: 1,
    });
    if (res.canceled) return;
    // ファイル名順に並べる(page_001, page_002 …)
    const assets = [...res.assets].sort((a, b) =>
      (a.fileName || a.uri).localeCompare(b.fileName || b.uri, undefined, { numeric: true }));
    setBooks((prev) => [
      ...prev,
      { id: String(Date.now()), title: `新しい本 ${prev.length + 1}`, pages: assets.map((a) => a.uri) },
    ]);
  };

  return (
    <>
      <StatusBar style="light" />
      {current
        ? <Reader book={current} onClose={() => setCurrent(null)} />
        : <Library books={books} onOpen={setCurrent} onImport={importBook} />}
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  logo: { color: C.paper, fontSize: 28, fontWeight: '800', padding: 16, letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.dim, fontSize: 15 },
  card: { flex: 1, margin: 6, maxWidth: '48%' },
  cover: { width: '100%', aspectRatio: 0.7, backgroundColor: '#222', borderRadius: 4 },
  cardTitle: { color: C.paper, marginTop: 6, fontWeight: '600' },
  cardSub: { color: C.dim, fontSize: 12 },
  fab: { position: 'absolute', right: 20, bottom: 36, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28 },
  fabText: { color: '#fff', fontWeight: '700' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 54, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 34, paddingTop: 12, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center' },
  barBtn: { color: '#fff', fontSize: 15, fontWeight: '600' },
  barTitle: { color: C.dim, flex: 1, textAlign: 'center', marginHorizontal: 12 },
});
