import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import TextField from '../ui/TextField';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { Exercise } from '../../types/database';

export interface ExercisePickerSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface ExercisePickerSheetProps {
  onSelect: (exercise: Exercise) => void;
}

const SNAP_POINTS = ['75%'];

// Bottom sheet con buscador para elegir un ejercicio de la tabla "exercises"
// y agregarlo a la rutina en edición. Se controla desde afuera vía ref
// (present/dismiss) para no tener que envolver toda la app en un provider.
const ExercisePickerSheet = forwardRef<ExercisePickerSheetRef, ExercisePickerSheetProps>(
  ({ onSelect }, ref) => {
    const { colors, scheme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const sheetRef = useRef<BottomSheet>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
      let active = true;
      supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })
        .then(({ data }) => {
          if (active) {
            setExercises((data as Exercise[]) ?? []);
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        present: () => sheetRef.current?.expand(),
        dismiss: () => sheetRef.current?.close(),
      }),
      []
    );

    const filtered = useMemo(() => {
      if (!search.trim()) return exercises;
      const query = search.trim().toLowerCase();
      return exercises.filter((e) => e.name?.toLowerCase().includes(query));
    }, [exercises, search]);

    const handleSelect = useCallback(
      (exercise: Exercise) => {
        onSelect(exercise);
        setSearch('');
        sheetRef.current?.close();
      },
      [onSelect]
    );

    // Backdrop con glassmorphism: BlurView como fondo (en vez del overlay
    // semitransparente plano de BottomSheetBackdrop) con tint según el modo.
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={1}
          style={[props.style, styles.backdropBg]}
        >
          <BlurView
            intensity={40}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        </BottomSheetBackdrop>
      ),
      [scheme, styles]
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.header}>
          <Text style={styles.title}>Agregar ejercicio</Text>
          <TextField
            placeholder="Buscar ejercicio"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </BottomSheetView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <BottomSheetFlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyText}>No encontramos ejercicios con ese nombre.</Text>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => handleSelect(item)}>
                <Card style={styles.exerciseCard}>
                  <View style={styles.exerciseIconWrap}>
                    <Ionicons name="fitness-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    {!!item.muscle_group && <Text style={styles.exerciseMeta}>{item.muscle_group}</Text>}
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </Card>
              </Pressable>
            )}
          />
        )}
      </BottomSheet>
    );
  }
);

ExercisePickerSheet.displayName = 'ExercisePickerSheet';

export default ExercisePickerSheet;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdropBg: {
      backgroundColor: 'transparent',
    },
    sheetBackground: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },
    handleIndicator: {
      backgroundColor: colors.border,
      width: 40,
    },
    header: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    title: {
      fontSize: 18,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    loading: {
      marginTop: spacing.lg,
    },
    listContent: {
      paddingHorizontal: spacing.sm,
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
}
