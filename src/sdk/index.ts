// Core SDK singleton
export {YourGPTSDK} from './core/YourGPTSDK';

// v1 compat: @yourgpt/chatbot-reactnative v1 exposed the provider as the
// default export (`import YourGPTProvider from '@yourgpt/chatbot-reactnative'`).
export {YourGPTProvider as default} from './components/YourGPTProvider';
export {YourGPTConfigBuilder} from './core/YourGPTConfigBuilder';

// React components
export {YourGPTProvider} from './components/YourGPTProvider';
export {YourGPTWidget} from './components/YourGPTWidget';
export {YourGPTBottomSheet} from './components/YourGPTBottomSheet';
export {YourGPTInlineChat} from './components/YourGPTInlineChat';
export {FloatingButton} from './components/FloatingButton';

// Hooks
export {useYourGPT} from './hooks/useYourGPT';
export {useSDKState} from './hooks/useSDKState';

// Notifications
export {YourGPTNotificationClient} from './notifications/YourGPTNotificationClient';
export {YourGPTNotificationHelper} from './notifications/YourGPTNotificationHelper';
export {YourGPTApnsNative} from './notifications/YourGPTApnsNative';
export {registerNotificationHandler} from './notifications/registerNotificationHandler';

// Re-export all types and enums for consumers
export type {
  YourGPTConfig,
  YourGPTNotificationConfig,
  NotificationAction,
  UserContext,
  SessionData,
  VisitorData,
  ContactData,
} from './types/config';
export {NotificationMode} from './types/config';

export type {YourGPTSDKState} from './types/state';
export {YourGPTConnectionState} from './types/state';

export type {YourGPTEventListener} from './types/events';
export {WidgetEvent, NativeEvent, SDKEvent} from './types/events';

export type {YourGPTError} from './types/errors';
export {YourGPTErrorCode} from './types/errors';

export type {NativeMessage, WidgetMessage} from './types/bridge';

export type {YourGPTContextValue} from './components/YourGPTProvider';
