import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EntrenamientoScreen from '../screens/main/EntrenamientoScreen';
import CrearRutinaScreen from '../screens/routines/CrearRutinaScreen';
import type { EntrenamientoStackParamList } from './types';

const Stack = createNativeStackNavigator<EntrenamientoStackParamList>();

// Stack anidado del tab "Entrenamiento": la pantalla raíz y Crear Rutina.
// headerShown:false porque cada pantalla arma su propio header (ScreenHeader).
export default function EntrenamientoStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntrenamientoHome" component={EntrenamientoScreen} />
      <Stack.Screen name="CrearRutina" component={CrearRutinaScreen} />
    </Stack.Navigator>
  );
}
