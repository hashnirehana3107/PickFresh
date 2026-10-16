import { Platform } from 'react-native';

// Live Cloud Backend (Vercel Serverless connected to MongoDB Atlas)
// Works globally 24/7 on any device (Android, iOS, Web) via Wi-Fi or Mobile Data (4G/5G)
export const API_HOST = 'https://pick-fresh.vercel.app';

export const getApiBaseUrl = () => API_HOST;

export const API_BASE_URL = `${API_HOST}/api`;
export const API_URL = API_BASE_URL;

export default API_BASE_URL;
