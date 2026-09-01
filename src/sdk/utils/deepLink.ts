import { Logger } from './logger';

export interface NotificationData {
  sessionUid?: string;
  session_uid?: string;
  conversation_id?: string;
  widget_uid?: string;
  [key: string]: string | undefined;
}

export function extractSessionUid(data: NotificationData): string | null {
  return data.sessionUid ?? data.session_uid ?? data.conversation_id ?? null;
}

export function extractWidgetUid(data: NotificationData): string | null {
  return data.widget_uid ?? null;
}

export function handleNotificationDeepLink(
  data: NotificationData,
  openSession: (session_uid: string) => void,
  show: () => void,
): void {
  const sessionUid = extractSessionUid(data);
  if (sessionUid) {
    Logger.log('Deep link: opening session', sessionUid);
    show();
    // Small delay to ensure the widget is visible before navigating
    setTimeout(() => openSession(sessionUid), 300);
  } else {
    Logger.log('Deep link: opening widget (no session)');
    show();
  }
}
