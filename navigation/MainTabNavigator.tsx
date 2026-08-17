import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/main/DashboardScreen';
import EntrenamientoStackNavigator from './EntrenamientoStackNavigator';
import EjerciciosStackNavigator from './EjerciciosStackNavigator';
import PerfilStackNavigator from './PerfilStackNavigator';
import { colors, fontFamily } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home',
  Entrenamiento: 'barbell',
  Ejercicios: 'list',
  Perfil: 'person',
};

const ICONS_OUTLINE: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home-outline',
  Entrenamiento: 'barbell-outline',
  Ejercicios: 'list-outline',
  Perfil: 'person-outline',
};

// Tab bar inferior estilo iOS nativo: 4 tabs, activo en naranja, inactivo en gris.
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name as keyof MainTabParamList] : ICONS_OUTLINE[route.name as keyof MainTabParamList]}
            size={size ?? 22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Entrenamiento" component={EntrenamientoStackNavigator} />
      <Tab.Screen name="Ejercicios" component={EjerciciosStackNavigator} />
      <Tab.Screen name="Perfil" component={PerfilStackNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
});
