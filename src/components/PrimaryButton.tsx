import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

type Props = { title: string; onPress: () => void; disabled?: boolean };

export const PrimaryButton: React.FC<Props> = ({ title, onPress, disabled }) => {
  const t = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { backgroundColor: t.colors.black, borderRadius: t.radii.md, paddingVertical: 14 },
        disabled ? { opacity: 0.5 } : null,
      ]}
    >
      <Text style={[styles.text, { color: '#fff', fontFamily: t.typography.font, fontSize: t.typography.label }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});