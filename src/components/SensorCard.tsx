import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { SENSOR_CONFIG, DANGER_LEVELS, COLORS, RADIUS, type SensorConfig } from '../utils/theme';

type Status = 'normal' | 'warning' | 'danger';

interface StatusResult {
  status: Status;
  label: string;
}

function getStatus(value: number, config: SensorConfig): StatusResult {
  if (config.isDangerLevel) {
    const level = DANGER_LEVELS[Math.min(Math.max(Math.round(value), 0), 3)];
    return { status: value >= 2 ? 'danger' : value >= 1 ? 'warning' : 'normal', label: level.label };
  }

  if (config.isBoolean) {
    if (config.dangerThreshold != null && value >= config.dangerThreshold) {
      return { status: 'danger', label: 'Danger' };
    }
    return { status: 'normal', label: 'Normal' };
  }

  if (config.invertDanger) {
    if (config.dangerThreshold != null && value <= config.dangerThreshold) {
      return { status: 'danger', label: 'Danger' };
    }
    if (config.warningThreshold != null && value <= config.warningThreshold) {
      return { status: 'warning', label: 'Warning' };
    }
    return { status: 'normal', label: 'Normal' };
  }

  if (config.dangerThreshold != null && value >= config.dangerThreshold) {
    return { status: 'danger', label: 'Danger' };
  }
  if (config.warningThreshold != null && value >= config.warningThreshold) {
    return { status: 'warning', label: 'Warning' };
  }
  return { status: 'normal', label: 'Normal' };
}

const STATUS_COLORS: Record<Status, { color: string; bg: string }> = {
  normal: { color: COLORS.safe, bg: COLORS.safeBg },
  warning: { color: COLORS.warning, bg: COLORS.warningBg },
  danger: { color: COLORS.danger, bg: COLORS.dangerBg },
};

interface SensorCardProps {
  fieldKey: string;
  value: number;
  previousValue?: number;
}

export default function SensorCard({ fieldKey, value, previousValue }: SensorCardProps) {
  const config = SENSOR_CONFIG[fieldKey];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (previousValue !== undefined && value !== previousValue) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);

  if (!config) return null;

  const { status, label: statusLabel } = getStatus(value, config);
  const sc = STATUS_COLORS[status];

  const displayValue = config.isBoolean
    ? (value >= 1 ? config.trueLabel : config.falseLabel)
    : value.toFixed(config.decimals);

  const progress = Math.min(1, Math.max(0, (value - config.min) / (config.max - config.min || 1)));

  const warnPos = config.warningThreshold != null
    ? (config.warningThreshold - config.min) / (config.max - config.min || 1)
    : null;
  const dangerPos = config.dangerThreshold != null
    ? (config.dangerThreshold - config.min) / (config.max - config.min || 1)
    : null;

  return (
    <Animated.View style={[styles.card, { backgroundColor: config.bg, transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: config.color }]} />
          <Text style={styles.label} numberOfLines={1}>{config.label}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.color }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: config.color }]}>{displayValue}</Text>
        {config.unit ? <Text style={styles.unit}>{config.unit}</Text> : null}
      </View>

      {!config.isBoolean && !config.isDangerLevel && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%`, backgroundColor: sc.color }]} />
            {warnPos != null && (
              <View style={[styles.thresholdMarker, { left: `${warnPos * 100}%` as `${number}%`, backgroundColor: COLORS.warning }]} />
            )}
            {dangerPos != null && (
              <View style={[styles.thresholdMarker, { left: `${dangerPos * 100}%` as `${number}%`, backgroundColor: COLORS.danger }]} />
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    width: '48.5%',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
  },
  unit: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.surfaceBorder,
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  thresholdMarker: {
    position: 'absolute',
    width: 2,
    height: 7,
    top: -2,
    borderRadius: 1,
    opacity: 0.5,
  },
});
