import { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SegmentedControl from '../../components/ui/SegmentedControl';
import { useAuth } from '../../context/AuthContext';
import { fetchWorkoutStats } from '../../lib/stats';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { WorkoutStats } from '../../lib/stats';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'Estadisticas'>;

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - spacing.md * 2 - spacing.sm * 2;

const CHART_CONFIG = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(234, 88, 12, ${opacity})`,
  labelColor: () => colors.textSecondary,
  fillShadowGradient: colors.primary,
  fillShadowGradientOpacity: 1,
};

const VOLUME_RANGE_OPTIONS = [
  { label: 'Semanas', value: 'weekly' as const },
  { label: 'Meses', value: 'monthly' as const },
];

// Estadísticas de entrenamiento (Fase 4): volumen por semana/mes, frecuencia
// mensual y récords personales por ejercicio, calculados a partir del
// historial de workout_sets.
export default function EstadisticasScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [volumeRange, setVolumeRange] = useState<'weekly' | 'monthly'>('weekly');

  useFocusEffect(
    useCallback(() => {
      if (!session?.user) return;
      let active = true;
      setLoading(true);
      fetchWorkoutStats(session.user.id)
        .then((data) => {
          if (active) setStats(data);
        })
        .catch(() => {
          // Si falla, la pantalla queda vacía; se puede reintentar volviendo a entrar.
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [session])
  );

  const volumePoints = volumeRange === 'weekly' ? stats?.weeklyVolume ?? [] : stats?.monthlyVolume ?? [];
  const hasVolume = volumePoints.some((p) => p.totalVolumeKg > 0);
  const hasFrequency = (stats?.monthlyFrequency ?? []).some((p) => p.workoutCount > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Estadísticas" onBack={() => navigation.goBack()} />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
                chartConfig={CHART_CONFIG}
                style={styles.chart}
              />
            </Card>
          ) : (
            <EmptyStatCard icon="bar-chart-outline" text="Todavía no hay volumen registrado para graficar." />
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
                chartConfig={CHART_CONFIG}
                style={styles.chart}
              />
            </Card>
          ) : (
            <EmptyStatCard icon="calendar-outline" text="Todavía no hay entrenamientos completados este período." />
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
            <EmptyStatCard icon="trophy-outline" text="Todavía no hay récords para mostrar." />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyStatCard({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
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
