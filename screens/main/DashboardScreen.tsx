import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../theme';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const TODAY_INDEX = (new Date().getDay() + 6) % 7; // lunes = 0

// Datos de actividad hardcodeados: se reemplazan por datos reales en Fase 2.
const ACTIVITY_DATA = {
  labels: DAYS,
  datasets: [{ data: [20, 45, 28, 60, 35, 50, 15] }],
};

const screenWidth = Dimensions.get('window').width;

// Dashboard (tab "Inicio"): saludo, rutina de hoy, calendario semanal visual
// y gráfico de actividad. Todo con datos de ejemplo hasta la Fase 2.
export default function DashboardScreen() {
  const { profile, session } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? 'atleta';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Hola {firstName} 👋</Text>

        <Card style={styles.todayCard}>
          <View style={styles.todayCardHeader}>
            <View style={styles.todayIconWrap}>
              <Ionicons name="barbell" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayLabel}>Rutina de hoy</Text>
              <Text style={styles.todayTitle}>Tren superior</Text>
            </View>
          </View>
          <Button title="Entrenar" onPress={() => {}} style={styles.trainButton} />
        </Card>

        <Text style={styles.sectionTitle}>Esta semana</Text>
        <Card style={styles.weekCard}>
          {DAYS.map((day, index) => (
            <View key={index} style={styles.dayItem}>
              <View style={[styles.dayCircle, index === TODAY_INDEX && styles.dayCircleActive]}>
                <Text style={[styles.dayLabel, index === TODAY_INDEX && styles.dayLabelActive]}>
                  {day}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Actividad</Text>
        <Card style={styles.chartCard}>
          <LineChart
            data={ACTIVITY_DATA}
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
  },
  dayCircleActive: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  dayLabelActive: {
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },
  chartCard: {
    alignItems: 'center',
    paddingRight: 0,
  },
  chart: {
    borderRadius: radius.md,
  },
});
