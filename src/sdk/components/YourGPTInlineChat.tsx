import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { YourGPTWidget } from './YourGPTWidget';
import { YourGPTSDK } from '../core/YourGPTSDK';
import { useSDKState } from '../hooks/useSDKState';

interface YourGPTInlineChatProps {
  /** Override the widget UID (defaults to the one from SDK config). */
  widgetUid?: string;
  /** Open a specific conversation session. */
  sessionUid?: string;
  /** Container style for the inline chat. */
  style?: ViewStyle;
  /** Custom loading indicator shown while the WebView loads. */
  renderLoading?: () => React.ReactNode;
  /** Custom error view shown when the widget fails to load. */
  renderError?: (error: string, retry: () => void) => React.ReactNode;
}

/**
 * Embeddable inline chat component (no Modal/BottomSheet wrapper).
 * Use this to embed the chat widget directly in your screen layout.
 *
 * Equivalent to Flutter's `createChatWidget()`.
 *
 * @example
 * ```tsx
 * <YourGPTInlineChat style={{ flex: 1 }} />
 * ```
 */
export function YourGPTInlineChat({
  sessionUid,
  style,
  renderLoading,
  renderError,
}: YourGPTInlineChatProps) {
  const sdkState = useSDKState();

  const url = sdkState.isInitialized
    ? YourGPTSDK.getWidgetUrl(sessionUid)
    : '';

  if (!sdkState.isInitialized) {
    return null;
  }

  const handleRetry = () => {
    // Force re-render by toggling visibility
    YourGPTSDK.show();
  };

  return (
    <View style={[styles.container, style]}>
      {sdkState.error && renderError ? (
        renderError(sdkState.error, handleRetry)
      ) : sdkState.isLoading && renderLoading ? (
        <View style={styles.container}>
          {renderLoading()}
          <YourGPTWidget url={url} />
        </View>
      ) : (
        <YourGPTWidget url={url} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
