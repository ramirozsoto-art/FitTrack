import { useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SegmentedControl from '../../components/ui/SegmentedControl';
import TextField from '../../components/ui/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../theme';
import type { Gender, Goal } from '../../types/database';
import type { PerfilStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<PerfilStackParamList, 'EditarPerfil'>;

const GOAL_OPTIONS: { value: Goal; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose_fat', label: 'Perder grasa', icon: 'flame-outline' },
  { value: 'gain_muscle', label: 'Ganar músculo', icon: 'barbell-outline' },
  { value: 'maintain', label: 'Mantener', icon: 'infinite-outline' },
];

const TRAINING_DAYS_OPTIONS = [3, 4, 5, 6].map((n) => ({ label: String(n), value: n }));

// Edición de perfil (Fase 4): mismos campos e inputs que Metabolismo Basal,
// pero precargados con los datos actuales y sumando el nombre.
export default function EditarPerfilScreen({ navigation }: Props) {
  const { profile, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [weight, setWeight] = useState(profile?.weight_kg ? String(profile.weight_kg) : '');
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'male');
  const [trainingDays, setTrainingDays] = useState(profile?.training_days ?? 4);
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!ageNum || !weightNum || !heightNum) {
      Alert.alert('Faltan datos', 'Completá tu edad, peso y altura.');
      return;
    }

    setSaving(true);
    const { error } = await updateProfile({
      full_name: fullName.trim() || null,
      age: ageNum,
      weight_kg: weightNum,
      height_cm: heightNum,
      gender,
      training_days: trainingDays,
      goal,
    });
    setSaving(false);

    if (error) {
      Alert.alert('No se pudieron guardar tus datos', error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Editar perfil" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextField
            label="Nombre"
            placeholder="Tu nombre"
            value={fullName}
            onChangeText={setFullName}
          />

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

          <Button title="Guardar cambios" onPress={handleSave} loading={saving} style={styles.saveButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  saveButton: {
    marginTop: spacing.lg,
  },
});
