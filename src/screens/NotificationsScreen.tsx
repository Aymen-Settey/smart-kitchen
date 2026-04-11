import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SENSOR_CONFIG, RADIUS } from "../utils/theme";

const LOG_KEY = "notification_log";

export interface NotificationLogEntry {
  id: string;
  fieldKey: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export async function loadLog(): Promise<NotificationLogEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(LOG_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export async function appendLog(entry: NotificationLogEntry) {
  const log = await loadLog();
  log.unshift(entry);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 100)));
}

export default function NotificationsScreen() {
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refreshLog = useCallback(async () => {
    const l = await loadLog();
    setLog(l);
  }, []);

  useEffect(() => {
    refreshLog();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshLog();
    setRefreshing(false);
  }, [refreshLog]);

  const clearLog = async () => {
    Alert.alert("Clear History", "Remove all notification history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(LOG_KEY);
          setLog([]);
        },
      },
    ]);
  };

  const ALERT_ICONS: Record<string, string> = {
    danger_flame_gas: "\u26A0\uFE0F",
    gas_warning: "\uD83D\uDCA8",
    temp_high: "\uD83C\uDF21\uFE0F",
    night_motion: "\uD83C\uDF19",
    humidity_danger: "\uD83D\uDCA7",
    humidity_warning: "\uD83D\uDCA7",
  };

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
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>
        Smart alerts are triggered automatically based on sensor readings,
        weather comparison, and time of day.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Active alert rules</Text>
        <Text style={styles.infoItem}>
          {"\u26A0\uFE0F"} Flame + Gas detected → Danger alert
        </Text>
        <Text style={styles.infoItem}>
          {"\uD83D\uDCA8"} Gas above threshold → Stove safety warning
        </Text>
        <Text style={styles.infoItem}>
          {"\uD83C\uDF21\uFE0F"} Kitchen temp 10°C+ above outside → Overheating
          alert
        </Text>
        <Text style={styles.infoItem}>
          {"\uD83C\uDF19"} Motion after 11 PM → Night intrusion alert
        </Text>
        <Text style={styles.infoItem}>
          {"\uD83D\uDCA7"} Humidity {">"}70% → Trapped steam, open window / run fan
        </Text>
        <Text style={styles.infoItem}>
          {"\uD83D\uDCA7"} Humidity {">"}60% for 5+ minutes → Poor ventilation warning
        </Text>
        
      </View>

      <View style={styles.logHeader}>
        <Text style={styles.logHeaderText}>History</Text>
        <View style={styles.logHeaderRight}>
          <Text style={styles.logBadge}>{log.length}</Text>
          {log.length > 0 && (
            <TouchableOpacity onPress={clearLog}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {log.length === 0 ? (
        <Text style={styles.emptyLog}>
          No notifications yet. Alerts will appear here when triggered.
        </Text>
      ) : (
        log.slice(0, 50).map((entry, index) => {
          const cfg = SENSOR_CONFIG[entry.fieldKey];
          const icon = ALERT_ICONS[entry.fieldKey] || "\uD83D\uDD14";
          return (
            <View key={`${entry.id}-${index}`} style={styles.logEntry}>
              <View style={styles.logEntryHeader}>
                <Text style={styles.logIcon}>{icon}</Text>
                <Text style={styles.logEntryLabel}>
                  {cfg?.label || entry.fieldKey}
                </Text>
                <Text style={styles.logEntryTime}>
                  {new Date(entry.timestamp).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.logEntryMsg}>{entry.message}</Text>
            </View>
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
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 20,
  },
  infoTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  infoItem: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 22,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logHeaderText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  logHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logBadge: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: COLORS.accent + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyLog: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 30,
  },
  logEntry: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 12,
    marginBottom: 8,
  },
  logEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  logIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  logEntryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  logEntryTime: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: "500",
  },
  logEntryMsg: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
});
