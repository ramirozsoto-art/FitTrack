import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { useTheme } from '../../context/ThemeContext';
import { fetchExercises } from '../../lib/exercises';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { Exercise } from '../../types/database';
import type { EjerciciosStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EjerciciosStackParamList, 'EjerciciosHome'>;
type Styles = ReturnType<typeof createStyles>;

const ALL_FILTER = 'Todos';

// Chip individual de filtro (grupo muscular o equipamiento). No se reutiliza
// en otro lado todavía, por eso vive acá adentro en vez de en components/ui.
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

// Biblioteca de ejercicios (Fase 4): búsqueda por nombre, filtros por grupo
// muscular/equipamiento y navegación al detalle de cada ejercicio.
export default function EjerciciosScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState(ALL_FILTER);
  const [equipmentFilter, setEquipmentFilter] = useState(ALL_FILTER);

  const loadExercises = useCallback(async () => {
    try {
      const data = await fetchExercises();
      setExercises(data);
    } catch {
      // Si falla, la lista queda como estaba; se puede reintentar con pull-to-refresh.
    }
  }, []);

  // useFocusEffect (no useEffect) para que la lista se refresque sola al
  // volver de Crear Ejercicio y aparezca el que se acaba de crear.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadExercises().finally(() => setLoading(false));
    }, [loadExercises])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExercises();
    setRefreshing(false);
  };

  const muscleGroups = useMemo(() => {
    const values = new Set(exercises.map((e) => e.muscle_group).filter((v): v is string => !!v));
    return [ALL_FILTER, ...Array.from(values).sort()];
  }, [exercises]);

  const equipmentOptions = useMemo(() => {
    const values = new Set(exercises.map((e) => e.equipment).filter((v): v is string => !!v));
    return [ALL_FILTER, ...Array.from(values).sort()];
  }, [exercises]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((e) => {
      if (query && !e.name?.toLowerCase().includes(query)) return false;
      if (muscleGroupFilter !== ALL_FILTER && e.muscle_group !== muscleGroupFilter) return false;
      if (equipmentFilter !== ALL_FILTER && e.equipment !== equipmentFilter) return false;
      return true;
    });
  }, [exercises, search, muscleGroupFilter, equipmentFilter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Ejercicios</Text>
          <Button
            title="+ Crear"
            variant="secondary"
            onPress={() => navigation.navigate('CrearEjercicio')}
            style={styles.createButton}
          />
        </View>
        <TextField
          placeholder="Buscar ejercicio"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {!loading && exercises.length > 0 && (
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {muscleGroups.map((group) => (
              <FilterChip
                key={group}
                label={group}
                selected={muscleGroupFilter === group}
                onPress={() => setMuscleGroupFilter(group)}
                styles={styles}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {equipmentOptions.map((equipment) => (
              <FilterChip
                key={equipment}
                label={equipment}
                selected={equipmentFilter === equipment}
                onPress={() => setEquipmentFilter(equipment)}
                styles={styles}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>No encontramos ejercicios con esos filtros.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('ExerciseDetail', { exercise: item })}>
              <Card style={styles.exerciseCard}>
                <View style={styles.exerciseIconWrap}>
                  <Ionicons name="fitness-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  {!!item.muscle_group && (
                    <Text style={styles.exerciseMeta}>{item.muscle_group}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
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
    createButton: {
      height: 40,
      paddingHorizontal: spacing.sm,
    },
    filters: {
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    chipRow: {
      paddingHorizontal: spacing.md,
      gap: 8,
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
    listContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
      gap: spacing.xs,
    },
    exerciseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    exerciseIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exerciseName: {
      fontSize: 16,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    exerciseMeta: {
      fontSize: 13,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
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
    },
  });
}
