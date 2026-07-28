export const notifications = {
  async requestPermission(): Promise<boolean> {
    return false;
  },

  async getExpoPushToken(): Promise<string | null> {
    return null;
  },
};
