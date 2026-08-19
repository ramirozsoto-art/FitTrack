import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatClock, formatShortDate } from '../../lib/date';
import { computeHistorySummary, fetchCompletedWorkouts } from '../../lib/history';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { WorkoutSummary } from '../../lib/history';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Historial'>;

// Historial de entrenamientos completados (Fase 4): fecha, duración y
// volumen total de cada sesión, más reciente primero.
export default function HistorialScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    if (!session?.user) return;
    try {
      const data = await fetchCompletedWorkouts(session.user.id);
      setWorkouts(data);
    } catch {
      // Si falla, la lista queda como estaba; se puede reintentar con pull-to-refresh.
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadWorkouts().finally(() => setLoading(false));
    }, [loadWorkouts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const summary = useMemo(() => computeHistorySummary(workouts), [workouts]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Historial" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.listContent}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Skeleton width={32} height={24} style={{ marginBottom: 6 }} />
              <Skeleton width="70%" height={12} />
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Skeleton width={32} height={24} style={{ marginBottom: 6 }} />
              <Skeleton width="70%" height={12} />
            </View>
          </Card>
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} style={styles.workoutCard}>
              <Skeleton width={40} height={40} radius={radius.md} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="65%" height={13} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            workouts.length > 0 ? (
              <Card style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.totalWorkouts}</Text>
                  <Text style={styles.summaryLabel}>Entrenamientos totales</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.avgWorkoutsPerWeek}</Text>
                  <Text style={styles.summaryLabel}>Promedio por semana</Text>
                </View>
              </Card>
            ) : null
          }
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 22,
      fontFamily: fontFamily.bold,
      color: colors.textPrimary,
    },
    summaryLabel: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    summaryDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
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
}
