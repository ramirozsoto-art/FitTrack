// Capa de acceso a datos y cálculo de estadísticas de entrenamiento (Fase 4):
// volumen por semana/mes, frecuencia mensual y récords personales por
// ejercicio. Todo se deriva de una sola consulta sobre workouts completados
// (con sus workout_sets embebidos), no hace falta pedir el historial varias
// veces para cada gráfico.
import { supabase } from './supabase';
import { MONTH_LABELS } from './date';

interface RawSet {
  weight: number | null;
  reps: number | null;
  exercise_id: string;
  exercise: { name: string } | null;
}

interface RawWorkout {
  id: string;
  started_at: string;
  workout_sets: RawSet[];
}

async function fetchCompletedWorkoutsWithSets(userId: string): Promise<RawWorkout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, started_at, workout_sets(weight, reps, exercise_id, exercise:exercises(name))')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: true });

  if (error) throw error;
  return (data as unknown as RawWorkout[]) ?? [];
}

export interface VolumePoint {
  label: string;
  totalVolumeKg: number;
}

export interface FrequencyPoint {
  label: string;
  workoutCount: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxSetVolumeKg: number; // mayor (peso x reps) en una sola serie
}

export interface WorkoutStats {
  weeklyVolume: VolumePoint[];
  monthlyVolume: VolumePoint[];
  monthlyFrequency: FrequencyPoint[];
  personalRecords: PersonalRecord[];
}

// Lunes 00:00 de la semana de una fecha dada, usado como clave de agrupación.
function mondayOf(date: Date): Date {
  const dayIndex = (date.getDay() + 6) % 7; // lunes=0 ... domingo=6
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayIndex);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

interface Aggregated<T> {
  label: string;
  sortKey: number;
  data: T;
}

function takeLastSorted<T>(map: Map<string, Aggregated<T>>, take: number): Aggregated<T>[] {
  return Array.from(map.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-take);
}

// Trae el historial completo de entrenamientos completados y calcula, en un
// solo recorrido, volumen semanal/mensual, frecuencia mensual y PRs por
// ejercicio.
export async function fetchWorkoutStats(userId: string, weeks = 8, months = 6): Promise<WorkoutStats> {
  const workouts = await fetchCompletedWorkoutsWithSets(userId);

  const weeklyVolumeMap = new Map<string, Aggregated<{ totalVolumeKg: number }>>();
  const monthlyVolumeMap = new Map<string, Aggregated<{ totalVolumeKg: number }>>();
  const monthlyFrequencyMap = new Map<string, Aggregated<{ workoutIds: Set<string> }>>();
  const prByExercise = new Map<string, PersonalRecord>();

  workouts.forEach((workout) => {
    const startedAt = new Date(workout.started_at);
    const monday = mondayOf(startedAt);
    const weekKey = monday.toISOString().slice(0, 10);
    const weekLabel = `${monday.getDate()}/${monday.getMonth() + 1}`;
    const monthKey = `${startedAt.getFullYear()}-${startedAt.getMonth()}`;
    const monthLabel = MONTH_LABELS[startedAt.getMonth()];
    const monthSortKey = startedAt.getFullYear() * 12 + startedAt.getMonth();

    let workoutVolume = 0;

    (workout.workout_sets ?? []).forEach((set) => {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      const setVolume = weight * reps;
      workoutVolume += setVolume;

      if (set.weight != null && set.reps != null) {
        const existing = prByExercise.get(set.exercise_id);
        const exerciseName = set.exercise?.name ?? 'Ejercicio';
        if (!existing) {
          prByExercise.set(set.exercise_id, {
            exerciseId: set.exercise_id,
            exerciseName,
            maxWeightKg: weight,
            maxSetVolumeKg: setVolume,
          });
        } else {
          existing.maxWeightKg = Math.max(existing.maxWeightKg, weight);
          existing.maxSetVolumeKg = Math.max(existing.maxSetVolumeKg, setVolume);
        }
      }
    });

    const weekEntry = weeklyVolumeMap.get(weekKey) ?? { label: weekLabel, sortKey: monday.getTime(), data: { totalVolumeKg: 0 } };
    weekEntry.data.totalVolumeKg += workoutVolume;
    weeklyVolumeMap.set(weekKey, weekEntry);

    const monthEntry = monthlyVolumeMap.get(monthKey) ?? { label: monthLabel, sortKey: monthSortKey, data: { totalVolumeKg: 0 } };
    monthEntry.data.totalVolumeKg += workoutVolume;
    monthlyVolumeMap.set(monthKey, monthEntry);

    const freqEntry =
      monthlyFrequencyMap.get(monthKey) ?? { label: monthLabel, sortKey: monthSortKey, data: { workoutIds: new Set<string>() } };
    freqEntry.data.workoutIds.add(workout.id);
    monthlyFrequencyMap.set(monthKey, freqEntry);
  });

  return {
    weeklyVolume: takeLastSorted(weeklyVolumeMap, weeks).map((e) => ({
      label: e.label,
      totalVolumeKg: Math.round(e.data.totalVolumeKg),
    })),
    monthlyVolume: takeLastSorted(monthlyVolumeMap, months).map((e) => ({
      label: e.label,
      totalVolumeKg: Math.round(e.data.totalVolumeKg),
    })),
    monthlyFrequency: takeLastSorted(monthlyFrequencyMap, months).map((e) => ({
      label: e.label,
      workoutCount: e.data.workoutIds.size,
    })),
    personalRecords: Array.from(prByExercise.values()).sort((a, b) => b.maxWeightKg - a.maxWeightKg),
  };
}
