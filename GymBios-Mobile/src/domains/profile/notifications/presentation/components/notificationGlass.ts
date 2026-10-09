// Liquid-glass palette shared by the notification panel pieces (see notifications.html reference).
export const NotificationGlass = {
  ink: '#1C2724',
  ink2: '#3A4743',
  ink3: '#4F5C58',
  muted: '#46534F',
  teal: '#24594E',
  tealDot: '#2F7A69',
  scrim: 'rgba(14,26,22,0.38)',
  /** Sheet fill when native liquid glass is unavailable (no blur, so it must stay legible). */
  sheetFallback: 'rgba(244,246,243,0.96)',
  border: 'rgba(255,255,255,0.7)',
  borderStrong: 'rgba(255,255,255,0.85)',
  cardRead: 'rgba(255,255,255,0.4)',
  cardUnread: 'rgba(255,255,255,0.82)',
  cardPressed: 'rgba(255,255,255,0.6)',
  control: 'rgba(255,255,255,0.55)',
  controlPressed: 'rgba(255,255,255,0.78)',
  track: 'rgba(255,255,255,0.32)',
  thumb: 'rgba(255,255,255,0.95)',
  shadow: 'rgba(14,36,30,1)',
} as const;
