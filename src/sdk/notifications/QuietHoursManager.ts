import type {YourGPTNotificationConfig} from '../types/config';

type QuietConfig = Pick<
  YourGPTNotificationConfig,
  'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd'
>;

function parseTime(hhmm: string): {hours: number; minutes: number} {
  const [h, m] = hhmm.split(':').map(Number);
  return {hours: h ?? 0, minutes: m ?? 0};
}

function toMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export class QuietHoursManager {
  private config: QuietConfig;

  constructor(config: QuietConfig) {
    this.config = config;
  }

  isQuietHour(): boolean {
    if (!this.config.quietHoursEnabled) {
      return false;
    }

    const startStr = this.config.quietHoursStart ?? '22:00';
    const endStr = this.config.quietHoursEnd ?? '08:00';

    const now = new Date();
    const currentMinutes = toMinutes(now.getHours(), now.getMinutes());

    const {hours: sh, minutes: sm} = parseTime(startStr);
    const {hours: eh, minutes: em} = parseTime(endStr);

    const startMinutes = toMinutes(sh, sm);
    const endMinutes = toMinutes(eh, em);

    if (startMinutes < endMinutes) {
      // Normal range: e.g. 08:00 – 22:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range: e.g. 22:00 – 08:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }
}
