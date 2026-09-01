import { Platform, PermissionsAndroid } from 'react-native';
import { Logger } from '../utils/logger';
import {getPushNotificationIOS} from './getPushNotificationIOS';

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
      '[APNs-Flow] Error requesting iOS notification permission (is @react-native-community/push-notification-ios installed?):',
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
