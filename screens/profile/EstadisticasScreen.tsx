import { useCallback, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fetchWorkoutStats } from '../../lib/stats';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { WorkoutStats } from '../../lib/stats';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Estadisticas'>;

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - spacing.md * 2 - spacing.sm * 2;

const VOLUME_RANGE_OPTIONS = [
  { label: 'Semanas', value: 'weekly' as const },
  { label: 'Meses', value: 'monthly' as const },
];

// Convierte un color hex (#RRGGBB) a rgba(...) para los callbacks de color de
// react-native-chart-kit, que necesitan variar la opacidad de un color que
// ahora depende del theme activo.
function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Estadísticas de entrenamiento (Fase 4): volumen por semana/mes, frecuencia
// mensual y récords personales por ejercicio, calculados a partir del
// historial de workout_sets.
export default function EstadisticasScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => hexToRgba(colors.primary, opacity),
      labelColor: (opacity = 1) => hexToRgba(colors.textSecondary, opacity),
      fillShadowGradient: colors.primary,
      fillShadowGradientOpacity: 1,
    }),
    [colors]
  );
  const { session } = useAuth();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [volumeRange, setVolumeRange] = useState<'weekly' | 'monthly'>('weekly');

  const loadStats = useCallback(async () => {
    if (!session?.user) return;
    try {
      const data = await fetchWorkoutStats(session.user.id);
      setStats(data);
    } catch {
      // Si falla, la pantalla queda como estaba; se puede reintentar con pull-to-refresh.
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadStats().finally(() => setLoading(false));
    }, [loadStats])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const volumePoints = volumeRange === 'weekly' ? stats?.weeklyVolume ?? [] : stats?.monthlyVolume ?? [];
  const hasVolume = volumePoints.some((p) => p.totalVolumeKg > 0);
  const hasFrequency = (stats?.monthlyFrequency ?? []).some((p) => p.workoutCount > 0);
  const hasAnyData = hasVolume || hasFrequency || !!stats?.personalRecords.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Estadísticas" onBack={() => navigation.goBack()} />

      {loading ? (
        <EstadisticasSkeleton styles={styles} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {!hasAnyData ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconWrap}>
                <Ionicons name="stats-chart-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>
                Todavía no tenés entrenamientos completados. Terminá uno desde el tab Entrenamiento para ver tus estadísticas acá.
              </Text>
            </View>
          ) : (
            <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Volumen entrenado</Text>
            <SegmentedControl options={VOLUME_RANGE_OPTIONS} value={volumeRange} onChange={setVolumeRange} />
          </View>
          {hasVolume ? (
            <Card style={styles.chartCard}>
              <BarChart
                data={{ labels: volumePoints.map((p) => p.label), datasets: [{ data: volumePoints.map((p) => p.totalVolumeKg) }] }}
                width={chartWidth}
                height={200}
                yAxisLabel=""
                yAxisSuffix=" kg"
                fromZero
                withInnerLines={false}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </Card>
          ) : (
            <EmptyStatCard icon="bar-chart-outline" text="Todavía no hay volumen registrado para graficar." styles={styles} colors={colors} />
          )}

          <Text style={styles.sectionTitle}>Frecuencia de entrenamientos</Text>
          {hasFrequency ? (
            <Card style={styles.chartCard}>
              <BarChart
                data={{
                  labels: (stats?.monthlyFrequency ?? []).map((p) => p.label),
                  datasets: [{ data: (stats?.monthlyFrequency ?? []).map((p) => p.workoutCount) }],
                }}
                width={chartWidth}
                height={180}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
                withInnerLines={false}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </Card>
          ) : (
            <EmptyStatCard icon="calendar-outline" text="Todavía no hay entrenamientos completados este período." styles={styles} colors={colors} />
          )}

          <Text style={styles.sectionTitle}>Récords personales</Text>
          {stats?.personalRecords.length ? (
            stats.personalRecords.map((pr) => (
              <Card key={pr.exerciseId} style={styles.prCard}>
                <View style={styles.prIconWrap}>
                  <Ionicons name="trophy-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prName}>{pr.exerciseName}</Text>
                  <Text style={styles.prMeta}>
                    Máx. peso: {pr.maxWeightKg} kg · Máx. volumen en 1 serie: {Math.round(pr.maxSetVolumeKg)} kg
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <EmptyStatCard icon="trophy-outline" text="Todavía no hay récords para mostrar." styles={styles} colors={colors} />
          )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyStatCard({
  icon,
  text,
  styles,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </Card>
  );
}

// Silueta de carga: título + gráfico de volumen, título + gráfico de
// frecuencia, título + un par de filas de récords personales.
function EstadisticasSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.scrollContent}>
      <Skeleton width={160} height={22} style={{ marginBottom: spacing.xs }} />
      <Card style={styles.chartCard}>
        <Skeleton width={chartWidth} height={200} radius={radius.md} />
      </Card>

      <Skeleton width={200} height={22} style={{ marginTop: spacing.md, marginBottom: spacing.xs }} />
      <Card style={styles.chartCard}>
        <Skeleton width={chartWidth} height={180} radius={radius.md} />
      </Card>

      <Skeleton width={150} height={22} style={{ marginTop: spacing.md, marginBottom: spacing.xs }} />
      {[0, 1].map((i) => (
        <Card key={i} style={styles.prCard}>
          <Skeleton width={36} height={36} radius={radius.md} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="50%" height={15} />
            <Skeleton width="80%" height={12} />
          </View>
        </Card>
      ))}
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
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    sectionHeaderRow: {
      marginBottom: spacing.xs,
      gap: spacing.xs,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    emptyStateIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    chartCard: {
      alignItems: 'center',
      paddingRight: 0,
    },
    chart: {
      borderRadius: radius.md,
    },
    emptyCard: {
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
    emptyText: {
      fontSize: 14,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    prCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    prIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prName: {
      fontSize: 15,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
    },
    prMeta: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
