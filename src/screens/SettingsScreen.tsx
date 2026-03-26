import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SENSOR_CONFIG, RADIUS } from '../utils/theme';
import { fetchChannelInfo } from '../utils/api';

const FIELD_ENTRIES = Object.entries(SENSOR_CONFIG);

export default function SettingsScreen() {
  const [channelId, setChannelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [channelName, setChannelName] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('thingspeak_config');
        if (stored) {
          const cfg = JSON.parse(stored);
          setChannelId(cfg.channelId || '');
          setApiKey(cfg.apiKey || '');
          setChannelName(cfg.channelName || null);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleTestSave = async () => {
    if (!channelId.trim() || !apiKey.trim()) {
      Alert.alert('Missing Fields', 'Please enter both Channel ID and Read API Key.');
      return;
    }
    setTesting(true);
    try {
      const info = await fetchChannelInfo(channelId.trim(), apiKey.trim());
      const name = info.name || 'Unknown Channel';
      const fieldCount = Object.keys(info).filter((k) => k.startsWith('field') && info[k]).length;

      await AsyncStorage.setItem(
        'thingspeak_config',
        JSON.stringify({
          channelId: channelId.trim(),
          apiKey: apiKey.trim(),
          channelName: name,
        })
      );
      setChannelName(name as string);
      Alert.alert('Connected!', `Channel: ${name}\nActive fields: ${fieldCount}`);
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message);
    }
    setTesting(false);
  };

  const handleClear = async () => {
    await AsyncStorage.removeItem('thingspeak_config');
    setChannelId('');
    setApiKey('');
    setChannelName(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ThingSpeak Connection</Text>

        {channelName && (
          <View style={styles.connectedPill}>
            <View style={[styles.dot, { backgroundColor: COLORS.safe }]} />
            <Text style={styles.connectedText}>Connected to {channelName}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>CHANNEL ID</Text>
        <TextInput
          style={styles.input}
          value={channelId}
          onChangeText={setChannelId}
          placeholder="e.g. 2345678"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>
          Found at: thingspeak.com → Your channel → Channel ID
        </Text>

        <Text style={styles.inputLabel}>READ API KEY</Text>
        <TextInput
          style={[styles.input, styles.monoInput]}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="e.g. ABC123XYZ"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="characters"
        />
        <Text style={styles.hint}>
          Found at: thingspeak.com → Your channel → API Keys tab → Read API Key
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, testing && styles.btnDisabled]}
            onPress={handleTestSave}
            disabled={testing}
          >
            <Text style={styles.primaryBtnText}>
              {testing ? 'Testing...' : 'Test & save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClear}>
            <Text style={styles.dangerBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How the data flows</Text>
        {[
          { num: '1', text: 'ESP32 reads sensors every 15 seconds' },
          { num: '2', text: 'Data is sent to ThingSpeak cloud via Wi-Fi' },
          { num: '3', text: 'This app fetches the latest data from ThingSpeak' },
        ].map((step) => (
          <View key={step.num} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{step.num}</Text>
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Field mapping reference</Text>
        {FIELD_ENTRIES.map(([fieldKey, cfg]) => (
          <View key={fieldKey} style={styles.fieldRow}>
            <View style={[styles.fieldDot, { backgroundColor: cfg.color }]} />
            <Text style={styles.fieldKey}>{fieldKey}</Text>
            <Text style={styles.fieldLabel}>{cfg.label}</Text>
            <Text style={styles.fieldUnit}>{cfg.unit || '—'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Smart Kitchen IoT v1.0</Text>
        <Text style={styles.footerSub}>ESP32 + ThingSpeak + React Native</Text>
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
    paddingBottom: 40,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.safeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  connectedText: {
    color: COLORS.safe,
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    color: COLORS.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.inner,
    borderWidth: 0.5,
    borderColor: COLORS.surfaceBorder,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  monoInput: {
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  hint: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.inner,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: RADIUS.inner,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.surfaceBorder,
  },
  fieldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  fieldKey: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    width: 48,
    fontFamily: 'monospace',
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fieldUnit: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    width: 30,
    textAlign: 'right',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 20,
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  footerSub: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.6,
  },
});
