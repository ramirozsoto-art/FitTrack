// Capa mínima de acceso a datos para rutinas y entrenamientos. Se centraliza
// acá (a diferencia del resto de las pantallas, que consultan Supabase
// directo) porque crear una rutina implica dos inserts encadenados y más de
// una pantalla necesita "traer las rutinas del usuario".
import { supabase } from './supabase';
import type {
  DraftRoutineExercise,
  Routine,
  RoutineExerciseWithExercise,
  Workout,
} from '../types/database';

export async function fetchUserRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Routine[]) ?? [];
}

// Ejercicios de una rutina con el ejercicio embebido (join), en el orden en
// que se armó la rutina. Se usa para precargar el Entrenamiento Activo.
export async function fetchRoutineExercises(routineId: string): Promise<RoutineExerciseWithExercise[]> {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('*, exercise:exercises(*)')
    .eq('routine_id', routineId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data as RoutineExerciseWithExercise[]) ?? [];
}

async function insertRoutineWithExercises(
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
  if (exercisesError) {
    // No dejar una rutina huérfana sin ejercicios: si el segundo insert
    // falla de verdad, deshacemos el primero.
    await supabase.from('routines').delete().eq('id', routine.id);
    throw exercisesError;
  }

  return routine as Routine;
}

// Busca una rutina recién creada por nombre/usuario con la misma cantidad de
// ejercicios que se intentó guardar. Existe porque un timeout de red puede
// tirar error en el cliente después de que el insert ya haya committeado en
// el servidor: sin esta verificación, ese caso se reporta como "no se pudo
// guardar" aunque la rutina sí quedó guardada.
async function findRecentlySavedRoutine(
  userId: string,
  name: string,
  expectedExerciseCount: number
): Promise<Routine | null> {
  const since = new Date(Date.now() - 15_000).toISOString();
  const { data } = await supabase
    .from('routines')
    .select('*, routine_exercises(count)')
    .eq('user_id', userId)
    .eq('name', name)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const savedCount = (data as any).routine_exercises?.[0]?.count ?? 0;
  if (savedCount !== expectedExerciseCount) return null;

  const { routine_exercises, ...routine } = data as any;
  return routine as Routine;
}

export async function createRoutine(
  userId: string,
  name: string,
  exercises: DraftRoutineExercise[]
): Promise<Routine> {
  try {
    return await insertRoutineWithExercises(userId, name, exercises);
  } catch (err) {
    const saved = await findRecentlySavedRoutine(userId, name, exercises.length);
    if (saved) return saved;
    throw err;
  }
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
