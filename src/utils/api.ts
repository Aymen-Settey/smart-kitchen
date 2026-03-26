export interface SensorData {
  timestamp: string;
  entryId: number;
  gas: number;
  smoke: number;
  temperature: number;
  humidity: number;
  flame: number;
  presence: number;
  distance: number;
  dangerLevel: number;
  [key: string]: string | number;
}

interface ThingSpeakEntry {
  created_at: string;
  entry_id: number;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
  field8?: string;
}

interface ThingSpeakChannel {
  name?: string;
  [key: string]: unknown;
}

function parseFeed(entry: ThingSpeakEntry): SensorData {
  return {
    timestamp: entry.created_at,
    entryId: entry.entry_id,
    gas: parseFloat(entry.field1 || '') || 0,
    smoke: parseFloat(entry.field2 || '') || 0,
    temperature: parseFloat(entry.field3 || '') || 0,
    humidity: parseFloat(entry.field4 || '') || 0,
    flame: parseFloat(entry.field5 || '') || 0,
    presence: parseFloat(entry.field6 || '') || 0,
    distance: parseFloat(entry.field7 || '') || 0,
    dangerLevel: parseFloat(entry.field8 || '') || 0,
  };
}

export async function fetchLatestData(channelId: string, apiKey: string): Promise<SensorData> {
  const url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json?api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ThingSpeak error: ${response.status}`);
  }
  const data = await response.json();
  if (!data || !data.created_at) {
    throw new Error('No data available from ThingSpeak');
  }
  return parseFeed(data);
}

export async function fetchHistory(channelId: string, apiKey: string, results: number = 20): Promise<SensorData[]> {
  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=${results}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ThingSpeak error: ${response.status}`);
  }
  const data = await response.json();
  if (!data || !data.feeds) {
    throw new Error('No feeds available');
  }
  return data.feeds.map(parseFeed);
}

export async function fetchChannelInfo(channelId: string, apiKey: string): Promise<ThingSpeakChannel> {
  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ThingSpeak error: ${response.status}`);
  }
  const data = await response.json();
  if (!data || !data.channel) {
    throw new Error('Invalid channel response');
  }
  return data.channel;
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function formatChartTime(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
