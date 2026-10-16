import { Platform } from 'react-native';

// In React Native:
// Android Emulator uses 10.0.2.2 or current host IP
// Physical device over local Wi-Fi uses your computer's Wi-Fi IP (192.168.1.100)
// Web uses localhost
export const API_HOST = Platform.select({
    android: 'http://192.168.1.100:5000',
    ios: 'http://192.168.1.100:5000',
    default: 'http://localhost:5000',
});

export const getApiBaseUrl = () => API_HOST;

export const API_BASE_URL = `${API_HOST}/api`;
export const API_URL = API_BASE_URL;

export default API_BASE_URL;
