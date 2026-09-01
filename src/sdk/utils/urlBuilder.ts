import type { YourGPTConfig } from '../types/config';

const SDK_VERSION = '2.0.0';
const DEFAULT_BASE_URL = 'https://widget.yourgpt.ai';

export function buildWidgetUrl(config: YourGPTConfig): string {
  const base = config.baseUrl ?? DEFAULT_BASE_URL;

  const params: Record<string, string> = {
    sdk: 'ReactNative',
    sdkVersion: SDK_VERSION,
    mobileWebView: 'true',
    ...(config.customParams ?? {}),
  };

  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `${base}/${config.widgetUid}?${query}`;
}
