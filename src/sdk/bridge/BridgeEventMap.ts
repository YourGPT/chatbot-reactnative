import {WidgetEvent} from '../types/events';

export const BRIDGE_EVENT_MAP: Record<string, WidgetEvent> = {
  'message:received': WidgetEvent.MESSAGE_RECEIVED,
  'message:new': WidgetEvent.MESSAGE_NEW,
  'message:sent': WidgetEvent.MESSAGE_SENT,
  'chat:opened': WidgetEvent.CHAT_OPENED,
  'widget:opened': WidgetEvent.WIDGET_OPENED,
  'chat:closed': WidgetEvent.CHAT_CLOSED,
  'widget:closed': WidgetEvent.WIDGET_CLOSED,
  'chatbot-close': WidgetEvent.CHATBOT_CLOSE,
  'connection:established': WidgetEvent.CONNECTION_ESTABLISHED,
  'connection:lost': WidgetEvent.CONNECTION_LOST,
  'connection:restored': WidgetEvent.CONNECTION_RESTORED,
  'user:typing': WidgetEvent.USER_TYPING,
  'user:stopped_typing': WidgetEvent.USER_STOPPED_TYPING,
  'escalation:to_human': WidgetEvent.ESCALATION_TO_HUMAN,
  'escalation:resolved': WidgetEvent.ESCALATION_RESOLVED,
  'error:occurred': WidgetEvent.ERROR_OCCURRED,
  'error:network': WidgetEvent.ERROR_NETWORK,
  'sdk:initialized': WidgetEvent.SDK_INITIALIZED,
};
