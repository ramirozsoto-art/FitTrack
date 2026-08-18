import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import SegmentedControl from '../../components/ui/SegmentedControl';
import TextField from '../../components/ui/TextField';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, radius, spacing, type ThemeColors } from '../../theme';
import type { Gender, Goal } from '../../types/database';

const GOAL_OPTIONS: { value: Goal; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose_fat', label: 'Perder grasa', icon: 'flame-outline' },
  { value: 'gain_muscle', label: 'Ganar músculo', icon: 'barbell-outline' },
  { value: 'maintain', label: 'Mantener', icon: 'infinite-outline' },
];

const TRAINING_DAYS_OPTIONS = [3, 4, 5, 6].map((n) => ({ label: String(n), value: n }));

// Formulario de Metabolismo Basal: se muestra una sola vez, luego de crear
// la cuenta, y guarda los datos en la tabla profiles de Supabase.
export default function MetabolismoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { saveOnboardingData } = useAuth();

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [trainingDays, setTrainingDays] = useState(4);
  const [goal, setGoal] = useState<Goal>('maintain');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!ageNum || !weightNum || !heightNum) {
      Alert.alert('Faltan datos', 'Completá tu edad, peso y altura.');
      return;
    }

    setLoading(true);
    const { error } = await saveOnboardingData({
      age: ageNum,
      weight_kg: weightNum,
      height_cm: heightNum,
      gender,
      training_days: trainingDays,
      goal,
    });
    setLoading(false);

    if (error) Alert.alert('No se pudieron guardar tus datos', error);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Contanos sobre vos</Text>
            <Text style={styles.subtitle}>
              Con estos datos calculamos tu metabolismo basal y personalizamos tu plan.
            </Text>
          </View>

          <View style={styles.row}>
            <TextField
              label="Edad"
              placeholder="25"
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              style={styles.rowInput}
            />
            <TextField
              label="Peso (kg)"
              placeholder="70"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              style={styles.rowInput}
            />
          </View>

          <TextField
            label="Altura (cm)"
            placeholder="175"
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
          />

          <Text style={styles.label}>Género</Text>
          <Card style={styles.genderCard}>
            <Text style={[styles.genderText, gender === 'female' && styles.genderTextInactive]}>
              Hombre
            </Text>
            <Switch
              value={gender === 'female'}
              onValueChange={(isFemale) => setGender(isFemale ? 'female' : 'male')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
            <Text style={[styles.genderText, gender === 'male' && styles.genderTextInactive]}>
              Mujer
            </Text>
          </Card>

          <Text style={styles.label}>Días de entreno por semana</Text>
          <SegmentedControl
            options={TRAINING_DAYS_OPTIONS}
            value={trainingDays}
            onChange={setTrainingDays}
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>Objetivo</Text>
          <View style={styles.goalList}>
            {GOAL_OPTIONS.map((option) => {
              const selected = goal === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setGoal(option.value)}
                  style={[styles.goalOption, selected && styles.goalOptionSelected]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.goalOptionText, selected && styles.goalOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Button title="Continuar" onPress={handleContinue} loading={loading} style={styles.continueButton} />
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
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    header: {
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 26,
      fontFamily: fontFamily.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    rowInput: {
      flex: 1,
    },
    label: {
      fontSize: 13,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    genderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    genderText: {
      fontSize: 15,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    genderTextInactive: {
      color: colors.textTertiary,
    },
    goalList: {
      gap: spacing.xs,
    },
    goalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      height: 56,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    goalOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    goalOptionText: {
      fontSize: 15,
      fontFamily: fontFamily.medium,
      color: colors.textPrimary,
    },
    goalOptionTextSelected: {
      color: colors.primaryDark,
    },
    continueButton: {
      marginTop: spacing.lg,
    },
  });
}
