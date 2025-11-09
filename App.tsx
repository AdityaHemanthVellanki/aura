import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Onboarding from './Onboarding';
import RecordVoice from './RecordVoice';
import Chat from './Chat';
import Welcome from './src/screens/Welcome';
import AddPhoto from './src/screens/AddPhoto';
import AuraOnboarding from './src/screens/AuraOnboarding';
import AuraOnboardingVoice from './src/screens/AuraOnboardingVoice';
import TalkToAura from './src/screens/TalkToAura';
import { AuraThemeProvider } from './src/components/ThemeProvider';
import { auth } from './src/lib/firebaseClient';
import { signInAnonymously } from 'firebase/auth';
import { useEffect } from 'react';
import Profile from './src/screens/Profile';
import Connections from './src/screens/Connections';
import ChatThread from './src/screens/ChatThread';
import Discover from './src/screens/Discover';
import EditPersonality from './src/screens/EditPersonality';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Profile" component={Profile} />
      <Tabs.Screen name="Connections" component={Connections} />
      <Tabs.Screen name="Discover" component={Discover} />
    </Tabs.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Ensure Firebase Auth is initialized and sign in anonymously for Storage access
    if (auth) {
      signInAnonymously(auth).catch(() => {
        // ignore errors (e.g., already signed in)
      });
    }
  }, []);
  return (
    <AuraThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="AddPhoto" component={AddPhoto} />
          <Stack.Screen name="AuraOnboardingVoice" component={AuraOnboardingVoice} />
          <Stack.Screen name="AuraOnboarding" component={AuraOnboarding} />
          <Stack.Screen name="TalkToAura" component={TalkToAura} />
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen name="RecordVoice" component={RecordVoice} />
          <Stack.Screen name="Chat" component={Chat} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ChatThread" component={ChatThread} />
          <Stack.Screen name="EditPersonality" component={EditPersonality} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuraThemeProvider>
  );
}
