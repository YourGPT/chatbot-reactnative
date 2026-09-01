import { AppState, Platform } from 'react-native';
import type { NativeEventSubscription } from 'react-native';
import { Logger } from '../utils/logger';
import type { YourGPTNotificationConfig } from '../types/config';
import { NotificationMode } from '../types/config';
import type { YourGPTEventListener } from '../types/events';
import { QuietHoursManager } from './QuietHoursManager';
import { withNotificationDefaults } from './defaults';

interface NotificationData {
  title?: string;
  body?: string;
  sessionUid?: string;
  session_uid?: string;
  conversation_id?: string;
  widget_uid?: string;
  sender_name?: string;
  message_content?: string;
  [key: string]: string | undefined;
}

export class AndroidNotificationManager {
  // Static storage for background/killed-state notification taps
  private static _pendingBackgroundTap: Record<string, string> | null = null;

  // Config used by the headless (killed-state) message handler. index.js can
  // customize it via registerNotificationHandler(config, mode); a mounted
  // manager instance keeps it in sync with the runtime config.
  //
  // Seeded with the shared defaults, not {}: the headless JS context never
  // constructs a YourGPTNotificationClient, so nothing else would apply them
  // and killed-state notifications would land on a different channel than
  // foreground ones.
  private static _headlessConfig: YourGPTNotificationConfig =
    withNotificationDefaults();
  private static _headlessMode: NotificationMode = NotificationMode.MINIMALIST;

  private config: YourGPTNotificationConfig;
  private mode: NotificationMode;
  private listener: YourGPTEventListener | null = null;
  private quietHours: QuietHoursManager;
  private onTokenReceived: (token: string) => void;
  private onNotificationTap: ((data: Record<string, string>) => void) | null =
    null;
  private unsubscribeForeground: (() => void) | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeNotifeeEvents: (() => void) | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;

  /**
   * Register Notifee background event handler and the FCM background message
   * handler.
   * MUST be called at app entry point (index.js), before AppRegistry.registerComponent.
   *
   * The FCM handler must be registered here and not in initialize(): when the
   * app is killed, Firebase delivers data-only messages via a headless JS task
   * that only executes index.js — YourGPTProvider never mounts, so a handler
   * registered during initialize() does not exist in that context and no
   * notification would be displayed.
   */
  static registerBackgroundHandler(
    config?: YourGPTNotificationConfig,
    mode?: NotificationMode,
  ): void {
    if (Platform.OS !== 'android') return;

    if (config) {
      AndroidNotificationManager._headlessConfig =
        withNotificationDefaults(config);
    }
    if (mode) {
      AndroidNotificationManager._headlessMode = mode;
    }

    try {
      const notifee = require('@notifee/react-native').default;
      notifee.onBackgroundEvent(
        async ({ type, detail }: { type: number; detail: any }) => {
          // type 1 = PRESS
          if (type === 1 && detail?.notification?.data) {
            Logger.log('Notifee background tap:', detail.notification.data);
            AndroidNotificationManager._pendingBackgroundTap = detail
              .notification.data as Record<string, string>;
          }
        },
      );
      Logger.log('Notifee background handler registered');
    } catch (e) {
      Logger.log('Notifee not available, skipping background tap handler:', e);
    }

    try {
      const messaging = require('@react-native-firebase/messaging').default;
      messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
        Logger.log('FCM background/killed-state message:', remoteMessage);
        await AndroidNotificationManager.handleHeadlessMessage(remoteMessage);
      });
      Logger.log('FCM background message handler registered');
    } catch (e) {
      Logger.log(
        'Firebase messaging not available, skipping background handler:',
        e,
      );
    }
  }

  /**
   * Display a notification for a message received while no manager instance
   * exists (app killed / headless JS). A mounted instance re-registers the
   * FCM handler with its own config, so this only runs in headless mode.
   */
  private static async handleHeadlessMessage(remoteMessage: any): Promise<void> {
    const config = AndroidNotificationManager._headlessConfig;

    if (config.notificationsEnabled === false) {
      Logger.log('Notifications disabled via config');
      return;
    }
    if (AndroidNotificationManager._headlessMode !== NotificationMode.MINIMALIST) {
      return;
    }

    const data: NotificationData = {
      ...(remoteMessage.notification ?? {}),
      ...(remoteMessage.data ?? {}),
    };

    if (new QuietHoursManager(config).isQuietHour()) {
      Logger.log('Notification suppressed (quiet hours)');
      return;
    }

    await AndroidNotificationManager.displayLocalNotification(data, config);
  }

  constructor(
    config: YourGPTNotificationConfig,
    mode: NotificationMode,
    onTokenReceived: (token: string) => void,
  ) {
    this.config = withNotificationDefaults(config);
    this.mode = mode;
    this.onTokenReceived = onTokenReceived;
    this.quietHours = new QuietHoursManager(this.config);

    // Keep the headless (killed-state) handler consistent with runtime config,
    // so a notification looks the same whether the app was alive or killed.
    AndroidNotificationManager._headlessConfig = this.config;
    AndroidNotificationManager._headlessMode = mode;
  }

  setNotificationTapHandler(
    handler: (data: Record<string, string>) => void,
  ): void {
    this.onNotificationTap = handler;

    // Replay any pending background tap that arrived before handler was set
    if (AndroidNotificationManager._pendingBackgroundTap) {
      const data = AndroidNotificationManager._pendingBackgroundTap;
      AndroidNotificationManager._pendingBackgroundTap = null;
      Logger.log('Replaying pending background tap:', data);
      handler(data);
    }
  }

  setEventListener(listener: YourGPTEventListener | null): void {
    this.listener = listener;
  }

  async getToken(): Promise<string | null> {
    if (Platform.OS !== 'android') {
      return null;
    }
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      const token = await messaging().getToken();
      console.log('FCM token obtained:', token);
      Logger.log('FCM token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (e) {
      Logger.error('Failed to get FCM token:', e);
      return null;
    }
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const messaging = require('@react-native-firebase/messaging').default;

      // Get initial token
      const token = await this.getToken();
      if (token) {
        this.onTokenReceived(token);
      }

      // Listen for token refresh
      this.unsubscribeTokenRefresh = messaging().onTokenRefresh(
        (newToken: string) => {
          Logger.log('FCM token refreshed');
          this.onTokenReceived(newToken);
        },
      );

      // Handle foreground messages
      this.unsubscribeForeground = messaging().onMessage(
        async (remoteMessage: any) => {
          Logger.log('FCM foreground message:', remoteMessage);
          this.handleMessage(remoteMessage);
        },
      );

      // Register background handler
      messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
        Logger.log('FCM background message:', remoteMessage);
        this.handleMessage(remoteMessage);
      });

      // Handle Notifee local notification taps (foreground)
      try {
        const notifee = require('@notifee/react-native').default;
        this.unsubscribeNotifeeEvents = notifee.onForegroundEvent(
          ({ type, detail }: { type: number; detail: any }) => {
            // type 1 = PRESS
            if (type === 1 && detail?.notification?.data) {
              Logger.log('Notifee foreground tap:', detail.notification.data);
              this._handleTap(
                detail.notification.data as Record<string, string>,
              );
            }
          },
        );

        // Check Notifee's getInitialNotification for killed-state tap
        // (Firebase's getInitialNotification doesn't work for Notifee local notifications)
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification?.data) {
          Logger.log(
            'Notifee initial notification (cold start):',
            initialNotification.notification.data,
          );
          this._handleTap(
            initialNotification.notification.data as Record<string, string>,
          );
        }
      } catch {
        // Notifee not installed
      }

      // Fallback: Firebase notification tap handlers (for FCM remote notifications)
      const initialFcm = await messaging().getInitialNotification();
      if (initialFcm?.data) {
        Logger.log('FCM initial notification (cold start):', initialFcm.data);
        this._handleTap(initialFcm.data as Record<string, string>);
      }

      messaging().onNotificationOpenedApp((remoteMessage: any) => {
        if (remoteMessage?.data) {
          Logger.log('FCM notification opened app:', remoteMessage.data);
          this._handleTap(remoteMessage.data as Record<string, string>);
        }
      });

      // Listen for app returning to foreground — replay any background tap
      this.appStateSubscription = AppState.addEventListener(
        'change',
        nextState => {
          if (
            nextState === 'active' &&
            AndroidNotificationManager._pendingBackgroundTap
          ) {
            const data = AndroidNotificationManager._pendingBackgroundTap;
            AndroidNotificationManager._pendingBackgroundTap = null;
            Logger.log('App foregrounded — replaying background tap:', data);
            this._handleTap(data);
          }
        },
      );

      Logger.log('Android notification manager initialized');
    } catch (e) {
      Logger.error(
        'Failed to initialize Android notifications (is @react-native-firebase/messaging installed?):',
        e,
      );
    }
  }

  handleMessage(remoteMessage: any): void {
    // Master switch
    if (this.config.notificationsEnabled === false) {
      Logger.log('Notifications disabled via config');
      return;
    }

    const data: NotificationData = {
      ...(remoteMessage.notification ?? {}),
      ...(remoteMessage.data ?? {}),
    };

    // Check quiet hours
    if (this.quietHours.isQuietHour()) {
      Logger.log('Notification suppressed (quiet hours)');
      return;
    }

    // Call event listener
    this.listener?.onPushMessageReceived?.(data as Record<string, string>);

    if (this.mode === NotificationMode.MINIMALIST) {
      this.showLocalNotification(data);
    }
  }

  handleNotificationTap(data: NotificationData): void {
    this._handleTap(data as Record<string, string>);
  }

  private _handleTap(data: Record<string, string>): void {
    Logger.log('Notification tapped:', data);
    this.listener?.onNotificationClicked?.(data);
    this.onNotificationTap?.(data);
  }

  private async showLocalNotification(data: NotificationData): Promise<void> {
    await AndroidNotificationManager.displayLocalNotification(
      data,
      this.config,
    );
  }

  /**
   * Stable notifee notification id. FCM may redeliver a message with the same
   * messageId (e.g. when the process dies before the first delivery is acked),
   * and each redelivery runs in a fresh headless JS context — so dedupe must
   * key off the message payload, not in-memory state. A stable id makes a
   * redelivery update the existing notification instead of duplicating it.
   *
   * With stackNotifications disabled, the id is per-session instead, so each
   * conversation keeps a single notification updated with the latest message.
   */
  private static notificationIdFor(
    data: NotificationData,
    config: YourGPTNotificationConfig,
  ): string | undefined {
    let messageId = data.id;
    let sessionId = data.sessionUid ?? data.session_uid ?? data.conversation_id;

    if (typeof data.action_payload === 'string') {
      try {
        const payload = JSON.parse(data.action_payload);
        messageId = messageId ?? payload?.id?.toString();
        sessionId = sessionId ?? payload?.session_id?.toString();
      } catch {
        // action_payload is not JSON — ignore
      }
    }

    if (config.stackNotifications === false) {
      return `yourgpt_session_${sessionId ?? 'default'}`;
    }
    return messageId != null ? `yourgpt_msg_${messageId}` : undefined;
  }

  private static async displayLocalNotification(
    data: NotificationData,
    rawConfig: YourGPTNotificationConfig,
  ): Promise<void> {
    // Final choke point for every Android display path (foreground, background
    // and headless), so resolve defaults here rather than trusting the caller
    // to have merged them. Inline `??` fallbacks must not be reintroduced
    // below: they are how the headless path silently drifted onto a stale
    // channel ID.
    const config = withNotificationDefaults(rawConfig);

    const title = data.title ?? data.sender_name ?? 'New Message';
    const body = data.body ?? data.message_content ?? '';

    const preview =
      config.showMessagePreview !== false
        ? body.substring(0, config.maxPreviewLength ?? 100)
        : 'New message';

    Logger.log('Showing local Android notification:', title, preview);

    try {
      const notifee = require('@notifee/react-native').default;

      // FCM redelivers already-handled messages when the process that handled
      // them is killed (e.g. the user swipes the app away) before Play
      // Services considers them acknowledged. If the exact same message is
      // still in the notification shade, skip the redelivery entirely — even
      // an in-place update would bump the notification to the top of the
      // shade and read like a new arrival.
      if (typeof data.action_payload === 'string') {
        try {
          const displayed = await notifee.getDisplayedNotifications();
          const alreadyShown = displayed?.some(
            (n: any) => n?.notification?.data?.action_payload === data.action_payload,
          );
          if (alreadyShown) {
            Logger.log('Duplicate FCM delivery — already displayed, skipping');
            return;
          }
        } catch {
          // If the shade can't be queried, fall through and display.
        }
      }

      const channelId = config.channelId;

      // Create notification channel (required on Android 8+, no-op if exists)
      await notifee.createChannel({
        id: channelId,
        name: config.channelName,
        description: config.channelDescription,
        importance: 4, // HIGH
        sound: config.soundEnabled !== false ? config.soundUri : undefined,
        vibration: config.vibrationEnabled !== false,
        vibrationPattern:
          config.vibrationEnabled !== false
            ? config.vibrationPattern ?? [300, 300, 300, 300]
            : undefined,
      });

      // Include original data so it's available on notification tap
      const notificationData: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          notificationData[key] = value;
        }
      }

      await notifee.displayNotification({
        id: AndroidNotificationManager.notificationIdFor(data, config),
        title,
        body: preview,
        data: notificationData,
        android: {
          channelId,
          importance: 4, // HIGH
          // With the stable id above, an FCM redelivery updates the existing
          // notification; onlyAlertOnce keeps that update from re-alerting.
          onlyAlertOnce: true,
          pressAction: { id: 'default' },
          smallIcon: config.smallIconRes,
          groupId: config.groupMessages !== false ? config.groupKey : undefined,
        },
      });
    } catch (e: any) {
      Logger.error('Notification display failed:', e?.message ?? e);
    }
  }

  destroy(): void {
    this.unsubscribeForeground?.();
    this.unsubscribeTokenRefresh?.();
    this.unsubscribeNotifeeEvents?.();
    this.appStateSubscription?.remove();
    this.unsubscribeForeground = null;
    this.unsubscribeTokenRefresh = null;
    this.unsubscribeNotifeeEvents = null;
    this.appStateSubscription = null;
    this.onNotificationTap = null;
  }
}
