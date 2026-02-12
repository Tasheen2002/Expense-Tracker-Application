import { apiClient } from './index';

// Base API client methods
export const api = {
  get: <T>(url: string) => apiClient.get(url).json<T>(),
  post: <T>(url: string, data?: unknown) => apiClient.post(url, { json: data }).json<T>(),
  put: <T>(url: string, data?: unknown) => apiClient.put(url, { json: data }).json<T>(),
  patch: <T>(url: string, data?: unknown) => apiClient.patch(url, { json: data }).json<T>(),
  delete: <T>(url: string) => apiClient.delete(url).json<T>(),
};

// TODO: Generate from OpenAPI schema
// Run: pnpm generate to create typed API client from Fastify backend
