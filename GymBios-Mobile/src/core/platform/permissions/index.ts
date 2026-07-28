export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export const permissions = {
  async requestCamera(): Promise<PermissionStatus> {
    return 'undetermined';
  },
};
