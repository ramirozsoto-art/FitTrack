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
