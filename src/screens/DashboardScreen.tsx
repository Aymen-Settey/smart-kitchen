import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { COLORS, SENSOR_CONFIG, RADIUS } from "../utils/theme";
import { fetchHistoryByMinutes, type SensorData } from "../utils/api";
import {
  loadRules,
  appendLog,
  type NotificationRule,
} from "./NotificationsScreen";
import SparklineChart from "../components/SparklineChart";

interface ThingSpeakConfig {
  channelId: string;
  apiKey: string;
  channelName?: string;
}

const SENSOR_FIELDS = ["field1", "field2", "field3", "field4", "field5"];

interface TimeFilter {
  label: string;
  minutes: number;
}

const TIME_FILTERS: TimeFilter[] = [
  { label: "1h", minutes: 60 },
  { label: "6h", minutes: 360 },
  { label: "12h", minutes: 720 },
  { label: "1d", minutes: 1440 },
  { label: "3d", minutes: 4320 },
  { label: "1w", minutes: 10080 },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function checkThresholds(data: SensorData) {
  const rules = await loadRules();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const threshold = parseFloat(rule.threshold);
    if (isNaN(threshold)) continue;
    const cfg = SENSOR_CONFIG[rule.fieldKey];
    if (!cfg) continue;
    const value = data[cfg.key] as number;
    const triggered = rule.above ? value > threshold : value < threshold;
    if (triggered) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: cfg.label,
          body:
            rule.message ||
            `${cfg.label}: ${value}${cfg.unit ? " " + cfg.unit : ""}`,
        },
        trigger: null,
      });
      await appendLog({
        id: `${Date.now()}-${rule.fieldKey}`,
        fieldKey: rule.fieldKey,
        message: rule.message,
        value,
        threshold,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default function DashboardScreen() {
  const [config, setConfig] = useState<ThingSpeakConfig | null>(null);
  const [historyData, setHistoryData] = useState<SensorData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>(
    TIME_FILTERS[0],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("thingspeak_config");
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchData = useCallback(
    async (cfg: ThingSpeakConfig, filter: TimeFilter, showLoader = false) => {
      try {
        if (showLoader) setLoading(true);
        const result = await fetchHistoryByMinutes(
          cfg.channelId,
          cfg.apiKey,
          filter.minutes,
        );
        setHistoryData(result);
        setError(null);
        if (result.length > 0) {
          checkThresholds(result[result.length - 1]);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (!config) return;

    fetchData(config, selectedFilter, true);
    intervalRef.current = setInterval(
      () => fetchData(config, selectedFilter),
      15000,
    );

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, selectedFilter]);

  useEffect(() => {
    const checkConfig = async () => {
      const stored = await AsyncStorage.getItem("thingspeak_config");
      if (stored) {
        const parsed: ThingSpeakConfig = JSON.parse(stored);
        if (
          !config ||
          parsed.channelId !== config.channelId ||
          parsed.apiKey !== config.apiKey
        ) {
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
    await fetchData(config, selectedFilter);
    setRefreshing(false);
  }, [config, selectedFilter, fetchData]);

  const handleFilterChange = (filter: TimeFilter) => {
    setSelectedFilter(filter);
    setHistoryData([]);
  };

  if (!config) {
    return (
      <View style={styles.container}>
        <View style={styles.setupCard}>
          <Text style={styles.setupIcon}>&#9881;</Text>
          <Text style={styles.setupTitle}>Setup Required</Text>
          <Text style={styles.setupText}>
            Go to the Settings tab to enter your ThingSpeak Channel ID and Read
            API Key.
          </Text>
        </View>
      </View>
    );
  }

  const latestData =
    historyData.length > 0 ? historyData[historyData.length - 1] : null;
  const showDate = selectedFilter.minutes > 360;

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
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: latestData ? COLORS.safe : COLORS.textTertiary,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: latestData ? COLORS.safe : COLORS.textTertiary },
            ]}
          >
            {latestData ? "Connected" : "Offline"}
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchData(config, selectedFilter, true)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filterRow}>
        {TIME_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterPill,
              selectedFilter.label === filter.label && styles.filterPillActive,
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter.label === filter.label &&
                  styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sensors</Text>
        <Text style={styles.sectionSub}>
          {historyData.length} data points · last {selectedFilter.label}
        </Text>
      </View>

      {loading && historyData.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loaderText}>Loading chart data…</Text>
        </View>
      ) : (
        SENSOR_FIELDS.map((fieldKey) => {
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
              showDate={showDate}
            />
          );
        })
      )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.danger + "4D",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  retryText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: COLORS.accent + "20",
    borderColor: COLORS.accent + "50",
  },
  filterText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: COLORS.accent,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sectionSub: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loaderText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 12,
  },
  setupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 30,
    margin: 20,
    alignItems: "center",
  },
  setupIcon: {
    fontSize: 40,
    color: COLORS.textTertiary,
    marginBottom: 16,
  },
  setupTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  setupText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});
