import { Platform } from 'react-native';

export const C = {
  bg: '#eef1f8',
  // Cards must be OPAQUE: on Android a translucent fill + elevation lets the elevation shadow show through as a grey box.
  card: '#FBFCFF',
  cardBorder: '#FFFFFF',
  surface: '#FFFFFF',
  line: 'rgba(20,22,31,0.08)',
  ink: '#14161F',
  soft: '#4B4F5E',
  faint: '#8A8FA0',
  primary: '#0A6CFF',
  primary2: '#0A3FD0',
  danger: '#FF4757',
  success: '#14C48B',
  warning: '#FF9F43',
  white: '#FFFFFF',
};

export const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  neutral: { fg: '#14161F', bg: 'rgba(20,22,31,0.08)' },
  new: { fg: '#3E6BFF', bg: 'rgba(62,107,255,0.12)' },
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
  blue: { bg: 'rgba(62,107,255,0.14)', fg: C.primary },
  violet: { bg: 'rgba(122,92,250,0.14)', fg: C.primary2 },
  green: { bg: 'rgba(20,196,139,0.14)', fg: C.success },
  orange: { bg: 'rgba(255,159,67,0.14)', fg: C.warning },
  red: { bg: 'rgba(255,71,87,0.12)', fg: C.danger },
};

export const FONT_UR = 'NotoNastaliqUrdu_400Regular';
export const FONT_UR_BOLD = 'NotoNastaliqUrdu_700Bold';

// Soft shadow. Only ever put it on views with an opaque background.
export const shadow = Platform.select({
  android: { shadowColor: '#1F2850', elevation: 2 },
  default: { shadowColor: '#1F2850', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as { shadowColor: string; elevation?: number; shadowOpacity?: number; shadowRadius?: number; shadowOffset?: { width: number; height: number } };
export const shadowSm = Platform.select({
  android: { shadowColor: '#1F2850', elevation: 0 },
  default: { shadowColor: '#1F2850', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
}) as typeof shadow;
