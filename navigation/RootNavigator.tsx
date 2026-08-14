import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';
import MetabolismoScreen from '../screens/onboarding/MetabolismoScreen';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

// Decide qué mostrar según el estado de sesión/perfil:
// sin sesión -> Auth | sesión sin onboarding -> Metabolismo | completo -> Tabs.
export default function RootNavigator() {
  const { session, loading, profileLoading, isOnboardingComplete } = useAuth();

  if (loading) return <LoadingScreen />;

  let content;
  if (!session) {
    content = <AuthNavigator />;
  } else if (profileLoading) {
    content = <LoadingScreen />;
  } else if (!isOnboardingComplete) {
    content = <MetabolismoScreen />;
  } else {
    content = <MainTabNavigator />;
  }

  return <NavigationContainer>{content}</NavigationContainer>;
}
