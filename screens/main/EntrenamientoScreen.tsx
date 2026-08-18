import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { deleteRoutine, fetchUserRoutines } from '../../lib/routines';
import { colors, fontFamily, spacing } from '../../theme';
import type { Routine } from '../../types/database';
import type { EntrenamientoStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EntrenamientoStackParamList, 'EntrenamientoHome'>;

// Pantalla raíz del tab "Entrenamiento": empezar un entrenamiento (en blanco
// o desde una rutina), crear rutina y la lista de rutinas guardadas.
export default function EntrenamientoScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutines = useCallback(async () => {
    if (!session?.user) return;
    try {
      const data = await fetchUserRoutines(session.user.id);
      setRoutines(data);
    } catch {
      // Si falla, la lista queda como estaba; el usuario puede reintentar con pull-to-refresh.
    }
  }, [session]);

  // Refresca cada vez que la pantalla vuelve a foco (ej: al volver de Crear Rutina).
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRoutines().finally(() => setLoading(false));
    }, [loadRoutines])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  const handleStartBlank = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('ActiveWorkout', { routineId: null });
  };
  const handleStartRoutine = (routineId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('ActiveWorkout', { routineId });
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert('Eliminar rutina', `¿Seguro que querés eliminar "${routine.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          const previous = routines;
          setRoutines((current) => current.filter((r) => r.id !== routine.id));
          try {
            await deleteRoutine(routine.id);
          } catch (err) {
            setRoutines(previous);
            // Mostramos el mensaje real de Postgres/PostgREST (RLS, foreign key,
            // etc.) en vez de un genérico: es la única forma de diagnosticar
            // por qué falla sin acceso directo a la base.
            const message = err instanceof Error ? err.message : 'Intentá de nuevo.';
            if (__DEV__) console.log('[deleteRoutine] error:', err);
            Alert.alert('No se pudo eliminar la rutina', message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Entrenamiento" />
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Button title="Empezar nuevo Entrenamiento" onPress={handleStartBlank} style={styles.startButton} />

            <Text style={styles.sectionTitle}>Rutinas</Text>
            <Button
              title="+ Crear nueva Rutina"
              variant="secondary"
              onPress={() => navigation.navigate('CrearRutina')}
              style={styles.createButton}
            />

            <Text style={styles.subsectionTitle}>Mis Rutinas</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="clipboard-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>Aún no tenés rutinas. Creá tu primera rutina para empezar.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.routineCard}>
            <View style={styles.routineHeader}>
              <Text style={styles.routineName} numberOfLines={1}>
                {item.name}
              </Text>
              <Pressable onPress={() => handleDeleteRoutine(item)} hitSlop={8} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
            <Button title="Empezar Rutina" onPress={() => handleStartRoutine(item.id)} style={styles.routineButton} />
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  startButton: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  createButton: {
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  routineCard: {
    marginBottom: spacing.xs,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  routineName: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  deleteButton: {
    padding: 6,
  },
  routineButton: {
    height: 44,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    paddingHorizontal: spacing.lg,
  },
});
