import { useCallback, useEffect, useRef, useState } from 'react';
import { CITIES } from '../lib/cities';
import {
  forecastUrl,
  parseWeather,
  WEATHER_CACHE_KEY,
  WEATHER_CACHE_MS,
  WEATHER_REFRESH_MS,
  type WeatherByCity,
} from '../lib/weather';

type WeatherStatus = 'loading' | 'ready' | 'error';

interface CachedWeather {
  version: 3;
  savedAt: number;
  observations: WeatherByCity;
}

function readCache(): CachedWeather | null {
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<CachedWeather>;
    if (value.version !== 3 || typeof value.savedAt !== 'number'
      || !Number.isFinite(value.savedAt) || value.savedAt > Date.now()
      || !value.observations || typeof value.observations !== 'object') return null;
    if (Object.keys(value.observations).length === 0) return null;
    return value as CachedWeather;
  } catch {
    return null;
  }
}

export function useWeather() {
  const [cache, setCache] = useState<CachedWeather | null>(readCache);
  const cacheRef = useRef(cache);
  const [status, setStatus] = useState<WeatherStatus>(cache ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { cacheRef.current = cache; }, [cache]);

  const refresh = useCallback(() => setReloadKey((previous) => previous + 1), []);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const controller = new AbortController();

    const load = async (force = false) => {
      const previous = cacheRef.current;
      if (inFlight || (!force && previous && Date.now() - previous.savedAt < WEATHER_CACHE_MS)) {
        return;
      }
      inFlight = true;
      if (!previous) setStatus('loading');
      try {
        const response = await fetch(forecastUrl(CITIES), { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const observations = parseWeather(await response.json() as unknown, CITIES);
        if (disposed) return;
        const updated = { version: 3 as const, observations, savedAt: Date.now() };
        cacheRef.current = updated;
        setCache(updated);
        setStatus('ready');
        setError(null);
        try { sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(updated)); } catch { /* optional cache */ }
      } catch (cause) {
        if (disposed || controller.signal.aborted) return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : '天気情報を取得できませんでした');
      } finally {
        inFlight = false;
      }
    };

    void load(reloadKey > 0);
    const interval = window.setInterval(() => { void load(); }, WEATHER_REFRESH_MS);
    const onFocus = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [reloadKey]);

  const isStale = cache ? Date.now() - cache.savedAt >= WEATHER_REFRESH_MS : false;
  return {
    observations: cache?.observations ?? {},
    fetchedAt: cache?.savedAt ?? null,
    status,
    error,
    isStale,
    refresh,
  };
}
