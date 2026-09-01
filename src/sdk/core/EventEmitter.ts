type EventCallback = (payload?: any) => void;

export class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  once(event: string, callback: EventCallback): void {
    const wrapper = (payload?: any) => {
      callback(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  emit(event: string, payload?: any): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`[YourGPT] Error in event listener for "${event}":`, e);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}
