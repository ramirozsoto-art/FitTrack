import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, spacing } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

// Header naranja sólido estilo iOS nativo, con flecha atrás opcional. Se usa
// en pantallas que necesitan diferenciarse del header blanco simple (como
// Inicio/Perfil), por ejemplo el stack de Entrenamiento.
export default function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {!!onBack && (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
});
