export interface NetworkStatus {
  isConnected: boolean;
}

export const networkMonitor = {
  async getStatus(): Promise<NetworkStatus> {
    return { isConnected: true };
  },
};
