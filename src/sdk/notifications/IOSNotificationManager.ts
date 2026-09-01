import {Platform} from 'react-native';
import {Logger} from '../utils/logger';
import type {YourGPTNotificationConfig} from '../types/config';
import {NotificationMode} from '../types/config';
import type {YourGPTEventListener} from '../types/events';
import {QuietHoursManager} from './QuietHoursManager';
import {YourGPTApnsNative} from './YourGPTApnsNative';

const APNS_TOKEN_STORAGE_KEY = 'yourgpt_sdk_push_token';

interface NotificationData {
  title?: string;
  body?: string;
  aps?: {alert?: {title?: string; body?: string} | string; badge?: number};
  sessionUid?: string;
  session_uid?: string;
  conversation_id?: string;
  widget_uid?: string;
  sender_name?: string;
  message_content?: string;
  [key: string]: any;
}

export class IOSNotificationManager {
  private config: YourGPTNotificationConfig;
  private mode: NotificationMode;
  private listener: YourGPTEventListener | null = null;
  private quietHours: QuietHoursManager;
  private onTokenReceived: (token: string) => void;
  private onNotificationTap: ((data: Record<string, string>) => void) | null = null;
  private _pendingNotificationTap: Record<string, any> | null = null;
  private useNativeModule: boolean;

  constructor(
    config: YourGPTNotificationConfig,
    mode: NotificationMode,
    onTokenReceived: (token: string) => void,
  ) {
    this.config = config;
    this.mode = mode;
    this.onTokenReceived = onTokenReceived;
    this.quietHours = new QuietHoursManager(config);
    this.useNativeModule = YourGPTApnsNative.isAvailable;
  }

  setEventListener(listener: YourGPTEventListener | null): void {
    this.listener = listener;
  }

  setNotificationTapHandler(handler: (data: Record<string, string>) => void): void {
    this.onNotificationTap = handler;

    // Replay any notification tap that arrived before this handler was registered
    // (cold start: app killed → notification tap → app launches → handler wired)
    if (this._pendingNotificationTap) {
      const data = this._pendingNotificationTap;
      this._pendingNotificationTap = null;
      Logger.log('[APNs] Replaying queued notification tap');
      handler(data as Record<string, string>);
    }
  }

  async getToken(): Promise<string | null> {
    if (Platform.OS !== 'ios') {
      return null;
    }

    if (this.useNativeModule) {
      return YourGPTApnsNative.getToken();
    }

    return this._cachedToken;
  }

  private _cachedToken: string | null = null;

  cacheToken(token: string): void {
    this._cachedToken = token;
    Logger.log('APNs token cached:', token.substring(0, 20) + '...', '(length:', token.length + ')');
    // Persist to AsyncStorage for availability across app restarts
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem(APNS_TOKEN_STORAGE_KEY, token).catch((e: any) =>
        Logger.warn('Failed to persist APNs token:', e),
      );
    } catch {
      // AsyncStorage not installed — skip persistence
    }
    this.onTokenReceived(token);
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    if (this.useNativeModule) {
      return this._initializeWithNativeModule();
    }

    return this._initializeWithRNCPushNotification();
  }

  // ─── Native module path (YourGPTApns.configure() in AppDelegate) ────────

  private async _initializeWithNativeModule(): Promise<void> {
    Logger.log('[APNs-Flow] Using native YourGPTApns module');

    YourGPTApnsNative.startListening();

    // Token received
    YourGPTApnsNative.on('YourGPTApns:onTokenReceived', (token: string) => {
      Logger.log('[APNs-Flow] Token received from native module:', token.substring(0, 20) + '...');
      this._cachedToken = token;
      this.onTokenReceived(token);
    });

    // Token error
    YourGPTApnsNative.on('YourGPTApns:onTokenError', (error: string) => {
      Logger.error('[APNs-Flow] APNs registration FAILED:', error);
      this.listener?.onPushTokenError?.(error);
    });

    // Notification received (foreground)
    YourGPTApnsNative.on('YourGPTApns:onNotificationReceived', (data: Record<string, any>) => {
      Logger.log('[APNs] Notification received from native module');
      this.handleMessage(data as NotificationData);
    });

    // Notification tapped
    YourGPTApnsNative.on('YourGPTApns:onNotificationTapped', (data: Record<string, any>) => {
      Logger.log('[APNs] Notification tapped from native module');
      this.handleNotificationTap(data);
    });

    // Permission callbacks
    YourGPTApnsNative.on('YourGPTApns:onPermissionGranted', () => {
      this.listener?.onNotificationPermissionGranted?.();
    });

    YourGPTApnsNative.on('YourGPTApns:onPermissionDenied', () => {
      this.listener?.onNotificationPermissionDenied?.();
    });

    // Try to get an already-cached token from the native side
    const existingToken = await YourGPTApnsNative.getToken();
    if (existingToken) {
      this._cachedToken = existingToken;
      Logger.log('[APNs-Flow] Loaded cached token from native module');
      this.onTokenReceived(existingToken);
    }

    // Request permission & register
    Logger.log('[APNs-Flow] Requesting permissions via native module...');
    await YourGPTApnsNative.requestPermission();

    Logger.log('iOS notification manager initialized (native module)');
  }

  // ─── Fallback path (RNCPushNotificationIOS — requires AppDelegate setup) ─

  private async _initializeWithRNCPushNotification(): Promise<void> {
    Logger.log('[APNs-Flow] Native module not available, falling back to RNCPushNotificationIOS');

    // Restore persisted token so it's available before the OS re-delivers
    try {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const storedToken = await AsyncStorage.getItem(APNS_TOKEN_STORAGE_KEY);
      if (storedToken) {
        this._cachedToken = storedToken;
        Logger.log('Loaded persisted APNs token');
        this.onTokenReceived(storedToken);
      }
    } catch {
      // AsyncStorage not installed — skip
    }

    try {
      const {getPushNotificationIOS} = require('./getPushNotificationIOS');
      const PushNotificationIOS = getPushNotificationIOS();

      // Register for token
      PushNotificationIOS.addEventListener(
        'register',
        (deviceToken: string) => {
          Logger.log('[APNs-Flow] APNs device token received from OS | token:', deviceToken.substring(0, 20) + '...', '| length:', deviceToken.length);
          this.cacheToken(deviceToken);
        },
      );

      // Handle foreground notifications
      PushNotificationIOS.addEventListener(
        'notification',
        (notification: any) => {
          const data = notification.getData() as NotificationData;
          Logger.log('[APNs] iOS notification received | data:', JSON.stringify(data));
          this.handleMessage(data);
          const noDataResult =
            PushNotificationIOS.FetchResult?.NoData ??
            'UIBackgroundFetchResultNoData';
          notification.finish(noDataResult);
        },
      );

      // Handle registration errors
      PushNotificationIOS.addEventListener(
        'registrationError',
        (error: any) => {
          Logger.error('[APNs-Flow] APNs registration FAILED:', JSON.stringify(error));
          this.listener?.onPushTokenError?.(error);
        },
      );

      // Handle notification taps (fires when user taps a notification)
      PushNotificationIOS.addEventListener(
        'localNotification',
        (notification: any) => {
          const data = notification.getData() as NotificationData;
          if (notification.getUserInteraction?.() ?? data?.userInteraction) {
            Logger.log('iOS notification tapped');
            this.handleNotificationTap(data as Record<string, any>);
          }
        },
      );

      // Request permission & register for remote notifications
      Logger.log('[APNs-Flow] IOSNotificationManager requesting permissions & registering for remote notifications...');
      PushNotificationIOS.requestPermissions({alert: true, badge: true, sound: true})
        .then((result: any) => {
          Logger.log('[APNs-Flow] Permission result from IOSNotificationManager:', JSON.stringify(result));
        })
        .catch((err: any) => {
          Logger.error('[APNs-Flow] Permission request failed in IOSNotificationManager:', err);
        });

      // Check for cold-start notification (app launched by tapping a notification)
      const initialNotification =
        await PushNotificationIOS.getInitialNotification();
      if (initialNotification) {
        const data = initialNotification.getData() as NotificationData;
        Logger.log('iOS initial notification (cold start)');
        this.handleNotificationTap(data as Record<string, any>);
      }

      Logger.log('iOS notification manager initialized (RNCPushNotificationIOS fallback)');
    } catch (e) {
      Logger.error(
        'Failed to initialize iOS notifications. Either:\n' +
        '  1. Call YourGPTApns.configure(application) in your AppDelegate.swift, OR\n' +
        '  2. Install @react-native-community/push-notification-ios and add AppDelegate callbacks manually.\n' +
        'Error:', e,
      );
    }
  }

  // ─── Message & tap handling ──────────────────────────────────────────────

  handleMessage(data: NotificationData): void {
    // Master switch
    if (this.config.notificationsEnabled === false) {
      Logger.log('[APNs] Notifications disabled via config');
      return;
    }

    Logger.log('[APNs] handleMessage called | mode:', this.mode, '| quietHours:', this.quietHours.isQuietHour());

    // Check quiet hours
    if (this.quietHours.isQuietHour()) {
      Logger.log('[APNs] Notification suppressed (quiet hours)');
      return;
    }

    this.listener?.onPushMessageReceived?.(data as Record<string, string>);

    if (this.mode === NotificationMode.MINIMALIST && !this.useNativeModule) {
      // Native module handles foreground display natively (willPresent delegate),
      // so only show local notifications in the fallback path.
      Logger.log('[APNs] Showing local notification (MINIMALIST mode, fallback path)');
      this.showLocalNotification(data);
    }

    // Increment badge count
    if (this.config.badgeEnabled !== false) {
      this.setBadgeCount((this._currentBadge ?? 0) + 1);
    }
  }

  handleNotificationTap(userInfo: Record<string, any>): void {
    this.listener?.onNotificationClicked?.(userInfo);

    if (this.onNotificationTap) {
      this.onNotificationTap(userInfo as Record<string, string>);
    } else {
      // Handler not registered yet — queue for replay when setNotificationTapHandler is called
      Logger.log('[APNs] Notification tap queued (handler not yet registered)');
      this._pendingNotificationTap = userInfo;
    }

    // Auto-dismiss notifications when tapped/opened
    if (this.config.autoDismissOnOpen !== false) {
      this.removeAllDeliveredNotifications();
    }
  }

  removeAllDeliveredNotifications(): void {
    if (this.useNativeModule) {
      YourGPTApnsNative.removeAllDeliveredNotifications();
      Logger.log('All delivered notifications removed (native)');
      return;
    }

    try {
      const {getPushNotificationIOS: getPNIOS} = require('./getPushNotificationIOS');
      const PushNotificationIOS = getPNIOS();
      PushNotificationIOS.removeAllDeliveredNotifications();
      Logger.log('All delivered notifications removed');
    } catch (e) {
      Logger.error('Failed to remove delivered notifications:', e);
    }
  }

  private _currentBadge: number = 0;

  setBadgeCount(count: number): void {
    this._currentBadge = count;

    if (this.useNativeModule) {
      YourGPTApnsNative.setBadgeCount(count);
      Logger.log('Badge count set to:', count);
      return;
    }

    try {
      const {getPushNotificationIOS: getPNIOS} = require('./getPushNotificationIOS');
      const PushNotificationIOS = getPNIOS();
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
      Logger.log('Badge count set to:', count);
    } catch (e) {
      Logger.error('Failed to set badge count:', e);
    }
  }

  resetBadgeCount(): void {
    this.setBadgeCount(0);
  }

  incrementBadgeCount(): void {
    this.setBadgeCount(this._currentBadge + 1);
  }

  private showLocalNotification(data: NotificationData): void {
    // Only used in fallback (RNCPushNotificationIOS) path
    const apsAlert = data.aps?.alert;
    const title =
      data.title ??
      (typeof apsAlert === 'object' ? apsAlert?.title : undefined) ??
      data.sender_name ??
      'New Message';
    const body =
      data.body ??
      (typeof apsAlert === 'object' ? apsAlert?.body : apsAlert) ??
      data.message_content ??
      '';

    const preview =
      this.config.showMessagePreview !== false
        ? body.substring(0, this.config.maxPreviewLength ?? 100)
        : 'New message';

    Logger.log('Showing local iOS notification:', title, preview);

    try {
      const {getPushNotificationIOS: getPNIOS} = require('./getPushNotificationIOS');
      const PushNotificationIOS = getPNIOS();
      const sessionUid = data.session_uid ?? data.sessionUid ?? data.conversation_id;
      const threadId = sessionUid && this.config.threadIdentifierPrefix
        ? `${this.config.threadIdentifierPrefix}.${sessionUid}`
        : undefined;

      const soundUri = this.config.soundUri ?? 'yourgpt_notification';
      const iosSoundUri = soundUri.includes('.') ? soundUri : `${soundUri}.wav`;

      PushNotificationIOS.addNotificationRequest({
        id: `yourgpt_${Date.now()}`,
        title: title,
        body: preview,
        sound: this.config.soundEnabled !== false
          ? iosSoundUri
          : undefined,
        category: this.config.categoryIdentifier ?? 'chat_message',
        threadId,
        userInfo: data,
      });
    } catch (e) {
      Logger.error('Failed to show local iOS notification:', e);
    }
  }

  destroy(): void {
    this._cachedToken = null;
    this.onNotificationTap = null;
    this._pendingNotificationTap = null;

    if (this.useNativeModule) {
      YourGPTApnsNative.destroy();
      return;
    }

    try {
      const {getPushNotificationIOS: getPNIOS} = require('./getPushNotificationIOS');
      const PushNotificationIOS = getPNIOS();
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('notification');
      PushNotificationIOS.removeEventListener('localNotification');
      PushNotificationIOS.removeEventListener('registrationError');
    } catch {}
  }
}
