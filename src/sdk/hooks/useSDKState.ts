import {useEffect, useState} from 'react';
import {YourGPTSDK} from '../core/YourGPTSDK';
import type {YourGPTSDKState} from '../types/state';

export function useSDKState(): YourGPTSDKState {
  const [state, setState] = useState<YourGPTSDKState>(
    () => YourGPTSDK.currentState,
  );

  useEffect(() => {
    // Subscribe and return the unsubscribe function as cleanup
    return YourGPTSDK.subscribeToState(setState);
  }, []);

  return state;
}
