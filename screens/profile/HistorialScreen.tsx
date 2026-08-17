import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { formatClock, formatShortDate } from '../../lib/date';
import { fetchCompletedWorkouts } from '../../lib/history';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { WorkoutSummary } from '../../lib/history';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Historial'>;

// Historial de entrenamientos completados (Fase 4): fecha, duración y
// volumen total de cada sesión, más reciente primero.
export default function HistorialScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user) return;
      let active = true;
      setLoading(true);
      fetchCompletedWorkouts(session.user.id)
        .then((data) => {
          if (active) setWorkouts(data);
        })
        .catch(() => {
          // Si falla, la lista queda como estaba; se puede reintentar volviendo a la pantalla.
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [session])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Historial" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="time-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>
                Todavía no tenés entrenamientos completados. Terminá uno desde el tab Entrenamiento para verlo acá.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('HistorialDetail', {
                  workoutId: item.id,
                  startedAt: item.started_at,
                  durationSeconds: item.duration_seconds,
                  totalVolumeKg: item.totalVolumeKg,
                })
              }
            >
              <Card style={styles.workoutCard}>
                <View style={styles.dateIconWrap}>
                  <Ionicons name="barbell" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workoutDate}>{formatShortDate(item.started_at)}</Text>
                  <Text style={styles.workoutMeta}>
                    {item.duration_seconds ? formatClock(item.duration_seconds) : '—'} · {Math.round(item.totalVolumeKg)} kg totales
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  dateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutDate: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  workoutMeta: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
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
});
