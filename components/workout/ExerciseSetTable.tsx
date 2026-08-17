import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { ActiveExercise } from '../../types/workoutSession';

interface ExerciseSetTableProps {
  item: ActiveExercise;
  onChangeWeight: (setIndex: number, value: string) => void;
  onChangeReps: (setIndex: number, value: string) => void;
  onToggleSet: (setIndex: number) => void;
  onAddSet: () => void;
}

// Bloque de un ejercicio dentro del Entrenamiento Activo: nombre + tabla de
// series (Serie/Kg/Repeticiones/Check), como en la captura 06 de Figma.
export default function ExerciseSetTable({
  item,
  onChangeWeight,
  onChangeReps,
  onToggleSet,
  onAddSet,
}: ExerciseSetTableProps) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={styles.exerciseName}>{item.exercise.name}</Text>

        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colSerie]}>Serie</Text>
          <Text style={[styles.headerCell, styles.colKg]}>Kg</Text>
          <Text style={[styles.headerCell, styles.colReps]}>Repeticiones</Text>
          <Text style={[styles.headerCell, styles.colCheck]}>Check</Text>
        </View>

        {item.sets.map((set, index) => (
          <View key={set.setNumber} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
            <Text style={[styles.rowText, styles.colSerie]}>{set.setNumber}</Text>
            <TextInput
              style={[styles.cellInput, styles.colKg]}
              value={set.weight}
              onChangeText={(value) => onChangeWeight(index, value)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              editable={!set.completed}
              textAlign="center"
            />
            <TextInput
              style={[styles.cellInput, styles.colReps]}
              value={set.reps}
              onChangeText={(value) => onChangeReps(index, value)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              editable={!set.completed}
              textAlign="center"
            />
            <View style={styles.colCheck}>
              {set.saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Pressable onPress={() => onToggleSet(index)} hitSlop={8} style={styles.checkButton}>
                  <Ionicons
                    name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={set.completed ? colors.primary : colors.textTertiary}
                  />
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </Card>

      <Button title="+ Agregar Serie" onPress={onAddSet} style={styles.addSetButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  exerciseName: {
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  headerCell: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: 6,
  },
  rowAlt: {
    backgroundColor: colors.background,
  },
  rowText: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  colSerie: { flex: 0.8 },
  colKg: { flex: 1 },
  colReps: { flex: 1.4 },
  colCheck: { flex: 0.8, alignItems: 'center', justifyContent: 'center' },
  cellInput: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  checkButton: {
    padding: 2,
  },
  addSetButton: {
    height: 48,
  },
});
