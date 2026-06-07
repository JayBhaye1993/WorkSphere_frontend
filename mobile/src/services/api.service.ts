import axios, { AxiosInstance, AxiosError } from 'axios';
import { StorageService, StorageKeys } from './storage.service';

const API_URLS = {
  identity: 'http://10.0.2.2:52092', // 10.0.2.2 = localhost from Android emulator
  tenant:   'http://10.0.2.2:52094',
  employee: 'http://10.0.2.2:52096',
  hr:       'http://10.0.2.2:52098',
  task:     'http://10.0.2.2:52100',
};

export type ServiceName = keyof typeof API_URLS;

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, timeout: 15000 });

  // Attach JWT token
  client.interceptors.request.use(config => {
    const token = StorageService.get(StorageKeys.ACCESS_TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Handle 401 — attempt refresh
  client.interceptors.response.use(
    res => res,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        const rt = StorageService.get(StorageKeys.REFRESH_TOKEN);
        if (rt) {
          try {
            const res = await axios.post(
              `${API_URLS.identity}/api/v1/auth/refresh`,
              { refreshToken: rt }
            );
            const newToken = res.data?.data?.accessToken;
            if (newToken) {
              StorageService.set(StorageKeys.ACCESS_TOKEN, newToken);
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${newToken}`;
                return client.request(error.config);
              }
            }
          } catch {
            // Refresh failed — clear session
            StorageService.delete(StorageKeys.ACCESS_TOKEN);
            StorageService.delete(StorageKeys.REFRESH_TOKEN);
            StorageService.delete(StorageKeys.USER);
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const ApiClients = {
  identity: createClient(API_URLS.identity),
  tenant:   createClient(API_URLS.tenant),
  employee: createClient(API_URLS.employee),
  hr:       createClient(API_URLS.hr),
  task:     createClient(API_URLS.task),
};
