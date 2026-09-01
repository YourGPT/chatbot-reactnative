import {YourGPTSDKState, YourGPTConnectionState} from '../types/state';

type StateListener = (state: YourGPTSDKState) => void;

const DEFAULT_STATE: YourGPTSDKState = {
  isInitialized: false,
  isLoading: false,
  isVisible: false,
  error: null,
  connectionState: YourGPTConnectionState.DISCONNECTED,
  badgeCount: 0,
  pendingSessionUid: null,
};

export class SDKState {
  private state: YourGPTSDKState = {...DEFAULT_STATE};
  private listeners: Set<StateListener> = new Set();

  getState(): YourGPTSDKState {
    return {...this.state};
  }

  setState(partial: Partial<YourGPTSDKState>): void {
    this.state = {...this.state, ...partial};
    this.notify();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.state = {...DEFAULT_STATE};
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[YourGPT] Error in state listener:', e);
      }
    });
  }
}
