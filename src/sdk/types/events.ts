import type {YourGPTError} from './errors';

// Events emitted by the widget to React Native
export enum WidgetEvent {
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_NEW = 'message:new',
  MESSAGE_SENT = 'message:sent',
  CHAT_OPENED = 'chat:opened',
  WIDGET_OPENED = 'widget:opened',
  CHAT_CLOSED = 'chat:closed',
  WIDGET_CLOSED = 'widget:closed',
  CHATBOT_CLOSE = 'chatbot-close',
  CONNECTION_ESTABLISHED = 'connection:established',
  CONNECTION_LOST = 'connection:lost',
  CONNECTION_RESTORED = 'connection:restored',
  USER_TYPING = 'user:typing',
  USER_STOPPED_TYPING = 'user:stopped_typing',
  ESCALATION_TO_HUMAN = 'escalation:to_human',
  ESCALATION_RESOLVED = 'escalation:resolved',
  ERROR_OCCURRED = 'error:occurred',
  ERROR_NETWORK = 'error:network',
  SDK_INITIALIZED = 'sdk:initialized',
}

// Events React Native sends to the widget via postMessage
export enum NativeEvent {
  SET_USER_CONTEXT = 'native:setUserContext',
  SET_SESSION_DATA = 'native:setSessionData',
  SET_VISITOR_DATA = 'native:setVisitorData',
  SET_CONTACT_DATA = 'native:setContactData',
  OPEN_CHAT = 'openChat',
  SEND_MESSAGE = 'native:sendMessage',
  REGISTER_FCM_TOKEN = 'register_fcm_token',
  REGISTER_PUSH_TOKEN = 'register_push_token',
  OPEN_SESSION = 'open_session',
}

// Internal SDK lifecycle events (emitted by the SDK itself, not the widget)
export enum SDKEvent {
  SDK_INITIALIZED = 'sdk:initialized_internal',
  SDK_ERROR = 'sdk:error',
  SDK_STATE_CHANGED = 'sdk:stateChanged',
  SDK_CONFIG_UPDATED = 'sdk:configUpdated',
  SDK_USER_CONTEXT_SET = 'sdk:userContextSet',
  SDK_PUSH_RECEIVED = 'sdk:pushReceived',
}

export interface YourGPTEventListener {
  // Required widget lifecycle events
  onMessageReceived(message: Record<string, any>): void;
  onChatOpened(): void;
  onChatClosed(): void;
  onError(error: YourGPTError): void;
  onLoadingStarted(): void;
  onLoadingFinished(): void;

  // Optional notification events
  onPushTokenReceived?(token: string): void;
  onPushMessageReceived?(data: Record<string, string>): void;
  onNotificationClicked?(extras: Record<string, string>): void;
  onWidgetOpenRequested?(widgetUid: string): void;
  onNotificationPermissionGranted?(): void;
  onNotificationPermissionDenied?(): void;
  onPushTokenError?(error: any): void;
  onBadgeCountChanged?(count: number): void;
}
