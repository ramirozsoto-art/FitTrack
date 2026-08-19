// Capa de acceso a datos y cálculo de estadísticas de entrenamiento (Fase 4 +
// rediseño de Fase 5 "ajustes parte 2"): volumen por semana/mes, frecuencia,
// racha de constancia, heatmap de calendario, progresión y PRs por ejercicio,
// y totales por grupo muscular. Todo se deriva de una sola consulta sobre
// workouts completados (con sus workout_sets embebidos) que trae TODO el
// historial; el selector de período de Estadísticas filtra en memoria para
// que cambiar de pestaña o de período no dispare otro round-trip a Supabase.
import { supabase } from './supabase';
import { formatShortDate, MONTH_LABELS } from './date';

// ---------------------------------------------------------------------------
// Dataset base
// ---------------------------------------------------------------------------

export interface StatsSetEntry {
  workoutId: string;
  startedAt: string; // ISO
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  weight: number;
  reps: number;
}

interface RawStatsSet {
  weight: number | null;
  reps: number | null;
  exercise_id: string;
  exercise: { name: string; muscle_group: string | null } | null;
}

interface RawStatsWorkout {
  id: string;
  started_at: string;
  workout_sets: RawStatsSet[];
}

// Trae todo el historial de entrenamientos completados, aplanado a una fila
// por serie con el ejercicio (nombre + grupo muscular) embebido.
export async function fetchStatsDataset(userId: string): Promise<StatsSetEntry[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, started_at, workout_sets(weight, reps, exercise_id, exercise:exercises(name, muscle_group))')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: true });

  if (error) throw error;

  const entries: StatsSetEntry[] = [];
  ((data as unknown as RawStatsWorkout[]) ?? []).forEach((workout) => {
    (workout.workout_sets ?? []).forEach((set) => {
      entries.push({
        workoutId: workout.id,
        startedAt: workout.started_at,
        exerciseId: set.exercise_id,
        exerciseName: set.exercise?.name ?? 'Ejercicio',
        muscleGroup: set.exercise?.muscle_group ?? null,
        weight: set.weight ?? 0,
        reps: set.reps ?? 0,
      });
    });
  });
  return entries;
}

// ---------------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------------

export type StatsPeriod = '4w' | '3m' | 'all';

export const STATS_PERIOD_OPTIONS: { label: string; value: StatsPeriod }[] = [
  { label: '4 semanas', value: '4w' },
  { label: '3 meses', value: '3m' },
  { label: 'Todo', value: 'all' },
];

function periodStartDate(period: StatsPeriod): Date | null {
  if (period === 'all') return null;
  const start = new Date();
  if (period === '4w') start.setDate(start.getDate() - 28);
  else start.setMonth(start.getMonth() - 3);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Cantidad de semanas que abarca el período, usada para promediar frecuencia
// (series/semana). Para "all" se mide desde el primer entrenamiento real.
function periodWeekSpan(fullDataset: StatsSetEntry[], period: StatsPeriod): number {
  if (period === '4w') return 4;
  if (period === '3m') return 13;
  if (fullDataset.length === 0) return 1;
  const earliest = fullDataset.reduce((min, e) => Math.min(min, new Date(e.startedAt).getTime()), Date.now());
  return Math.max(1, Math.ceil((Date.now() - earliest) / (7 * 24 * 60 * 60 * 1000)));
}

export function filterDatasetByPeriod(dataset: StatsSetEntry[], period: StatsPeriod): StatsSetEntry[] {
  const start = periodStartDate(period);
  if (!start) return dataset;
  return dataset.filter((e) => new Date(e.startedAt) >= start);
}

// ---------------------------------------------------------------------------
// Helpers compartidos
// ---------------------------------------------------------------------------

// Lunes 00:00 de la semana de una fecha dada, usado como clave de agrupación.
function mondayOf(date: Date): Date {
  const dayIndex = (date.getDay() + 6) % 7; // lunes=0 ... domingo=6
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayIndex);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

// ---------------------------------------------------------------------------
// Vista General
// ---------------------------------------------------------------------------

export interface VolumePoint {
  label: string;
  totalVolumeKg: number;
}

export interface FrequencyPoint {
  label: string;
  workoutCount: number;
}

export interface HeatmapDay {
  date: string; // yyyy-mm-dd (hora local)
  volumeKg: number;
}

export interface GeneralStats {
  weeklyVolume: VolumePoint[];
  monthlyVolume: VolumePoint[];
  monthlyFrequency: FrequencyPoint[];
  totalVolumeKg: number;
  longestStreakWeeks: number;
  heatmap: HeatmapDay[];
}

// Racha más larga de semanas consecutivas (lunes a domingo) con al menos un
// entrenamiento completado. Es "histórica": se calcula sobre TODO el
// historial sin importar el período seleccionado en pantalla, a diferencia
// del resto de las métricas de esta vista.
function computeLongestStreakWeeks(fullDataset: StatsSetEntry[]): number {
  if (fullDataset.length === 0) return 0;

  const weekTimes = Array.from(
    new Set(fullDataset.map((e) => mondayOf(new Date(e.startedAt)).getTime()))
  ).sort((a, b) => a - b);

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < weekTimes.length; i++) {
    current = weekTimes[i] - weekTimes[i - 1] === oneWeekMs ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

// Cuántas semanas de heatmap mostrar según el período: 4 semanas y 3 meses
// (~13 semanas) van directo; "todo" se limita a 1 año para que la grilla no
// crezca sin límite con años de historial.
function heatmapWeekCount(period: StatsPeriod, dataset: StatsSetEntry[]): number {
  if (period === '4w') return 4;
  if (period === '3m') return 13;
  if (dataset.length === 0) return 4;
  const earliest = dataset.reduce((min, e) => Math.min(min, new Date(e.startedAt).getTime()), Date.now());
  const weeksSinceStart = Math.ceil((Date.now() - earliest) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(52, Math.max(4, weeksSinceStart));
}

function buildHeatmap(fullDataset: StatsSetEntry[], period: StatsPeriod): HeatmapDay[] {
  // El heatmap arma su propia ventana de semanas completas (no la respeta el
  // recorte de filterDatasetByPeriod, que corta por fecha exacta), por eso
  // agrega directo sobre fullDataset y limita weeks acá.
  const weeks = heatmapWeekCount(period, fullDataset);
  const dailyVolume = new Map<string, number>();
  fullDataset.forEach((e) => {
    const key = localDateKey(new Date(e.startedAt));
    dailyVolume.set(key, (dailyVolume.get(key) ?? 0) + e.weight * e.reps);
  });

  const thisMonday = mondayOf(new Date());
  const startMonday = new Date(thisMonday);
  startMonday.setDate(startMonday.getDate() - (weeks - 1) * 7);
  const endExclusive = new Date(thisMonday);
  endExclusive.setDate(endExclusive.getDate() + 7);

  const days: HeatmapDay[] = [];
  const cursor = new Date(startMonday);
  while (cursor < endExclusive) {
    const key = localDateKey(cursor);
    days.push({ date: key, volumeKg: Math.round(dailyVolume.get(key) ?? 0) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function computeGeneralStats(fullDataset: StatsSetEntry[], period: StatsPeriod): GeneralStats {
  const dataset = filterDatasetByPeriod(fullDataset, period);

  const weeklyVolumeMap = new Map<string, Aggregated<{ totalVolumeKg: number }>>();
  const monthlyVolumeMap = new Map<string, Aggregated<{ totalVolumeKg: number }>>();
  const monthlyFrequencyMap = new Map<string, Aggregated<{ workoutIds: Set<string> }>>();
  let totalVolumeKg = 0;

  dataset.forEach((entry) => {
    const startedAt = new Date(entry.startedAt);
    const volume = entry.weight * entry.reps;
    totalVolumeKg += volume;

    const monday = mondayOf(startedAt);
    const weekKey = monday.toISOString().slice(0, 10);
    const weekLabel = `${monday.getDate()}/${monday.getMonth() + 1}`;
    const monthKey = `${startedAt.getFullYear()}-${startedAt.getMonth()}`;
    const monthLabel = MONTH_LABELS[startedAt.getMonth()];
    const monthSortKey = startedAt.getFullYear() * 12 + startedAt.getMonth();

    const weekEntry =
      weeklyVolumeMap.get(weekKey) ?? { label: weekLabel, sortKey: monday.getTime(), data: { totalVolumeKg: 0 } };
    weekEntry.data.totalVolumeKg += volume;
    weeklyVolumeMap.set(weekKey, weekEntry);

    const monthEntry =
      monthlyVolumeMap.get(monthKey) ?? { label: monthLabel, sortKey: monthSortKey, data: { totalVolumeKg: 0 } };
    monthEntry.data.totalVolumeKg += volume;
    monthlyVolumeMap.set(monthKey, monthEntry);

    const freqEntry =
      monthlyFrequencyMap.get(monthKey) ??
      { label: monthLabel, sortKey: monthSortKey, data: { workoutIds: new Set<string>() } };
    freqEntry.data.workoutIds.add(entry.workoutId);
    monthlyFrequencyMap.set(monthKey, freqEntry);
  });

  return {
    weeklyVolume: takeLastSorted(weeklyVolumeMap, 12).map((e) => ({
      label: e.label,
      totalVolumeKg: Math.round(e.data.totalVolumeKg),
    })),
    monthlyVolume: takeLastSorted(monthlyVolumeMap, 12).map((e) => ({
      label: e.label,
      totalVolumeKg: Math.round(e.data.totalVolumeKg),
    })),
    monthlyFrequency: takeLastSorted(monthlyFrequencyMap, 12).map((e) => ({
      label: e.label,
      workoutCount: e.data.workoutIds.size,
    })),
    totalVolumeKg: Math.round(totalVolumeKg),
    longestStreakWeeks: computeLongestStreakWeeks(fullDataset),
    heatmap: buildHeatmap(fullDataset, period),
  };
}

// ---------------------------------------------------------------------------
// Vista Por Ejercicio
// ---------------------------------------------------------------------------

export interface TrainedExercise {
  exerciseId: string;
  exerciseName: string;
}

// Ejercicios que el usuario efectivamente entrenó alguna vez (no todo el
// catálogo), para el buscador de la vista "Por Ejercicio".
export function computeTrainedExercises(fullDataset: StatsSetEntry[]): TrainedExercise[] {
  const map = new Map<string, string>();
  fullDataset.forEach((e) => map.set(e.exerciseId, e.exerciseName));
  return Array.from(map.entries())
    .map(([exerciseId, exerciseName]) => ({ exerciseId, exerciseName }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export interface ExerciseProgressionPoint {
  label: string;
  maxWeightKg: number;
}

export interface ExerciseDetailStats {
  exerciseId: string;
  exerciseName: string;
  prMaxWeightKg: number;
  prMaxSetVolumeKg: number; // mayor (peso x reps) en una sola serie
  estimated1RmKg: number; // fórmula de Epley sobre la mejor serie
  timesTrained: number; // entrenamientos distintos en el período
  progression: ExerciseProgressionPoint[]; // máx. peso por sesión, cronológico
}

// PRs, 1RM estimado (Epley: peso x (1 + reps/30)) y progresión de peso máximo
// por sesión de un ejercicio puntual, dentro del período seleccionado.
export function computeExerciseDetail(
  fullDataset: StatsSetEntry[],
  period: StatsPeriod,
  exerciseId: string
): ExerciseDetailStats | null {
  const dataset = filterDatasetByPeriod(fullDataset, period).filter((e) => e.exerciseId === exerciseId);
  if (dataset.length === 0) return null;

  let prMaxWeightKg = 0;
  let prMaxSetVolumeKg = 0;
  let estimated1RmKg = 0;
  const workoutIds = new Set<string>();
  const maxWeightByWorkout = new Map<string, { startedAt: string; maxWeightKg: number }>();

  dataset.forEach((e) => {
    const setVolume = e.weight * e.reps;
    prMaxWeightKg = Math.max(prMaxWeightKg, e.weight);
    prMaxSetVolumeKg = Math.max(prMaxSetVolumeKg, setVolume);
    estimated1RmKg = Math.max(estimated1RmKg, e.weight * (1 + e.reps / 30));
    workoutIds.add(e.workoutId);

    const existing = maxWeightByWorkout.get(e.workoutId);
    if (!existing || e.weight > existing.maxWeightKg) {
      maxWeightByWorkout.set(e.workoutId, { startedAt: e.startedAt, maxWeightKg: e.weight });
    }
  });

  const progression = Array.from(maxWeightByWorkout.values())
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-15)
    .map((p) => ({ label: formatShortDate(p.startedAt), maxWeightKg: Math.round(p.maxWeightKg * 10) / 10 }));

  return {
    exerciseId,
    exerciseName: dataset[0].exerciseName,
    prMaxWeightKg,
    prMaxSetVolumeKg: Math.round(prMaxSetVolumeKg),
    estimated1RmKg: Math.round(estimated1RmKg * 10) / 10,
    timesTrained: workoutIds.size,
    progression,
  };
}

// ---------------------------------------------------------------------------
// Vista Por Grupo Muscular
// ---------------------------------------------------------------------------

export interface MuscleGroupVolume {
  muscleGroup: string;
  totalVolumeKg: number;
}

// Volumen total por grupo muscular en el período, de mayor a menor — la base
// del gráfico de barras horizontales que reemplaza al radar chart.
export function computeMuscleGroupVolumes(fullDataset: StatsSetEntry[], period: StatsPeriod): MuscleGroupVolume[] {
  const dataset = filterDatasetByPeriod(fullDataset, period);
  const map = new Map<string, number>();
  dataset.forEach((e) => {
    if (!e.muscleGroup) return;
    map.set(e.muscleGroup, (map.get(e.muscleGroup) ?? 0) + e.weight * e.reps);
  });
  return Array.from(map.entries())
    .map(([muscleGroup, totalVolumeKg]) => ({ muscleGroup, totalVolumeKg: Math.round(totalVolumeKg) }))
    .sort((a, b) => b.totalVolumeKg - a.totalVolumeKg);
}

export interface MuscleGroupDetail {
  muscleGroup: string;
  totalVolumeKg: number;
  totalSets: number;
  maxWeightKg: number;
  workoutsPerWeek: number;
}

export function computeMuscleGroupDetail(
  fullDataset: StatsSetEntry[],
  period: StatsPeriod,
  muscleGroup: string
): MuscleGroupDetail {
  const dataset = filterDatasetByPeriod(fullDataset, period).filter((e) => e.muscleGroup === muscleGroup);

  let totalVolumeKg = 0;
  let maxWeightKg = 0;
  const workoutIds = new Set<string>();
  dataset.forEach((e) => {
    totalVolumeKg += e.weight * e.reps;
    maxWeightKg = Math.max(maxWeightKg, e.weight);
    workoutIds.add(e.workoutId);
  });

  const weekSpan = periodWeekSpan(fullDataset, period);

  return {
    muscleGroup,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets: dataset.length,
    maxWeightKg,
    workoutsPerWeek: Math.round((workoutIds.size / weekSpan) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Dashboard (Fase 5 "ajustes parte 1" — no tocar sin revisar DashboardScreen)
// ---------------------------------------------------------------------------

interface RawVolumeSet {
  weight: number | null;
  reps: number | null;
}

interface RawVolumeWorkout {
  started_at: string;
  workout_sets: RawVolumeSet[];
}

export interface WeeklyVolumeTrend {
  currentWeekVolumeKg: number;
  previousWeekVolumeKg: number;
  hasPreviousWeekData: boolean;
}

// Volumen total (peso x reps) de la semana actual vs. la semana anterior,
// usado en la tarjeta de actividad del Dashboard. weekStart es el lunes
// 00:00 de la semana actual (mismo criterio que lib/date.ts#getWeekStart).
export async function fetchWeeklyVolumeTrend(userId: string, weekStart: Date): Promise<WeeklyVolumeTrend> {
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const { data, error } = await supabase
    .from('workouts')
    .select('started_at, workout_sets(weight, reps)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', previousWeekStart.toISOString())
    .order('started_at', { ascending: true });

  if (error) throw error;

  let currentWeekVolumeKg = 0;
  let previousWeekVolumeKg = 0;
  let hasPreviousWeekData = false;

  ((data as unknown as RawVolumeWorkout[]) ?? []).forEach((workout) => {
    const startedAt = new Date(workout.started_at);
    const volume = (workout.workout_sets ?? []).reduce(
      (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
      0
    );

    if (startedAt >= weekStart) {
      currentWeekVolumeKg += volume;
    } else {
      previousWeekVolumeKg += volume;
      hasPreviousWeekData = true;
    }
  });

  return {
    currentWeekVolumeKg: Math.round(currentWeekVolumeKg),
    previousWeekVolumeKg: Math.round(previousWeekVolumeKg),
    hasPreviousWeekData,
  };
}
