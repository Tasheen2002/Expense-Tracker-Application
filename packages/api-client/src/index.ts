import ky from 'ky';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = ky.create({
  prefixUrl: API_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        // Add auth token from localStorage or cookies
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('auth-token')
          : null;

        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
});

export * from './client';
