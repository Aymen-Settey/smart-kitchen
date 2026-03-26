# Smart Kitchen IoT

Real-time kitchen safety monitoring app built with React Native (Expo SDK 54) and ThingSpeak.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo Go](https://expo.dev/go) installed on your phone

## Install dependencies

```bash
npm install
```

## Launch the app

### Standard (same Wi-Fi network)

```bash
npx expo start
```

Scan the QR code in the terminal with Expo Go.

### With ngrok tunnel (different networks)

**Terminal 1:**

```bash
npx expo start --port 8081
```

**Terminal 2:**

```bash
ngrok http 8081
```

Open the ngrok URL on your phone's browser.

### Platform-specific

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Environment variables

Copy `.env.example` to `.env` and set your ngrok URL if using tunneling:

```bash
cp .env.example .env
```

## Setup

1. Open the app and go to the **Settings** tab
2. Enter your ThingSpeak **Channel ID** and **Read API Key**
3. Tap **Test & save**

The dashboard will start fetching sensor data every 15 seconds.

## Tech Stack

- React Native + Expo SDK 54 (TypeScript)
- React Navigation (Bottom Tabs)
- react-native-svg (charts)
- AsyncStorage (credentials persistence)
- ThingSpeak REST API
