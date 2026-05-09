/**
 * NeuroVision Central Configuration
 * Centralizes domain and port logic to avoid hardcoding across the app.
 */

const getEnvConfig = () => {
  const { protocol, host, hostname } = window.location;
  const [hostBase, port] = host.split(':');
  
  // Detect if we are in production (Vercel)
  const isProd = hostname.includes('vercel.app') || hostname.includes('neurovision');
  
  // Base domain for the platform
  // In production, the main domain is the base URL. In dev, it's localtest.me.
  const BASE_DOMAIN = isProd ? hostname : 'localtest.me';
  const FRONTEND_PORT = port || (isProd ? '' : '5174');
  
  const MAIN_URL = `${protocol}//${BASE_DOMAIN}${FRONTEND_PORT ? `:${FRONTEND_PORT}` : ''}`;
  
  // Main domain is either the exact BASE_DOMAIN or one of the dev defaults
  const isMainDomain = hostname === BASE_DOMAIN || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'lvh.me';

  return {
    BASE_DOMAIN,
    FRONTEND_PORT,
    MAIN_URL,
    isMainDomain,
    protocol
  };
};

export const config = getEnvConfig();
export default config;
