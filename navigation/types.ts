// Tipos de parámetros de cada stack/tab, para navegación tipada con TypeScript.
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Exercise } from '../types/database';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Entrenamiento: NavigatorScreenParams<EntrenamientoStackParamList>;
  Ejercicios: NavigatorScreenParams<EjerciciosStackParamList>;
  Perfil: NavigatorScreenParams<PerfilStackParamList>;
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

// Stack anidado dentro del tab "Ejercicios" (Fase 4): la biblioteca y el
// detalle de un ejercicio puntual.
export type EjerciciosStackParamList = {
  EjerciciosHome: undefined;
  ExerciseDetail: { exercise: Exercise };
  CrearEjercicio: undefined;
};

// Stack anidado dentro del tab "Perfil" (Fase 4): datos + edición, historial
// de entrenamientos y estadísticas.
export type PerfilStackParamList = {
  PerfilHome: undefined;
  EditarPerfil: undefined;
  Historial: undefined;
  HistorialDetail: {
    workoutId: string;
    startedAt: string;
    durationSeconds: number | null;
    totalVolumeKg: number;
  };
  Estadisticas: undefined;
};
