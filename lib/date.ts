// Helpers de fecha/tiempo compartidos por Dashboard y Entrenamiento Activo.

export const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Índice de hoy con lunes=0 a domingo=6 (a diferencia de Date#getDay, que usa domingo=0).
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

// Lunes 00:00 de la semana actual, usado como corte para consultas semanales.
export function getWeekStart(): Date {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIndex());
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Índice de lunes=0 a domingo=6 a partir de una fecha ISO.
export function dayIndexFromISODate(iso: string): number {
  return (new Date(iso).getDay() + 6) % 7;
}

// Formatea segundos como "H:MM:SS", igual al timer del diseño de Figma.
export function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
