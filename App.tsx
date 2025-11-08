import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Onboarding from './Onboarding';
import RecordVoice from './RecordVoice';
import Chat from './Chat';
import Welcome from './src/screens/Welcome';
import AuraOnboarding from './src/screens/AuraOnboarding';
import AuraOnboardingVoice from './src/screens/AuraOnboardingVoice';
import TalkToAura from './src/screens/TalkToAura';
import { AuraThemeProvider } from './src/components/ThemeProvider';
import { auth } from './src/lib/firebaseClient';
import { signInAnonymously } from 'firebase/auth';
import { useEffect } from 'react';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Ensure Firebase Auth is initialized and sign in anonymously for Storage access
    if (auth) {
      signInAnonymously(auth).catch(() => {
        // ignore errors (e.g., already signed in)
      });
    } else {
      console.warn('Firebase auth unavailable. Skipping anonymous sign-in.');
    }
  }, []);
  return (
    <AuraThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="AuraOnboardingVoice" component={AuraOnboardingVoice} />
          <Stack.Screen name="AuraOnboarding" component={AuraOnboarding} />
          <Stack.Screen name="TalkToAura" component={TalkToAura} />
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen name="RecordVoice" component={RecordVoice} />
          <Stack.Screen name="Chat" component={Chat} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuraThemeProvider>
  );
}
