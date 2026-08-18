import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, spacing, type ThemeColors } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

// Pantalla de bienvenida + login. Combina logo, botón de Google e inputs de
// email/contraseña, como pide el diseño de Figma.
export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Ingresá tu email y contraseña.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('No se pudo iniciar sesión', error);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('No se pudo iniciar sesión con Google', error);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>FitTrack</Text>
            <Text style={styles.subtitle}>Tu progreso, entreno a entreno</Text>
          </View>

          <Pressable style={styles.googleButton} onPress={handleGoogle} disabled={googleLoading}>
            <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Conectando...' : 'Continuar con Google'}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con tu email</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextField
            label="Email"
            placeholder="tu@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />

          <Button title="Iniciar sesión" onPress={handleLogin} loading={loading} style={styles.loginButton} />

          <Pressable style={styles.signUpLink} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpText}>
              ¿No tenés cuenta? <Text style={styles.signUpTextBold}>Crear cuenta</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    logo: {
      fontSize: 40,
      fontFamily: fontFamily.bold,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: spacing.xs / 2,
    },
    googleButton: {
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    googleButtonText: {
      fontSize: 16,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
      gap: spacing.xs,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textTertiary,
    },
    loginButton: {
      marginTop: spacing.xs,
    },
    signUpLink: {
      marginTop: spacing.md,
      alignItems: 'center',
    },
    signUpText: {
      fontSize: 14,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
    },
    signUpTextBold: {
      fontFamily: fontFamily.semiBold,
      color: colors.primary,
    },
  });
}
