import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { YourGPTSDK } from '../core/YourGPTSDK';
import { YourGPTBottomSheet } from './YourGPTBottomSheet';
import {
  YourGPTConfig,
  UserContext,
  SessionData,
  VisitorData,
  ContactData,
} from '../types/config';
import { YourGPTSDKState } from '../types/state';
import { WidgetEvent, SDKEvent, YourGPTEventListener } from '../types/events';
import { YourGPTNotificationClient } from '../notifications/YourGPTNotificationClient';
import { Logger } from '../utils/logger';
import { extractSessionUid } from '../utils/deepLink';

export interface YourGPTContextValue {
  // Widget control
  open: () => void;
  close: () => void;
  openSession: (session_uid: string) => void;

  // Data setters
  setUserContext: (ctx: UserContext) => void;
  setSessionData: (data: SessionData) => void;
  setVisitorData: (data: VisitorData) => void;
  setContactData: (data: ContactData) => void;
  sendMessage: (message: string) => void;
  openChat: () => void;

  // Event binding
  on: (event: WidgetEvent | SDKEvent | string, cb: (payload?: any) => void) => void;
  off: (event: WidgetEvent | SDKEvent | string, cb: (payload?: any) => void) => void;
  setEventListener: (listener: YourGPTEventListener) => void;

  // Config
  updateConfig: (newConfig: Partial<YourGPTConfig>) => void;

  // State
  sdkState: YourGPTSDKState;
  isReady: boolean;
}

export const YourGPTContext = createContext<YourGPTContextValue | undefined>(
  undefined,
);

interface YourGPTProviderProps {
  children: React.ReactNode;
  config?: YourGPTConfig;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string, retry: () => void) => React.ReactNode;
  /**
   * @deprecated Legacy v1 prop. Use `config={{ widgetUid: '...' }}` instead.
   * Kept so apps written against @yourgpt/chatbot-reactnative v1 keep working.
   */
  widgetId?: string;
  /**
   * @deprecated Legacy v1 prop. The widget now renders in a themed bottom
   * sheet and no longer needs a header overlay color. Accepted and ignored.
   */
  headerColor?: string;
}

export function YourGPTProvider({
  children,
  config,
  renderLoading,
  renderError,
  widgetId,
}: YourGPTProviderProps) {
  const [sdkState, setSdkState] = useState<YourGPTSDKState>(
    () => YourGPTSDK.currentState,
  );

  // v1 compat: <YourGPTProvider widgetId="..."> maps to config.widgetUid
  const effectiveConfig: YourGPTConfig | undefined =
    config ?? (widgetId ? { widgetUid: widgetId } : undefined);

  // Initialize SDK if config provided
  useEffect(() => {
    if (effectiveConfig && !YourGPTSDK.isReady) {
      YourGPTSDK.initialize(effectiveConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // Subscribe to SDK state changes
  useEffect(() => {
    const unsubscribe = YourGPTSDK.subscribeToState(setSdkState);
    return unsubscribe;
  }, []);

  // Initialize notification client if enabled (skip if quickInitialize already set one up)
  useEffect(() => {
    if (!effectiveConfig?.enableNotifications) return;
    if (YourGPTSDK._hasNotificationClient()) return; // already set by quickInitialize

    const client = new YourGPTNotificationClient(
      effectiveConfig.notificationConfig,
      effectiveConfig.notificationMode,
    );

    // Handle notification tap → open widget and navigate to session
    client.setNotificationTapCallback(data => {
      const sessionUid = extractSessionUid(data);
      Logger.log('Notification tap — session:', sessionUid);
      if (sessionUid) {
        YourGPTSDK.openSession(sessionUid);
      } else {
        YourGPTSDK.show();
      }
    });

    YourGPTSDK._setNotificationClient(client);
    client.initialize().catch(err => {
      Logger.error('Failed to initialize notification client:', err);
    });

    return () => {
      client.destroy();
      YourGPTSDK._setNotificationClient(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    YourGPTSDK.hide();
  };

  const widgetUrl = sdkState.isInitialized
    ? YourGPTSDK.getWidgetUrl(sdkState.pendingSessionUid ?? undefined)
    : '';

  const contextValue = useMemo<YourGPTContextValue>(
    () => ({
      open: () => YourGPTSDK.show(),
      close: () => YourGPTSDK.hide(),
      openSession: (uid: string) => YourGPTSDK.openSession(uid),
      setUserContext: (ctx: UserContext) => YourGPTSDK.setUserContext(ctx),
      setSessionData: (data: SessionData) => YourGPTSDK.setSessionData(data),
      setVisitorData: (data: VisitorData) => YourGPTSDK.setVisitorData(data),
      setContactData: (data: ContactData) => YourGPTSDK.setContactData(data),
      sendMessage: (msg: string) => YourGPTSDK.sendMessage(msg),
      openChat: () => YourGPTSDK.openChat(),
      on: (event: WidgetEvent | SDKEvent | string, cb: (payload?: any) => void) =>
        YourGPTSDK.on(event, cb),
      off: (event: WidgetEvent | SDKEvent | string, cb: (payload?: any) => void) =>
        YourGPTSDK.off(event, cb),
      setEventListener: (listener: YourGPTEventListener) =>
        YourGPTSDK.setEventListener(listener),
      updateConfig: (newConfig: Partial<YourGPTConfig>) =>
        YourGPTSDK.updateConfig(newConfig),
      sdkState,
      isReady: sdkState.isInitialized,
    }),
    [sdkState],
  );

  return (
    <YourGPTContext.Provider value={contextValue}>
      {children}
      {sdkState.isInitialized && (
        <YourGPTBottomSheet
          visible={sdkState.isVisible}
          url={widgetUrl}
          onClose={handleClose}
          renderLoading={renderLoading}
          renderError={renderError}
        />
      )}
    </YourGPTContext.Provider>
  );
}

export function useYourGPTContext(): YourGPTContextValue {
  const ctx = useContext(YourGPTContext);
  if (!ctx) {
    throw new Error('useYourGPT must be used within <YourGPTProvider>');
  }
  return ctx;
}
