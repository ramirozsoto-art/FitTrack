import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingScreen from '../screens/LoadingScreen';
import MetabolismoScreen from '../screens/onboarding/MetabolismoScreen';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

// Decide qué mostrar según el estado de sesión/perfil:
// sin sesión -> Auth | sesión sin onboarding -> Metabolismo | completo -> Tabs.
export default function RootNavigator() {
  const { session, loading, profileLoading, isOnboardingComplete } = useAuth();
  const { scheme, colors } = useTheme();

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

  // Base de React Navigation (Default/Dark) con nuestros colores pisados encima,
  // para que el fondo entre pantallas durante una transición sea el nuestro y
  // no el gris/blanco por defecto de la librería.
  const navigationTheme: NavigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  return <NavigationContainer theme={navigationTheme}>{content}</NavigationContainer>;
}
