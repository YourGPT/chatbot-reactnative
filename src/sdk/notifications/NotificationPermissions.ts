import { Platform, PermissionsAndroid } from 'react-native';
import { Logger } from '../utils/logger';
import {getPushNotificationIOS} from './getPushNotificationIOS';
import {YourGPTApnsNative} from './YourGPTApnsNative';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return requestAndroidPermission();
  } else if (Platform.OS === 'ios') {
    return requestIOSPermission();
  }
  return false;
}

async function requestAndroidPermission(): Promise<boolean> {
  // POST_NOTIFICATIONS permission required on Android 13+ (API 33)
  if (Number(Platform.Version) < 33) {
    return true; // No runtime permission needed before API 33
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    Logger.log('Android notification permission:', result);
    return granted;
  } catch (e) {
    Logger.error('Error requesting Android notification permission:', e);
    return false;
  }
}

async function requestIOSPermission(): Promise<boolean> {
  // Prefer the SDK's own native module: it requests authorization AND calls
  // registerForRemoteNotifications(), so no extra JS dependency is needed.
  // @react-native-community/push-notification-ios is only a fallback for apps
  // that haven't run `pod install` for the SDK's podspec.
  if (YourGPTApnsNative.isAvailable) {
    Logger.log('[APNs-Flow] Requesting iOS notification permission via native YourGPTApns module...');
    const granted = await YourGPTApnsNative.requestPermission();
    Logger.log('[APNs-Flow] iOS notification permission (native module) | granted:', granted);
    return granted;
  }

  try {
    const PushNotificationIOS = getPushNotificationIOS();
    Logger.log('[APNs-Flow] Requesting iOS notification permission...');
    const result = await PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
    });
    const granted = !!(result.alert || result.badge || result.sound);
    Logger.log('[APNs-Flow] iOS notification permission result:', JSON.stringify(result), '| granted:', granted);
    return granted;
  } catch (e) {
    Logger.error(
      '[APNs-Flow] Could not request iOS notification permission. Either run `pod install` so the ' +
        'SDK\'s native YourGPTApns module is linked (and call YourGPTApns.configure(application) in ' +
        'AppDelegate.swift), or install @react-native-community/push-notification-ios. Error:',
      e,
    );
    return false;
  }
}

export async function areNotificationsEnabled(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) {
      return true;
    }
    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result;
  }

  if (Platform.OS === 'ios') {
    if (YourGPTApnsNative.isAvailable) {
      return YourGPTApnsNative.isPermissionGranted();
    }

    try {
      const PushNotificationIOS = getPushNotificationIOS();
      return new Promise(resolve => {
        PushNotificationIOS.checkPermissions((permissions: any) => {
          resolve(
            !!(permissions.alert || permissions.badge || permissions.sound),
          );
        });
      });
    } catch {
      return false;
    }
  }

  return false;
}
