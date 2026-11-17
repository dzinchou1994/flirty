'use client';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; field?: string } };

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: '{}',
        });
        const json = (await res.json().catch(() => null)) as ApiResult<unknown> | null;
        return Boolean(json && json.ok);
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const doFetch = () =>
    fetch(path, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers || {}),
      },
      credentials: 'include',
    });

  let res = await doFetch();
  let json = (await res.json()) as ApiResult<T>;

  if (
    !json.ok &&
    (json.error.code === 'UNAUTHORIZED' || res.status === 401) &&
    !path.includes('/auth/refresh') &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/register')
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      res = await doFetch();
      json = (await res.json()) as ApiResult<T>;
    }
  }

  return json;
}
