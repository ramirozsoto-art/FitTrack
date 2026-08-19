import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Skeleton from '../../components/ui/Skeleton';
import TextField from '../../components/ui/TextField';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  computeExerciseDetail,
  computeGeneralStats,
  computeMuscleGroupDetail,
  computeMuscleGroupVolumes,
  computeTrainedExercises,
  fetchStatsDataset,
  STATS_PERIOD_OPTIONS,
} from '../../lib/stats';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type {
  ExerciseDetailStats,
  GeneralStats,
  HeatmapDay,
  MuscleGroupDetail,
  MuscleGroupVolume,
  StatsPeriod,
  StatsSetEntry,
  TrainedExercise,
} from '../../lib/stats';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Estadisticas'>;
type Styles = ReturnType<typeof createStyles>;
type StatsView = 'general' | 'exercise' | 'muscle';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - spacing.md * 2 - spacing.sm * 2;

const VIEW_OPTIONS: { label: string; value: StatsView }[] = [
  { label: 'General', value: 'general' },
  { label: 'Ejercicio', value: 'exercise' },
  { label: 'Grupo muscular', value: 'muscle' },
];

const VOLUME_RANGE_OPTIONS = [
  { label: 'Semanas', value: 'weekly' as const },
  { label: 'Meses', value: 'monthly' as const },
];

// Convierte un color hex (#RRGGBB) a rgba(...), usado tanto para los
// callbacks de color de react-native-chart-kit como para el heatmap y las
// barras horizontales (hechas a mano con Views, sin librería nueva).
function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Estadísticas de entrenamiento: vista General (volumen, frecuencia, racha,
// heatmap), Por Ejercicio (PRs, 1RM estimado, progresión) y Por Grupo
// Muscular (comparación de volumen entre grupos + detalle de uno puntual),
// todo filtrable por período (4 semanas / 3 meses / todo el historial).
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
      propsForDots: { r: '3', strokeWidth: '1', stroke: colors.primary },
    }),
    [colors]
  );
  const { session } = useAuth();
  const [dataset, setDataset] = useState<StatsSetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<StatsView>('general');
  const [period, setPeriod] = useState<StatsPeriod>('3m');

  const loadDataset = useCallback(async () => {
    if (!session?.user) return;
    try {
      const data = await fetchStatsDataset(session.user.id);
      setDataset(data);
    } catch {
      // Si falla, la pantalla queda como estaba; se puede reintentar con pull-to-refresh.
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadDataset().finally(() => setLoading(false));
    }, [loadDataset])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDataset();
    setRefreshing(false);
  };

  const hasAnyData = dataset.length > 0;

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
              <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
              <View style={styles.periodRow}>
                <SegmentedControl options={STATS_PERIOD_OPTIONS} value={period} onChange={setPeriod} />
              </View>

              {view === 'general' && (
                <GeneralView dataset={dataset} period={period} colors={colors} styles={styles} chartConfig={chartConfig} />
              )}
              {view === 'exercise' && (
                <ExerciseView dataset={dataset} period={period} colors={colors} styles={styles} chartConfig={chartConfig} />
              )}
              {view === 'muscle' && <MuscleGroupView dataset={dataset} period={period} colors={colors} styles={styles} />}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Vista General
// ---------------------------------------------------------------------------

interface ViewProps {
  dataset: StatsSetEntry[];
  period: StatsPeriod;
  colors: ThemeColors;
  styles: Styles;
}

function GeneralView({ dataset, period, colors, styles, chartConfig }: ViewProps & { chartConfig: any }) {
  const stats: GeneralStats = useMemo(() => computeGeneralStats(dataset, period), [dataset, period]);
  const [volumeRange, setVolumeRange] = useState<'weekly' | 'monthly'>('weekly');

  const volumePoints = volumeRange === 'weekly' ? stats.weeklyVolume : stats.monthlyVolume;
  const hasVolume = volumePoints.some((p) => p.totalVolumeKg > 0);
  const hasFrequency = stats.monthlyFrequency.some((p) => p.workoutCount > 0);

  return (
    <>
      <View style={styles.statGrid}>
        <MiniStat icon="barbell-outline" label="Volumen total" value={`${stats.totalVolumeKg} kg`} colors={colors} styles={styles} />
        <MiniStat
          icon="flame-outline"
          label="Racha más larga"
          value={stats.longestStreakWeeks > 0 ? `${stats.longestStreakWeeks} sem.` : '—'}
          colors={colors}
          styles={styles}
        />
      </View>

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
        <EmptyStatCard icon="bar-chart-outline" text="Todavía no hay volumen registrado para graficar en este período." styles={styles} colors={colors} />
      )}

      <Text style={styles.sectionTitle}>Frecuencia de entrenamientos</Text>
      {hasFrequency ? (
        <Card style={styles.chartCard}>
          <BarChart
            data={{
              labels: stats.monthlyFrequency.map((p) => p.label),
              datasets: [{ data: stats.monthlyFrequency.map((p) => p.workoutCount) }],
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
        <EmptyStatCard icon="calendar-outline" text="Todavía no hay entrenamientos completados en este período." styles={styles} colors={colors} />
      )}

      <Text style={styles.sectionTitle}>Constancia</Text>
      <Card style={styles.heatmapCard}>
        <Heatmap days={stats.heatmap} colors={colors} styles={styles} />
      </Card>
    </>
  );
}

// Grilla estilo "contribuciones de GitHub": una columna por semana, 7 filas
// (lunes a domingo), más oscuro cuanto mayor el volumen entrenado ese día.
function Heatmap({ days, colors, styles }: { days: HeatmapDay[]; colors: ThemeColors; styles: Styles }) {
  const weeks = useMemo(() => {
    const chunks: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
    return chunks;
  }, [days]);

  const maxVolume = Math.max(1, ...days.map((d) => d.volumeKg));

  const cellColor = (volumeKg: number) => {
    if (volumeKg <= 0) return colors.background;
    const ratio = Math.min(1, volumeKg / maxVolume);
    return hexToRgba(colors.primary, 0.25 + ratio * 0.75);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.heatmapGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.heatmapColumn}>
            {week.map((day) => (
              <View
                key={day.date}
                style={[styles.heatmapCell, { backgroundColor: cellColor(day.volumeKg), borderColor: colors.border }]}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Vista Por Ejercicio
// ---------------------------------------------------------------------------

function ExerciseView({ dataset, period, colors, styles, chartConfig }: ViewProps & { chartConfig: any }) {
  const trainedExercises = useMemo(() => computeTrainedExercises(dataset), [dataset]);
  const [search, setSearch] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trainedExercises;
    return trainedExercises.filter((e) => e.exerciseName.toLowerCase().includes(query));
  }, [trainedExercises, search]);

  const detail: ExerciseDetailStats | null = useMemo(
    () => (selectedExerciseId ? computeExerciseDetail(dataset, period, selectedExerciseId) : null),
    [dataset, period, selectedExerciseId]
  );

  if (trainedExercises.length === 0) {
    return (
      <EmptyStatCard icon="barbell-outline" text="Todavía no entrenaste ningún ejercicio." styles={styles} colors={colors} />
    );
  }

  if (!selectedExerciseId) {
    return (
      <>
        <TextField placeholder="Buscar ejercicio" value={search} onChangeText={setSearch} autoCapitalize="none" />
        {filtered.length === 0 ? (
          <EmptyStatCard icon="search-outline" text="No encontramos ejercicios con ese nombre." styles={styles} colors={colors} />
        ) : (
          filtered.map((ex: TrainedExercise) => (
            <Pressable key={ex.exerciseId} onPress={() => setSelectedExerciseId(ex.exerciseId)}>
              <Card style={styles.exerciseRow}>
                <View style={styles.exerciseIconWrap}>
                  <Ionicons name="fitness-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.exerciseRowName}>{ex.exerciseName}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Card>
            </Pressable>
          ))
        )}
      </>
    );
  }

  return (
    <>
      <Pressable onPress={() => setSelectedExerciseId(null)} style={styles.changeRow} hitSlop={8}>
        <Ionicons name="chevron-back" size={16} color={colors.primary} />
        <Text style={styles.changeRowText}>Cambiar ejercicio</Text>
      </Pressable>

      {!detail ? (
        <EmptyStatCard
          icon="bar-chart-outline"
          text="No hay datos de este ejercicio en el período seleccionado."
          styles={styles}
          colors={colors}
        />
      ) : (
        <>
          <Text style={styles.exerciseDetailName}>{detail.exerciseName}</Text>

          <View style={styles.statGrid}>
            <MiniStat icon="trophy-outline" label="PR peso máximo" value={`${detail.prMaxWeightKg} kg`} colors={colors} styles={styles} />
            <MiniStat
              icon="stats-chart-outline"
              label="PR volumen (1 serie)"
              value={`${detail.prMaxSetVolumeKg} kg`}
              colors={colors}
              styles={styles}
            />
            <MiniStat icon="repeat-outline" label="Veces entrenado" value={String(detail.timesTrained)} colors={colors} styles={styles} />
            <MiniStat icon="calculator-outline" label="1RM estimado" value={`${detail.estimated1RmKg} kg`} colors={colors} styles={styles} />
          </View>
          <Text style={styles.hintText}>
            El 1RM estimado usa la fórmula de Epley (peso × (1 + reps / 30)) sobre la mejor serie registrada: es una estimación, no un valor medido.
          </Text>

          <Text style={styles.sectionTitle}>Progresión de peso máximo</Text>
          {detail.progression.length > 1 ? (
            <Card style={styles.chartCard}>
              <LineChart
                data={{
                  labels: detail.progression.map((p) => p.label),
                  datasets: [{ data: detail.progression.map((p) => p.maxWeightKg) }],
                }}
                width={chartWidth}
                height={180}
                yAxisLabel=""
                yAxisSuffix=" kg"
                fromZero
                bezier
                withInnerLines={false}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </Card>
          ) : (
            <EmptyStatCard
              icon="trending-up-outline"
              text="Hace falta más de un entrenamiento con este ejercicio en el período para graficar la progresión."
              styles={styles}
              colors={colors}
            />
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista Por Grupo Muscular
// ---------------------------------------------------------------------------

function MuscleGroupView({ dataset, period, colors, styles }: ViewProps) {
  const groups: MuscleGroupVolume[] = useMemo(() => computeMuscleGroupVolumes(dataset, period), [dataset, period]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroup && !groups.some((g) => g.muscleGroup === selectedGroup)) {
      setSelectedGroup(null);
    }
  }, [groups, selectedGroup]);

  const detailGroup = selectedGroup ?? groups[0]?.muscleGroup ?? null;
  const detail: MuscleGroupDetail | null = useMemo(
    () => (detailGroup ? computeMuscleGroupDetail(dataset, period, detailGroup) : null),
    [dataset, period, detailGroup]
  );

  if (groups.length === 0) {
    return (
      <EmptyStatCard
        icon="body-outline"
        text="Todavía no hay volumen registrado por grupo muscular en este período."
        styles={styles}
        colors={colors}
      />
    );
  }

  const maxVolume = Math.max(1, ...groups.map((g) => g.totalVolumeKg));

  return (
    <>
      <Text style={styles.sectionTitle}>Volumen por grupo muscular</Text>
      <Card style={styles.barsCard}>
        {groups.map((g) => (
          <View key={g.muscleGroup} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {g.muscleGroup}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { width: `${Math.max(4, (g.totalVolumeKg / maxVolume) * 100)}%`, backgroundColor: colors.primary }]}
              />
            </View>
            <Text style={styles.barValue}>{g.totalVolumeKg} kg</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.sectionTitle}>Detalle por grupo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {groups.map((g) => (
          <FilterChip
            key={g.muscleGroup}
            label={g.muscleGroup}
            selected={detailGroup === g.muscleGroup}
            onPress={() => setSelectedGroup(g.muscleGroup)}
            styles={styles}
          />
        ))}
      </ScrollView>

      {detail && (
        <View style={styles.statGrid}>
          <MiniStat icon="barbell-outline" label="Volumen total" value={`${detail.totalVolumeKg} kg`} colors={colors} styles={styles} />
          <MiniStat icon="layers-outline" label="Series totales" value={String(detail.totalSets)} colors={colors} styles={styles} />
          <MiniStat icon="trending-up-outline" label="Peso máximo" value={`${detail.maxWeightKg} kg`} colors={colors} styles={styles} />
          <MiniStat
            icon="calendar-outline"
            label="Frecuencia"
            value={`${detail.workoutsPerWeek}/sem.`}
            colors={colors}
            styles={styles}
          />
        </View>
      )}
    </>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------

function MiniStat({
  icon,
  label,
  value,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ThemeColors;
  styles: Styles;
}) {
  return (
    <Card style={styles.miniStatCard}>
      <View style={styles.miniStatIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </Card>
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
  styles: Styles;
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

// Silueta de carga: selector + período, dos stat tiles, gráfico de volumen,
// gráfico de frecuencia y heatmap — la forma de la vista General, que es la
// que se ve primero al entrar.
function EstadisticasSkeleton({ styles }: { styles: Styles }) {
  return (
    <View style={styles.scrollContent}>
      <Skeleton height={44} radius={radius.md} style={{ marginBottom: spacing.xs }} />
      <View style={styles.periodRow}>
        <Skeleton height={44} radius={radius.md} />
      </View>

      <View style={styles.statGrid}>
        <Skeleton width="47%" height={72} radius={radius.md} />
        <Skeleton width="47%" height={72} radius={radius.md} />
      </View>

      <Skeleton width={160} height={22} style={{ marginTop: spacing.md, marginBottom: spacing.xs }} />
      <Card style={styles.chartCard}>
        <Skeleton width={chartWidth} height={200} radius={radius.md} />
      </Card>

      <Skeleton width={200} height={22} style={{ marginTop: spacing.md, marginBottom: spacing.xs }} />
      <Card style={styles.chartCard}>
        <Skeleton width={chartWidth} height={180} radius={radius.md} />
      </Card>

      <Skeleton width={120} height={22} style={{ marginTop: spacing.md, marginBottom: spacing.xs }} />
      <Card style={styles.heatmapCard}>
        <Skeleton width={chartWidth} height={100} radius={radius.md} />
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
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    periodRow: {
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
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
    hintText: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textTertiary,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    // ---- stat grid (MiniStat 2x2) ----
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    miniStatCard: {
      flexBasis: '47%',
      flexGrow: 1,
    },
    miniStatIconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    miniStatValue: {
      fontSize: 18,
      fontFamily: fontFamily.bold,
      color: colors.textPrimary,
    },
    miniStatLabel: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // ---- heatmap ----
    heatmapCard: {
      alignItems: 'flex-start',
    },
    heatmapGrid: {
      flexDirection: 'row',
      gap: 4,
    },
    heatmapColumn: {
      gap: 4,
    },
    heatmapCell: {
      width: 14,
      height: 14,
      borderRadius: 3,
      borderWidth: 1,
    },
    // ---- por ejercicio ----
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    exerciseIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exerciseRowName: {
      flex: 1,
      fontSize: 15,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    changeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 2,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    changeRowText: {
      fontSize: 14,
      fontFamily: fontFamily.medium,
      color: colors.primary,
    },
    exerciseDetailName: {
      fontSize: 20,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    // ---- por grupo muscular ----
    barsCard: {
      gap: spacing.xs,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    barLabel: {
      width: 90,
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
    },
    barTrack: {
      flex: 1,
      height: 14,
      borderRadius: radius.full,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    barValue: {
      width: 60,
      textAlign: 'right',
      fontSize: 12,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    chipRow: {
      gap: 8,
      paddingVertical: 2,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.white,
    },
  });
}
