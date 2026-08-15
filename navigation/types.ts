// Tipos de parámetros de cada stack/tab, para navegación tipada con TypeScript.

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Entrenamiento: undefined;
  Ejercicios: undefined;
  Perfil: undefined;
};

// Stack anidado dentro del tab "Entrenamiento", para poder navegar a
// Crear Rutina con flecha atrás.
export type EntrenamientoStackParamList = {
  EntrenamientoHome: undefined;
  CrearRutina: undefined;
};
