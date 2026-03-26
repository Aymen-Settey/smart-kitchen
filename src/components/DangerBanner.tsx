import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DANGER_LEVELS, COLORS, RADIUS } from '../utils/theme';
import { formatTimestamp } from '../utils/api';

interface DangerBannerProps {
  level: number;
  timestamp: string | null;
  isConnected: boolean;
}

export default function DangerBanner({ level, timestamp, isConnected }: DangerBannerProps) {
  const safeLevel = Math.min(Math.max(Math.round(level || 0), 0), 3);
  const info = DANGER_LEVELS[safeLevel];

  const dotColor = isConnected ? info.color : COLORS.textTertiary;

  return (
    <View style={[styles.card, { backgroundColor: info.bg, borderColor: info.color + '4D' }]}>
      <View style={styles.topRow}>
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: dotColor }]} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
      </View>

      <View style={styles.centerSection}>
        <Text style={[styles.levelNumber, { color: info.color }]}>{safeLevel}</Text>
        <Text style={[styles.levelName, { color: info.color }]}>{info.label}</Text>
        <Text style={styles.description}>{info.description}</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Safe</Text>
        <View style={styles.segmentRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  backgroundColor: i <= safeLevel
                    ? DANGER_LEVELS[i].color
                    : COLORS.surfaceBorder,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressLabel}>Critical</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    padding: 20,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  timestamp: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  centerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  levelNumber: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -3,
    lineHeight: 62,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '500',
  },
  segmentRow: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 10,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
