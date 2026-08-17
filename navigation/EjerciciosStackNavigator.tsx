import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EjerciciosScreen from '../screens/main/EjerciciosScreen';
import ExerciseDetailScreen from '../screens/exercises/ExerciseDetailScreen';
import type { EjerciciosStackParamList } from './types';

const Stack = createNativeStackNavigator<EjerciciosStackParamList>();

// Stack anidado del tab "Ejercicios": la biblioteca y el detalle de un
// ejercicio. headerShown:false porque cada pantalla arma su propio header.
export default function EjerciciosStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EjerciciosHome" component={EjerciciosScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
    </Stack.Navigator>
  );
}
