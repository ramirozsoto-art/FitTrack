// Capa mínima de acceso a datos para rutinas y entrenamientos. Se centraliza
// acá (a diferencia del resto de las pantallas, que consultan Supabase
// directo) porque crear una rutina implica dos inserts encadenados y más de
// una pantalla necesita "traer las rutinas del usuario".
import { supabase } from './supabase';
import type { DraftRoutineExercise, Routine, Workout } from '../types/database';

export async function fetchUserRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Routine[]) ?? [];
}

export async function createRoutine(
  userId: string,
  name: string,
  exercises: DraftRoutineExercise[]
): Promise<Routine> {
  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .insert({ user_id: userId, name })
    .select('*')
    .single();

  if (routineError) throw routineError;

  const rows = exercises.map((item, index) => ({
    routine_id: routine.id,
    exercise_id: item.exercise.id,
    sets: item.sets,
    reps: item.reps,
    rest_seconds: item.rest_seconds,
    order_index: index,
  }));

  const { error: exercisesError } = await supabase.from('routine_exercises').insert(rows);
  if (exercisesError) throw exercisesError;

  return routine as Routine;
}

// Entrenamientos del usuario desde weekStart (inclusive) hasta hoy, usados
// para el calendario semanal y el gráfico de actividad del Dashboard.
export async function fetchWeeklyWorkouts(userId: string, weekStart: Date): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', weekStart.toISOString())
    .order('started_at', { ascending: true });

  if (error) throw error;
  return (data as Workout[]) ?? [];
}
