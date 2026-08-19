// Capa de acceso a datos para el Historial de Entrenamientos (Fase 4).
// Solo lee de workouts/workout_sets (no las toca ni las modifica): esas
// tablas las escribe exclusivamente lib/workouts.ts durante el Entrenamiento
// Activo.
import { supabase } from './supabase';
import type { Exercise, Workout, WorkoutSet } from '../types/database';

export interface WorkoutSummary extends Workout {
  totalVolumeKg: number;
  setCount: number;
}

// Entrenamientos completados del usuario, con el volumen total (peso x reps
// sumado de todas sus series) calculado a partir de workout_sets.
export async function fetchCompletedWorkouts(userId: string): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, workout_sets(weight, reps)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false });

  if (error) throw error;

  return ((data as any[]) ?? []).map((row) => {
    const sets = (row.workout_sets ?? []) as { weight: number | null; reps: number | null }[];
    const totalVolumeKg = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    const { workout_sets, ...workout } = row;
    return { ...(workout as Workout), totalVolumeKg, setCount: sets.length };
  });
}

export interface HistorySummary {
  totalWorkouts: number;
  avgWorkoutsPerWeek: number;
}

// Resumen chico arriba de la lista de Historial: total registrado y promedio
// por semana desde el primer entrenamiento hasta hoy (no solo entre el
// primero y el último, para que la racha "se enfríe" si el usuario dejó de
// entrenar hace tiempo).
export function computeHistorySummary(workouts: WorkoutSummary[]): HistorySummary {
  if (workouts.length === 0) return { totalWorkouts: 0, avgWorkoutsPerWeek: 0 };

  const earliest = Math.min(...workouts.map((w) => new Date(w.started_at).getTime()));
  const weekSpan = Math.max(1, Math.ceil((Date.now() - earliest) / (7 * 24 * 60 * 60 * 1000)));

  return {
    totalWorkouts: workouts.length,
    avgWorkoutsPerWeek: Math.round((workouts.length / weekSpan) * 10) / 10,
  };
}

export interface WorkoutExerciseGroup {
  exercise: Exercise;
  sets: WorkoutSet[];
}

// Series de un entrenamiento puntual, agrupadas por ejercicio en el orden en
// que se hicieron. No hay "order_index" en workout_sets (a diferencia de
// routine_exercises), así que se agrupa por primera aparición según
// created_at.
export async function fetchWorkoutDetail(workoutId: string): Promise<WorkoutExerciseGroup[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*, exercise:exercises(*)')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const groups: WorkoutExerciseGroup[] = [];
  const indexByExerciseId = new Map<string, number>();

  ((data as any[]) ?? []).forEach(({ exercise, ...set }) => {
    let index = indexByExerciseId.get(exercise.id);
    if (index === undefined) {
      index = groups.length;
      indexByExerciseId.set(exercise.id, index);
      groups.push({ exercise, sets: [] });
    }
    groups[index].sets.push(set as WorkoutSet);
  });

  groups.forEach((g) => g.sets.sort((a, b) => a.set_number - b.set_number));

  return groups;
}
