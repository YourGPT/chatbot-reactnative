import type {NativeEvent} from './events';

export interface NativeMessage {
  type: NativeEvent;
  payload?: any;
}

export interface WidgetMessage {
  type: string;
  payload?: any;
  [key: string]: any;
}
