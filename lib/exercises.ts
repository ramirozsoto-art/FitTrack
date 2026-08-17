// Capa de acceso a datos para la Biblioteca de Ejercicios (Fase 4).
import { supabase } from './supabase';
import type { Exercise } from '../types/database';

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data as Exercise[]) ?? [];
}

interface CreateExerciseParams {
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
}

// Crea un ejercicio personalizado del usuario actual. is_default siempre
// false acá: los ejercicios precargados (is_default = true) no se crean
// desde la app.
export async function createExercise(userId: string, params: CreateExerciseParams): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: params.name,
      muscle_group: params.muscleGroup,
      equipment: params.equipment,
      created_by: userId,
      is_default: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Exercise;
}
