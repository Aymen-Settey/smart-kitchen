import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SENSOR_CONFIG, RADIUS } from '../utils/theme';
import { fetchLatestData, type SensorData } from '../utils/api';
import DangerBanner from '../components/DangerBanner';
import SensorCard from '../components/SensorCard';

interface ThingSpeakConfig {
  channelId: string;
  apiKey: string;
  channelName?: string;
}

const SENSOR_FIELDS = ['field1', 'field2', 'field3', 'field4', 'field5', 'field6', 'field7'];

export default function DashboardScreen() {
  const [config, setConfig] = useState<ThingSpeakConfig | null>(null);
  const [data, setData] = useState<SensorData | null>(null);
  const [prevData, setPrevData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('thingspeak_config');
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async (cfg: ThingSpeakConfig) => {
    try {
      const result = await fetchLatestData(cfg.channelId, cfg.apiKey);
      setData((current) => {
        setPrevData(current);
        return result;
      });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (!config) return;

    fetchData(config);
    intervalRef.current = setInterval(() => fetchData(config), 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config]);

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
    await fetchData(config);
    setRefreshing(false);
  }, [config, fetchData]);

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

  const dangerLevel = data ? Math.round(data.dangerLevel) : 0;
  const isAlert = dangerLevel >= 2;
  const valveOpen = dangerLevel < 2;

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
        <Text style={styles.title}>Smart Kitchen</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isAlert ? COLORS.danger : COLORS.safe }]} />
          <Text style={[styles.statusText, { color: isAlert ? COLORS.danger : COLORS.safe }]}>
            {isAlert ? 'Alert active' : 'Monitoring'}
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchData(config)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <DangerBanner
        level={data ? data.dangerLevel : 0}
        timestamp={data ? data.timestamp : null}
        isConnected={!!data && !error}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sensors</Text>
        <Text style={styles.sectionSub}>Real-time readings</Text>
      </View>

      <View style={styles.sensorGrid}>
        {SENSOR_FIELDS.map((fieldKey) => {
          const cfg = SENSOR_CONFIG[fieldKey];
          const value = data ? (data[cfg.key] as number) : 0;
          const prev = prevData ? (prevData[cfg.key] as number) : undefined;
          return (
            <SensorCard
              key={fieldKey}
              fieldKey={fieldKey}
              value={value}
              previousValue={prev}
            />
          );
        })}
      </View>

      <View style={[styles.valveCard, { borderColor: valveOpen ? COLORS.safe + '4D' : COLORS.danger + '4D' }]}>
        <View style={styles.valveLeft}>
          <View style={[styles.statusDot, { backgroundColor: valveOpen ? COLORS.safe : COLORS.danger }]} />
          <Text style={styles.valveLabel}>Gas valve</Text>
        </View>
        <Text style={[styles.valveStatus, { color: valveOpen ? COLORS.safe : COLORS.danger }]}>
          {valveOpen ? 'OPEN' : 'CLOSED'}
        </Text>
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.danger + '4D',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  retryText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sectionSub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  valveCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valveLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  valveStatus: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
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
