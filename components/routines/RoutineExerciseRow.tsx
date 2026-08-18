import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { DraftRoutineExercise } from '../../types/database';

interface RoutineExerciseRowProps {
  item: DraftRoutineExercise;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

// Fila de un ejercicio dentro de la rutina en edición. Sets/reps/descanso se
// muestran con sus valores por defecto (no editables en esta fase); se puede
// sacar el ejercicio o reordenarlo con las flechas subir/bajar.
export default function RoutineExerciseRow({
  item,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: RoutineExerciseRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="fitness-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.exercise.name}
        </Text>
        <Text style={styles.meta}>
          {item.sets} series · {item.reps} reps · {item.rest_seconds}s descanso
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={6} style={styles.actionButton}>
          <Ionicons name="chevron-up" size={18} color={isFirst ? colors.textTertiary : colors.textSecondary} />
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={6} style={styles.actionButton}>
          <Ionicons name="chevron-down" size={18} color={isLast ? colors.textTertiary : colors.textSecondary} />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={6} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    meta: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    actionButton: {
      padding: 6,
    },
  });
}
