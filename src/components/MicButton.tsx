import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Audio } from 'expo-av';

type Props = {
  onRecorded: (uri: string, durationSec: number) => void;
  disabled?: boolean;
  maxDurationSec?: number;
};

export function MicButton({ onRecorded, disabled, maxDurationSec = 20 }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [secs, setSecs] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const start = async () => {
    if (disabled || recording) return;
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, shouldDuckAndroid: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
    setSecs(0);
    timerRef.current = setInterval(async () => {
      setSecs((s) => s + 1);
      if (secs + 1 >= maxDurationSec) await stop();
    }, 1000);
  };

  const stop = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI()!;
      const status = await recording.getStatusAsync();
      const dur = Math.max(1, Math.floor(((status as any)?.durationMillis || 0) / 1000));
      setRecording(null);
      if (timerRef.current) clearInterval(timerRef.current);
      onRecorded(uri, dur);
    } catch {
      setRecording(null);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity onPress={recording ? stop : start} disabled={!!disabled} style={{ padding: 12, borderRadius: 24, backgroundColor: disabled ? '#999' : recording ? '#f55' : '#5af' }}>
        <Text style={{ color: '#fff' }}>{recording ? 'Stop' : 'Record'}</Text>
      </TouchableOpacity>
      {!!recording && <Text style={{ marginTop: 4 }}>Recording… {secs}s</Text>}
    </View>
  );
}