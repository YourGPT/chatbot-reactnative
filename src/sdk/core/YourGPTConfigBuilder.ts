import type { YourGPTConfig, YourGPTNotificationConfig } from '../types/config';
import { NotificationMode } from '../types/config';
import { buildWidgetUrl } from '../utils/urlBuilder';

/**
 * Fluent builder for creating YourGPTConfig objects.
 *
 * @example
 * ```ts
 * const config = new YourGPTConfigBuilder('your-widget-uid')
 *   .setDebug(true)
 *   .withNotifications(NotificationMode.MINIMALIST, { soundEnabled: true })
 *   .withCustomParams({ theme: 'dark' })
 *   .build();
 * ```
 */
export class YourGPTConfigBuilder {
  private config: YourGPTConfig;

  constructor(widgetUid: string) {
    this.config = { widgetUid };
  }

  setDebug(debug: boolean): this {
    this.config.debug = debug;
    return this;
  }

  setBaseUrl(baseUrl: string): this {
    this.config.baseUrl = baseUrl;
    return this;
  }

  withCustomParams(params: Record<string, string>): this {
    this.config.customParams = {
      ...this.config.customParams,
      ...params,
    };
    return this;
  }

  withNotifications(
    mode: NotificationMode = NotificationMode.MINIMALIST,
    notificationConfig?: YourGPTNotificationConfig,
  ): this {
    this.config.enableNotifications = true;
    this.config.notificationMode = mode;
    if (notificationConfig) {
      this.config.notificationConfig = notificationConfig;
    }
    return this;
  }

  setAutoRegisterToken(autoRegister: boolean): this {
    this.config.autoRegisterToken = autoRegister;
    return this;
  }

  /**
   * Build the final YourGPTConfig object.
   */
  build(): YourGPTConfig {
    return { ...this.config };
  }

  /**
   * Build the widget URL from the current config.
   */
  buildWidgetUrl(): string {
    return buildWidgetUrl(this.config);
  }
}
