export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean>;
};

export const analytics = {
  track(event: AnalyticsEvent): void {
    if (__DEV__) {
      console.debug('[analytics]', event.name, event.properties);
    }
  },

  identify(userId: string): void {
    if (__DEV__) {
      console.debug('[analytics] identify', userId);
    }
  },
};
