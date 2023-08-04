import React, { createContext, useContext, useState } from "react";
import { Dimensions, Linking, Modal, SafeAreaView, View } from "react-native";
import { WebView } from "react-native-webview";

const YourGPTContext = createContext(
  {} as {
    open: () => void;
    close: () => void;
  }
);

export default function YourGPTProvider({ projectId, widgetId, headerColor = "transparent", children }: { children: React.ReactNode; projectId: string; widgetId: string; headerColor?: string }) {
  const [showWidget, setShowWidget] = useState(false);

  const open = () => {
    setShowWidget(true);
  };
  const close = () => {
    setShowWidget(false);
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
    if (event.nativeEvent.data === "closeButtonPressed") {
      close();
    }
  };

  return (
    <YourGPTContext.Provider value={{ open, close }}>
      {showWidget && (
        <Modal visible={showWidget} transparent animationType="fade" onRequestClose={close}>
          <View
            style={{
              backgroundColor: headerColor,
              width: Dimensions.get("screen").width,
              height: 300,
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 5,
            }}
          />
          <SafeAreaView style={{ flex: 1, zIndex: 10 }}>
            <WebView
              source={{
                uri: `https://widget.yourgpt.ai/${projectId}/${widgetId}?view=app`,
              }}
              style={{
                flex: 1,
              }}
              onOpenWindow={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                const { targetUrl } = nativeEvent;
                Linking.openURL(targetUrl);
              }}
              javaScriptEnabled={true}
              injectedJavaScript={injectJavaScript}
              onMessage={onMessage}
              containerStyle={{}}
            />
          </SafeAreaView>
        </Modal>
      )}
      {children}
    </YourGPTContext.Provider>
  );
}

export function useYourGPT() {
  const context = useContext(YourGPTContext);
  if (context === undefined) {
    throw new Error("useYourGPT should be used inside YourGPTProvider");
  }

  return context;
}
