import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = { visible: boolean; onClose: () => void; onSubmit: (query: string) => void };

export const RequestModal: React.FC<Props> = ({ visible, onClose, onSubmit }) => {
  const [q, setQ] = useState('');
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Request Connection</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="@username or aura123" style={styles.input} />
          <View style={{ flexDirection:'row', gap: 8 }}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => { onSubmit(q.trim()); setQ(''); onClose(); }}><Text style={styles.btnPrimaryText}>Send Request</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnLight} onPress={onClose}><Text style={styles.btnLightText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '86%', backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#F6F7F9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  btnPrimary: { backgroundColor: '#777', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnLight: { backgroundColor: '#eee', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 },
  btnLightText: { color: '#333', fontWeight: '600' },
});

