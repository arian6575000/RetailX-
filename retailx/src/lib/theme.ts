import { Platform } from 'react-native';

export const C = {
  bg: '#F4F1FF',
  // Cards must be OPAQUE: on Android a translucent fill + elevation lets the elevation shadow show through as a grey box.
  card: '#FFFFFF',
  cardBorder: '#FFFFFF',
  surface: '#FFFFFF',
  line: 'rgba(60,36,150,0.10)',
  ink: '#16123A',
  soft: '#4A4670',
  faint: '#8A86A8',
  primary: '#5B2BE0',
  primary2: '#3F18C4',
  accent: '#7B52FF',
  tint: 'rgba(91,43,224,0.10)',
  tintStrong: 'rgba(91,43,224,0.18)',
  deep: '#2A0E8F',
  danger: '#F0384D',
  success: '#12B886',
  warning: '#F59A2B',
  white: '#FFFFFF',
};

/** Violet gradients used by headers, hero cards, buttons and the lock screen. */
export const GRAD = {
  header: ['#7B52FF', '#4A1FD6'] as [string, string],
  button: ['#7B52FF', '#4A1FD6'] as [string, string],
  hero: ['#6A3DF5', '#3A14B8'] as [string, string],
  lock: ['#5B2BE0', '#2A0E8F'] as [string, string],
};

export const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  neutral: { fg: '#2A0E8F', bg: 'rgba(91,43,224,0.10)' },
  new: { fg: '#5B2BE0', bg: 'rgba(91,43,224,0.12)' },
  ok: { fg: '#0E9F6E', bg: 'rgba(20,196,139,0.13)' },
  warn: { fg: '#B86200', bg: 'rgba(255,159,67,0.16)' },
  bad: { fg: '#E0243A', bg: 'rgba(255,71,87,0.12)' },
  // aliases used by apps
  ready: { fg: '#0E9F6E', bg: 'rgba(20,196,139,0.13)' },
  completed: { fg: '#0E9F6E', bg: 'rgba(20,196,139,0.13)' },
  refunded: { fg: '#B86200', bg: 'rgba(255,159,67,0.16)' },
  cancelled: { fg: '#E0243A', bg: 'rgba(255,71,87,0.12)' },
  low: { fg: '#B86200', bg: 'rgba(255,159,67,0.16)' },
  out: { fg: '#E0243A', bg: 'rgba(255,71,87,0.12)' },
};

export const TONES = {
  blue: { bg: 'rgba(91,43,224,0.12)', fg: C.primary },
  violet: { bg: 'rgba(123,82,255,0.14)', fg: C.accent },
  green: { bg: 'rgba(20,196,139,0.14)', fg: C.success },
  orange: { bg: 'rgba(255,159,67,0.14)', fg: C.warning },
  red: { bg: 'rgba(255,71,87,0.12)', fg: C.danger },
};

export const FONT_UR = 'NotoNastaliqUrdu_400Regular';
export const FONT_UR_BOLD = 'NotoNastaliqUrdu_700Bold';

// Soft shadow. Only ever put it on views with an opaque background.
export const shadow = Platform.select({
  android: { shadowColor: '#2A1A78', elevation: 2 },
  default: { shadowColor: '#2A1A78', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as { shadowColor: string; elevation?: number; shadowOpacity?: number; shadowRadius?: number; shadowOffset?: { width: number; height: number } };
export const shadowSm = Platform.select({
  android: { shadowColor: '#2A1A78', elevation: 0 },
  default: { shadowColor: '#2A1A78', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
}) as typeof shadow;
