export const checkInKeys = {
  all: ['checkIn'] as const,
  today: () => [...checkInKeys.all, 'today'] as const,
  status: (identifier: { qr?: string; faceId?: string; memberId?: number }) =>
    [...checkInKeys.all, 'status', identifier] as const,
  deviceKeys: () => [...checkInKeys.all, 'deviceKeys'] as const,
};
