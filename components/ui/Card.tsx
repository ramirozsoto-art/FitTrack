import { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow, spacing, type ThemeColors } from '../../theme';

// Contenedor con fondo blanco, bordes redondeados y sombra suave (estilo card de iOS).
export default function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.card, style]} {...props} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      ...shadow.sm,
    },
  });
}
