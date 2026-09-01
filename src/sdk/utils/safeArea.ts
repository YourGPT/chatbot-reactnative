import { useContext } from 'react';
import type { Context } from 'react';

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const ZERO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// react-native-safe-area-context is an optional peer dependency: apps that
// upgraded from @yourgpt/chatbot-reactnative v1 may not have it installed,
// and even when installed they may not mount a <SafeAreaProvider>. Metro
// treats a require() inside try/catch as an optional dependency, so bundling
// succeeds without the module.
let InsetsContext: Context<EdgeInsets | null> | null = null;
try {
  InsetsContext =
    require('react-native-safe-area-context').SafeAreaInsetsContext ?? null;
} catch {
  InsetsContext = null;
}

/**
 * Like useSafeAreaInsets(), but degrades to zero insets instead of throwing
 * when react-native-safe-area-context is missing or no SafeAreaProvider is
 * mounted above the SDK components.
 */
export function useSafeInsets(): EdgeInsets {
  // Module presence is fixed for the lifetime of the app, so the hook call
  // order is stable even though the useContext call is behind a condition.
  if (InsetsContext) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const insets = useContext(InsetsContext);
    return insets ?? ZERO_INSETS;
  }
  return ZERO_INSETS;
}
