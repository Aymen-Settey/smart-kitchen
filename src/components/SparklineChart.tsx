import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, RADIUS } from '../utils/theme';
import { formatChartTime } from '../utils/api';

const CHART_WIDTH = 300;
const CHART_HEIGHT = 120;
const PADDING = { top: 8, right: 8, bottom: 20, left: 40 };

export interface ChartDataPoint {
  value: number;
  time: string;
}

interface SparklineChartProps {
  data: ChartDataPoint[];
  color: string;
  label: string;
  unit: string;
  warningThreshold: number | null;
  dangerThreshold: number | null;
}

export default function SparklineChart({ data, color, label, unit, warningThreshold, dangerThreshold }: SparklineChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Waiting for data...</Text>
        </View>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.1 || 1;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = max - min || 1;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const toX = (i: number) => PADDING.left + (i / (data.length - 1)) * plotWidth;
  const toY = (v: number) => PADDING.top + plotHeight - ((v - min) / range) * plotHeight;

  const pointsStr = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  const gridLines = [0, 0.5, 1].map((f) => {
    const val = min + f * range;
    return { y: toY(val), label: val.toFixed(0) };
  });

  const latestValue = values[values.length - 1];
  const firstTime = formatChartTime(data[0].time);
  const lastTime = formatChartTime(data[data.length - 1].time);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.currentValue, { color }]}>
          {latestValue.toFixed(1)}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        {gridLines.map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PADDING.left}
              y1={g.y}
              x2={CHART_WIDTH - PADDING.right}
              y2={g.y}
              stroke={COLORS.surfaceBorder}
              strokeWidth="0.5"
            />
            <SvgText
              x={PADDING.left - 6}
              y={g.y + 3}
              fill={COLORS.textTertiary}
              fontSize="8"
              textAnchor="end"
            >
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {warningThreshold != null && toY(warningThreshold) >= PADDING.top && toY(warningThreshold) <= PADDING.top + plotHeight && (
          <Line
            x1={PADDING.left}
            y1={toY(warningThreshold)}
            x2={CHART_WIDTH - PADDING.right}
            y2={toY(warningThreshold)}
            stroke={COLORS.warning}
            strokeWidth="0.8"
            strokeDasharray="4,3"
          />
        )}

        {dangerThreshold != null && toY(dangerThreshold) >= PADDING.top && toY(dangerThreshold) <= PADDING.top + plotHeight && (
          <Line
            x1={PADDING.left}
            y1={toY(dangerThreshold)}
            x2={CHART_WIDTH - PADDING.right}
            y2={toY(dangerThreshold)}
            stroke={COLORS.danger}
            strokeWidth="0.8"
            strokeDasharray="4,3"
          />
        )}

        <Polyline
          points={pointsStr}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <SvgText
          x={PADDING.left}
          y={CHART_HEIGHT - 4}
          fill={COLORS.textTertiary}
          fontSize="8"
          textAnchor="start"
        >
          {firstTime}
        </SvgText>
        <SvgText
          x={CHART_WIDTH - PADDING.right}
          y={CHART_HEIGHT - 4}
          fill={COLORS.textTertiary}
          fontSize="8"
          textAnchor="end"
        >
          {lastTime}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  currentValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  placeholder: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
});
