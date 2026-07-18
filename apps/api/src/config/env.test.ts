import { describe, expect, it } from 'vitest';

import { loadDatabaseUrl, loadServerEnv } from './env.js';

describe('loadServerEnv', () => {
  it('uses the local development port by default when PORT is unset', () => {
    expect(loadServerEnv({})).toEqual({ port: 8787 });
  });

  it('treats an empty PORT as unset (#3)', () => {
    expect(loadServerEnv({ PORT: '' })).toEqual({ port: 8787 });
  });

  it('treats a whitespace-only PORT as unset', () => {
    expect(loadServerEnv({ PORT: '   ' })).toEqual({ port: 8787 });
  });

  it('parses a valid PORT', () => {
    expect(loadServerEnv({ PORT: '3000' })).toEqual({ port: 3000 });
  });

  it('rejects exponential notation (#6)', () => {
    expect(() => loadServerEnv({ PORT: '1e4' })).toThrow();
  });

  it('rejects hexadecimal notation (#6)', () => {
    expect(() => loadServerEnv({ PORT: '0x1F90' })).toThrow();
  });

  it('rejects a PORT below the valid range', () => {
    expect(() => loadServerEnv({ PORT: '0' })).toThrow();
  });

  it('rejects a PORT above the valid range', () => {
    expect(() => loadServerEnv({ PORT: '70000' })).toThrow();
  });
});

describe('loadDatabaseUrl', () => {
  it('requires DATABASE_URL', () => {
    expect(() => loadDatabaseUrl({})).toThrow();
  });

  it('returns the configured DATABASE_URL', () => {
    const url = 'postgresql://tamamori:local-dev-only@127.0.0.1:55432/tamamori';
    expect(loadDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });
});
