/**
 * Centralized TanStack Query keys for the Attendance domain.
 * Follows the project's query key conventions.
 */
export const attendanceKeys = {
  all: ['attendance'] as const,

  list: (filters?: object) =>
    [...attendanceKeys.all, 'list', filters] as const,

  stats: ['attendance', 'stats'] as const,

  reports: (filters?: object) =>
    [...attendanceKeys.all, 'reports', filters] as const,

  detail: (id: number) => [...attendanceKeys.all, 'detail', id] as const,
};
