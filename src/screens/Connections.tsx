import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { getConnections, Connection, addConnection, getUserToken } from '../lib/localStore';
import { api } from '../lib/api';
import { RequestModal } from '../components/RequestModal';

export default function Connections({ navigation }: any) {
  const t = useTheme();
  const [items, setItems] = useState<Connection[]>([]);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = await getUserToken();
      try {
        if (uid) {
          const res = await api.post('/api/connections/list', { userId: uid });
          const serverItems = (res?.data?.connections || []) as any[];
          if (serverItems.length) {
            setItems(serverItems.map((s) => ({ id: s.connection_id || s.id, name: s.name, tags: s.tags })));
            return;
          }
        }
      } catch {}
      setItems(await getConnections());
    })();
  }, []);

  const renderItem = ({ item }: { item: Connection }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ChatThread', { userId: item.id, name: item.name })}>
      {item.avatarUri ? (
        <Image source={{ uri: item.avatarUri }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarCircle} />
      )}
      <Text style={[styles.cardTitle, { color: t.colors.textPrimary }]}>{item.name}</Text>
      <View style={styles.tagRow}>{(item.tags || []).slice(0,3).map((tag) => (<View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>))}</View>
    </TouchableOpacity>
  );

  const sendRequest = async (query: string) => {
    if (!query) return;
    const id = query.replace(/^@/, '') || `user-${Math.random().toString(36).slice(2)}`;
    const uid = await getUserToken();
    try {
      if (uid) {
        const res = await api.post('/api/connections/request', { userId: uid, name: id, connectionId: null, tags: ['requested'] });
        if (res?.data?.ok) {
          const next = await api.post('/api/connections/list', { userId: uid }).then((r) => (r?.data?.connections || []) as any[]);
          setItems(next.map((s) => ({ id: s.connection_id || s.id, name: s.name, tags: s.tags })));
          return;
        }
      }
    } catch {}
    const nextLocal = await addConnection({ id, name: id, tags: ['requested'] });
    setItems(nextLocal);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}> 
      <Text style={[styles.brand, { color: t.colors.textPrimary }]}>aura</Text>
      <Text style={[styles.subtitle, { color: t.colors.textMuted }]}>your connections</Text>
      <FlatList data={items} keyExtractor={(c) => c.id} renderItem={renderItem} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} />
      <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}><Text style={styles.addText}>+ Add</Text></TouchableOpacity>
      <RequestModal visible={modal} onClose={() => setModal(false)} onSubmit={sendRequest} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brand: { fontSize: 32, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16 },
  subtitle: { fontSize: 14, paddingHorizontal: 16, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 1 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ccd', marginBottom: 8 },
  avatarImg: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: '#eef', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { color: '#333' },
  addBtn: { position: 'absolute', right: 16, top: 12, backgroundColor: '#000', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  addText: { color: '#fff', fontWeight: '600' },
});
