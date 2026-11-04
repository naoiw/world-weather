import type { City } from './cities';

export interface WeatherObservation {
  temperature: number;
  humidity: number;
  code: number;
  isDay: boolean;
  observedAt: number;
}

export type WeatherByCity = Record<string, WeatherObservation>;

interface ForecastCurrent {
  time?: unknown;
  temperature_2m?: unknown;
  relative_humidity_2m?: unknown;
  weather_code?: unknown;
  is_day?: unknown;
}

interface ForecastResponse {
  current?: ForecastCurrent;
}

export const WEATHER_CACHE_MS = 20 * 60 * 1000;
export const WEATHER_REFRESH_MS = 30 * 60 * 1000;
export const WEATHER_CACHE_KEY = 'world-weather-open-meteo-v1';

export function forecastUrl(cities: readonly City[]): string {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', cities.map((city) => city.latitude).join(','));
  url.searchParams.set('longitude', cities.map((city) => city.longitude).join(','));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,is_day');
  url.searchParams.set('timezone', 'GMT');
  url.searchParams.set('forecast_days', '1');
  return url.toString();
}

export function parseWeather(payload: unknown, cities: readonly City[]): WeatherByCity {
  const list: unknown[] = Array.isArray(payload) ? payload : [payload];
  if (list.length !== cities.length) throw new Error('都市数とAPIの応答数が一致しません');
  const byCity: WeatherByCity = {};
  for (let index = 0; index < cities.length; index += 1) {
    const entry = list[index] as ForecastResponse | null;
    const current = entry?.current;
    if (!current) continue;
    const { temperature_2m, relative_humidity_2m, weather_code, is_day, time } = current;
    // Do not substitute invented weather data for missing or nonnumeric readings.
    if (![temperature_2m, relative_humidity_2m, weather_code].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    )) continue;
    if (is_day !== 0 && is_day !== 1) continue;
    if (typeof time !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(time)) continue;
    const observedAt = Date.parse(time + 'Z'); // GMT requested; raw ISO is timezone-less.
    if (!Number.isFinite(observedAt)) continue;
    byCity[cities[index].id] = {
      temperature: temperature_2m as number,
      humidity: relative_humidity_2m as number,
      code: weather_code as number,
      isDay: is_day === 1,
      observedAt,
    };
  }
  if (Object.keys(byCity).length === 0) throw new Error('有効な天気データがありません');
  return byCity;
}

export function weatherDescription(code: number): { label: string; symbol: string } {
  if (code === 0) return { label: '快晴', symbol: '☀' };
  if (code === 1 || code === 2) return { label: '晴れ時々曇り', symbol: '⛅' };
  if (code === 3) return { label: '曇り', symbol: '☁' };
  if (code === 45 || code === 48) return { label: '霧', symbol: '≋' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: '霧雨', symbol: '☂' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: '雨', symbol: '☂' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '雪', symbol: '❄' };
  if ([95, 96, 99].includes(code)) return { label: '雷雨', symbol: 'ϟ' };
  return { label: '不明', symbol: '–' };
}
