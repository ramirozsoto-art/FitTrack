// Tipos "en vivo" del Entrenamiento Activo (Fase 3), separados del esquema
// de Supabase: representan el estado en pantalla antes/mientras se persiste
// cada serie.
import type { Exercise } from './database';

export interface ActiveSetRow {
  id: string | null; // id en "workout_sets" una vez persistida; null si todavía no se marcó completa
  setNumber: number;
  weight: string; // texto crudo del input, se parsea recién al completar la serie
  reps: string;
  completed: boolean;
  saving: boolean;
}

export interface ActiveExercise {
  key: string; // key local estable para listas (no es el id de Supabase)
  exercise: Exercise;
  restSeconds: number;
  sets: ActiveSetRow[];
}
