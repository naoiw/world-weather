import type { City } from './cities';

/** Weather values are model estimates, not direct observations at each city. */
export interface WeatherObservation {
  temperature: number;
  humidity: number;
  code: number;
  isDay: boolean;
  observedAt: number;
  apparentTemperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  precipitationProbability: number | null;
}

export type WeatherByCity = Record<string, WeatherObservation>;

interface ForecastCurrent {
  time?: unknown;
  temperature_2m?: unknown;
  relative_humidity_2m?: unknown;
  weather_code?: unknown;
  is_day?: unknown;
  apparent_temperature?: unknown;
  wind_speed_10m?: unknown;
  wind_direction_10m?: unknown;
  precipitation?: unknown;
  cloud_cover?: unknown;
}

interface ForecastHourly {
  time?: unknown;
  precipitation_probability?: unknown;
}

interface ForecastResponse {
  current?: ForecastCurrent;
  hourly?: ForecastHourly;
}

export const WEATHER_CACHE_MS = 20 * 60 * 1000;
export const WEATHER_REFRESH_MS = 30 * 60 * 1000;
// The response schema changed: invalidate previously cached entries on deployment.
export const WEATHER_CACHE_KEY = 'world-weather-open-meteo-v2';

export function forecastUrl(cities: readonly City[]): string {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', cities.map((city) => city.latitude).join(','));
  url.searchParams.set('longitude', cities.map((city) => city.longitude).join(','));
  url.searchParams.set('current',
    'temperature_2m,relative_humidity_2m,weather_code,is_day,' +
    'apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover');
  // Precipitation probability is hourly-only; get it in the SAME Forecast API request.
  url.searchParams.set('hourly', 'precipitation_probability');
  url.searchParams.set('timezone', 'GMT');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('precipitation_unit', 'mm');
  return url.toString();
}

function numericOrNull(value: unknown, min = -Infinity, max = Infinity): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value : null;
}

/** Match the exact UTC hour of current conditions. Never substitute an adjacent hour. */
export function hourlyProbability(hourly: ForecastHourly | undefined, currentTime: string): number | null {
  if (!Array.isArray(hourly?.time) || !Array.isArray(hourly.precipitation_probability)) {
    return null;
  }
  const hour = currentTime.slice(0, 13);
  const index = hourly.time.findIndex((time) => typeof time === 'string' && time.slice(0, 13) === hour);
  if (index === -1) return null;
  return numericOrNull(hourly.precipitation_probability[index], 0, 100);
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
    const temperature = numericOrNull(temperature_2m);
    const humidity = numericOrNull(relative_humidity_2m, 0, 100);
    const code = numericOrNull(weather_code, 0);
    if (temperature === null || humidity === null || code === null || !Number.isInteger(code)) continue;
    if (is_day !== 0 && is_day !== 1) continue;
    if (typeof time !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(time)) continue;
    const observedAt = Date.parse(time + 'Z'); // GMT requested; API ISO string has no offset.
    if (!Number.isFinite(observedAt)) continue;

    byCity[cities[index].id] = {
      temperature,
      humidity,
      code,
      isDay: is_day === 1,
      observedAt,
      apparentTemperature: numericOrNull(current.apparent_temperature),
      windSpeed: numericOrNull(current.wind_speed_10m, 0),
      windDirection: numericOrNull(current.wind_direction_10m, 0, 360),
      precipitation: numericOrNull(current.precipitation, 0),
      cloudCover: numericOrNull(current.cloud_cover, 0, 100),
      precipitationProbability: hourlyProbability(entry?.hourly, time),
    };
  }
  if (Object.keys(byCity).length === 0) throw new Error('有効な天気データがありません');
  return byCity;
}

/** Meteorological wind direction is where the wind comes FROM, clockwise from north. */
export function windDirectionLabel(degrees: number | null): string {
  if (degrees === null || !Number.isFinite(degrees) || degrees < 0 || degrees > 360) return '—';
  const names = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  return names[Math.round(degrees / 45) % 8];
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
