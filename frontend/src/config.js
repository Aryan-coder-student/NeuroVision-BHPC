/**
 * NeuroVision Central Configuration
 * Centralizes domain and port logic to avoid hardcoding across the app.
 */

const getEnvConfig = () => {
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(':');
  
  // Base domain for the platform (used for central auth and org selection)
  // In development, this is typically localtest.me, lvh.me, or localhost
  const BASE_DOMAIN = 'localtest.me';
  const FRONTEND_PORT = port || '5174';
  
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
