import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ExercisePickerSheet from '../../components/routines/ExercisePickerSheet';
import type { ExercisePickerSheetRef } from '../../components/routines/ExercisePickerSheet';
import ExerciseSetTable from '../../components/workout/ExerciseSetTable';
import WorkoutStatsBar from '../../components/workout/WorkoutStatsBar';
import RestTimerBanner from '../../components/workout/RestTimerBanner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fetchRoutineExercises } from '../../lib/routines';
import {
  cancelWorkout,
  finishWorkout,
  insertWorkoutSet,
  deleteWorkoutSet,
  deleteWorkoutSets,
  startWorkout,
} from '../../lib/workouts';
import { spacing, type ThemeColors } from '../../theme';
import type { Exercise, Workout } from '../../types/database';
import type { ActiveExercise, ActiveSetRow } from '../../types/workoutSession';
import type { EntrenamientoStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EntrenamientoStackParamList, 'ActiveWorkout'>;

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_REST_SECONDS = 60;

let localKeyCounter = 0;
function nextLocalKey(): string {
  localKeyCounter += 1;
  return `local-${localKeyCounter}`;
}

function buildEmptySet(setNumber: number, defaultReps: number): ActiveSetRow {
  return { id: null, setNumber, weight: '', reps: String(defaultReps), completed: false, saving: false };
}

// Pantalla de Entrenamiento Activo (Fase 3): timer en vivo, ejercicios con
// su tabla de series (todos visibles con scroll, como en la captura 06 de
// Figma) y descanso entre series. Cubre tanto el arranque desde una rutina
// (ejercicios precargados) como un entrenamiento en blanco (captura 05).
export default function ActiveWorkoutScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { routineId } = route.params;
  const { session } = useAuth();
  const userId = session?.user.id;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [restTimer, setRestTimer] = useState<{ secondsLeft: number; total: number } | null>(null);

  const startedAtRef = useRef<number>(Date.now());
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sheetRef = useRef<ExercisePickerSheetRef>(null);

  // Timer principal: arranca solo con la pantalla, se recalcula desde una
  // referencia fija para no acumular drift.
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Abre la sesión en Supabase y, si viene de una rutina, precarga sus
  // ejercicios con los sets/reps/descanso configurados.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        Alert.alert('Sesión inválida', 'Volvé a iniciar sesión para entrenar.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        setLoadingInitial(false);
        return;
      }
      try {
        const created = await startWorkout(userId, routineId);
        if (!active) return;
        startedAtRef.current = new Date(created.started_at).getTime();
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
        setWorkout(created);

        if (routineId) {
          const routineExercises = await fetchRoutineExercises(routineId);
          if (!active) return;
          setExercises(
            routineExercises.map((re) => ({
              key: nextLocalKey(),
              exercise: re.exercise,
              restSeconds: re.rest_seconds,
              sets: Array.from({ length: re.sets }, (_, i) => buildEmptySet(i + 1, re.reps)),
            }))
          );
        }
      } catch (err) {
        if (!active) return;
        Alert.alert(
          'No se pudo iniciar el entrenamiento',
          err instanceof Error ? err.message : 'Intentá de nuevo.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      } finally {
        if (active) setLoadingInitial(false);
      }
    })();
    return () => {
      active = false;
    };
    // Solo debe correr al montar: userId/routineId no cambian durante la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  const totalVolumeKg = useMemo(
    () =>
      exercises.reduce(
        (sum, ex) =>
          sum +
          ex.sets.reduce(
            (s, set) => (set.completed ? s + (parseFloat(set.weight) || 0) * (parseInt(set.reps, 10) || 0) : s),
            0
          ),
        0
      ),
    [exercises]
  );

  const completedSetCount = useMemo(
    () => exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0),
    [exercises]
  );

  const startRestTimer = useCallback((totalSeconds: number) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (totalSeconds <= 0) return;
    setRestTimer({ secondsLeft: totalSeconds, total: totalSeconds });
    restIntervalRef.current = setInterval(() => {
      setRestTimer((current) => {
        if (!current) return current;
        const next = current.secondsLeft - 1;
        if (next <= 0) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return null;
        }
        return { ...current, secondsLeft: next };
      });
    }, 1000);
  }, []);

  const stopRestTimer = useCallback(() => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTimer(null);
  }, []);

  const updateSet = (exerciseIndex: number, setIndex: number, patch: Partial<ActiveSetRow>) => {
    setExercises((prev) => {
      const next = [...prev];
      const sets = [...next[exerciseIndex].sets];
      sets[setIndex] = { ...sets[setIndex], ...patch };
      next[exerciseIndex] = { ...next[exerciseIndex], sets };
      return next;
    });
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const ex = next[exerciseIndex];
      const setNumber = ex.sets.length + 1;
      next[exerciseIndex] = { ...ex, sets: [...ex.sets, buildEmptySet(setNumber, DEFAULT_REPS)] };
      return next;
    });
  };

  const handleToggleSet = async (exerciseIndex: number, setIndex: number) => {
    if (!workout) return;
    const ex = exercises[exerciseIndex];
    const set = ex.sets[setIndex];

    if (set.completed) {
      updateSet(exerciseIndex, setIndex, { saving: true });
      try {
        if (set.id) await deleteWorkoutSet(set.id);
        updateSet(exerciseIndex, setIndex, { completed: false, id: null, saving: false });
      } catch (err) {
        updateSet(exerciseIndex, setIndex, { saving: false });
        Alert.alert('No se pudo destildar la serie', err instanceof Error ? err.message : 'Intentá de nuevo.');
      }
      return;
    }

    const repsValue = parseInt(set.reps, 10);
    if (!Number.isFinite(repsValue) || repsValue <= 0) {
      Alert.alert('Faltan repeticiones', 'Ingresá cuántas repeticiones hiciste en esta serie.');
      return;
    }
    const weightValue = parseFloat(set.weight.replace(',', '.'));
    const safeWeight = Number.isFinite(weightValue) ? weightValue : 0;

    updateSet(exerciseIndex, setIndex, { saving: true });
    try {
      const saved = await insertWorkoutSet({
        workoutId: workout.id,
        exerciseId: ex.exercise.id,
        setNumber: set.setNumber,
        reps: repsValue,
        weightKg: safeWeight,
        restSeconds: ex.restSeconds,
      });
      updateSet(exerciseIndex, setIndex, {
        id: saved.id,
        completed: true,
        saving: false,
        weight: String(safeWeight),
        reps: String(repsValue),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      startRestTimer(ex.restSeconds || DEFAULT_REST_SECONDS);
    } catch (err) {
      updateSet(exerciseIndex, setIndex, { saving: false });
      Alert.alert('No se pudo guardar la serie', err instanceof Error ? err.message : 'Intentá de nuevo.');
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        key: nextLocalKey(),
        exercise,
        restSeconds: DEFAULT_REST_SECONDS,
        sets: Array.from({ length: DEFAULT_SETS }, (_, i) => buildEmptySet(i + 1, DEFAULT_REPS)),
      },
    ]);
  };

  // Elimina una serie puntual (swipe-to-delete). Si ya estaba guardada en
  // Supabase, la borra ahí primero; si falla, no se toca el estado local y
  // se le avisa a la fila para que vuelva a su posición cerrada.
  const handleDeleteSet = async (exerciseIndex: number, setIndex: number): Promise<boolean> => {
    const set = exercises[exerciseIndex]?.sets[setIndex];
    if (!set) return false;

    if (set.id) {
      try {
        await deleteWorkoutSet(set.id);
      } catch (err) {
        Alert.alert('No se pudo eliminar la serie', err instanceof Error ? err.message : 'Intentá de nuevo.');
        return false;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExercises((prev) => {
      const next = [...prev];
      const sets = next[exerciseIndex].sets
        .filter((_, i) => i !== setIndex)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
      next[exerciseIndex] = { ...next[exerciseIndex], sets };
      return next;
    });
    return true;
  };

  // Elimina un ejercicio completo (confirmado desde el menú "•••"), incluidas
  // todas sus series ya guardadas en Supabase.
  const handleDeleteExercise = async (exerciseIndex: number) => {
    const ex = exercises[exerciseIndex];
    if (!ex) return;

    const savedSetIds = ex.sets.filter((s) => s.id).map((s) => s.id as string);
    try {
      await deleteWorkoutSets(savedSetIds);
    } catch (err) {
      Alert.alert('No se pudo eliminar el ejercicio', err instanceof Error ? err.message : 'Intentá de nuevo.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setExercises((prev) => prev.filter((_, i) => i !== exerciseIndex));
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar entrenamiento',
      'Se va a perder el progreso de esta sesión. ¿Seguro que querés cancelarlo?',
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Cancelar entrenamiento',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              if (workout) await cancelWorkout(workout.id);
            } catch {
              // No hay nada más que reintentar desde acá: salimos igual.
            } finally {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleFinish = () => {
    const proceed = async () => {
      if (!workout) return;
      setFinishing(true);
      try {
        await finishWorkout(workout.id, elapsedSeconds);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        navigation.replace('PostWorkout', {
          workoutId: workout.id,
          durationSeconds: elapsedSeconds,
          totalVolumeKg,
          exerciseCount: exercises.filter((ex) => ex.sets.some((s) => s.completed)).length,
          completedSetCount,
        });
      } catch (err) {
        setFinishing(false);
        Alert.alert(
          'No se pudo terminar el entrenamiento',
          err instanceof Error ? err.message : 'Intentá de nuevo.'
        );
      }
    };

    if (completedSetCount === 0) {
      Alert.alert('Sin series completadas', 'Todavía no marcaste ninguna serie. ¿Terminar igual?', [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Terminar igual', onPress: proceed },
      ]);
      return;
    }
    proceed();
  };

  if (loadingInitial) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="Entrenamiento Activo" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Entrenamiento Activo" onBack={handleCancel} />
      <WorkoutStatsBar
        elapsedSeconds={elapsedSeconds}
        totalVolumeKg={totalVolumeKg}
        completedSets={completedSetCount}
        restActive={!!restTimer}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="barbell-outline" size={32} color={colors.textPrimary} />
              </View>
              <Button
                title="Empezar"
                variant="secondary"
                onPress={() => sheetRef.current?.present()}
                style={styles.emptyStartButton}
              />
            </View>
          ) : (
            exercises.map((item, exerciseIndex) => (
              <ExerciseSetTable
                key={item.key}
                item={item}
                onChangeWeight={(setIndex, value) => updateSet(exerciseIndex, setIndex, { weight: value })}
                onChangeReps={(setIndex, value) => updateSet(exerciseIndex, setIndex, { reps: value })}
                onToggleSet={(setIndex) => handleToggleSet(exerciseIndex, setIndex)}
                onAddSet={() => handleAddSet(exerciseIndex)}
                onDeleteSet={(setIndex) => handleDeleteSet(exerciseIndex, setIndex)}
                onDeleteExercise={() => handleDeleteExercise(exerciseIndex)}
              />
            ))
          )}

          <Button
            title="+ Agregar Ejercicio"
            variant="secondary"
            onPress={() => sheetRef.current?.present()}
            style={styles.addExerciseButton}
          />

          <Button
            title="Terminar Entrenamiento"
            onPress={handleFinish}
            loading={finishing}
            disabled={cancelling}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {restTimer && (
        <View style={styles.restTimerOverlay} pointerEvents="box-none">
          <RestTimerBanner
            secondsLeft={restTimer.secondsLeft}
            totalSeconds={restTimer.total}
            onSkip={stopRestTimer}
          />
        </View>
      )}

      <ExercisePickerSheet ref={sheetRef} onSelect={handleAddExercise} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyStartButton: {
      width: '100%',
    },
    addExerciseButton: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    restTimerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: spacing.sm,
    },
  });
}
