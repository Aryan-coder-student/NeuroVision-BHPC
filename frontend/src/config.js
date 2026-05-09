/**
 * NeuroVision Central Configuration
 * Centralizes domain and port logic to avoid hardcoding across the app.
 */

const getEnvConfig = () => {
  const { protocol, host, hostname } = window.location;
  const [hostBase, port] = host.split(':');
  
  // Robust environment detection
  const isDev = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('localtest.me') || hostname.includes('lvh.me');
  const isProd = !isDev;
  
  // Base domain for the platform
  const BASE_DOMAIN = isProd ? hostname : 'localtest.me';
  const FRONTEND_PORT = port || (isProd ? '' : '5174');
  
  const MAIN_URL = `${protocol}//${BASE_DOMAIN}${FRONTEND_PORT ? `:${FRONTEND_PORT}` : ''}`;
  
  // In production, we are always on the "Main Domain" (the central hub)
  const isMainDomain = isProd || hostname === BASE_DOMAIN || hostname === 'localhost' || hostname === 'lvh.me';

  // API URL logic - Prioritize Environment Variables
  const API_URL = import.meta.env.VITE_API_URL || (isProd 
    ? 'https://neurovision-backend-99o7.onrender.com/api/v1' 
    : `${protocol}//api.localtest.me:8000/api/v1`);

  return {
    BASE_DOMAIN,
    FRONTEND_PORT,
    MAIN_URL,
    API_URL,
    isMainDomain,
    protocol
  };
};

export const config = getEnvConfig();
export default config;
