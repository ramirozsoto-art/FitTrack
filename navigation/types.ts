// Tipos de parámetros de cada stack/tab, para navegación tipada con TypeScript.
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Entrenamiento: NavigatorScreenParams<EntrenamientoStackParamList>;
  Ejercicios: undefined;
  Perfil: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>;

// Stack anidado dentro del tab "Entrenamiento", para poder navegar a
// Crear Rutina y al Entrenamiento Activo con flecha atrás.
export type EntrenamientoStackParamList = {
  EntrenamientoHome: undefined;
  CrearRutina: undefined;
  ActiveWorkout: { routineId: string | null };
  PostWorkout: {
    workoutId: string;
    durationSeconds: number;
    totalVolumeKg: number;
    exerciseCount: number;
    completedSetCount: number;
  };
};
