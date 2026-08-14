import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../theme';

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Perder grasa',
  gain_muscle: 'Ganar músculo',
  maintain: 'Mantener',
};

// Pantalla de perfil: datos de metabolismo basal cargados en el onboarding
// y botón para cerrar sesión.
export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  const stats = [
    { label: 'Edad', value: profile?.age ? `${profile.age} años` : '—' },
    { label: 'Peso', value: profile?.weight_kg ? `${profile.weight_kg} kg` : '—' },
    { label: 'Altura', value: profile?.height_cm ? `${profile.height_cm} cm` : '—' },
    { label: 'Días de entreno', value: profile?.training_days ? `${profile.training_days}/sem` : '—' },
    { label: 'Objetivo', value: profile?.goal ? GOAL_LABELS[profile.goal] : '—' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Perfil</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Sin nombre'}</Text>
          <Text style={styles.email}>{session?.user?.email}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Tus datos</Text>
        <Card>
          {stats.map((stat, index) => (
            <View
              key={stat.label}
              style={[styles.statRow, index < stats.length - 1 && styles.statRowBorder]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </Card>

        <Button
          title="Cerrar sesión"
          variant="secondary"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
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
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  email: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
});
