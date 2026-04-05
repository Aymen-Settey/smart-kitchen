import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SENSOR_CONFIG, RADIUS } from "../utils/theme";

const SENSOR_FIELDS = ["field1", "field2", "field3", "field4", "field5"];
const STORAGE_KEY = "notification_rules";
const LOG_KEY = "notification_log";

export interface NotificationRule {
  fieldKey: string;
  enabled: boolean;
  threshold: string;
  above: boolean; // true = trigger when value > threshold, false = when value < threshold
  message: string;
}

export interface NotificationLogEntry {
  id: string;
  fieldKey: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

function defaultRules(): NotificationRule[] {
  return SENSOR_FIELDS.map((fieldKey) => {
    const cfg = SENSOR_CONFIG[fieldKey];
    return {
      fieldKey,
      enabled: false,
      threshold: "",
      above: !cfg.invertDanger,
      message: `${cfg.label} threshold exceeded!`,
    };
  });
}

export async function loadRules(): Promise<NotificationRule[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultRules();
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
  const [rules, setRules] = useState<NotificationRule[]>(defaultRules());
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await loadRules();
      setRules(r);
      const l = await loadLog();
      setLog(l);
    })();
  }, []);

  const saveRules = useCallback(async (updated: NotificationRule[]) => {
    setRules(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const updateRule = (fieldKey: string, patch: Partial<NotificationRule>) => {
    const updated = rules.map((r) =>
      r.fieldKey === fieldKey ? { ...r, ...patch } : r,
    );
    saveRules(updated);
  };

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

  const refreshLog = async () => {
    const l = await loadLog();
    setLog(l);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>
        Set thresholds for each sensor. You'll get a notification when a value
        crosses the limit.
      </Text>

      {rules.map((rule) => {
        const cfg = SENSOR_CONFIG[rule.fieldKey];
        if (!cfg) return null;

        return (
          <View
            key={rule.fieldKey}
            style={[styles.ruleCard, { borderLeftColor: cfg.color }]}
          >
            <View style={styles.ruleHeader}>
              <View style={styles.ruleLabel}>
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                <Text style={styles.ruleName}>{cfg.label}</Text>
              </View>
              <Switch
                value={rule.enabled}
                onValueChange={(v) => updateRule(rule.fieldKey, { enabled: v })}
                trackColor={{
                  false: COLORS.surfaceBorder,
                  true: COLORS.accent + "60",
                }}
                thumbColor={rule.enabled ? COLORS.accent : COLORS.textTertiary}
              />
            </View>

            {rule.enabled && (
              <View style={styles.ruleBody}>
                <View style={styles.thresholdRow}>
                  <TouchableOpacity
                    style={[styles.dirPill, rule.above && styles.dirPillActive]}
                    onPress={() => updateRule(rule.fieldKey, { above: true })}
                  >
                    <Text
                      style={[
                        styles.dirText,
                        rule.above && styles.dirTextActive,
                      ]}
                    >
                      Above
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dirPill,
                      !rule.above && styles.dirPillActive,
                    ]}
                    onPress={() => updateRule(rule.fieldKey, { above: false })}
                  >
                    <Text
                      style={[
                        styles.dirText,
                        !rule.above && styles.dirTextActive,
                      ]}
                    >
                      Below
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.thresholdInput}
                    value={rule.threshold}
                    onChangeText={(t) =>
                      updateRule(rule.fieldKey, { threshold: t })
                    }
                    placeholder="Value"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="numeric"
                  />
                  {cfg.unit ? (
                    <Text style={styles.unitLabel}>{cfg.unit}</Text>
                  ) : null}
                </View>

                <Text style={styles.msgLabel}>Custom message</Text>
                <TextInput
                  style={styles.msgInput}
                  value={rule.message}
                  onChangeText={(t) =>
                    updateRule(rule.fieldKey, { message: t })
                  }
                  placeholder="Notification message..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                />
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.logSection}>
        <TouchableOpacity
          style={styles.logToggle}
          onPress={() => {
            if (!showLog) refreshLog();
            setShowLog(!showLog);
          }}
        >
          <Text style={styles.logToggleText}>
            {showLog ? "Hide" : "Show"} Notification History
          </Text>
          <Text style={styles.logBadge}>{log.length}</Text>
        </TouchableOpacity>

        {showLog && (
          <>
            {log.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearLog}>
                <Text style={styles.clearBtnText}>Clear all</Text>
              </TouchableOpacity>
            )}
            {log.length === 0 ? (
              <Text style={styles.emptyLog}>No notifications yet.</Text>
            ) : (
              log.slice(0, 50).map((entry) => {
                const cfg = SENSOR_CONFIG[entry.fieldKey];
                return (
                  <View key={entry.id} style={styles.logEntry}>
                    <View style={styles.logEntryHeader}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: cfg?.color || COLORS.accent },
                        ]}
                      />
                      <Text style={styles.logEntryLabel}>
                        {cfg?.label || entry.fieldKey}
                      </Text>
                      <Text style={styles.logEntryTime}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.logEntryMsg}>{entry.message}</Text>
                    <Text style={styles.logEntryValue}>
                      Value: {entry.value} · Threshold: {entry.threshold}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
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
  ruleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ruleLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  ruleName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  ruleBody: {
    marginTop: 14,
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dirPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.elevated,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
  },
  dirPillActive: {
    backgroundColor: COLORS.accent + "20",
    borderColor: COLORS.accent + "50",
  },
  dirText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "600",
  },
  dirTextActive: {
    color: COLORS.accent,
  },
  thresholdInput: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unitLabel: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: "500",
  },
  msgLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  msgInput: {
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  logSection: {
    marginTop: 10,
  },
  logToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 10,
  },
  logToggleText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
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
  clearBtn: {
    alignSelf: "flex-end",
    marginBottom: 10,
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
    paddingVertical: 20,
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
  logEntryValue: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: "500",
  },
});
