import ky from 'ky';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE_URL = `${API_URL}/api/v1`;

const authHook = (request: Request) => {
  // Add auth token from localStorage or cookies
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth-token')
    : null;

  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
};

// API client for versioned endpoints (/api/v1/*)
export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [authHook],
  },
});

// API client for root-level endpoints (auth, workspaces)
export const rootApiClient = ky.create({
  prefixUrl: API_URL,
  hooks: {
    beforeRequest: [authHook],
  },
});

export * from './client';
