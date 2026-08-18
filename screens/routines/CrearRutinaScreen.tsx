import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import ScreenHeader from '../../components/ui/ScreenHeader';
import TextField from '../../components/ui/TextField';
import RoutineExerciseRow from '../../components/routines/RoutineExerciseRow';
import ExercisePickerSheet from '../../components/routines/ExercisePickerSheet';
import type { ExercisePickerSheetRef } from '../../components/routines/ExercisePickerSheet';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { createRoutine } from '../../lib/routines';
import { fontFamily, spacing, type ThemeColors } from '../../theme';
import type { DraftRoutineExercise, Exercise } from '../../types/database';
import type { EntrenamientoStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EntrenamientoStackParamList, 'CrearRutina'>;

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_REST_SECONDS = 60;

// Pantalla para armar una rutina nueva: título + lista de ejercicios elegidos
// desde el bottom sheet de búsqueda. Guarda en "routines" + "routine_exercises".
export default function CrearRutinaScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const sheetRef = useRef<ExercisePickerSheetRef>(null);

  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<DraftRoutineExercise[]>([]);
  const [saving, setSaving] = useState(false);

  const handleAddExercise = (exercise: Exercise) => {
    setExercises((prev) => [
      ...prev,
      { exercise, sets: DEFAULT_SETS, reps: DEFAULT_REPS, rest_seconds: DEFAULT_REST_SECONDS },
    ]);
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    setExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'Ponele un nombre a tu rutina.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Sin ejercicios', 'Agregá al menos un ejercicio a la rutina.');
      return;
    }
    if (!session?.user) return;

    setSaving(true);
    try {
      await createRoutine(session.user.id, title.trim(), exercises);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'No se pudo guardar la rutina',
        err instanceof Error ? err.message : 'Intentá de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Rutina Nueva" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextField
            label="Título de rutina"
            placeholder="Ej: Tren superior"
            value={title}
            onChangeText={setTitle}
          />

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="barbell-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>Todavía no agregaste ejercicios a esta rutina.</Text>
            </View>
          ) : (
            exercises.map((item, index) => (
              <RoutineExerciseRow
                key={`${item.exercise.id}-${index}`}
                item={item}
                isFirst={index === 0}
                isLast={index === exercises.length - 1}
                onMoveUp={() => moveExercise(index, -1)}
                onMoveDown={() => moveExercise(index, 1)}
                onRemove={() => removeExercise(index)}
              />
            ))
          )}

          <Button
            title="+ Agregar Ejercicio"
            variant="secondary"
            onPress={() => sheetRef.current?.present()}
            style={styles.addButton}
          />

          <Button title="Guardar Rutina" onPress={handleSave} loading={saving} style={styles.saveButton} />
          <Button title="Atrás" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>

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
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    addButton: {
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    saveButton: {
      marginBottom: spacing.xs,
    },
  });
}
