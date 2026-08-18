import { useCallback, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
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
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { MainTabScreenProps } from '../../navigation/types';
import type { Routine, Workout } from '../../types/database';

const DAYS = WEEKDAY_LABELS;
const TODAY_INDEX = todayIndex();

const screenWidth = Dimensions.get('window').width;

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
  const [loading, setLoading] = useState(true);
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
                color: (opacity = 1) => hexToRgba(colors.primary, opacity),
                labelColor: (opacity = 1) => hexToRgba(colors.textSecondary, opacity),
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

// Convierte un color hex (#RRGGBB) a rgba(...) para los callbacks de color de
// react-native-chart-kit, que necesitan variar la opacidad de un color que
// ahora depende del theme activo (antes era un rgba(234, 88, 12, ...) fijo).
function hexToRgba(hex: string, opacity: number): string {
  const match = hex.replace('#', '');
  const r = parseInt(match.substring(0, 2), 16);
  const g = parseInt(match.substring(2, 4), 16);
  const b = parseInt(match.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
      <Card style={styles.chartCard}>
        <Skeleton width={screenWidth - spacing.md * 2 - spacing.sm * 2} height={180} radius={radius.md} />
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
}
