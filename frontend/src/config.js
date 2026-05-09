/**
 * NeuroVision Central Configuration
 * Centralizes domain and port logic to avoid hardcoding across the app.
 */

const getEnvConfig = () => {
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(':');
  
  // Base domain for the platform
  // Use the environment variable if available, otherwise fallback to localtest.me
  const isProd = hostname.includes('vercel.app') || hostname.includes('neurovision');
  const BASE_DOMAIN = isProd ? hostname : 'localtest.me';
  const FRONTEND_PORT = port || (isProd ? '' : '5174');
  
  const MAIN_URL = `${protocol}//${BASE_DOMAIN}:${FRONTEND_PORT}`;
  
  return {
    BASE_DOMAIN,
    FRONTEND_PORT,
    MAIN_URL,
    isMainDomain: hostname === BASE_DOMAIN || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'lvh.me'
  };
};

export const config = getEnvConfig();
export default config;
