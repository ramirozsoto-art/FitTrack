import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatClock } from '../../lib/date';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, spacing, type ThemeColors } from '../../theme';

interface WorkoutStatsBarProps {
  elapsedSeconds: number;
  totalVolumeKg: number;
  completedSets: number;
  restActive: boolean;
}

// Franja de estadísticas en vivo debajo del header, como en el diseño de
// Figma (Tiempo | Volumen | Series | Cronómetro).
export default function WorkoutStatsBar({
  elapsedSeconds,
  totalVolumeKg,
  completedSets,
  restActive,
}: WorkoutStatsBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Text style={styles.value}>{formatClock(elapsedSeconds)}</Text>
        <Text style={styles.label}>Tiempo</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{Math.round(totalVolumeKg)}</Text>
        <Text style={styles.label}>Volumen</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{completedSets}</Text>
        <Text style={styles.label}>Series</Text>
      </View>
      <View style={styles.item}>
        <Ionicons name="time" size={18} color={restActive ? colors.white : 'rgba(255,255,255,0.85)'} />
        <Text style={styles.label}>Cronómetro</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.primaryDark,
      paddingVertical: spacing.xs,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    value: {
      fontSize: 14,
      fontFamily: fontFamily.semiBold,
      color: colors.white,
    },
    label: {
      fontSize: 11,
      fontFamily: fontFamily.medium,
      color: 'rgba(255,255,255,0.85)',
    },
  });
}
