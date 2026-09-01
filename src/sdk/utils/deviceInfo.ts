import {Platform, NativeModules} from 'react-native';
import type {VisitorData} from '../types/config';

export function getDeviceVisitorData(): Partial<VisitorData> {
  const platform = Platform.OS;
  const osVersion = String(Platform.Version);

  let deviceModel = 'Unknown';
  let appVersion = 'Unknown';
  let locale = 'en';

  try {
    // Device model
    if (Platform.OS === 'android') {
      deviceModel =
        (Platform.constants as any)?.Model ??
        (Platform.constants as any)?.Brand ??
        'Android Device';
    } else if (Platform.OS === 'ios') {
      deviceModel =
        (Platform.constants as any)?.systemName ?? 'iOS Device';
    }
  } catch {}

  try {
    // App version from native modules
    const rni18n = NativeModules.I18nManager;
    locale = rni18n?.localeIdentifier ?? rni18n?.languageName ?? 'en';
  } catch {}

  try {
    // App version from RNDeviceInfo or built-in constants
    const constants = Platform.constants as any;
    appVersion = constants?.reactNativeVersion
      ? `${constants.reactNativeVersion.major}.${constants.reactNativeVersion.minor}`
      : 'Unknown';
  } catch {}

  return {
    platform,
    osVersion,
    deviceModel,
    appVersion,
    locale,
  };
}
