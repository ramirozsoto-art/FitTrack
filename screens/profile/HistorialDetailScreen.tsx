import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { formatClock, formatShortDate } from '../../lib/date';
import { fetchWorkoutDetail } from '../../lib/history';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { WorkoutExerciseGroup } from '../../lib/history';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'HistorialDetail'>;

// Detalle de un entrenamiento pasado: ejercicios y series hechas (reps,
// peso), agrupados por ejercicio. El resumen del header viaja por params
// (ya se calculó en la lista); acá solo se pide el detalle de las series.
export default function HistorialDetailScreen({ navigation, route }: Props) {
  const { startedAt, durationSeconds, totalVolumeKg, workoutId } = route.params;
  const [groups, setGroups] = useState<WorkoutExerciseGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchWorkoutDetail(workoutId)
      .then((data) => {
        if (active) setGroups(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workoutId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title={formatShortDate(startedAt)} onBack={() => navigation.goBack()} />

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{durationSeconds ? formatClock(durationSeconds) : '—'}</Text>
          <Text style={styles.summaryLabel}>Duración</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(totalVolumeKg)} kg</Text>
          <Text style={styles.summaryLabel}>Volumen total</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {groups.map((group) => (
            <Card key={group.exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseIconWrap}>
                  <Ionicons name="fitness-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.exerciseName}>{group.exercise.name}</Text>
              </View>

              {group.sets.map((set) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={styles.setLabel}>Serie {set.set_number}</Text>
                  <Text style={styles.setValue}>
                    {set.weight ?? 0} kg × {set.reps ?? 0} reps
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                </View>
              ))}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  exerciseCard: {
    marginBottom: spacing.xs,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  exerciseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingLeft: 40,
  },
  setLabel: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    width: 64,
  },
  setValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
});
