import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SENSOR_CONFIG, DANGER_LEVELS, RADIUS } from '../utils/theme';
import { fetchHistory, type SensorData } from '../utils/api';
import SparklineChart from '../components/SparklineChart';

interface ThingSpeakConfig {
  channelId: string;
  apiKey: string;
  channelName?: string;
}

const POINT_OPTIONS = [20, 50, 100] as const;
const CHART_FIELDS = ['field1', 'field2', 'field3', 'field4', 'field7'];

export default function HistoryScreen() {
  const [config, setConfig] = useState<ThingSpeakConfig | null>(null);
  const [historyData, setHistoryData] = useState<SensorData[]>([]);
  const [points, setPoints] = useState<number>(20);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('thingspeak_config');
      if (stored) setConfig(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
  }, []);

  const loadHistory = useCallback(async (cfg: ThingSpeakConfig, numPoints: number) => {
    try {
      const data = await fetchHistory(cfg.channelId, cfg.apiKey, numPoints);
      setHistoryData(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) loadHistory(config, points);
  }, [config, points]);

  useEffect(() => {
    const checkConfig = async () => {
      const stored = await AsyncStorage.getItem('thingspeak_config');
      if (stored) {
        const parsed: ThingSpeakConfig = JSON.parse(stored);
        if (!config || parsed.channelId !== config.channelId || parsed.apiKey !== config.apiKey) {
          setConfig(parsed);
        }
      }
    };
    const interval = setInterval(checkConfig, 2000);
    return () => clearInterval(interval);
  }, [config]);

  const onRefresh = useCallback(async () => {
    if (!config) return;
    setRefreshing(true);
    await loadHistory(config, points);
    setRefreshing(false);
  }, [config, points, loadHistory]);

  if (!config) {
    return (
      <View style={styles.container}>
        <View style={styles.setupCard}>
          <Text style={styles.setupIcon}>&#9881;</Text>
          <Text style={styles.setupTitle}>Setup Required</Text>
          <Text style={styles.setupText}>
            Go to the Settings tab to enter your ThingSpeak Channel ID and Read API Key.
          </Text>
        </View>
      </View>
    );
  }

  const dangerData = historyData.slice(-30);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.accent}
          colors={[COLORS.accent]}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.countText}>{historyData.length} data points</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.pillRow}>
        {POINT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, points === opt && styles.pillActive]}
            onPress={() => setPoints(opt)}
          >
            <Text style={[styles.pillText, points === opt && styles.pillTextActive]}>
              {opt} pts
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {CHART_FIELDS.map((fieldKey) => {
        const cfg = SENSOR_CONFIG[fieldKey];
        const chartData = historyData.map((d) => ({
          value: d[cfg.key] as number,
          time: d.timestamp,
        }));
        return (
          <SparklineChart
            key={fieldKey}
            data={chartData}
            color={cfg.color}
            label={cfg.label}
            unit={cfg.unit}
            warningThreshold={cfg.warningThreshold}
            dangerThreshold={cfg.dangerThreshold}
          />
        );
      })}

      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Danger Level Timeline</Text>
        <View style={styles.barsRow}>
          {dangerData.map((d, i) => {
            const level = Math.min(Math.max(Math.round(d.dangerLevel), 0), 3);
            const barHeight = 8 + level * 12;
            const barColor = DANGER_LEVELS[level].color;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                    width: Math.max(4, (100 / Math.max(dangerData.length, 1)) - 1),
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabel}>Older</Text>
          <Text style={styles.timelineLabel}>Recent</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  countText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.danger + '4D',
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
  },
  pillActive: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent + '50',
  },
  pillText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.accent,
  },
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 12,
  },
  timelineTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 50,
    gap: 2,
  },
  bar: {
    borderRadius: 2,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timelineLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '500',
  },
  setupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 30,
    margin: 20,
    alignItems: 'center',
  },
  setupIcon: {
    fontSize: 40,
    color: COLORS.textTertiary,
    marginBottom: 16,
  },
  setupTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  setupText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
