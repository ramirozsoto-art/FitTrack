import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { fetchExercises } from '../../lib/exercises';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { Exercise } from '../../types/database';
import type { EjerciciosStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EjerciciosStackParamList, 'EjerciciosHome'>;

const ALL_FILTER = 'Todos';

// Chip individual de filtro (grupo muscular o equipamiento). No se reutiliza
// en otro lado todavía, por eso vive acá adentro en vez de en components/ui.
function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState(ALL_FILTER);
  const [equipmentFilter, setEquipmentFilter] = useState(ALL_FILTER);

  useEffect(() => {
    let active = true;
    fetchExercises()
      .then((data) => {
        if (active) setExercises(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
        <Text style={styles.title}>Ejercicios</Text>
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
          ListEmptyComponent={
            <Text style={styles.emptyText}>No encontramos ejercicios con esos filtros.</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
