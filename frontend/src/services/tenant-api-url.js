const TENANT_ENDPOINT_PREFIX = '/tenant/';
const INVALID_TENANT_ENDPOINT_ERROR =
  'tenantRequest accepts only normalized /tenant/ endpoints';

export function buildTenantApiUrl(apiBaseUrl, endpointPath) {
  if (typeof endpointPath !== 'string') {
    throw new Error(INVALID_TENANT_ENDPOINT_ERROR);
  }

  const apiBase = new URL(apiBaseUrl);
  const apiBasePath = apiBase.pathname.replace(/\/$/, '');
  const requestUrl = new URL(`${apiBase.origin}${apiBasePath}${endpointPath}`);
  const tenantPathPrefix = `${apiBasePath}${TENANT_ENDPOINT_PREFIX}`;

  if (
    requestUrl.origin !== apiBase.origin
    || !requestUrl.pathname.startsWith(tenantPathPrefix)
  ) {
    throw new Error(INVALID_TENANT_ENDPOINT_ERROR);
  }

  return requestUrl.href;
}
