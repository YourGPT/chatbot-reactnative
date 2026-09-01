import {AndroidNotificationManager} from './AndroidNotificationManager';
import type {YourGPTNotificationConfig} from '../types/config';
import type {NotificationMode} from '../types/config';

/**
 * Register background notification handlers (Android).
 * Must be called at the app entry point (index.js), before AppRegistry.registerComponent.
 *
 * Registers both the notification tap handler and the FCM background message
 * handler. The latter is what displays notifications when the app is fully
 * closed: killed-state data messages run in a headless JS context where React
 * never mounts, so handlers registered inside <YourGPTProvider> don't exist.
 *
 * Pass `config`/`mode` if you customize notification appearance (channel,
 * sound, icon, quiet hours, ...) so killed-state notifications match the ones
 * shown while the app is running.
 *
 * @example
 * ```js
 * // index.js
 * import { registerNotificationHandler } from '@yourgpt/chatbot-reactnative';
 * registerNotificationHandler();
 * AppRegistry.registerComponent(appName, () => App);
 * ```
 */
export function registerNotificationHandler(
  config?: YourGPTNotificationConfig,
  mode?: NotificationMode,
): void {
  AndroidNotificationManager.registerBackgroundHandler(config, mode);
}
