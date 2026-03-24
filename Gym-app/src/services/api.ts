import { Platform } from 'react-native';

// Android emulator maps 10.0.2.2 → host machine localhost.
// Web and iOS simulator use localhost directly.
// For a physical device replace with your machine's LAN IP, e.g. http://192.168.1.100:8080/api
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080/api'
    : 'http://localhost:8080/api';
