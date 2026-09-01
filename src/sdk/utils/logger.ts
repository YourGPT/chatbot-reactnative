const TAG = '[YourGPT]';

class Logger {
  private static debugEnabled = true;

  static configure(debug: boolean): void {
    Logger.debugEnabled = debug;
  }

  static log(...args: any[]): void {
    if (Logger.debugEnabled) {
      console.log(TAG, ...args);
    }
  }

  static warn(...args: any[]): void {
    if (Logger.debugEnabled) {
      console.warn(TAG, ...args);
    }
  }

  static error(...args: any[]): void {
    console.error(TAG, ...args);
  }
}

export { Logger };
