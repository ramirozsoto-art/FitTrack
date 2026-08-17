import { useCallback, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { dayIndexFromISODate, getWeekStart, todayIndex, WEEKDAY_LABELS } from '../../lib/date';
import { fetchUserRoutines, fetchWeeklyWorkouts } from '../../lib/routines';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { MainTabScreenProps } from '../../navigation/types';
import type { Routine, Workout } from '../../types/database';

const DAYS = WEEKDAY_LABELS;
const TODAY_INDEX = todayIndex();

const screenWidth = Dimensions.get('window').width;

type Props = MainTabScreenProps<'Inicio'>;

// Dashboard (tab "Inicio"): saludo, rutina de hoy, calendario semanal visual
// y gráfico de actividad, todo con datos reales de Supabase.
export default function DashboardScreen({ navigation }: Props) {
  const { profile, session } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? 'atleta';

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [routinesData, workoutsData] = await Promise.all([
        fetchUserRoutines(session.user.id),
        fetchWeeklyWorkouts(session.user.id, getWeekStart()),
      ]);
      setRoutines(routinesData);
      setWorkouts(workoutsData);
    } catch {
      // Si falla, se mantienen los últimos datos cargados; se puede reintentar con pull-to-refresh.
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
    navigation.navigate('Entrenamiento', {
      screen: 'ActiveWorkout',
      params: { routineId: latestRoutine.id },
    });
  };

  const trainedDayIndices = useMemo(() => {
    return new Set(workouts.map((w) => dayIndexFromISODate(w.started_at)));
  }, [workouts]);

  const dailyCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    workouts.forEach((w) => {
      counts[dayIndexFromISODate(w.started_at)] += 1;
    });
    return counts;
  }, [workouts]);

  const activityData = useMemo(
    () => ({ labels: DAYS, datasets: [{ data: dailyCounts }] }),
    [dailyCounts]
  );

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
        {workouts.length > 0 ? (
          <Card style={styles.chartCard}>
            <LineChart
              data={activityData}
              width={screenWidth - spacing.md * 2 - spacing.sm * 2}
              height={180}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(234, 88, 12, ${opacity})`,
                labelColor: () => colors.textSecondary,
                propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
              }}
              bezier
              style={styles.chart}
            />
          </Card>
        ) : (
          <Card style={styles.chartEmptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.chartEmptyText}>Todavía no registraste entrenamientos esta semana.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  chartCard: {
    alignItems: 'center',
    paddingRight: 0,
  },
  chart: {
    borderRadius: radius.md,
  },
  chartEmptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  chartEmptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
