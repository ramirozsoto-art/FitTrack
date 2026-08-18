import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { fontFamily, radius, shadow, spacing, type ThemeColors } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 64;
const STROKE = 5;
const RING_RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface RestTimerBannerProps {
  secondsLeft: number;
  totalSeconds: number;
  onSkip: () => void;
}

// Banner de descanso entre series: aro circular con la cuenta regresiva y
// botón para saltarlo. Se muestra flotando arriba de "Terminar Entrenamiento".
export default function RestTimerBanner({ secondsLeft, totalSeconds, onSkip }: RestTimerBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useSharedValue(1);

  useEffect(() => {
    const ratio = totalSeconds > 0 ? Math.max(0, secondsLeft) / totalSeconds : 0;
    progress.value = withTiming(ratio, { duration: 950, easing: Easing.linear });
  }, [secondsLeft, totalSeconds, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(150)} style={styles.container}>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.primaryLight}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
            animatedProps={animatedProps}
          />
        </Svg>
        <Text style={styles.seconds}>{Math.max(0, secondsLeft)}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Descanso</Text>
        <Text style={styles.subtitle}>Preparate para la próxima serie</Text>
      </View>
      <Pressable onPress={onSkip} hitSlop={8} style={styles.skipButton}>
        <Text style={styles.skipText}>Saltar</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xs,
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
      gap: spacing.xs,
      ...shadow.md,
    },
    ringWrap: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seconds: {
      position: 'absolute',
      fontSize: 16,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontFamily: fontFamily.semiBold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    skipButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
    },
    skipText: {
      fontSize: 14,
      fontFamily: fontFamily.semiBold,
      color: colors.primary,
    },
  });
}
