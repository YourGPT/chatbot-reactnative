export enum NotificationMode {
  MINIMALIST = 'MINIMALIST',
  ADVANCED = 'ADVANCED',
  DISABLED = 'DISABLED',
}

export interface YourGPTNotificationConfig {
  // Master switch
  notificationsEnabled?: boolean;

  // Sound
  soundEnabled?: boolean;
  soundUri?: string; // Android: resource name in res/raw without extension (e.g. 'yourgpt_notification'). iOS: filename in app bundle with extension (e.g. 'yourgpt_notification.wav'). If no extension, '.wav' is appended for iOS.

  // Vibration (Android only)
  vibrationEnabled?: boolean;
  vibrationPattern?: number[];

  // LED (Android only)
  ledEnabled?: boolean;
  ledColor?: string; // e.g. '#0000FF'
  ledOnMs?: number;
  ledOffMs?: number;

  // Priority & Grouping
  priority?: 'max' | 'high' | 'default' | 'low' | 'min';
  groupMessages?: boolean;
  groupKey?: string;

  // Actions
  showReplyAction?: boolean;
  autoCancel?: boolean;

  // Quiet Hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // 'HH:MM' 24-hr format, e.g. '22:00'
  quietHoursEnd?: string; // 'HH:MM' 24-hr format, e.g. '08:00'

  // Message Preview
  showMessagePreview?: boolean;
  maxPreviewLength?: number;

  // Stacking
  stackNotifications?: boolean;
  maxNotificationStack?: number;

  // Android channel (API 26+)
  channelId?: string;
  channelName?: string;
  channelDescription?: string;
  smallIconRes?: string; // Android notification icon resource, e.g. '@mipmap/ic_launcher'

  // iOS only
  badgeEnabled?: boolean;
  categoryIdentifier?: string; // iOS notification category, e.g. 'chat_message'
  threadIdentifierPrefix?: string; // iOS notification threading prefix

  // Behavior
  autoDismissOnOpen?: boolean; // Auto-dismiss notifications when chat is opened

  // Custom data
  customExtras?: Record<string, string>;
}

export interface NotificationAction {
  identifier: string;
  title: string;
  foreground?: boolean;
}

export interface YourGPTConfig {
  widgetUid: string;
  debug?: boolean;
  customParams?: Record<string, string>;
  enableNotifications?: boolean;
  notificationMode?: NotificationMode;
  autoRegisterToken?: boolean;
  notificationConfig?: YourGPTNotificationConfig;
  baseUrl?: string;
}

export interface UserContext {
  [key: string]: string | number | boolean;
}

export interface SessionData {
  sessionUid?: string;
  [key: string]: any;
}

export interface VisitorData {
  name?: string;
  email?: string;
  phone?: string;
  // Auto-enriched fields
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  deviceModel?: string;
  locale?: string;
  [key: string]: any;
}

export interface ContactData {
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}
