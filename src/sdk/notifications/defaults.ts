import type {YourGPTNotificationConfig} from '../types/config';

/**
 * Single source of truth for notification defaults.
 *
 * This lives in its own module — not next to the client that consumes it —
 * because the killed-state (headless JS) Android path never constructs a
 * YourGPTNotificationClient: Firebase runs index.js only, React never mounts.
 * Both paths must resolve the same channel ID, or Android registers two
 * separate immutable channels and the user sees duplicate entries in system
 * settings with independent sound/importance settings.
 */
export const DEFAULT_NOTIFICATION_CONFIG: YourGPTNotificationConfig = {
  soundEnabled: true,
  soundUri: 'yourgpt_notification',
  vibrationEnabled: true,
  groupMessages: true,
  groupKey: 'yourgpt_group',
  showReplyAction: true,
  autoCancel: true,
  showMessagePreview: true,
  maxPreviewLength: 100,
  stackNotifications: true,
  maxNotificationStack: 5,
  badgeEnabled: true,
  // Bumped from 'yourgpt_messages' — Android channels are immutable after
  // creation, so a new ID ensures fresh installs get the custom sound on the
  // channel. Any change here must be picked up by every display path, which
  // is why nothing may re-declare these values inline.
  channelId: 'yourgpt_messages_v2',
  channelName: 'YourGPT Messages',
  channelDescription: 'Notifications from YourGPT chatbot',
  smallIconRes: 'ic_yourgpt_notification',
};

/**
 * Merge a caller-supplied (possibly partial, possibly undefined) notification
 * config over the defaults. Safe to apply more than once.
 */
export function withNotificationDefaults(
  config?: YourGPTNotificationConfig,
): YourGPTNotificationConfig {
  return {...DEFAULT_NOTIFICATION_CONFIG, ...config};
}
