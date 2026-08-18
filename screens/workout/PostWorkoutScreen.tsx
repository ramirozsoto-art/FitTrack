import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dayIndexFromISODate, formatClock, getWeekStart, WEEKDAY_LABELS } from '../../lib/date';
import { fetchWeeklyWorkouts } from '../../lib/routines';
import { fontFamily, spacing, type ThemeColors } from '../../theme';
import type { EntrenamientoStackParamList, MainTabParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EntrenamientoStackParamList, 'PostWorkout'>;

// Resumen post-entrenamiento (captura 07 de Figma): racha semanal + stats
// de la sesión que acaba de terminar.
export default function PostWorkoutScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { durationSeconds, totalVolumeKg, exerciseCount, completedSetCount } = route.params;
  const { session } = useAuth();
  const [trainedDayIndices, setTrainedDayIndices] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!session?.user) return;
        try {
          const workouts = await fetchWeeklyWorkouts(session.user.id, getWeekStart());
          if (!active) return;
          setTrainedDayIndices(new Set(workouts.map((w) => dayIndexFromISODate(w.started_at))));
        } catch {
          // Si falla, la racha simplemente no se muestra actualizada; no bloquea la pantalla.
        }
      })();
      return () => {
        active = false;
      };
    }, [session])
  );

  const handleViewStats = () => {
    navigation.reset({ index: 0, routes: [{ name: 'EntrenamientoHome' }] });
    navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('Perfil', {
      screen: 'Estadisticas',
    });
  };

  const handleContinue = () => {
    navigation.reset({ index: 0, routes: [{ name: 'EntrenamientoHome' }] });
    navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate('Inicio');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={styles.doneCard}>
            <Text style={styles.doneText}>BIEN HECHO!</Text>
          </Card>
        </Animated.View>

        <View style={styles.statsGrid}>
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.statTileWrap}>
            <StatTile icon="time-outline" value={formatClock(durationSeconds)} label="Duración" />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.statTileWrap}>
            <StatTile icon="barbell-outline" value={`${Math.round(totalVolumeKg)} kg`} label="Volumen total" />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={styles.statTileWrap}>
            <StatTile icon="list-outline" value={String(exerciseCount)} label="Ejercicios" />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400).delay(340)} style={styles.statTileWrap}>
            <StatTile icon="checkmark-done-outline" value={String(completedSetCount)} label="Series" />
          </Animated.View>
        </View>

        <Text style={styles.streakLabel}>Racha semanal:</Text>
        <View style={styles.streakRow}>
          {WEEKDAY_LABELS.map((day, index) => (
            <View key={index} style={styles.dayLetterCircle}>
              <Text style={styles.dayLetterText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.streakRow}>
          {WEEKDAY_LABELS.map((_, index) => {
            const trained = trainedDayIndices.has(index);
            return (
              <View key={index} style={[styles.dayStatusCircle, trained && styles.dayStatusCircleActive]}>
                {trained && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Button title="Ver estadísticas" onPress={handleViewStats} style={styles.statsButton} />
          <Button title="Continuar" onPress={handleContinue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.statTile}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    doneCard: {
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginBottom: spacing.lg,
    },
    doneText: {
      fontSize: 18,
      fontFamily: fontFamily.bold,
      color: colors.textPrimary,
      letterSpacing: 0.5,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    statTileWrap: {
      flexBasis: '47%',
      flexGrow: 1,
    },
    statTile: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    statValue: {
      fontSize: 18,
      fontFamily: fontFamily.bold,
      color: colors.textPrimary,
      marginTop: 4,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    streakLabel: {
      fontSize: 15,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    streakRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    dayLetterCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayLetterText: {
      fontSize: 12,
      fontFamily: fontFamily.semiBold,
      color: colors.textSecondary,
    },
    dayStatusCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayStatusCircleActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    footer: {
      flex: 1,
      justifyContent: 'flex-end',
      marginTop: spacing.xl,
      gap: spacing.xs,
    },
    statsButton: {
      marginBottom: 0,
    },
  });
}
