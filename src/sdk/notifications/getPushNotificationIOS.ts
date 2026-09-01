import {Logger} from '../utils/logger';

type PushNotificationIOSModule = {
  default?: any;
  [key: string]: any;
};

/**
 * Normalizes CJS/ESM interop for @react-native-community/push-notification-ios.
 * Some RN/Babel setups return the class directly, others return { default: class }.
 */
export function getPushNotificationIOS(): any {
  const mod = require('@react-native-community/push-notification-ios') as PushNotificationIOSModule;
  const resolved = mod?.default ?? mod;
  Logger.log(
    '[APNs] getPushNotificationIOS resolved:',
    typeof resolved,
    '| hasAddEventListener:',
    typeof resolved?.addEventListener,
    '| hasRequestPermissions:',
    typeof resolved?.requestPermissions,
  );
  return resolved;
}

