import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { COLORS, SENSOR_CONFIG, RADIUS } from "../utils/theme";
import {
  fetchHistoryByMinutes,
  fetchOutdoorTemperature,
  type SensorData,
} from "../utils/api";
import { appendLog } from "./NotificationsScreen";
import SparklineChart from "../components/SparklineChart";

interface ThingSpeakConfig {
  channelId: string;
  apiKey: string;
  channelName?: string;
}

const SENSOR_FIELDS = [
  "field1",
  "field2",
  "field3",
  "field4",
  "field5",
  "field6",
];

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

const METEOBLUE_API_KEY = "nGjziluvMENTfAe0";

// Track alert states — only notify on rising edge (condition goes from false → true)
const alertActive: Record<string, boolean> = {};

function shouldAlert(type: string, conditionMet: boolean): boolean {
  const wasActive = alertActive[type] || false;
  alertActive[type] = conditionMet;
  // Only fire when transitioning from inactive to active
  return conditionMet && !wasActive;
}

async function logAlert(
  title: string,
  body: string,
  type: string,
  value: number,
  threshold: number,
) {
  await appendLog({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${type}`,
    fieldKey: type,
    message: `${title}: ${body}`,
    value,
    threshold,
    timestamp: new Date().toISOString(),
  });
}

async function checkSmartAlerts(
  recentData: SensorData[],
  outdoorTemp: number | null,
) {
  if (recentData.length === 0) return;
  // Use the latest reading for current state
  const data = recentData[recentData.length - 1];
  const kitchenTemp = data.temperature as number;
  const gas = data.gas as number;
  const flame = data.flame as number;
  const motion = data.motion as number;
  const gasThreshold = SENSOR_CONFIG.field3.warningThreshold ?? 500;

  // Check if any reading in the recent window triggered the condition
  const anyFlame = recentData.some((d) => (d.flame as number) >= 1);
  const anyGasHigh = recentData.some((d) => (d.gas as number) > gasThreshold);
  const anyMotion = recentData.some((d) => (d.motion as number) >= 1);

  // 1) Flame + Gas together → DANGER (highest priority)
  const flameAndGas = anyFlame && anyGasHigh;
  if (shouldAlert("danger_flame_gas", flameAndGas)) {
    await logAlert(
      "\u26A0\uFE0F DANGER",
      `Flame detected & gas at ${gas.toFixed(0)} (threshold: ${gasThreshold}). Take immediate action!`,
      "danger_flame_gas",
      gas,
      gasThreshold,
    );
  }

  // 2) Gas above threshold → stove safety warning
  const gasHigh = anyGasHigh && !flameAndGas;
  if (shouldAlert("gas_warning", gasHigh)) {
    await logAlert(
      "\uD83D\uDCA8 Gas Detected",
      `Gas level at ${gas.toFixed(0)} (threshold: ${gasThreshold}). Don\u2019t get close to the stove with fire in hand.`,
      "gas_warning",
      gas,
      gasThreshold,
    );
  }

  // 3) Temperature: kitchen is 10°C+ above outdoor weather
  const tempHigh = outdoorTemp !== null && kitchenTemp > outdoorTemp + 10;
  if (shouldAlert("temp_high", tempHigh)) {
    await logAlert(
      "\uD83C\uDF21\uFE0F Kitchen Overheating",
      `Kitchen: ${kitchenTemp.toFixed(1)}\u00b0C, Outside: ${outdoorTemp!.toFixed(1)}\u00b0C (+${(kitchenTemp - outdoorTemp!).toFixed(1)}\u00b0C difference).`,
      "temp_high",
      kitchenTemp,
      outdoorTemp! + 10,
    );
  }

  // 4) Motion after 23:00 → night intrusion
  const hour = new Date().getHours();
  const nightMotion = anyMotion && (hour >= 23 || hour < 5);
  if (shouldAlert("night_motion", nightMotion)) {
    await logAlert(
      "\uD83C\uDF19 Late Night Motion",
      `Motion detected at ${new Date().toLocaleTimeString()}. Someone could be in your kitchen.`,
      "night_motion",
      motion,
      1,
    );
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
  const [outdoorTemp, setOutdoorTemp] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"m" | "h" | "d">("h");
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
          // Fetch outdoor temp for comparison using GPS location
          let currentOutdoor = outdoorTemp;
          try {
            // Try stored location first, then detect via GPS
            let lat: string | null = null;
            let lon: string | null = null;
            const locStr = await AsyncStorage.getItem("user_location");
            if (locStr) {
              const loc = JSON.parse(locStr);
              lat = loc.latitude;
              lon = loc.longitude;
            }
            if (!lat || !lon) {
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status === "granted") {
                const position = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Low,
                });
                lat = position.coords.latitude.toString();
                lon = position.coords.longitude.toString();
                await AsyncStorage.setItem(
                  "user_location",
                  JSON.stringify({ latitude: lat, longitude: lon }),
                );
              }
            }
            if (lat && lon) {
              const temp = await fetchOutdoorTemperature(
                lat,
                lon,
                METEOBLUE_API_KEY,
              );
              if (temp !== null) {
                currentOutdoor = temp;
                setOutdoorTemp(temp);
              }
            }
          } catch {}
          // Only check alerts on data from the last 10 minutes
          const tenMinAgo = Date.now() - 10 * 60 * 1000;
          const recentData = result.filter(
            (d) => new Date(d.timestamp).getTime() >= tenMinAgo,
          );
          checkSmartAlerts(recentData, currentOutdoor);
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
    // Load saved location name
    (async () => {
      try {
        const locStr = await AsyncStorage.getItem("user_location");
        if (locStr) {
          const loc = JSON.parse(locStr);
          if (loc.name) setLocationName(loc.name);
          else if (loc.latitude && loc.longitude)
            setLocationName(`${loc.latitude}, ${loc.longitude}`);
        }
      } catch {}
    })();
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
    setShowCustomInput(false);
  };

  const handleCustomApply = () => {
    const num = parseFloat(customValue);
    if (isNaN(num) || num <= 0) return;
    const multiplier = customUnit === "d" ? 1440 : customUnit === "h" ? 60 : 1;
    const minutes = Math.round(num * multiplier);
    const label = `${customValue}${customUnit}`;
    handleFilterChange({ label, minutes });
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

  function getSensorSubtitle(fieldKey: string): string | undefined {
    const cfg = SENSOR_CONFIG[fieldKey];
    if (!cfg || historyData.length === 0) return undefined;

    if (fieldKey === "field1") {
      // Flame — last time fire was detected (value >= 1)
      for (let i = historyData.length - 1; i >= 0; i--) {
        if ((historyData[i].flame as number) >= 1) {
          const d = new Date(historyData[i].timestamp);
          return `Fire ON · ${d.toLocaleString()}`;
        }
      }
      return "No fire detected";
    }

    if (fieldKey === "field2") {
      // Temperature — average
      const temps = historyData.map((d) => d.temperature as number);
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      return `Average temp: ${avg.toFixed(1)}`;
    }

    if (fieldKey === "field3") {
      // Gas — last time high gas detected (above warning threshold)
      const threshold = cfg.warningThreshold ?? 500;
      for (let i = historyData.length - 1; i >= 0; i--) {
        if ((historyData[i].gas as number) > threshold) {
          const d = new Date(historyData[i].timestamp);
          return `Gas detected · ${d.toLocaleString()}`;
        }
      }
      return "No high gas detected";
    }

    if (fieldKey === "field4") {
      // Motion — last time presence detected (value >= 1)
      for (let i = historyData.length - 1; i >= 0; i--) {
        if ((historyData[i].motion as number) >= 1) {
          const d = new Date(historyData[i].timestamp);
          return `Presence · ${d.toLocaleString()}`;
        }
      }
      return "No presence detected";
    }

    return undefined;
  }

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
        <View>
          <Text style={styles.title}>Smart Kitchen</Text>
          {locationName && (
            <Text style={styles.locationText}>
              {"\uD83D\uDCCD"} {locationName}
              {outdoorTemp !== null
                ? ` · ${outdoorTemp.toFixed(1)}°C outside`
                : ""}
            </Text>
          )}
        </View>
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
        <TouchableOpacity
          style={[
            styles.filterPill,
            showCustomInput && styles.filterPillActive,
          ]}
          onPress={() => setShowCustomInput(!showCustomInput)}
        >
          <Text
            style={[
              styles.filterText,
              showCustomInput && styles.filterTextActive,
            ]}
          >
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {showCustomInput && (
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customValue}
            onChangeText={setCustomValue}
            placeholder="e.g. 2"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
          {(["m", "h", "d"] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[
                styles.unitPill,
                customUnit === u && styles.unitPillActive,
              ]}
              onPress={() => setCustomUnit(u)}
            >
              <Text
                style={[
                  styles.unitText,
                  customUnit === u && styles.unitTextActive,
                ]}
              >
                {u === "m" ? "min" : u === "h" ? "hr" : "day"}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.applyBtn} onPress={handleCustomApply}>
            <Text style={styles.applyBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
      )}

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
              subtitle={getSensorSubtitle(fieldKey)}
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
  locationText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
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
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
  },
  unitPillActive: {
    backgroundColor: COLORS.accent + "20",
    borderColor: COLORS.accent + "50",
  },
  unitText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "600",
  },
  unitTextActive: {
    color: COLORS.accent,
  },
  applyBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
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
