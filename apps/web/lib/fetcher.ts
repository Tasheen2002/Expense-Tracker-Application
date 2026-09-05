import { apiClient } from './api-client';

export const fetcher = async <T>(url: string): Promise<T> => {
  return apiClient.get(url).json<T>();
};
