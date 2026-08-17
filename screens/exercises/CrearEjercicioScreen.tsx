import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../../components/ui/Button';
import ScreenHeader from '../../components/ui/ScreenHeader';
import TextField from '../../components/ui/TextField';
import { useAuth } from '../../context/AuthContext';
import { createExercise } from '../../lib/exercises';
import { colors, spacing } from '../../theme';
import type { EjerciciosStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<EjerciciosStackParamList, 'CrearEjercicio'>;

// Formulario para crear un ejercicio personalizado (Fase 4): mismos campos
// que se muestran en el detalle. Se guarda en "exercises" con
// created_by = auth.uid() e is_default = false.
export default function CrearEjercicioScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponele un nombre al ejercicio.');
      return;
    }
    if (!session?.user) return;

    setSaving(true);
    try {
      await createExercise(session.user.id, {
        name: name.trim(),
        muscleGroup: muscleGroup.trim() || null,
        equipment: equipment.trim() || null,
      });
      // EjerciciosScreen refresca su lista con useFocusEffect al volver a
      // foco, así que no hace falta pasarle el ejercicio creado por params.
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'No se pudo crear el ejercicio',
        err instanceof Error ? err.message : 'Intentá de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Ejercicio nuevo" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextField
            label="Nombre"
            placeholder="Ej: Press militar"
            value={name}
            onChangeText={setName}
          />
          <TextField
            label="Grupo muscular"
            placeholder="Ej: Hombros"
            value={muscleGroup}
            onChangeText={setMuscleGroup}
          />
          <TextField
            label="Equipamiento"
            placeholder="Ej: Mancuernas"
            value={equipment}
            onChangeText={setEquipment}
          />

          <Button title="Guardar ejercicio" onPress={handleSave} loading={saving} style={styles.saveButton} />
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
  saveButton: {
    marginTop: spacing.sm,
  },
});
