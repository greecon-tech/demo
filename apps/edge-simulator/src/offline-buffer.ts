export interface BufferFlushResult {
  sent: number;
  retained: number;
}

export class OfflineBuffer<T> {
  private readonly items: T[] = [];

  append(item: T): void {
    this.items.push(item);
  }

  size(): number {
    return this.items.length;
  }

  snapshot(): T[] {
    return [...this.items];
  }

  async flush(dispatch: (item: T) => Promise<void>): Promise<BufferFlushResult> {
    let sent = 0;
    const retained: T[] = [];

    for (const item of this.items) {
      try {
        await dispatch(item);
        sent += 1;
      } catch {
        retained.push(item);
      }
    }

    this.items.length = 0;
    this.items.push(...retained);
    return {
      sent,
      retained: retained.length
    };
  }
}
