// Tipos de las tablas de Supabase usadas en Fase 0/1.
// NOTA: los nombres de columna de "profiles" son una convención asumida
// (snake_case). Si tu tabla real usa otros nombres, ajustá este archivo.

export type Gender = 'male' | 'female';

export type Goal = 'lose_fat' | 'gain_muscle' | 'maintain';

export interface Profile {
  id: string; // uuid, FK a auth.users.id
  full_name: string | null;
  email: string | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  gender: Gender | null;
  training_days: number | null;
  goal: Goal | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Datos del formulario de Metabolismo Basal (todavía sin guardar).
export interface OnboardingData {
  age: number;
  weight_kg: number;
  height_cm: number;
  gender: Gender;
  training_days: number;
  goal: Goal;
}

// Fila de la tabla "exercises". Solo se usan los campos mostrados en el
// listado de Fase 1; ajustar si el esquema real difiere.
export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
}

// Tipos de las tablas de Fase 2 (rutinas y entrenamientos). Las tablas están
// vacías en Supabase, así que el esquema de columnas es una convención
// asumida (snake_case, misma lógica que "profiles"/"exercises"). Ajustar si
// el esquema real difiere.

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  order_index: number;
  created_at: string;
}

// RoutineExercise con el ejercicio embebido (join), para mostrar el nombre
// sin hacer una consulta aparte por cada fila.
export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise;
}

// Fila "en edición" dentro de la pantalla de Crear Rutina, antes de guardar
// (todavía no tiene id propio ni routine_id).
export interface DraftRoutineExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  rest_seconds: number;
}

export type WorkoutStatus = 'active' | 'completed' | 'cancelled';

export interface Workout {
  id: string;
  user_id: string;
  routine_id: string | null;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  status: WorkoutStatus;
  created_at: string;
}

// Fase 3: cada fila representa una serie ya completada (solo se insertan al
// tildar el check, no hay filas "pendientes" en la tabla).
export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  completed: boolean;
  rest_seconds: number | null;
  created_at: string;
}
