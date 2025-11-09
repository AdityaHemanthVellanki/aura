import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { AutoRecorder } from './AutoRecorder';

type Props = {
  visible: boolean;
  onClose: () => void;
  muted?: boolean;
  onRecorded: (uri: string | null, durationSec: number) => void;
};

export const ConsentModal: React.FC<Props> = ({ visible, onClose, muted = false, onRecorded }) => {
  const t = useTheme();
  const [manualRecordingActive, setManualRecordingActive] = useState(false);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: t.colors.background }]}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Voice Consent</Text>
          <Text style={{ color: t.colors.textSecondary, marginTop: 8 }}>
            Please say: “I consent to Aura creating a digital version of my voice.”
          </Text>
          <View style={{ marginTop: 16 }}>
            {!muted ? (
              <AutoRecorder active={true} maxDurationSec={10} onRecorded={onRecorded} muted={muted} />
            ) : (
              <>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Record your consent" onPress={() => setManualRecordingActive(true)} style={{ marginTop: 8 }}>
                  <Text style={{ color: t.colors.black, fontWeight: '700' }}>Record</Text>
                </TouchableOpacity>
                {manualRecordingActive && (
                  <AutoRecorder active={true} maxDurationSec={10} onRecorded={(uri, dur) => { setManualRecordingActive(false); onRecorded(uri, dur); }} muted={muted} />
                )}
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
              <Text style={{ color: t.colors.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '88%', borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
});

