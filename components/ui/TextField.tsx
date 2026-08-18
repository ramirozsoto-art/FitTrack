import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

// Input estilo iOS: label arriba, borde que resalta en naranja al enfocar.
export default function TextField({ label, error, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError, style]}
        placeholderTextColor={colors.textTertiary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { marginBottom: spacing.sm },
    label: {
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      fontSize: 17,
      fontFamily: fontFamily.regular,
      color: colors.textPrimary,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.error,
      marginTop: 4,
    },
  });
}
