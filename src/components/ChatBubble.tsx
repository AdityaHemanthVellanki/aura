import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

type Props = { role: 'aura' | 'user'; text: string };

export const ChatBubble: React.FC<Props> = ({ role, text }) => {
  const t = useTheme();
  const isAura = role === 'aura';
  return (
    <View
      style={[
        styles.bubble,
        isAura ? { alignSelf: 'flex-start', backgroundColor: '#f2f2f2' } : { alignSelf: 'flex-end', backgroundColor: '#e8f4ff' },
      ]}
    >
      <Text style={[styles.text, { color: t.colors.textPrimary }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 12, marginVertical: 6, maxWidth: '80%' },
  text: { fontSize: 16 },
});

