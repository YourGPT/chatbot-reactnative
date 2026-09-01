export enum YourGPTErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  WEBVIEW_ERROR = 'WEBVIEW_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOTIFICATION_DENIED = 'NOTIFICATION_DENIED',
  BRIDGE_PARSE_ERROR = 'BRIDGE_PARSE_ERROR',
}

export interface YourGPTError {
  code: YourGPTErrorCode;
  message: string;
  nativeError?: Error;
}

export function createError(
  code: YourGPTErrorCode,
  message: string,
  nativeError?: Error,
): YourGPTError {
  return {code, message, nativeError};
}
