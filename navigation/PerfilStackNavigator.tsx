import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PerfilScreen from '../screens/main/PerfilScreen';
import EditarPerfilScreen from '../screens/profile/EditarPerfilScreen';
import HistorialScreen from '../screens/profile/HistorialScreen';
import HistorialDetailScreen from '../screens/profile/HistorialDetailScreen';
import EstadisticasScreen from '../screens/profile/EstadisticasScreen';
import type { PerfilStackParamList } from './types';

const Stack = createNativeStackNavigator<PerfilStackParamList>();

// Stack anidado del tab "Perfil": datos + edición, historial de
// entrenamientos y estadísticas. headerShown:false porque cada pantalla
// arma su propio header (o su propio título, como la pantalla raíz).
export default function PerfilStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilHome" component={PerfilScreen} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
      <Stack.Screen name="Historial" component={HistorialScreen} />
      <Stack.Screen name="HistorialDetail" component={HistorialDetailScreen} />
      <Stack.Screen name="Estadisticas" component={EstadisticasScreen} />
    </Stack.Navigator>
  );
}
