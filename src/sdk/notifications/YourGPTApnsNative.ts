import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { Logger } from '../utils/logger';

const { YourGPTApns: NativeModule } = NativeModules;

/**
 * Thin wrapper around the native YourGPTApns iOS module.
 *
 * On non-iOS platforms every method is a safe no-op.
 *
 * The native module is available when:
 *   1. The SDK's podspec is installed (`pod install`), AND
 *   2. `YourGPTApns.configure(application)` was called in AppDelegate.
 *
 * If the native module is missing (e.g. not linked), the wrapper
 * falls back gracefully so the rest of the SDK still works.
 */
class YourGPTApnsNativeClass {
  private emitter: NativeEventEmitter | null = null;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private subscriptions: { remove: () => void }[] = [];
  /** Buffer for events that arrive before `.on()` callbacks are registered. */
  private pendingEvents: Map<string, any[]> = new Map();

  get isAvailable(): boolean {
    return Platform.OS === 'ios' && NativeModule != null;
  }

  /**
   * Start listening for native events. Call once during init.
   */
  startListening(): void {
    if (!this.isAvailable) return;

    this.emitter = new NativeEventEmitter(NativeModule);

    const events = [
      'YourGPTApns:onTokenReceived',
      'YourGPTApns:onTokenError',
      'YourGPTApns:onNotificationReceived',
      'YourGPTApns:onNotificationTapped',
      'YourGPTApns:onPermissionGranted',
      'YourGPTApns:onPermissionDenied',
    ];

    for (const eventName of events) {
      const sub = this.emitter.addListener(eventName, (data: any) => {
        const callbacks = this.listeners.get(eventName);
        if (callbacks && callbacks.length > 0) {
          for (const cb of callbacks) {
            try {
              cb(data);
            } catch (e) {
              Logger.error(`[YourGPTApns] Error in listener for ${eventName}:`, e);
            }
          }
        } else {
          // No callbacks registered yet — buffer for replay when .on() is called
          Logger.log(`[YourGPTApns] Buffering event (no listener yet): ${eventName}`);
          if (!this.pendingEvents.has(eventName)) {
            this.pendingEvents.set(eventName, []);
          }
          this.pendingEvents.get(eventName)!.push(data);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  /**
   * Register a callback for a native event.
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Flush any events that were buffered before this callback was registered
    const pending = this.pendingEvents.get(event);
    if (pending && pending.length > 0) {
      this.pendingEvents.delete(event);
      Logger.log(`[YourGPTApns] Replaying ${pending.length} buffered event(s) for: ${event}`);
      for (const data of pending) {
        try {
          callback(data);
        } catch (e) {
          Logger.error(`[YourGPTApns] Error replaying buffered event for ${event}:`, e);
        }
      }
    }
  }

  /**
   * Remove a previously registered callback.
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) callbacks.splice(idx, 1);
    }
  }

  // ─── Exposed native methods ──────────────────────────────────────────────

  async requestPermission(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      return await NativeModule.requestPermission();
    } catch (e) {
      Logger.error('[YourGPTApns] requestPermission failed:', e);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.isAvailable) return null;
    try {
      return await NativeModule.getToken();
    } catch {
      return null;
    }
  }

  async isPermissionGranted(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      return await NativeModule.isPermissionGranted();
    } catch {
      return false;
    }
  }

  removeAllDeliveredNotifications(): void {
    if (!this.isAvailable) return;
    NativeModule.removeAllDeliveredNotifications();
  }

  removeDeliveredNotification(identifier: string): void {
    if (!this.isAvailable) return;
    NativeModule.removeDeliveredNotification(identifier);
  }

  setBadgeCount(count: number): void {
    if (!this.isAvailable) return;
    NativeModule.setBadgeCount(count);
  }

  /**
   * Tear down all native event listeners.
   */
  destroy(): void {
    for (const sub of this.subscriptions) {
      sub.remove();
    }
    this.subscriptions = [];
    this.listeners.clear();
    this.pendingEvents.clear();
    this.emitter = null;
  }
}

export const YourGPTApnsNative = new YourGPTApnsNativeClass();
