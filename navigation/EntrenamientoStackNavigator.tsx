import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EntrenamientoScreen from '../screens/main/EntrenamientoScreen';
import CrearRutinaScreen from '../screens/routines/CrearRutinaScreen';
import ActiveWorkoutScreen from '../screens/workout/ActiveWorkoutScreen';
import PostWorkoutScreen from '../screens/workout/PostWorkoutScreen';
import type { EntrenamientoStackParamList } from './types';

const Stack = createNativeStackNavigator<EntrenamientoStackParamList>();

// Stack anidado del tab "Entrenamiento": pantalla raíz, Crear Rutina y la
// sesión de Entrenamiento Activo + su resumen. headerShown:false porque cada
// pantalla arma su propio header (ScreenHeader).
export default function EntrenamientoStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EntrenamientoHome" component={EntrenamientoScreen} />
      <Stack.Screen name="CrearRutina" component={CrearRutinaScreen} />
      {/* gestureEnabled:false: no se puede abandonar el entrenamiento con el swipe-back,
          solo con la flecha del header (que confirma antes de cancelar). */}
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="PostWorkout" component={PostWorkoutScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
