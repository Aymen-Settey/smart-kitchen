import React from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const DarkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#8B5CF6',
    background: '#0A0A0F',
    card: '#14141C',
    text: '#F0F0F5',
    border: '#2A2A38',
    notification: '#EF4444',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

interface TabIconProps {
  label: string;
  focused: boolean;
}

const icons: Record<string, string> = {
  Dashboard: '\u25C9',
  History: '\u25F7',
  Settings: '\u2699',
};

function TabIcon({ label, focused }: TabIconProps) {
  return (
    <Text style={{ fontSize: 20, color: focused ? '#8B5CF6' : '#55556A' }}>
      {icons[label] || '\u25CF'}
    </Text>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: '#55556A',
          tabBarStyle: {
            backgroundColor: '#14141C',
            borderTopWidth: 0.5,
            borderTopColor: '#2A2A38',
            height: 80,
            paddingBottom: 20,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500' as const,
            letterSpacing: 0.3,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
