// Env + public runtime configuration
export const CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  isProduction: process.env.NODE_ENV === 'production',
};
