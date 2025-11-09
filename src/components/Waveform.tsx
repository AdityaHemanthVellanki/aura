import React from 'react';
import { View } from 'react-native';

export function Waveform({ active }: { active: boolean }) {
  return (
    <View style={{ height: 24, width: '100%', backgroundColor: active ? '#9cf' : '#ddd', borderRadius: 4 }} />
  );
}