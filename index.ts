import { registerRootComponent } from 'expo';

import App from './App';
import { Audio } from 'expo-av';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Configure audio mode for recording and playback
(async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: (Audio as any).InterruptionModeIOS?.DoNotMix ?? (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: (Audio as any).InterruptionModeAndroid?.DoNotMix ?? (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    });
  } catch (e) {
    // Non-fatal; permissions may not be granted yet.
    console.warn('Audio mode setup failed', e);
  }
})();
