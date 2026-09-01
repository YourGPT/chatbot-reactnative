import { Platform } from 'react-native';
import type { YourGPTNotificationConfig, NotificationAction } from '../types/config';
import { Logger } from '../utils/logger';

/**
 * Static utility class for advanced notification operations.
 * Useful for ADVANCED mode users who build custom notification UI.
 *
 * Requires `@notifee/react-native` for Android and
 * `@react-native-community/push-notification-ios` for iOS.
 */
export class YourGPTNotificationHelper {
  /**
   * Show a rich notification with optional subtitle.
   */
  static async showRichNotification(
    title: string,
    body: string,
    subtitle?: string,
    data?: Record<string, string>,
    config?: YourGPTNotificationConfig,
    sessionUid?: string,
  ): Promise<void> {
    if (Platform.OS === 'android') {
      await YourGPTNotificationHelper._showAndroidNotification(
        title,
        body,
        data,
        config,
        sessionUid,
      );
    } else if (Platform.OS === 'ios') {
      YourGPTNotificationHelper._showIOSNotification(
        title,
        body,
        subtitle,
        data,
        config,
        sessionUid,
      );
    }
  }

  /**
   * Show a notification with action buttons (Android only via Notifee).
   */
  static async showActionNotification(
    title: string,
    body: string,
    actions: NotificationAction[],
    data?: Record<string, string>,
    config?: YourGPTNotificationConfig,
    sessionUid?: string,
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      // iOS actions are handled via notification categories, not per-notification
      Logger.warn('Action notifications are only supported on Android. Use registerNotificationCategories for iOS.');
      return;
    }

    try {
      const notifee = require('@notifee/react-native').default;
      const channelId = config?.channelId ?? 'yourgpt_messages_v2';

      await notifee.createChannel({
        id: channelId,
        name: config?.channelName ?? 'YourGPT Messages',
        importance: 4,
        sound: config?.soundEnabled !== false
          ? (config?.soundUri ?? 'yourgpt_notification')
          : undefined,
      });

      await notifee.displayNotification({
        id: YourGPTNotificationHelper.generateNotificationId(sessionUid),
        title,
        body,
        data: data ?? {},
        android: {
          channelId,
          importance: 4,
          pressAction: { id: 'default' },
          smallIcon: config?.smallIconRes ?? 'ic_yourgpt_notification',
          actions: actions.map(a => ({
            title: a.title,
            pressAction: {
              id: a.identifier,
              launchActivity: a.foreground !== false ? 'default' : undefined,
            },
          })),
        },
      });
    } catch (e: any) {
      Logger.error('Action notification failed:', e?.message ?? e);
    }
  }

  /**
   * Remove all delivered notifications.
   */
  static async removeAllDeliveredNotifications(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const notifee = require('@notifee/react-native').default;
        await notifee.cancelAllNotifications();
      } catch (e) {
        Logger.error('Failed to remove Android notifications:', e);
      }
    } else if (Platform.OS === 'ios') {
      try {
        const { getPushNotificationIOS } = require('./getPushNotificationIOS');
        const PushNotificationIOS = getPushNotificationIOS();
        PushNotificationIOS.removeAllDeliveredNotifications();
      } catch (e) {
        Logger.error('Failed to remove iOS notifications:', e);
      }
    }
  }

  /**
   * Remove a specific notification by ID.
   */
  static async removeNotification(id: string): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const notifee = require('@notifee/react-native').default;
        await notifee.cancelNotification(id);
      } catch (e) {
        Logger.error('Failed to remove Android notification:', e);
      }
    } else if (Platform.OS === 'ios') {
      try {
        const { getPushNotificationIOS } = require('./getPushNotificationIOS');
        const PushNotificationIOS = getPushNotificationIOS();
        PushNotificationIOS.removeDeliveredNotifications([id]);
      } catch (e) {
        Logger.error('Failed to remove iOS notification:', e);
      }
    }
  }

  /**
   * Generate a deterministic notification ID from a session UID.
   * Ensures that notifications for the same session replace each other.
   */
  static generateNotificationId(sessionUid?: string): string {
    if (!sessionUid) {
      return `yourgpt_${Date.now()}`;
    }
    // Simple hash to create a stable ID
    let hash = 0;
    for (let i = 0; i < sessionUid.length; i++) {
      const char = sessionUid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return `yourgpt_${Math.abs(hash)}`;
  }

  /**
   * Get the current FCM token (Android only).
   */
  static async getToken(): Promise<string | null> {
    if (Platform.OS === 'android') {
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        return await messaging().getToken();
      } catch {
        return null;
      }
    }
    return null;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private static async _showAndroidNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
    config?: YourGPTNotificationConfig,
    sessionUid?: string,
  ): Promise<void> {
    try {
      const notifee = require('@notifee/react-native').default;
      const channelId = config?.channelId ?? 'yourgpt_messages_v2';

      await notifee.createChannel({
        id: channelId,
        name: config?.channelName ?? 'YourGPT Messages',
        importance: 4,
        sound: config?.soundEnabled !== false
          ? (config?.soundUri ?? 'yourgpt_notification')
          : undefined,
      });

      await notifee.displayNotification({
        id: YourGPTNotificationHelper.generateNotificationId(sessionUid),
        title,
        body,
        data: data ?? {},
        android: {
          channelId,
          importance: 4,
          pressAction: { id: 'default' },
          smallIcon: config?.smallIconRes ?? 'ic_yourgpt_notification',
          groupId: config?.groupMessages !== false
            ? (config?.groupKey ?? 'yourgpt_group')
            : undefined,
        },
      });
    } catch (e: any) {
      Logger.error('Android notification failed:', e?.message ?? e);
    }
  }

  private static _showIOSNotification(
    title: string,
    body: string,
    subtitle?: string,
    data?: Record<string, string>,
    config?: YourGPTNotificationConfig,
    sessionUid?: string,
  ): void {
    try {
      const { getPushNotificationIOS } = require('./getPushNotificationIOS');
      const PushNotificationIOS = getPushNotificationIOS();

      const threadId = sessionUid && config?.threadIdentifierPrefix
        ? `${config.threadIdentifierPrefix}.${sessionUid}`
        : undefined;

      PushNotificationIOS.addNotificationRequest({
        id: YourGPTNotificationHelper.generateNotificationId(sessionUid),
        title,
        subtitle,
        body,
        sound: config?.soundEnabled !== false
          ? (() => {
              const uri = config?.soundUri ?? 'yourgpt_notification';
              return uri.includes('.') ? uri : `${uri}.wav`;
            })()
          : undefined,
        category: config?.categoryIdentifier ?? 'chat_message',
        threadId,
        userInfo: data ?? {},
      });
    } catch (e) {
      Logger.error('iOS notification failed:', e);
    }
  }
}
