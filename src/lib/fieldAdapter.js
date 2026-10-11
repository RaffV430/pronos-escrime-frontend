import { accountScope, cachePath, cacheLifetime, reducedData, CACHE_EVENT } from './fieldCache.js';
export function fieldAdapter(
  network,
  cache,
  {
    token = () => localStorage.getItem('token'),
    reduced = reducedData,
    notify = (detail) => window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail })),
  } = {},
) {
  const pending = new Map();
  let generation = 0;
  return async (config) => {
    const requestToken = token();
    const scope = accountScope(requestToken);
    const path = cachePath(config);
    const method = (config.method || 'get').toLowerCase();
    const ttl = method === 'get' && scope ? cacheLifetime(path, reduced()) : null;
    if (ttl === null) {
      const response = await network(config);
      if (method !== 'get' && scope && path !== '/auth/refresh') {
        generation++;
        const profile = !path.startsWith('/auth/') ? cache.read(scope, '/auth/me') : null;
        cache.clear(scope);
        if (profile) cache.write(scope, '/auth/me', profile.data);
        notify({ invalidated: true });
      }
      return response;
    }
    const row = cache.read(scope, path);
    const key = scope + path;
    const fetchLatest = () => {
      if (pending.has(key)) return pending.get(key);
      const version = generation;
      // Background refresh is independent of a view unmounting. Never store credentials.
      const request = network({
        ...config,
        signal: undefined,
        timeout: reduced() ? 8000 : config.timeout,
        headers: { ...config.headers, ...(row?.etag && path !== '/auth/me' ? { 'If-None-Match': row.etag } : {}) },
        validateStatus: (status) =>
          status === 304 || (config.validateStatus ? config.validateStatus(status) : status >= 200 && status < 300),
      })
        .then((response) => {
          if (response.status === 304 && row) response = { ...response, status: 200, data: row.data };
          if (requestToken === token() && version === generation) {
            const data =
              path === '/auth/me'
                ? {
                    id: response.data.id,
                    name: response.data.name,
                    username: response.data.username,
                    publicListing: response.data.publicListing,
                  }
                : response.data;
            cache.write(scope, path, data, path === '/auth/me' ? undefined : response.headers?.etag || row?.etag);
            notify({
              path: row && cache.read(scope, path) ? path : undefined,
              checkedAt: Date.now(),
              user: path === '/auth/me' ? response.data : undefined,
            });
          }
          return response;
        })
        .finally(() => pending.delete(key));
      pending.set(key, request);
      return request;
    };
    if (row && !config.forceRefresh) {
      if (Date.now() - row.at >= ttl)
        fetchLatest().catch((error) => {
          if (requestToken !== token()) return;
          if ([401, 403, 404].includes(error.response?.status)) {
            cache.clear(scope);
            notify({ path, error });
          } else notify({ path, offline: true, checkedAt: row.at });
        });
      return {
        config,
        status: 200,
        statusText: 'Cached',
        headers: {},
        data: path === '/auth/me' ? { ...row.data, isAdmin: false } : row.data,
        cachedAt: row.at,
        fromCache: true,
      };
    }
    return fetchLatest();
  };
}
