import React, {createContext, useContext, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  SafeAreaView,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';

const YourGPTContext = createContext(
  {} as {
    open: () => void;
    close: () => void;
  },
);

export default function YourGPTProvider({
  widgetId,
  headerColor = 'transparent',
  children,
}: {
  children: React.ReactNode;
  projectId: string;
  widgetId: string;
  headerColor?: string;
}) {
  const [showWidget, setShowWidget] = useState(false);
  const [loading, setLoading] = useState(true);

  const open = () => {
    setShowWidget(true);
    setTimeout(() => {
      setLoading(false);
    }, 4000);
  };
  const close = () => {
    setShowWidget(false);
    setLoading(true);
  };

  const injectJavaScript = `
    setTimeout(function() { 
      const close = document.querySelector('.mobile-close'); 
      const oldClose = close.cloneNode(true);
      close.parentNode.replaceChild(oldClose, close);

      document.querySelector('.mobile-close').addEventListener('click', function() {
        window.ReactNativeWebView.postMessage('closeButtonPressed');
      });
    }, 1000);
`;

  const onMessage = (event: any) => {
    if (event.nativeEvent.data === 'closeButtonPressed') {
      close();
    }
  };

  return (
    <YourGPTContext.Provider value={{open, close}}>
      {showWidget && (
        <Modal
          visible={showWidget}
          transparent
          animationType="fade"
          onRequestClose={close}>
          <View style={{flex: 1}}>
            <View
              style={{
                backgroundColor: headerColor,
                width: Dimensions.get('screen').width,
                height: 300,
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 5,
              }}
            />
            <SafeAreaView style={{flex: 1, zIndex: 10}}>
              {loading && (
                <View
                  style={{
                    position: 'absolute',
                    width: Dimensions.get('window').width,
                    height: Dimensions.get('window').height,
                    backgroundColor: '#fff',
                    zIndex: 999,
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <ActivityIndicator size="large" />
                </View>
              )}
              <WebView
                source={{
                  uri: `https://widget.yourgpt.ai/${widgetId}?view=app`,
                }}
                style={{
                  flex: 1,
                }}
                onOpenWindow={syntheticEvent => {
                  const {nativeEvent} = syntheticEvent;
                  const {targetUrl} = nativeEvent;
                  Linking.openURL(targetUrl);
                }}
                javaScriptEnabled={true}
                injectedJavaScript={injectJavaScript}
                onMessage={onMessage}
                containerStyle={{}}
              />
            </SafeAreaView>
          </View>
        </Modal>
      )}
      {children}
    </YourGPTContext.Provider>
  );
}

export function useYourGPT() {
  const context = useContext(YourGPTContext);
  if (context === undefined) {
    throw new Error('useYourGPT should be used inside YourGPTProvider');
  }

  return context;
}
