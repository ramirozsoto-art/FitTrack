import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { colors, fontFamily, spacing } from '../../theme';
import type { EjerciciosStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EjerciciosStackParamList, 'ExerciseDetail'>;

// Detalle de un ejercicio de la biblioteca: nombre, grupo muscular y
// equipamiento. El ejercicio viaja completo por params (ya se cargó en la
// lista), así que no hace falta pedirlo de nuevo a Supabase.
export default function ExerciseDetailScreen({ navigation, route }: Props) {
  const { exercise } = route.params;

  const details = [
    { label: 'Grupo muscular', value: exercise.muscle_group ?? '—' },
    { label: 'Equipamiento', value: exercise.equipment ?? '—' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Ejercicio" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="fitness-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.name}>{exercise.name}</Text>

        <Card style={styles.detailsCard}>
          {details.map((detail, index) => (
            <View
              key={detail.label}
              style={[styles.detailRow, index < details.length - 1 && styles.detailRowBorder]}
            >
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 22,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  detailsCard: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
});
