import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EjerciciosScreen from '../screens/main/EjerciciosScreen';
import ExerciseDetailScreen from '../screens/exercises/ExerciseDetailScreen';
import CrearEjercicioScreen from '../screens/exercises/CrearEjercicioScreen';
import type { EjerciciosStackParamList } from './types';

const Stack = createNativeStackNavigator<EjerciciosStackParamList>();

// Stack anidado del tab "Ejercicios": la biblioteca, el detalle de un
// ejercicio y el formulario para crear uno propio. headerShown:false porque
// cada pantalla arma su propio header.
export default function EjerciciosStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EjerciciosHome" component={EjerciciosScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="CrearEjercicio" component={CrearEjercicioScreen} />
    </Stack.Navigator>
  );
}
