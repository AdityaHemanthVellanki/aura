import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { getConnections, Connection, getUserToken } from '../lib/localStore';
import { api } from '../lib/api';

export default function Discover({ navigation }: any) {
  const t = useTheme();
  const [items, setItems] = useState<Connection[]>([]);

  useEffect(() => { (async () => {
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
  })(); }, []);

  const renderItem = ({ item }: { item: Connection }) => (
    <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('ChatThread', { userId: item.id, name: item.name })}>
      {item.avatarUri ? (
        <Image source={{ uri: item.avatarUri }} style={styles.avatarImg} />
      ) : (
        <View style={styles.circle} />
      )}
      <Text style={[styles.tileTitle, { color: t.colors.textPrimary }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}> 
      <Text style={[styles.brand, { color: t.colors.textPrimary }]}>aura</Text>
      <FlatList data={items} keyExtractor={(c) => c.id} renderItem={renderItem} numColumns={2} columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }} contentContainerStyle={{ gap: 12, paddingVertical: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brand: { fontSize: 32, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16 },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ccd', marginBottom: 8 },
  avatarImg: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  tileTitle: { fontSize: 16, fontWeight: '600' },
});
