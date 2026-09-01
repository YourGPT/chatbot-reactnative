import { Platform } from 'react-native';
import type { YourGPTNotificationConfig } from '../types/config';
import { NotificationMode } from '../types/config';
import type { YourGPTEventListener } from '../types/events';
import { AndroidNotificationManager } from './AndroidNotificationManager';
import { IOSNotificationManager } from './IOSNotificationManager';
import {
  requestNotificationPermission,
  areNotificationsEnabled,
} from './NotificationPermissions';
import { handleNotificationDeepLink } from '../utils/deepLink';
import { Logger } from '../utils/logger';

const DEFAULT_CONFIG: YourGPTNotificationConfig = {
  soundEnabled: true,
  soundUri: 'yourgpt_notification',
  vibrationEnabled: true,
  groupMessages: true,
  showReplyAction: true,
  autoCancel: true,
  showMessagePreview: true,
  maxPreviewLength: 100,
  stackNotifications: true,
  maxNotificationStack: 5,
  badgeEnabled: true,
  // Bumped from 'yourgpt_messages' — Android channels are immutable after creation,
  // so a new ID ensures fresh installs get the custom sound on the channel.
  channelId: 'yourgpt_messages_v2',
  channelName: 'YourGPT Messages',
  channelDescription: 'Notifications from YourGPT chatbot',
  smallIconRes: 'ic_yourgpt_notification',
};

export class YourGPTNotificationClient {
  private config: YourGPTNotificationConfig;
  private mode: NotificationMode;
  private androidManager: AndroidNotificationManager | null = null;
  private iosManager: IOSNotificationManager | null = null;
  private listener: YourGPTEventListener | null = null;
  private initialized = false;
  private _onTapCallback: ((data: Record<string, string>) => void) | null =
    null;

  constructor(
    config: YourGPTNotificationConfig = {},
    mode: NotificationMode = NotificationMode.MINIMALIST,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mode = mode;
  }

  setNotificationTapCallback(cb: (data: Record<string, string>) => void): void {
    this._onTapCallback = cb;
    this.androidManager?.setNotificationTapHandler(cb);
    this.iosManager?.setNotificationTapHandler(cb);
  }

  setEventListener(listener: YourGPTEventListener | null): void {
    this.listener = listener;
    this.androidManager?.setEventListener(listener);
    this.iosManager?.setEventListener(listener);
  }

  async initialize(): Promise<void> {
    if (this.mode === NotificationMode.DISABLED) {
      Logger.log('Notifications disabled');
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      Logger.warn('Notification permission denied');
      this.listener?.onNotificationPermissionDenied?.();
      return;
    }

    this.listener?.onNotificationPermissionGranted?.();
    Logger.log('Notification permission granted');

    if (Platform.OS === 'android') {
      this.androidManager = new AndroidNotificationManager(
        this.config,
        this.mode,
        token => this.onTokenReceived(token),
      );
      this.androidManager.setEventListener(this.listener);
      if (this._onTapCallback) {
        this.androidManager.setNotificationTapHandler(this._onTapCallback);
      }
      await this.androidManager.initialize();
    } else if (Platform.OS === 'ios') {
      this.iosManager = new IOSNotificationManager(
        this.config,
        this.mode,
        token => this.onTokenReceived(token),
      );
      this.iosManager.setEventListener(this.listener);
      if (this._onTapCallback) {
        this.iosManager.setNotificationTapHandler(this._onTapCallback);
      }
      await this.iosManager.initialize();
    }

    this.initialized = true;
    Logger.log('YourGPTNotificationClient initialized');
  }

  private onTokenReceived(token: string): void {
    Logger.log(
      '[APNs-Flow] Push token received by notification client:',
      token.substring(0, 20) + '...',
    );
    this.listener?.onPushTokenReceived?.(token);

    // Notify SDK so it can register the token with the widget if already ready.
    // This fixes the race condition where the APNs token arrives after widget load.
    try {
      const { YourGPTSDK } = require('../core/YourGPTSDK');
      YourGPTSDK._onPushTokenReceived(token);
    } catch (e) {
      Logger.error('[APNs-Flow] Failed to notify SDK of new push token:', e);
    }
  }

  async getToken(): Promise<string | null> {
    if (Platform.OS === 'android') {
      return this.androidManager?.getToken() ?? null;
    } else if (Platform.OS === 'ios') {
      return this.iosManager?.getToken() ?? null;
    }
    return null;
  }

  // Called when app receives a push notification (for ADVANCED mode apps)
  handleIncomingPushMessage(data: Record<string, string>): void {
    if (Platform.OS === 'android') {
      this.androidManager?.handleMessage(data);
    } else if (Platform.OS === 'ios') {
      this.iosManager?.handleMessage(data);
    }
  }

  // Called when user taps a push notification
  handleNotificationTap(
    data: Record<string, string>,
    openSession: (session_uid: string) => void,
    show: () => void,
  ): void {
    if (Platform.OS === 'android') {
      this.androidManager?.handleNotificationTap(data);
    } else if (Platform.OS === 'ios') {
      this.iosManager?.handleNotificationTap(data);
    }

    handleNotificationDeepLink(data, openSession, show);
  }

  // iOS-specific badge management
  setBadgeCount(count: number): void {
    this.iosManager?.setBadgeCount(count);
  }

  resetBadgeCount(): void {
    this.iosManager?.resetBadgeCount();
  }

  incrementBadgeCount(): void {
    this.iosManager?.incrementBadgeCount();
  }

  // iOS-specific: cache APNs token from AppDelegate
  cacheIOSToken(token: string): void {
    this.iosManager?.cacheToken(token);
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get currentMode(): NotificationMode {
    return this.mode;
  }

  setNotificationMode(mode: NotificationMode): void {
    this.mode = mode;
  }

  async checkPermissions(): Promise<boolean> {
    return areNotificationsEnabled();
  }

  /**
   * Check whether a push notification payload originated from YourGPT.
   * Useful in ADVANCED mode to filter notifications before processing.
   */
  static isYourGPTNotification(data: Record<string, string>): boolean {
    return 'widget_uid' in data || 'project_uid' in data;
  }

  /**
   * Clear the cached push token (e.g. on user logout).
   * Prevents notifications from being delivered to a logged-out device.
   */
  async resetToken(): Promise<void> {
    // Clear iOS cached token from memory and AsyncStorage
    if (Platform.OS === 'ios' && this.iosManager) {
      (this.iosManager as any)._cachedToken = null;
      try {
        const AsyncStorage =
          require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('yourgpt_sdk_push_token');
      } catch {
        // AsyncStorage not installed
      }
    }
    Logger.log('Push token reset');
  }

  /**
   * Request notification permission and register the push token in one call.
   * Useful for deferred permission requests (not just at init time).
   * Returns true if permission was granted.
   */
  async requestPermissionAndRegister(): Promise<boolean> {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Logger.warn('Notification permission denied');
      this.listener?.onNotificationPermissionDenied?.();
      return false;
    }

    this.listener?.onNotificationPermissionGranted?.();
    Logger.log('Notification permission granted');

    // Get token and notify SDK
    const token = await this.getToken();
    if (token) {
      this.onTokenReceived(token);
    }

    return true;
  }

  destroy(): void {
    this.androidManager?.destroy();
    this.iosManager?.destroy();
    this.androidManager = null;
    this.iosManager = null;
    this.initialized = false;
  }
}
