import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Pantalla simple mientras se resuelve la sesión inicial o el perfil.
export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
