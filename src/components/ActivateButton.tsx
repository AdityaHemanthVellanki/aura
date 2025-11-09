import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import * as Haptics from 'expo-haptics';

type Props = { title?: string; onPress: () => void };

export const ActivateButton: React.FC<Props> = ({ title = 'Activate Aura', onPress }) => {
  const t = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={async () => { await Haptics.selectionAsync(); onPress(); }}
      style={[styles.btn, { backgroundColor: t.colors.black }]}
    >
      <Text style={[styles.text, { color: t.colors.background }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  text: { fontSize: 16, fontWeight: '700' },
});
