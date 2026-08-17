// Cálculo de metabolismo basal (BMR) y calorías diarias estimadas (TDEE)
// para el Perfil (Fase 4). No pega contra Supabase: es una función pura
// sobre los datos que ya tiene el perfil.
import type { Gender, Goal } from '../types/database';

interface TDEEInput {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  trainingDays: number;
  goal: Goal;
}

// BMR con la fórmula de Mifflin-St Jeor (la más usada hoy, más precisa que
// Harris-Benedict). El factor de actividad escala según los días de entreno
// semanales, y el objetivo aplica un déficit/superávit calórico típico
// (~500 kcal para bajar grasa, ~300 kcal para ganar músculo).
export function calculateTDEE({ age, weightKg, heightCm, gender, trainingDays, goal }: TDEEInput): number {
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  let activityFactor = 1.2; // sedentario / 0-1 días
  if (trainingDays >= 6) activityFactor = 1.725; // muy activo
  else if (trainingDays >= 4) activityFactor = 1.55; // moderado
  else if (trainingDays >= 2) activityFactor = 1.375; // liviano

  const tdee = bmr * activityFactor;

  if (goal === 'lose_fat') return Math.round(tdee - 500);
  if (goal === 'gain_muscle') return Math.round(tdee + 300);
  return Math.round(tdee);
}
