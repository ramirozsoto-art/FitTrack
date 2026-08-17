// Capa de acceso a datos para el Entrenamiento Activo (Fase 3): abrir/cerrar
// la sesión en "workouts" y persistir cada serie completada en "workout_sets".
import { supabase } from './supabase';
import type { Workout, WorkoutSet } from '../types/database';

export async function startWorkout(userId: string, routineId: string | null): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      routine_id: routineId,
      started_at: new Date().toISOString(),
      status: 'active',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Workout;
}

interface InsertSetParams {
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
}

export async function insertWorkoutSet(params: InsertSetParams): Promise<WorkoutSet> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_id: params.workoutId,
      exercise_id: params.exerciseId,
      set_number: params.setNumber,
      reps: params.reps,
      weight_kg: params.weightKg,
      completed: true,
      rest_seconds: params.restSeconds,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as WorkoutSet;
}

// Se usa al destildar una serie ya guardada.
export async function deleteWorkoutSet(setId: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', setId);
  if (error) throw error;
}

export async function finishWorkout(workoutId: string, durationSeconds: number): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({
      finished_at: new Date().toISOString(),
      duration_seconds: Math.round(durationSeconds),
      status: 'completed',
    })
    .eq('id', workoutId);

  if (error) throw error;
}

// No borramos las series ya guardadas: quedan como historial de lo que
// efectivamente se llegó a hacer antes de cancelar.
export async function cancelWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({ finished_at: new Date().toISOString(), status: 'cancelled' })
    .eq('id', workoutId);

  if (error) throw error;
}
