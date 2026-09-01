# YourGPT React Native SDK - Push Notification Setup

This guide explains how to enable push notifications in your React Native app using the YourGPT SDK. When set up, your users will receive notifications for new messages from the YourGPT widget even when the app is in the background or closed.

## Features

- **Background Notifications**: Receive messages when the app is closed or in the background
- **Automatic Token Management**: FCM/APNs token is fetched, cached, and registered with the backend automatically
- **Two Modes**: Minimalist (auto-handles everything) or Advanced (custom handling)
- **Cross-Platform**: Single codebase handles both Android (FCM) and iOS (APNs)

## Prerequisites

1. React Native >= 0.72 / React >= 18
2. A YourGPT account with a **widget UID**
3. A Firebase project with Android and/or iOS apps registered
4. For iOS: An Apple Developer account with push notification entitlements and a physical device

---

## Step 1: Install Dependencies

```bash
# Required for Android push notifications
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native

# Install iOS pods (the SDK's native APNs module is auto-linked)
cd ios && pod install && cd ..
```

> **Note:** `@react-native-community/push-notification-ios` is **not required**. The SDK includes a built-in native module (`YourGPTApns`) that handles APNs token registration, foreground display, and tap events automatically. The community library is only used as a fallback if the native module is unavailable.

---

## Step 2: Android Setup

### 2.1 Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/) and create or select a project
2. Add an Android app with your package name
3. Download `google-services.json` and place it in `android/app/`

**`android/build.gradle`**:

```groovy
buildscript {
  dependencies {
    classpath('com.google.gms:google-services:4.4.0')
  }
}
```

**`android/app/build.gradle`**:

```groovy
apply plugin: 'com.google.gms.google-services'
```

### 2.2 Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## Step 3: iOS Setup

### 3.1 Xcode Capabilities

1. Open your project in Xcode
2. Select your app target → **Signing & Capabilities**
3. Click **+ Capability** → add **Push Notifications**
4. Click **+ Capability** → add **Background Modes** → enable **Remote notifications**

### 3.2 AppDelegate Configuration

Add a single line to your `AppDelegate.swift` — the SDK handles everything else (token registration, foreground display, tap events) automatically via its built-in native module:

```swift
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import yourgpt_react_native_sdk  // <-- Add this import

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // One-line YourGPT push notification setup.
    // Handles APNs token registration, foreground display, and tap events automatically.
    YourGPTApns.configure(application)

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "YourAppName",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}
```

That's it — no manual delegate methods, no `UNUserNotificationCenterDelegate` conformance, no `RNCPushNotificationIOS` imports. The native module uses method swizzling to intercept APNs callbacks and forwards events to the JS bridge automatically.

### 3.3 Create an APNs Key

1. Go to [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Create a new key with **Apple Push Notifications service (APNs)** enabled
3. Download the `.p8` file and note the **Key ID** and **Team ID**

---

## Step 4: Configure Push Notifications on YourGPT Dashboard

### For Android (FCM)

1. **Firebase Console** → **Project Settings** → **Service Accounts** → **Generate new private key**
2. **YourGPT Dashboard** → chatbot **Settings** → **Notifications** → Enable **FCM** → Upload the JSON file

### For iOS (APNs)

1. **YourGPT Dashboard** → chatbot **Settings** → **Notifications** → Enable **APNs**
2. Enter **Team ID**, **Key ID**, **Bundle ID**, and upload the `.p8` file

Once status shows **"Configured"**, your backend is ready to send push notifications.

---

## Step 5: React Native Integration

### Option A: Quick Setup (Recommended)

**`index.js`** — register the background handler before your app component:

```javascript
import { AppRegistry } from 'react-native';
import App from './App';
import { registerNotificationHandler } from '@yourgpt/chatbot-reactnative';

// Must be called before AppRegistry.registerComponent
registerNotificationHandler();

AppRegistry.registerComponent('YourApp', () => App);
```

> **Why this matters on Android:** when the app is fully closed, FCM data
> messages are delivered to a headless JS task that only runs `index.js` —
> your React tree (and `<YourGPTProvider>`) never mounts. This call registers
> the handlers that display notifications and capture taps in that state.
>
> If you customize notification appearance, pass the same config here so
> killed-state notifications match:
>
> ```javascript
> registerNotificationHandler(notificationConfig, NotificationMode.MINIMALIST);
> ```

**`App.tsx`** — enable notifications in the provider config:

```tsx
import React from 'react';
import { YourGPTProvider, useYourGPT } from '@yourgpt/chatbot-reactnative';

function App() {
  return (
    <YourGPTProvider
      config={{
        widgetUid: 'YOUR_WIDGET_UID',
        enableNotifications: true,
      }}
    >
      <HomeScreen />
    </YourGPTProvider>
  );
}

function HomeScreen() {
  const { open } = useYourGPT();

  return <Button title="Open Chat" onPress={open} />;
}
```

That's it. The SDK handles permission requests, token fetching, registration, and notification display automatically.

### Option B: Full Configuration

```tsx
<YourGPTProvider
  config={{
    widgetUid: 'YOUR_WIDGET_UID',
    enableNotifications: true,
    notificationMode: NotificationMode.MINIMALIST,
    autoRegisterToken: true,
    notificationConfig: {
      soundEnabled: true,
      badgeEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      channelId: 'yourgpt_messages',
      channelName: 'YourGPT Messages',
    },
  }}
>
  {children}
</YourGPTProvider>
```

---

## Step 6: Open the Widget at Least Once

The push token is registered with the YourGPT backend **through the WebView JS bridge** when the widget is opened. Until the widget is opened at least once, the backend won't know where to send notifications.

```tsx
const { open } = useYourGPT();
open(); // Opens the chat widget
```

---

## How It Works

```
1. App starts → Firebase (Android) / YourGPTApns native module (iOS) initialized
   → FCM/APNs token fetched and cached locally
2. User opens widget → Token sent to YourGPT backend via WebView JS bridge
3. New message on backend → FCM (Android) or APNs (iOS) push sent to device
4. YourGPTNotificationClient handles message → Notification displayed
5. User taps notification → Widget opens to the relevant conversation
```

---

## Notification Modes

| Mode         | Description                                                    | Use Case                                |
| ------------ | -------------------------------------------------------------- | --------------------------------------- |
| `MINIMALIST` | Auto-handles everything: display, grouping, tap actions        | Most apps — zero custom code needed     |
| `ADVANCED`   | SDK identifies YourGPT notifications but does not display them | Apps that need custom notification UI   |
| `DISABLED`   | No notification handling                                       | Apps that don't want push notifications |

```typescript
import { NotificationMode } from '@yourgpt/chatbot-reactnative';

// Set during initialization
notificationMode: NotificationMode.MINIMALIST; // or ADVANCED, DISABLED
```

---

## Notification Configuration

```typescript
const notificationConfig: YourGPTNotificationConfig = {
  // Sound
  soundEnabled: true,
  soundUri: undefined, // Android custom sound URI

  // Vibration (Android only)
  vibrationEnabled: true,
  vibrationPattern: [0, 300, 200, 300],

  // LED (Android only)
  ledEnabled: true,
  ledColor: '#0000FF',
  ledOnMs: 300,
  ledOffMs: 3000,

  // Priority & Grouping
  priority: 'high', // 'max' | 'high' | 'default' | 'low' | 'min'
  groupMessages: true,
  groupKey: 'com.yourgpt.sdk.MESSAGES',

  // Actions
  showReplyAction: true,
  autoCancel: true,

  // Quiet Hours
  quietHoursEnabled: true,
  quietHoursStart: '22:00', // HH:MM 24-hr format
  quietHoursEnd: '08:00',

  // Message Preview
  showMessagePreview: true,
  maxPreviewLength: 100,

  // Stacking
  stackNotifications: true,
  maxNotificationStack: 5,

  // Android channel (API 26+)
  channelId: 'yourgpt_messages',
  channelName: 'YourGPT Messages',
  channelDescription: 'Chat messages from YourGPT AI assistant',

  // iOS badge
  badgeEnabled: true,

  // Custom data
  customExtras: {},
};
```

### Available Options

| Option                    | Default                                | Description                                                                                                                     |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `soundEnabled`            | `true`                                 | Play sound on notification                                                                                                      |
| `soundUri`                | `undefined`                            | Custom sound URI (Android only)                                                                                                 |
| `vibrationEnabled`        | `true`                                 | Vibrate on notification (Android only)                                                                                          |
| `vibrationPattern`        | `undefined`                            | Custom vibration pattern in ms                                                                                                  |
| `ledEnabled`              | `undefined`                            | LED indicator (Android only)                                                                                                    |
| `ledColor`                | `undefined`                            | LED color as hex string (Android only)                                                                                          |
| `ledOnMs` / `ledOffMs`    | `undefined`                            | LED timing in ms (Android only)                                                                                                 |
| `priority`                | `undefined`                            | Notification priority (Android only)                                                                                            |
| `groupMessages`           | `true`                                 | Group notifications by conversation                                                                                             |
| `groupKey`                | `undefined`                            | Android notification group key                                                                                                  |
| `showReplyAction`         | `true`                                 | Show inline reply action                                                                                                        |
| `autoCancel`              | `true`                                 | Dismiss on tap (Android)                                                                                                        |
| `quietHoursEnabled`       | `undefined`                            | Suppress notifications during hours                                                                                             |
| `quietHoursStart` / `End` | `undefined`                            | Quiet hours range (HH:MM 24h format)                                                                                            |
| `showMessagePreview`      | `true`                                 | Show message content in notification                                                                                            |
| `maxPreviewLength`        | `100`                                  | Max characters in preview                                                                                                       |
| `stackNotifications`      | `true`                                 | `true`: one notification per message. `false`: a single notification per conversation, updated in place with the latest message |
| `maxNotificationStack`    | `5`                                    | Reserved — not currently applied on Android                                                                                     |
| `channelId`               | `'yourgpt_messages'`                   | Android notification channel ID                                                                                                 |
| `channelName`             | `'YourGPT Messages'`                   | Android notification channel name                                                                                               |
| `channelDescription`      | `'Notifications from YourGPT chatbot'` | Android notification channel description                                                                                        |
| `badgeEnabled`            | `true`                                 | Update app badge count (iOS only)                                                                                               |
| `customExtras`            | `undefined`                            | Custom data attached to notifications                                                                                           |

---

## SDK Methods Reference

### Token Management

```typescript
const client = new YourGPTNotificationClient(config, mode);

// Get cached push token
const token = await client.getToken();

// Cache an APNs token manually (iOS — usually handled automatically)
client.cacheIOSToken(token);
```

### State & Mode

```typescript
// Check initialization
const ready = client.isInitialized;

// Get current mode
const mode = client.currentMode;

// Change mode at runtime
client.setNotificationMode(NotificationMode.ADVANCED);

// Check if notifications are enabled at the OS level
const enabled = await client.checkPermissions();
```

### Notification Tap Handling

```typescript
// Set a callback for when the user taps a notification
client.setNotificationTapCallback(data => {
  console.log('Notification tapped:', data);
});
```

### Incoming Message Handling (Advanced Mode)

```typescript
// Manually handle an incoming push message
client.handleIncomingPushMessage(data);

// Handle a notification tap with deep linking
client.handleNotificationTap(
  data,
  sessionUid => {
    /* open specific session */
  },
  () => {
    /* show widget */
  },
);
```

### Badge Management (iOS)

```typescript
client.setBadgeCount(5);
client.incrementBadgeCount();
client.resetBadgeCount();
```

### Lifecycle

```typescript
client.destroy();
```

---

## Advanced Mode: Custom Notification Handling

If you use `NotificationMode.ADVANCED`, the SDK fetches and caches the push token but does **not** display notifications — your app handles display.

```tsx
import {
  YourGPTNotificationClient,
  NotificationMode,
} from '@yourgpt/chatbot-reactnative';

const client = new YourGPTNotificationClient(
  { soundEnabled: true },
  NotificationMode.ADVANCED,
);

client.setEventListener({
  onMessageReceived: () => {},
  onChatOpened: () => {},
  onChatClosed: () => {},
  onError: () => {},
  onLoadingStarted: () => {},
  onLoadingFinished: () => {},

  onPushTokenReceived: token => {
    console.log('Push token:', token);
  },
  onPushMessageReceived: data => {
    // Display your own custom notification
    console.log('Push message:', data);
  },
  onNotificationClicked: data => {
    console.log('Notification tapped:', data);
  },
});

await client.initialize();
```

---

## Complete Example

### `index.js`

```javascript
import { AppRegistry } from 'react-native';
import App from './App';
import { registerNotificationHandler } from '@yourgpt/chatbot-reactnative';

registerNotificationHandler();
AppRegistry.registerComponent('MyApp', () => App);
```

### `App.tsx`

```tsx
import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import {
  YourGPTProvider,
  useYourGPT,
  useSDKState,
  NotificationMode,
} from '@yourgpt/chatbot-reactnative';

export default function App() {
  return (
    <YourGPTProvider
      config={{
        widgetUid: 'YOUR_WIDGET_UID',
        enableNotifications: true,
        notificationMode: NotificationMode.MINIMALIST,
        notificationConfig: {
          soundEnabled: true,
          badgeEnabled: true,
        },
      }}
    >
      <HomeScreen />
    </YourGPTProvider>
  );
}

function HomeScreen() {
  const { open, openSession } = useYourGPT();
  const state = useSDKState();

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        SDK: {state.isInitialized ? 'Ready' : 'Not Ready'}
      </Text>
      <Text style={styles.status}>Connection: {state.connectionState}</Text>

      <Button title="Open Chat" onPress={open} />
      <Button
        title="Open Session"
        onPress={() => openSession('conversation-uid')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  status: { fontSize: 14, color: '#666' },
});
```

---

## Testing

1. Install on a **physical device** (push notifications do not work on iOS Simulator; FCM may not work on Android emulators)
2. Grant notification permission when prompted
3. Open the widget at least once (so the push token is registered with the backend)
4. Close or background the app
5. Send a test message through the YourGPT dashboard

---

## Troubleshooting

### Notifications not received

1. Verify credentials show **"Configured"** on the YourGPT Dashboard
2. **Android**: Verify `google-services.json` is in `android/app/`
3. **iOS**: Confirm Push Notifications and Background Modes capabilities in Xcode
4. **iOS**: Verify `YourGPTApns.configure(application)` is called in AppDelegate (see Step 3.2)
5. Ensure the widget was opened at least once after SDK initialization
6. Enable `debug: true` and check console for `[YourGPT]` logs

### Notifications not received in killed state (Android)

1. Verify `registerNotificationHandler()` is called in `index.js` **before** `AppRegistry.registerComponent` — killed-state messages run in a headless JS context where handlers registered inside `<YourGPTProvider>` don't exist
2. Test with a release build — in debug builds, headless JS depends on a live Metro connection
3. Don't use **Force stop** to test: Android blocks all FCM delivery to force-stopped apps until the next manual launch (swipe the app away from recents instead)
4. Check OEM battery settings (e.g. Samsung "Sleeping apps", battery optimization) — set the app's battery usage to Unrestricted

### Notifications received but not displayed

1. **Android**: Ensure `POST_NOTIFICATIONS` permission is granted (Android 13+)
2. Check that the notification channel is not disabled in device settings
3. Verify `notificationMode` is not `DISABLED`
4. Check that quiet hours are not active

### Widget doesn't open on notification tap

1. **iOS**: Ensure `YourGPTApns.configure(application)` is called in AppDelegate before React Native starts
2. Verify `YourGPTProvider` is rendered with `enableNotifications: true`
3. **iOS**: Run `pod install` after adding the SDK — the native module must be linked

### Token not registered

1. The push token is sent via the WebView JS bridge — the widget must be opened at least once
2. Enable `debug: true` and check for `"Registering push token"` in the console

### iOS: `No such module 'yourgpt_react_native_sdk'`

The SDK's native module is auto-linked via `use_native_modules!` in your Podfile. Make sure you run `pod install` after adding the SDK:

```bash
cd ios && pod install && cd ..
```

If you still see the error, verify the SDK's `react-native.config.js` exists at the package root and that the podspec is included in `package.json`'s `files` array.

## Support

For issues or questions, please refer to the main [README](README.md) or contact YourGPT support.

- Documentation: [https://docs.yourgpt.ai](https://docs.yourgpt.ai)
- Email: support@yourgpt.ai
