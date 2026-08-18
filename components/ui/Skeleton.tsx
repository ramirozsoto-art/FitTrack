import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { radius as radiusTokens } from '../../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Bloque base para skeleton loaders: fondo sólido (color del theme activo) +
// una franja translúcida que barre de lado a lado en loop, simulando brillo.
// El ancho de la franja se calcula del layout medido en runtime (onLayout)
// para que la animación siempre cruce el bloque completo sin depender de un
// tamaño fijo hardcodeado.
export default function Skeleton({ width = '100%', height = 16, radius = radiusTokens.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const [boxWidth, setBoxWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [progress]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setBoxWidth(e.nativeEvent.layout.width);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value * 2 - 1) * boxWidth }],
  }));

  return (
    <View
      onLayout={onLayout}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border, overflow: 'hidden' }, style]}
    >
      {boxWidth > 0 && (
        <Animated.View
          style={[styles.shimmer, { width: boxWidth * 0.5 }, shimmerStyle]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
