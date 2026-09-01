import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { SDKState } from './SDKState';
import { EventEmitter } from './EventEmitter';
import {
  YourGPTConfig,
  UserContext,
  SessionData,
  VisitorData,
  ContactData,
} from '../types/config';
import { YourGPTSDKState } from '../types/state';
import { YourGPTConnectionState } from '../types/state';
import {
  WidgetEvent,
  NativeEvent,
  SDKEvent,
  YourGPTEventListener,
} from '../types/events';
import { YourGPTErrorCode, createError } from '../types/errors';
import { postToWidget, registerBridgeHandler } from '../bridge/JSBridge';
import { Logger } from '../utils/logger';
import { buildWidgetUrl } from '../utils/urlBuilder';
import { getDeviceVisitorData } from '../utils/deviceInfo';

class YourGPTSDKClass {
  private static _instance: YourGPTSDKClass;

  private config: YourGPTConfig | null = null;
  private sdkState: SDKState = new SDKState();
  private emitter: EventEmitter = new EventEmitter();
  private eventListener: YourGPTEventListener | null = null;
  private widgetRef: RefObject<WebView | null> | null = null;
  private notificationClient: any = null; // set when notifications enabled
  private _widgetReady = false;

  private constructor() {
    registerBridgeHandler(this._handleBridgeEvent.bind(this));
    // Emit SDK_STATE_CHANGED on every state update
    this.sdkState.subscribe((state) => {
      this.emitter.emit(SDKEvent.SDK_STATE_CHANGED, state);
    });
  }

  static getInstance(): YourGPTSDKClass {
    if (!YourGPTSDKClass._instance) {
      YourGPTSDKClass._instance = new YourGPTSDKClass();
    }
    return YourGPTSDKClass._instance;
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  initialize(config: YourGPTConfig): void {
    if (!config.widgetUid) {
      throw createError(
        YourGPTErrorCode.INVALID_CONFIG,
        'widgetUid is required',
      );
    }

    this.config = config;
    Logger.configure(config.debug ?? false);
    Logger.log('SDK initialized with widgetUid:', config.widgetUid);

    this.sdkState.setState({
      isInitialized: true,
      connectionState: YourGPTConnectionState.DISCONNECTED,
    });

    this.emitter.emit(SDKEvent.SDK_INITIALIZED, { widgetUid: config.widgetUid });
  }

  /**
   * One-line SDK initialisation with notifications auto-enabled.
   *
   * Initialises the SDK and sets up push notifications in minimalist mode.
   * The user still needs `<YourGPTProvider>` in the component tree for the
   * bottom sheet, but can omit the `config` prop since everything is already
   * configured.
   *
   * @example
   * ```ts
   * // index.js
   * registerNotificationHandler();
   *
   * // App.tsx
   * await YourGPTSDK.quickInitialize('your-widget-uid');
   * ```
   */
  async quickInitialize(widgetUid: string): Promise<void> {
    this.initialize({ widgetUid, enableNotifications: true });

    // Set up notification client (mirrors Flutter's quickSetup)
    const {
      YourGPTNotificationClient,
    } = require('../notifications/YourGPTNotificationClient');
    const { extractSessionUid } = require('../utils/deepLink');

    const client = new YourGPTNotificationClient();

    client.setNotificationTapCallback((data: Record<string, string>) => {
      const sessionUid = extractSessionUid(data);
      Logger.log('Notification tap — session:', sessionUid);
      if (sessionUid) {
        this.openSession(sessionUid);
      } else {
        this.show();
      }
    });

    this._setNotificationClient(client);
    await client.initialize();
  }

  // ─── Widget ref (set by YourGPTProvider) ─────────────────────────────────

  _setWidgetRef(ref: RefObject<WebView | null>): void {
    this.widgetRef = ref;
  }

  // ─── Widget control ───────────────────────────────────────────────────────

  show(): void {
    this._assertInitialized();
    this.sdkState.setState({ isVisible: true });
  }

  hide(): void {
    this.sdkState.setState({ isVisible: false, pendingSessionUid: null });
  }

  openSession(session_uid: string): void {
    this._assertInitialized();
    Logger.log('openSession:', session_uid);

    // Always store in reactive state — triggers re-render so URL includes session_uid
    this.sdkState.setState({ pendingSessionUid: session_uid });
    this.show();
  }

  // ─── Data setters ─────────────────────────────────────────────────────────

  setUserContext(ctx: UserContext): void {
    this._assertInitialized();
    postToWidget(this.widgetRef!, NativeEvent.SET_USER_CONTEXT, ctx);
    this.emitter.emit(SDKEvent.SDK_USER_CONTEXT_SET, ctx);
  }

  setSessionData(data: SessionData): void {
    this._assertInitialized();
    postToWidget(this.widgetRef!, NativeEvent.SET_SESSION_DATA, data);
  }

  setVisitorData(data: VisitorData): void {
    this._assertInitialized();
    const enriched = { ...getDeviceVisitorData(), ...data };
    postToWidget(this.widgetRef!, NativeEvent.SET_VISITOR_DATA, enriched);
  }

  setContactData(data: ContactData): void {
    this._assertInitialized();
    postToWidget(this.widgetRef!, NativeEvent.SET_CONTACT_DATA, data);
  }

  sendMessage(message: string): void {
    this._assertInitialized();
    postToWidget(this.widgetRef!, NativeEvent.SEND_MESSAGE, { message });
  }

  openChat(): void {
    this._assertInitialized();
    postToWidget(this.widgetRef!, NativeEvent.OPEN_CHAT, null);
  }

  // ─── Event system ─────────────────────────────────────────────────────────

  setEventListener(listener: YourGPTEventListener): void {
    this.eventListener = listener;
  }

  on(event: WidgetEvent | SDKEvent | string, callback: (payload?: any) => void): void {
    this.emitter.on(event, callback);
  }

  off(event: WidgetEvent | SDKEvent | string, callback: (payload?: any) => void): void {
    this.emitter.off(event, callback);
  }

  // ─── State ────────────────────────────────────────────────────────────────

  get isReady(): boolean {
    return this.sdkState.getState().isInitialized;
  }

  get currentState(): YourGPTSDKState {
    return this.sdkState.getState();
  }

  subscribeToState(callback: (state: YourGPTSDKState) => void): () => void {
    return this.sdkState.subscribe(callback);
  }

  // ─── Push notification token registration ─────────────────────────────────

  /**
   * Called when a push token is received late (after widget ready).
   * This is the fix for the race condition where the APNs token arrives
   * after _onWidgetReady() has already checked for the token.
   */
  _onPushTokenReceived(token: string): void {
    const { Platform } = require('react-native');
    Logger.log('[APNs-Flow] Token received by SDK | widgetReady:', this._widgetReady, '| hasWidgetRef:', !!this.widgetRef?.current);
    if (this._widgetReady && this.widgetRef?.current) {
      Logger.log('[APNs-Flow] Widget already ready — registering token now');
      this.registerPushToken(token, Platform.OS);
    } else {
      Logger.log('[APNs-Flow] Widget not ready yet — token will be registered in _onWidgetReady()');
    }
  }

  registerPushToken(token: string, platform: 'android' | 'ios'): void {
    Logger.log(
      '[APNs-Flow] Registering push token for',
      platform,
      '| token:',
      token.substring(0, 20) + '...',
    );

    const eventType =
      platform === 'android'
        ? NativeEvent.REGISTER_FCM_TOKEN
        : NativeEvent.REGISTER_PUSH_TOKEN;

    const payload = {
      token,
      platform,
      widget_uid: this.config?.widgetUid,
    };

    if (this.widgetRef?.current) {
      Logger.log(
        '[APNs-Flow] Sending push token to widget via postMessage | event:',
        eventType,
        '| widget_uid:',
        this.config?.widgetUid,
      );
      postToWidget(this.widgetRef, eventType, payload);
    } else {
      Logger.warn(
        '[APNs-Flow] Cannot send push token to widget — widgetRef is not available',
      );
    }

    this.eventListener?.onPushTokenReceived?.(token);
    this.emitter.emit(SDKEvent.SDK_PUSH_RECEIVED, { token, platform });
  }

  // ─── Badge management (iOS) ──────────────────────────────────────────────

  setBadgeCount(count: number): void {
    this.sdkState.setState({ badgeCount: count });
    this.eventListener?.onBadgeCountChanged?.(count);
  }

  incrementBadgeCount(): void {
    const current = this.sdkState.getState().badgeCount;
    this.setBadgeCount(current + 1);
  }

  resetBadgeCount(): void {
    this.setBadgeCount(0);
  }

  // ─── Widget URL ──────────────────────────────────────────────────────────

  getWidgetUrl(sessionUid?: string): string {
    this._assertInitialized();
    if (sessionUid) {
      const configWithSession = {
        ...this.config!,
        customParams: {
          ...this.config!.customParams,
          session_uid: sessionUid,
        },
      };
      return buildWidgetUrl(configWithSession);
    }
    return buildWidgetUrl(this.config!);
  }

  getPendingSessionUid(): string | null {
    return this.sdkState.getState().pendingSessionUid;
  }

  getConfig(): YourGPTConfig {
    this._assertInitialized();
    return this.config!;
  }

  /**
   * Update SDK configuration at runtime.
   * Merges the provided partial config with the existing one.
   */
  updateConfig(newConfig: Partial<YourGPTConfig>): void {
    this._assertInitialized();
    this.config = { ...this.config!, ...newConfig };
    if (newConfig.debug !== undefined) {
      Logger.configure(newConfig.debug);
    }
    Logger.log('SDK config updated');
    this.emitter.emit(SDKEvent.SDK_CONFIG_UPDATED, this.config);
  }

  // ─── Internal: called by JSBridge ────────────────────────────────────────

  _handleBridgeEvent(event: WidgetEvent, payload: any): void {
    Logger.log('SDK event:', event, payload);

    // Emit to named listeners
    this.emitter.emit(event, payload);

    // Update connection state based on events
    switch (event) {
      case WidgetEvent.CONNECTION_ESTABLISHED:
      case WidgetEvent.CHAT_OPENED:
      case WidgetEvent.WIDGET_OPENED:
        this.sdkState.setState({
          connectionState: YourGPTConnectionState.CONNECTED,
          error: null,
        });
        this.eventListener?.onChatOpened();
        break;

      case WidgetEvent.CONNECTION_LOST:
        this.sdkState.setState({
          connectionState: YourGPTConnectionState.DISCONNECTED,
        });
        break;

      case WidgetEvent.CONNECTION_RESTORED:
        this.sdkState.setState({
          connectionState: YourGPTConnectionState.CONNECTED,
        });
        break;

      case WidgetEvent.CHAT_CLOSED:
      case WidgetEvent.WIDGET_CLOSED:
      case WidgetEvent.CHATBOT_CLOSE:
        this.hide();
        this.eventListener?.onChatClosed();
        break;

      case WidgetEvent.MESSAGE_RECEIVED:
      case WidgetEvent.MESSAGE_NEW:
        this.eventListener?.onMessageReceived(payload ?? {});
        break;

      case WidgetEvent.ERROR_OCCURRED:
      case WidgetEvent.ERROR_NETWORK:
        const err = createError(
          event === WidgetEvent.ERROR_NETWORK
            ? YourGPTErrorCode.NETWORK_ERROR
            : YourGPTErrorCode.WEBVIEW_ERROR,
          payload?.message ?? 'An error occurred',
        );
        this.sdkState.setState({
          connectionState: YourGPTConnectionState.ERROR,
          error: err.message,
        });
        this.eventListener?.onError(err);
        break;

      case WidgetEvent.SDK_INITIALIZED:
        Logger.log('SDK_INITIALIZED event received from widget');
        break;
    }
  }

  // ─── Called by YourGPTWidget on load start/end ────────────────────────────

  _onWidgetLoadStart(): void {
    this.sdkState.setState({
      isLoading: true,
      connectionState: YourGPTConnectionState.CONNECTING,
    });
    this.eventListener?.onLoadingStarted();
  }

  _onWidgetLoadEnd(): void {
    this.sdkState.setState({ isLoading: false });
    this.eventListener?.onLoadingFinished();
  }

  _onWidgetReady(): void {
    Logger.log('[APNs-Flow] Widget ready — registering push token if available');
    this._widgetReady = true;

    // Register push token (matches Android/iOS/Flutter: send on page load finish)
    if (!this.notificationClient) {
      Logger.warn(
        '[APNs-Flow] Widget ready: notificationClient is null — push token will not be registered',
      );
    }
    if (this.notificationClient) {
      this.notificationClient
        .getToken()
        .then((token: string | null) => {
          if (token) {
            Logger.log('[APNs-Flow] Widget ready: token available, registering now');
            const { Platform } = require('react-native');
            this.registerPushToken(token, Platform.OS);
          } else {
            Logger.warn('[APNs-Flow] Widget ready: no push token available yet — will register when token arrives');
          }
        })
        .catch((e: any) => {
          Logger.error('[APNs-Flow] Widget ready: failed to get push token:', e);
        });
    }

    // Flush pending session navigation (don't clear state here — URL change would cause reload)
    const pendingUid = this.sdkState.getState().pendingSessionUid;
    if (pendingUid) {
      postToWidget(this.widgetRef!, NativeEvent.OPEN_SESSION, {
        session_uid: pendingUid,
      });
    }
  }

  _onWidgetError(message: string): void {
    const err = createError(YourGPTErrorCode.WEBVIEW_ERROR, message);
    this.sdkState.setState({
      isLoading: false,
      connectionState: YourGPTConnectionState.ERROR,
      error: message,
    });
    this.eventListener?.onError(err);
    this.emitter.emit(SDKEvent.SDK_ERROR, err);
  }

  // ─── Notification client (set by YourGPTProvider or quickInitialize) ────────

  _setNotificationClient(client: any): void {
    this.notificationClient = client;
  }

  _hasNotificationClient(): boolean {
    return this.notificationClient != null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  destroy(): void {
    this.emitter.clear();
    this.eventListener = null;
    this.widgetRef = null;
    this.notificationClient = null;
    this._widgetReady = false;
    this.sdkState.reset();
    Logger.log('SDK destroyed');
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _assertInitialized(): void {
    if (!this.config) {
      throw createError(
        YourGPTErrorCode.NOT_INITIALIZED,
        'YourGPTSDK is not initialized. Call initialize() first.',
      );
    }
  }
}

export const YourGPTSDK = YourGPTSDKClass.getInstance();
