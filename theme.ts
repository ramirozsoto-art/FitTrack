// Tema global de FitTrack: colores, espaciados, radios y tipografía.
// Basado en el diseño de Figma (paleta naranja, estilo iOS nativo).

export const colors = {
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#FFEDD5',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#22C55E',
  overlay: 'rgba(17, 24, 39, 0.4)',
  glass: 'rgba(255, 255, 255, 0.7)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// Familia tipográfica: Inter cargada vía @expo-google-fonts/inter en App.tsx.
// Mientras las fuentes cargan, cae en la fuente del sistema (San Francisco en iOS).
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  largeTitle: { fontSize: 34, fontFamily: fontFamily.bold, lineHeight: 41 },
  title1: { fontSize: 28, fontFamily: fontFamily.bold, lineHeight: 34 },
  title2: { fontSize: 22, fontFamily: fontFamily.semiBold, lineHeight: 28 },
  title3: { fontSize: 20, fontFamily: fontFamily.semiBold, lineHeight: 25 },
  headline: { fontSize: 17, fontFamily: fontFamily.semiBold, lineHeight: 22 },
  body: { fontSize: 17, fontFamily: fontFamily.regular, lineHeight: 22 },
  callout: { fontSize: 16, fontFamily: fontFamily.regular, lineHeight: 21 },
  subhead: { fontSize: 15, fontFamily: fontFamily.regular, lineHeight: 20 },
  footnote: { fontSize: 13, fontFamily: fontFamily.regular, lineHeight: 18 },
  caption: { fontSize: 12, fontFamily: fontFamily.regular, lineHeight: 16 },
} as const;

export const shadow = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

const theme = { colors, spacing, radius, fontFamily, typography, shadow };

export default theme;
