export const COLORS = {
  background: '#0A0A0F',
  surface: '#14141C',
  surfaceBorder: '#2A2A38',
  elevated: '#1C1C28',
  textPrimary: '#F0F0F5',
  textSecondary: '#8888A0',
  textTertiary: '#55556A',
  accent: '#8B5CF6',
  safe: '#22C55E',
  safeBg: '#0A2618',
  warning: '#F59E0B',
  warningBg: '#2A1F0A',
  danger: '#EF4444',
  dangerBg: '#2A0A0A',
  critical: '#DC2626',
  criticalBg: '#3D0A0A',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const RADIUS = {
  card: 16,
  inner: 12,
  pill: 20,
} as const;

export interface SensorConfig {
  key: string;
  label: string;
  unit: string;
  color: string;
  bg: string;
  min: number;
  max: number;
  warningThreshold: number | null;
  dangerThreshold: number | null;
  decimals: number;
  isBoolean?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  invertDanger?: boolean;
  isDangerLevel?: boolean;
}

export const SENSOR_CONFIG: Record<string, SensorConfig> = {
  field1: {
    key: 'gas',
    label: 'Gas Level',
    unit: '',
    color: '#8B5CF6',
    bg: '#1A1030',
    min: 0,
    max: 4095,
    warningThreshold: 500,
    dangerThreshold: 700,
    decimals: 0,
  },
  field2: {
    key: 'smoke',
    label: 'Smoke Level',
    unit: '',
    color: '#6366F1',
    bg: '#151530',
    min: 0,
    max: 4095,
    warningThreshold: 400,
    dangerThreshold: 600,
    decimals: 0,
  },
  field3: {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    color: '#EF4444',
    bg: '#2A0F0F',
    min: 0,
    max: 100,
    warningThreshold: 45,
    dangerThreshold: 60,
    decimals: 1,
  },
  field4: {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    color: '#06B6D4',
    bg: '#0A2028',
    min: 0,
    max: 100,
    warningThreshold: null,
    dangerThreshold: null,
    decimals: 1,
  },
  field5: {
    key: 'flame',
    label: 'Flame',
    unit: '',
    color: '#F97316',
    bg: '#2A1808',
    min: 0,
    max: 1,
    warningThreshold: 1,
    dangerThreshold: 1,
    decimals: 0,
    isBoolean: true,
    trueLabel: 'Detected',
    falseLabel: 'Clear',
  },
  field6: {
    key: 'presence',
    label: 'Presence',
    unit: '',
    color: '#3B82F6',
    bg: '#0A1530',
    min: 0,
    max: 1,
    warningThreshold: null,
    dangerThreshold: null,
    decimals: 0,
    isBoolean: true,
    trueLabel: 'Occupied',
    falseLabel: 'Empty',
  },
  field7: {
    key: 'distance',
    label: 'Distance',
    unit: 'cm',
    color: '#10B981',
    bg: '#0A2820',
    min: 0,
    max: 400,
    warningThreshold: 30,
    dangerThreshold: 10,
    decimals: 1,
    invertDanger: true,
  },
  field8: {
    key: 'dangerLevel',
    label: 'Danger Level',
    unit: '',
    color: '#F43F5E',
    bg: '#2A0A15',
    min: 0,
    max: 3,
    warningThreshold: null,
    dangerThreshold: null,
    decimals: 0,
    isDangerLevel: true,
  },
};

export interface DangerLevelInfo {
  label: string;
  color: string;
  bg: string;
  description: string;
}

export const DANGER_LEVELS: Record<number, DangerLevelInfo> = {
  0: {
    label: 'Normal',
    color: '#22C55E',
    bg: '#0A2618',
    description: 'All sensors are within safe operating ranges',
  },
  1: {
    label: 'Warning',
    color: '#F59E0B',
    bg: '#2A1F0A',
    description: 'One or more sensors have exceeded warning thresholds',
  },
  2: {
    label: 'Danger',
    color: '#EF4444',
    bg: '#2A0A0A',
    description: 'Dangerous conditions detected — gas valve closed',
  },
  3: {
    label: 'Critical',
    color: '#DC2626',
    bg: '#3D0A0A',
    description: 'Critical emergency — immediate action required',
  },
};
