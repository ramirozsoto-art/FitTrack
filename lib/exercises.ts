// Capa de acceso a datos para la Biblioteca de Ejercicios (Fase 4).
import { supabase } from './supabase';
import type { Exercise } from '../types/database';

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data as Exercise[]) ?? [];
}
