import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/main/DashboardScreen';
import EntrenamientoScreen from '../screens/main/EntrenamientoScreen';
import EjerciciosScreen from '../screens/main/EjerciciosScreen';
import PerfilScreen from '../screens/main/PerfilScreen';
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
      <Tab.Screen name="Entrenamiento" component={EntrenamientoScreen} />
      <Tab.Screen name="Ejercicios" component={EjerciciosScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
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
