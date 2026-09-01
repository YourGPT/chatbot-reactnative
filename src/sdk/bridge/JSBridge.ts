import type {RefObject} from 'react';
import type {WebView} from 'react-native-webview';
import {NativeEvent, WidgetEvent} from '../types/events';
import type {WidgetMessage} from '../types/bridge';
import {BRIDGE_EVENT_MAP} from './BridgeEventMap';
import {Logger} from '../utils/logger';

type SDKBridgeEventHandler = (event: WidgetEvent, payload: any) => void;

let _handler: SDKBridgeEventHandler | null = null;

export function registerBridgeHandler(handler: SDKBridgeEventHandler): void {
  _handler = handler;
}

export function postToWidget(
  ref: RefObject<WebView | null>,
  type: NativeEvent,
  payload?: any,
): void {
  const payloadJson = JSON.stringify(payload ?? null);
  const js = `
    (function() {
      try {
        window.postMessage({ type: '${type}', payload: ${payloadJson} }, '*');
      } catch(e) {}
    })();
    true;
  `;
  Logger.log('Bridge → Widget:', type, payload);
  ref.current?.injectJavaScript(js);
}

/** @deprecated Use postToWidget instead — both now use injectJavaScript. */
export function injectToWidget(
  ref: RefObject<WebView | null>,
  type: NativeEvent,
  payload?: any,
): void {
  postToWidget(ref, type, payload);
}

export function handleIncomingMessage(rawData: string): void {
  try {
    const parsed: WidgetMessage = JSON.parse(rawData);
    const type = parsed.type;

    if (!type) {
      Logger.warn('Bridge: message with no type field:', rawData);
      return;
    }

    const mappedEvent = BRIDGE_EVENT_MAP[type];
    if (mappedEvent) {
      Logger.log('Bridge ← Widget:', type, parsed.payload);
      _handler?.(mappedEvent, parsed.payload ?? null);
    } else {
      // Unknown type — pass through as a generic message event
      // This handles app-specific action results (LIKE_POST, CREATE_POST, etc.)
      Logger.log('Bridge ← Widget (unrecognized type):', type, parsed);
      _handler?.(WidgetEvent.MESSAGE_RECEIVED, parsed);
    }
  } catch (e) {
    // Handle plain string that was not valid JSON
    if (rawData === 'chatbot-close') {
      Logger.log('Bridge ← Widget (legacy string): chatbot-close');
      _handler?.(WidgetEvent.CHATBOT_CLOSE, null);
      return;
    }
    Logger.error('Bridge: failed to parse message:', rawData, e);
  }
}

export function buildInjectionScript(): string {
  return `
(function() {
  if (window.__yourgpt_bridge_injected) return;
  window.__yourgpt_bridge_injected = true;

  console.log('[YourGPT Bridge] Injection script running');

  // 1. Listen for postMessage events (for native→widget messages echoed back)
  window.addEventListener('message', function(e) {
    try {
      var data = e.data;
      if (!data) return;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch(ex) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: data }));
          return;
        }
      }
      if (data && typeof data === 'object') {
        // Filter out native→widget messages (echoed back by postMessage)
        var nativeTypes = ['open_session', 'register_fcm_token', 'register_push_token',
          'setUserContext', 'setSessionData', 'setVisitorData', 'setContactData',
          'sendMessage', 'openChat'];
        if (data.type && nativeTypes.indexOf(data.type) !== -1) return;
        console.log('[YourGPT Bridge] postMessage event:', JSON.stringify(data).substring(0, 200));
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    } catch(err) {
      console.log('[YourGPT Bridge] postMessage error:', err);
    }
  });

  // 2. Hook into $yourgptChatbot event API when it becomes available
  function hookChatbotEvents(chatbot) {
    console.log('[YourGPT Bridge] Hooking into $yourgptChatbot events');
    var events = [
      'sdk:initialized', 'message:received', 'message:new', 'message:sent',
      'chat:opened', 'widget:opened', 'chat:closed', 'widget:closed',
      'chatbot-close', 'connection:established', 'connection:lost',
      'connection:restored', 'user:typing', 'user:stopped_typing',
      'escalation:to_human', 'escalation:resolved', 'error:occurred',
      'error:network'
    ];
    events.forEach(function(eventName) {
      chatbot.on(eventName, function(payload) {
        console.log('[YourGPT Bridge] chatbot event:', eventName);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: eventName,
          payload: payload || null
        }));
      });
    });
  }

  // Poll for $yourgptChatbot to become available
  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    if (window.$yourgptChatbot) {
      clearInterval(interval);
      hookChatbotEvents(window.$yourgptChatbot);
    } else if (attempts > 100) {
      console.log('[YourGPT Bridge] $yourgptChatbot not found after 10s');
      clearInterval(interval);
    }
  }, 100);
})();
true;
`;
}

export const JSBridge = {
  registerBridgeHandler,
  postToWidget,
  injectToWidget,
  handleIncomingMessage,
  buildInjectionScript,
};
