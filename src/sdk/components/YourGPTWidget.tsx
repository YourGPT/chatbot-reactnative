import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {YourGPTSDK} from '../core/YourGPTSDK';
import {JSBridge} from '../bridge/JSBridge';
import type {NativeMessage} from '../types/bridge';

export interface YourGPTWidgetRef {
  postMessage: (message: NativeMessage) => void;
  reload: () => void;
}

interface YourGPTWidgetProps {
  url: string;
}

const YourGPTWidget = forwardRef<YourGPTWidgetRef, YourGPTWidgetProps>(
  ({url}, ref) => {
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      postMessage: (message: NativeMessage) => {
        const payloadJson = JSON.stringify(message.payload ?? null);
        const js = `
          (function() {
            try {
              window.postMessage({ type: '${message.type}', payload: ${payloadJson} }, '*');
            } catch(e) {}
          })();
          true;
        `;
        webviewRef.current?.injectJavaScript(js);
      },
      reload: () => {
        webviewRef.current?.reload();
      },
    }));

    return (
      <View style={styles.container}>
        <WebView
          ref={webviewRef}
          source={{uri: url}}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          // userAgent left as default so the backend UA parser can detect the OS (ios/android).
          // SDK identity is already passed via URL query params: sdk=ReactNative&sdkVersion=1.1.0
          injectedJavaScriptBeforeContentLoaded={JSBridge.buildInjectionScript()}
          onMessage={event => {
            JSBridge.handleIncomingMessage(event.nativeEvent.data);
          }}
          onLoadStart={() => {
            YourGPTSDK._onWidgetLoadStart();
          }}
          onLoadEnd={() => {
            YourGPTSDK._onWidgetLoadEnd();
            YourGPTSDK._setWidgetRef(webviewRef);
            YourGPTSDK._onWidgetReady();
          }}
          onError={({nativeEvent}) => {
            YourGPTSDK._onWidgetError(
              nativeEvent.description || 'WebView error',
            );
          }}
          onHttpError={({nativeEvent}) => {
            YourGPTSDK._onWidgetError(
              `HTTP ${nativeEvent.statusCode}: ${nativeEvent.url}`,
            );
          }}
          onOpenWindow={syntheticEvent => {
            const {nativeEvent} = syntheticEvent;
            Linking.openURL(nativeEvent.targetUrl).catch(() => {});
          }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          scalesPageToFit={false}
        />
      </View>
    );
  },
);

YourGPTWidget.displayName = 'YourGPTWidget';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export {YourGPTWidget};
