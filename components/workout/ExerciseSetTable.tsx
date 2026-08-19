import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { ActiveExercise, ActiveSetRow } from '../../types/workoutSession';

interface ExerciseSetTableProps {
  item: ActiveExercise;
  onChangeWeight: (setIndex: number, value: string) => void;
  onChangeReps: (setIndex: number, value: string) => void;
  onToggleSet: (setIndex: number) => void;
  onAddSet: () => void;
  onDeleteSet: (setIndex: number) => Promise<boolean>;
  onDeleteExercise: () => void;
}

// Bloque de un ejercicio dentro del Entrenamiento Activo: nombre + tabla de
// series (Serie/Kg/Repeticiones/Check), como en la captura 06 de Figma.
// Cada fila se puede eliminar con swipe (estilo Mail/Recordatorios de iOS) y
// el "•••" del header abre el menú para eliminar el ejercicio completo.
export default function ExerciseSetTable({
  item,
  onChangeWeight,
  onChangeReps,
  onToggleSet,
  onAddSet,
  onDeleteSet,
  onDeleteExercise,
}: ExerciseSetTableProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const confirmDeleteExercise = () => {
    Alert.alert(
      'Eliminar ejercicio',
      `Se van a borrar las ${item.sets.length} series cargadas de ${item.exercise.name}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onDeleteExercise },
      ]
    );
  };

  const handleOpenMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Eliminar ejercicio', 'Cancelar'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (index) => {
          if (index === 0) confirmDeleteExercise();
        }
      );
    } else {
      Alert.alert(item.exercise.name, undefined, [
        { text: 'Eliminar ejercicio', style: 'destructive', onPress: confirmDeleteExercise },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {item.exercise.name}
          </Text>
          <Pressable onPress={handleOpenMenu} hitSlop={8} style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colSerie]}>Serie</Text>
          <Text style={[styles.headerCell, styles.colKg]}>Kg</Text>
          <Text style={[styles.headerCell, styles.colReps]}>Repeticiones</Text>
          <Text style={[styles.headerCell, styles.colCheck]}>Check</Text>
        </View>

        {item.sets.map((set, index) => (
          <SetRow
            key={set.setNumber}
            set={set}
            index={index}
            colors={colors}
            styles={styles}
            onChangeWeight={(value) => onChangeWeight(index, value)}
            onChangeReps={(value) => onChangeReps(index, value)}
            onToggleSet={() => onToggleSet(index)}
            onDelete={() => onDeleteSet(index)}
          />
        ))}
      </Card>

      <Button title="+ Agregar Serie" onPress={onAddSet} style={styles.addSetButton} />
    </View>
  );
}

interface SetRowProps {
  set: ActiveSetRow;
  index: number;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onChangeWeight: (value: string) => void;
  onChangeReps: (value: string) => void;
  onToggleSet: () => void;
  onDelete: () => Promise<boolean>;
}

// Fila de una serie individual: swipe hacia la izquierda revela un botón
// rojo de eliminar, mismo patrón que Mail/Recordatorios de iOS.
function SetRow({ set, index, colors, styles, onChangeWeight, onChangeReps, onToggleSet, onDelete }: SetRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const success = await onDelete();
    if (!success) {
      setDeleting(false);
      swipeableRef.current?.close();
    }
    // Si tuvo éxito, la fila se desmonta cuando el padre saca la serie del estado.
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable onPress={handleDelete} disabled={deleting} style={styles.deleteAction}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.white} />
          )}
        </Pressable>
      )}
    >
      <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
        <Text style={[styles.rowText, styles.colSerie]}>{set.setNumber}</Text>
        <TextInput
          style={[styles.cellInput, styles.colKg]}
          value={set.weight}
          onChangeText={onChangeWeight}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          editable={!set.completed}
          textAlign="center"
        />
        <TextInput
          style={[styles.cellInput, styles.colReps]}
          value={set.reps}
          onChangeText={onChangeReps}
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
            <Pressable onPress={onToggleSet} hitSlop={8} style={styles.checkButton}>
              <SetCheckIcon completed={set.completed} colors={colors} />
            </Pressable>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

// Ícono de check con un pequeño rebote de escala al pasar a completado.
function SetCheckIcon({ completed, colors }: { completed: boolean; colors: ThemeColors }) {
  const scale = useSharedValue(1);
  const wasCompleted = useRef(completed);

  useEffect(() => {
    if (completed && !wasCompleted.current) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 120 }),
        withTiming(1, { duration: 120 })
      );
    }
    wasCompleted.current = completed;
  }, [completed, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedIonicons
      name={completed ? 'checkmark-circle' : 'ellipse-outline'}
      size={26}
      color={completed ? colors.primary : colors.textTertiary}
      style={animatedStyle}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.sm,
    },
    card: {
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    exerciseName: {
      flex: 1,
      fontSize: 17,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
    },
    menuButton: {
      padding: 4,
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
      backgroundColor: colors.surface,
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
    deleteAction: {
      width: 72,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    addSetButton: {
      height: 48,
    },
  });
}
