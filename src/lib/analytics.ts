type EventProps = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: string, props: EventProps = {}): void {
  try {
    if (typeof window === 'undefined') return;
    const payload = { event, ...props, ts: Date.now() };

    const w = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(payload);
      return;
    }

    // Fallback for local debugging before external analytics is connected.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[trackEvent]', payload);
    }
  } catch {
    // no-op: analytics failures must never block product flows
  }
}

