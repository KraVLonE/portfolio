import { useEffect, useRef, useState } from 'react';

/**
 * In-memory response cache + "stale-while-revalidate" hook. Removes the loading flash:
 *  - refresh: the server embeds this page's data (<script id="blog-data">), primed on boot;
 *  - back navigation: data is already cached -> instant render, refreshed in background;
 *  - filter/page switch: previous list stays on screen (dimmed) until the new one arrives.
 * Keys: `posts|<page>|<tag>`, `tags`, `post|<slug>` (must match portfolio-backend/app/api/blog_seo.py).
 */
const store = new Map<string, unknown>();

export const cacheKeys = {
  posts: (page: number, tag: string | null) => `posts|${page}|${tag ?? ''}`,
  tags: 'tags',
  post: (slug: string) => `post|${slug}`,
};

export function primeFromDocument(doc: Document = document) {
  const el = doc.getElementById('blog-data');
  if (!el) return;
  try {
    for (const [k, v] of Object.entries(JSON.parse(el.textContent || '{}'))) store.set(k, v);
  } catch {
    /* malformed boot data: just fetch normally */
  }
  el.remove();
}

export const cacheGet = <T,>(key: string) => store.get(key) as T | undefined;
export const cacheSet = (key: string, value: unknown) => store.set(key, value);
export const cacheClear = () => { store.clear(); inflight.clear(); };

export interface ApiState<T> {
  data: T | undefined;
  /** No data at all yet for any key: show a skeleton. */
  loading: boolean;
  /** Showing the previous key's data while the new key loads: dim it. */
  stale: boolean;
  error: unknown;
}

export function useApi<T>(key: string, fetcher: () => Promise<T>): ApiState<T> {
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });
  const [state, setState] = useState<{ key: string; data?: T; error?: unknown }>(() => ({ key, data: cacheGet<T>(key) }));

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then(
      (d) => { cacheSet(key, d); if (!cancelled) setState({ key, data: d }); },
      (e) => { if (!cancelled) setState({ key, data: cacheGet<T>(key), error: e }); },
    );
    return () => { cancelled = true; };
  }, [key]);

  const cached = cacheGet<T>(key);
  const current = state.key === key;
  const data = current ? state.data ?? cached : cached ?? state.data;
  return {
    data,
    loading: data === undefined && !(current && state.error),
    stale: !current && cached === undefined && state.data !== undefined,
    error: current && data === undefined ? state.error : undefined,
  };
}

const inflight = new Set<string>();

/** Warm the cache (e.g. on hover) so the next page renders instantly. Errors are ignored. */
export function prefetch<T>(key: string, fetcher: () => Promise<T>) {
  if (store.has(key) || inflight.has(key)) return;
  inflight.add(key);
  fetcher().then((d) => store.set(key, d), () => {}).finally(() => inflight.delete(key));
}
