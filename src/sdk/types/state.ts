export enum YourGPTConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface YourGPTSDKState {
  isInitialized: boolean;
  isLoading: boolean;
  isVisible: boolean;
  error: string | null;
  connectionState: YourGPTConnectionState;
  badgeCount: number;
  pendingSessionUid: string | null;
}
