import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTenantApiUrl } from './tenant-api-url.js';

const API_BASE_URL = 'https://api.example.com/api/v1';

test('buildTenantApiUrl accepts normalized tenant endpoints', () => {
  assert.equal(
    buildTenantApiUrl(API_BASE_URL, '/tenant/context/?include=role'),
    'https://api.example.com/api/v1/tenant/context/?include=role',
  );
});

test('buildTenantApiUrl rejects public endpoints', () => {
  assert.throws(
    () => buildTenantApiUrl(API_BASE_URL, '/workspaces/'),
    /only normalized \/tenant\/ endpoints/,
  );
});

test('buildTenantApiUrl rejects dot-segment escapes from the tenant namespace', () => {
  for (const endpoint of [
    '/tenant/../workspaces/',
    '/tenant/%2e%2e/workspaces/',
    '/tenant/..\\workspaces/',
  ]) {
    assert.throws(
      () => buildTenantApiUrl(API_BASE_URL, endpoint),
      /only normalized \/tenant\/ endpoints/,
    );
  }
});
