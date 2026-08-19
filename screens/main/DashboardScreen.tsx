import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dayIndexFromISODate, getWeekStart, todayIndex, WEEKDAY_LABELS } from '../../lib/date';
import { fetchUserRoutines, fetchWeeklyWorkouts } from '../../lib/routines';
import { fetchWeeklyVolumeTrend, type WeeklyVolumeTrend } from '../../lib/stats';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { MainTabScreenProps } from '../../navigation/types';
import type { Routine, Workout } from '../../types/database';

const DAYS = WEEKDAY_LABELS;
const TODAY_INDEX = todayIndex();
const DEFAULT_WEEKLY_GOAL = 4;

type Props = MainTabScreenProps<'Inicio'>;

// Dashboard (tab "Inicio"): saludo, rutina de hoy, calendario semanal visual
// y gráfico de actividad, todo con datos reales de Supabase.
export default function DashboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile, session } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? 'atleta';

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<WeeklyVolumeTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!session?.user) return;
    try {
      const weekStart = getWeekStart();
      const [routinesData, workoutsData, volumeTrendData] = await Promise.all([
        fetchUserRoutines(session.user.id),
        fetchWeeklyWorkouts(session.user.id, weekStart),
        fetchWeeklyVolumeTrend(session.user.id, weekStart),
      ]);
      setRoutines(routinesData);
      setWorkouts(workoutsData);
      setVolumeTrend(volumeTrendData);
    } catch {
      // Si falla, se mantienen los últimos datos cargados; se puede reintentar con pull-to-refresh.
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const latestRoutine = routines[0] ?? null;

  const handleTrain = () => {
    if (!latestRoutine) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('Entrenamiento', {
      screen: 'ActiveWorkout',
      params: { routineId: latestRoutine.id },
    });
  };

  const trainedDayIndices = useMemo(() => {
    return new Set(workouts.map((w) => dayIndexFromISODate(w.started_at)));
  }, [workouts]);

  const weeklyGoal = profile?.training_days || DEFAULT_WEEKLY_GOAL;
  const workoutsThisWeek = workouts.length;
  const weeklyProgressPercent = Math.min(100, Math.round((workoutsThisWeek / weeklyGoal) * 100));

  const volumeDeltaKg = volumeTrend
    ? volumeTrend.currentWeekVolumeKg - volumeTrend.previousWeekVolumeKg
    : 0;
  const volumeTrendUp = volumeDeltaKg >= 0;
  const volumeDeltaPercent =
    volumeTrend && volumeTrend.previousWeekVolumeKg > 0
      ? Math.round((volumeDeltaKg / volumeTrend.previousWeekVolumeKg) * 100)
      : null;
  const volumeTrendLabel =
    volumeDeltaPercent !== null
      ? `${volumeTrendUp ? '+' : ''}${volumeDeltaPercent}%`
      : `${volumeTrendUp ? '+' : ''}${volumeDeltaKg} kg`;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DashboardSkeleton styles={styles} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.greeting}>Hola {firstName} 👋</Text>

        <Card style={styles.todayCard}>
          <View style={styles.todayCardHeader}>
            <View style={styles.todayIconWrap}>
              <Ionicons name="barbell" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayLabel}>Rutina de hoy</Text>
              <Text style={styles.todayTitle}>{latestRoutine?.name ?? 'Sin rutinas todavía'}</Text>
            </View>
          </View>
          {latestRoutine ? (
            <Button title="Entrenar" onPress={handleTrain} style={styles.trainButton} />
          ) : (
            <Text style={styles.todayEmptyText}>
              Creá tu primera rutina desde el tab Entrenamiento para verla acá.
            </Text>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Esta semana</Text>
        <Card style={styles.weekCard}>
          {DAYS.map((day, index) => {
            const trained = trainedDayIndices.has(index);
            return (
              <View key={index} style={styles.dayItem}>
                <View style={[styles.dayCircle, trained && styles.dayCircleActive]}>
                  {trained ? (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  ) : (
                    <Text style={[styles.dayLabel, index === TODAY_INDEX && styles.dayLabelToday]}>
                      {day}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        <Text style={styles.sectionTitle}>Actividad</Text>
        <Card style={styles.activityCard}>
          <View style={styles.activityBlock}>
            <View style={styles.activityBlockHeader}>
              <Text style={styles.activityLabel}>Progreso semanal</Text>
              <Text style={styles.activityValue}>
                {workoutsThisWeek} de {weeklyGoal} entrenamientos
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${weeklyProgressPercent}%` }]} />
            </View>
          </View>

          <View style={styles.activityDivider} />

          <View style={styles.activityBlock}>
            <View style={styles.activityBlockHeader}>
              <Text style={styles.activityLabel}>Volumen esta semana</Text>
              <View style={styles.trendRow}>
                <Text style={styles.activityValue}>{volumeTrend?.currentWeekVolumeKg ?? 0} kg</Text>
                {volumeTrend?.hasPreviousWeekData && (
                  <View style={styles.trendBadge}>
                    <Ionicons
                      name={volumeTrendUp ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color={volumeTrendUp ? colors.success : colors.error}
                    />
                    <Text
                      style={[
                        styles.trendText,
                        { color: volumeTrendUp ? colors.success : colors.error },
                      ]}
                    >
                      {volumeTrendLabel}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {volumeTrend && !volumeTrend.hasPreviousWeekData && (
              <Text style={styles.activityHint}>
                Todavía no hay datos de la semana pasada para comparar.
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// Silueta de carga del Dashboard: saludo, tarjeta "rutina de hoy", semana y gráfico.
function DashboardSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.scrollContent}>
      <Skeleton width={180} height={30} style={{ marginBottom: spacing.sm }} />

      <Card style={styles.todayCard}>
        <View style={styles.todayCardHeader}>
          <Skeleton width={44} height={44} radius={radius.md} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="50%" height={13} />
            <Skeleton width="75%" height={19} />
          </View>
        </View>
        <Skeleton height={48} radius={radius.md} />
      </Card>

      <Skeleton width={130} height={22} style={{ marginBottom: spacing.xs }} />
      <Card style={[styles.weekCard, { alignItems: 'center' }]}>
        {DAYS.map((_, index) => (
          <Skeleton key={index} width={32} height={32} radius={16} />
        ))}
      </Card>

      <Skeleton width={100} height={22} style={{ marginBottom: spacing.xs }} />
      <Card style={styles.activityCard}>
        <View style={{ gap: 6 }}>
          <Skeleton width="60%" height={13} />
          <Skeleton height={8} radius={radius.full} />
        </View>
        <View style={styles.activityDivider} />
        <View style={{ gap: 6 }}>
          <Skeleton width="50%" height={13} />
          <Skeleton width="40%" height={19} />
        </View>
      </Card>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
    },
    greeting: {
      fontSize: 28,
      fontFamily: fontFamily.bold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    todayCard: {
      marginBottom: spacing.md,
    },
    todayCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    todayIconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayLabel: {
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
    },
    todayTitle: {
      fontSize: 19,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
    },
    todayEmptyText: {
      fontSize: 13,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    trainButton: {
      height: 48,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    weekCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    dayItem: {
      alignItems: 'center',
    },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    dayCircleActive: {
      backgroundColor: colors.primary,
    },
    dayLabel: {
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
    },
    dayLabelToday: {
      color: colors.primary,
      fontFamily: fontFamily.semiBold,
    },
    activityCard: {
      gap: spacing.sm,
    },
    activityBlock: {
      gap: spacing.xs,
    },
    activityBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    activityLabel: {
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
    },
    activityValue: {
      fontSize: 15,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
    },
    activityDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    progressTrack: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
      backgroundColor: colors.primary,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    trendText: {
      fontSize: 13,
      fontFamily: fontFamily.semiBold,
    },
    activityHint: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textTertiary,
    },
  });
}
