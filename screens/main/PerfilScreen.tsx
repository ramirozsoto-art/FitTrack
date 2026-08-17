import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { calculateTDEE } from '../../lib/tdee';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'PerfilHome'>;

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Perder grasa',
  gain_muscle: 'Ganar músculo',
  maintain: 'Mantener',
};

// Pantalla de perfil: datos de metabolismo basal, TDEE estimado, accesos a
// editar perfil / historial / estadísticas, y botón para cerrar sesión.
export default function PerfilScreen({ navigation }: Props) {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  const tdee =
    profile?.age && profile?.weight_kg && profile?.height_cm && profile?.gender && profile?.training_days && profile?.goal
      ? calculateTDEE({
          age: profile.age,
          weightKg: profile.weight_kg,
          heightCm: profile.height_cm,
          gender: profile.gender,
          trainingDays: profile.training_days,
          goal: profile.goal,
        })
      : null;

  const stats = [
    { label: 'Edad', value: profile?.age ? `${profile.age} años` : '—' },
    { label: 'Peso', value: profile?.weight_kg ? `${profile.weight_kg} kg` : '—' },
    { label: 'Altura', value: profile?.height_cm ? `${profile.height_cm} cm` : '—' },
    { label: 'Días de entreno', value: profile?.training_days ? `${profile.training_days}/sem` : '—' },
    { label: 'Objetivo', value: profile?.goal ? GOAL_LABELS[profile.goal] : '—' },
    { label: 'Calorías diarias (TDEE)', value: tdee ? `${tdee} kcal` : '—' },
  ];

  const menuItems = [
    {
      icon: 'time-outline' as const,
      label: 'Historial de entrenamientos',
      onPress: () => navigation.navigate('Historial'),
    },
    {
      icon: 'stats-chart-outline' as const,
      label: 'Estadísticas',
      onPress: () => navigation.navigate('Estadisticas'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Perfil</Text>
          <Button
            title="Editar"
            variant="secondary"
            onPress={() => navigation.navigate('EditarPerfil')}
            style={styles.editButton}
          />
        </View>

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

        <Text style={styles.sectionTitle}>Actividad</Text>
        <Card style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <View key={item.label}>
              {index > 0 && <View style={styles.menuDivider} />}
              <Pressable onPress={item.onPress} style={styles.menuRow}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  editButton: {
    height: 40,
    paddingHorizontal: spacing.sm,
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
    marginTop: spacing.md,
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
  menuCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 52,
    paddingHorizontal: spacing.sm,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
});
