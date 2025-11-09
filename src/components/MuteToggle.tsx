import React, { createContext, useContext, useEffect, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeProvider';
import { getMute, setMute } from '../lib/localStore';

type Ctx = { muted: boolean; setMuted: (m: boolean) => void };
const MuteCtx = createContext<Ctx>({ muted: false, setMuted: () => {} });
export const useMute = () => useContext(MuteCtx);

export const MuteProvider = ({ children }: { children: React.ReactNode }) => {
  const [muted, setMutedState] = useState(false);
  useEffect(() => { (async () => { setMutedState(await getMute()); })(); }, []);
  const setMuted = async (m: boolean) => { setMutedState(m); await setMute(m); };
  return <MuteCtx.Provider value={{ muted, setMuted }}>{children}</MuteCtx.Provider>;
};

export const MuteToggle: React.FC<{ accessibilityLabel?: string }> = ({ accessibilityLabel = 'Toggle mute' }) => {
  const t = useTheme();
  const { muted, setMuted } = useMute();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={async () => { await Haptics.selectionAsync(); setMuted(!muted); }}
      style={[styles.btn]}
    >
      <View style={[styles.dot, { backgroundColor: muted ? '#999' : t.colors.black }]} />
      <Text style={{ color: t.colors.textSecondary, marginLeft: 8 }}>{muted ? 'Muted' : 'Unmuted'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
