console.log("DEBUG: config.js loading...");
const getEnvConfig = () => {
  const { protocol, host, hostname } = window.location;
  const [hostBase, port] = host.split(':');
  
  // Robust environment detection
  const isDev = hostname.includes('localtest.me') || hostname.includes('127.0.0.1');
  const isProd = !isDev;
  
  // Base domain for the platform
  const BASE_DOMAIN = isProd ? hostname : 'localtest.me';
  const FRONTEND_PORT = port || (isProd ? '' : '5174');
  
  const MAIN_URL = `${protocol}//${BASE_DOMAIN}${FRONTEND_PORT ? `:${FRONTEND_PORT}` : ''}`;
  
  // In production, we are always on the "Main Domain" (the central hub)
  const isMainDomain = isProd || hostname === BASE_DOMAIN;

  // API URL logic - Prioritize Environment Variables
  let rawApiUrl = import.meta.env.VITE_API_URL || '';
  
  // Fallback if VITE_API_URL is missing or is an internal Render host (no dots)
  const isInternalHost = rawApiUrl && !rawApiUrl.includes('.');
  if (!rawApiUrl || isInternalHost) {
    rawApiUrl = isProd 
      ? 'https://neurovision-backend-99o7.onrender.com/api/v1' 
      : `${protocol}//localtest.me:8000/api/v1`;
  }
  
  // Safety: Ensure it always starts with http:// or https://
  if (rawApiUrl && !rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
    rawApiUrl = `https://${rawApiUrl}`;
  }
  
  // Dynamically adapt localtest.me API URL to target the correct tenant subdomain
  if (isDev && rawApiUrl.includes('localtest.me')) {
    rawApiUrl = rawApiUrl.replace('localtest.me', hostname);
  }
  
  // Safety: Ensure it always ends with /api/v1 if not already there
  if (!rawApiUrl.includes('/api/v1')) {
    rawApiUrl = rawApiUrl.replace(/\/$/, '') + '/api/v1';
  }
  const API_URL = rawApiUrl;

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
