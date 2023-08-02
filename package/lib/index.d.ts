import React from "react";
import { ModalProps } from "react-native";
import { WebViewProps } from "react-native-webview";

declare module "yourgpt-chatbot-reactnative" {
  export interface YourGPTProviderProps {
    projectId: string;
    widgetId: string;
    headerColor?: string;
    children: React.ReactNode;
  }

  export default function YourGPTProvider(props: YourGPTProviderProps): React.ReactNode;

  export function useYourGPT(): {
    open: () => void;
    close: () => void;
  };

  export interface YourGPTWebViewProps extends WebViewProps {
    containerStyle?: any;
  }

  export interface YourGPTModalProps extends ModalProps {
    onRequestClose: () => void;
  }
}
