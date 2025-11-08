import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Switch, TextInput } from 'react-native';
import { useTheme } from './ThemeProvider';
import { MicRecordButton } from './MicRecordButton';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (evidenceTranscript: string, recordedUri?: string) => void;
};

export const ConsentModal: React.FC<Props> = ({ visible, onClose, onConfirm }) => {
  const t = useTheme();
  const [checked, setChecked] = useState(false);
  const [phraseUri, setPhraseUri] = useState<string | undefined>(undefined);
  const [evidenceText, setEvidenceText] = useState(
    'I consent to Aura creating a digital version of my voice'
  );

  const confirm = () => {
    if (!checked) return;
    onConfirm(evidenceText, phraseUri);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: t.colors.background }]}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Voice Cloning Consent</Text>
          <Text style={[styles.text, { color: t.colors.textSecondary }]}>I consent to Aura creating a synthetic voice using my recorded audio. I confirm these recordings are my voice and I give permission for the app to create a voice clone. I understand I can delete my data and voice clone at any time.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
            <Switch value={checked} onValueChange={setChecked} />
            <Text style={{ marginLeft: 8 }}>I agree</Text>
          </View>
          <Text style={[styles.text, { color: t.colors.textSecondary, marginTop: 8 }]}>Authorization phrase</Text>
          <MicRecordButton onRecorded={(uri) => setPhraseUri(uri)} />
          <Text style={[styles.text, { color: t.colors.textSecondary, marginTop: 12 }]}>Transcript (optional)</Text>
          <TextInput
            value={evidenceText}
            onChangeText={setEvidenceText}
            style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 8, padding: 8, marginTop: 6 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <PrimaryButton title="Cancel" onPress={onClose} />
            <PrimaryButton title="Confirm" onPress={confirm} disabled={!checked} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', borderRadius: 16, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  text: { fontSize: 14 },
});

