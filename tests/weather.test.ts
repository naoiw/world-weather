import assert from 'node:assert/strict';
import test from 'node:test';
import { CITIES } from '../src/lib/cities.ts';
import { forecastUrl, parseWeather, weatherDescription } from '../src/lib/weather.ts';

test('request batches the cities with current GMT measurements', () => {
  const url = new URL(forecastUrl(CITIES));
  assert.equal(url.searchParams.get('latitude')?.split(',').length, CITIES.length);
  assert.equal(url.searchParams.get('longitude')?.split(',').length, CITIES.length);
  assert.equal(url.searchParams.get('timezone'), 'GMT');
});

test('parseWeather maps all positions to their city ids', () => {
  const data = CITIES.map((_, i) => ({
    current: { time: '2026-11-04T10:15', temperature_2m: 12 + i,
      relative_humidity_2m: 53, weather_code: 2, is_day: 1 },
  }));
  const result = parseWeather(data, CITIES);
  assert.equal(result.tokyo.temperature, 12);
  assert.equal(result.auckland.temperature, 12 + CITIES.length - 1);
  assert.equal(result.tokyo.observedAt, Date.parse('2026-11-04T10:15:00Z'));
});

test('a missing city reading is omitted instead of invented', () => {
  const data = CITIES.map(() => ({ current: { time: '2026-11-04T10:15',
    temperature_2m: 18, relative_humidity_2m: 70, weather_code: 3, is_day: 0 } }));
  data[0].current.temperature_2m = Number.NaN;
  const result = parseWeather(data, CITIES);
  assert.equal(result.tokyo, undefined);
  assert.ok(result.seoul);
});

test('invalid count and empty weather data fail with errors', () => {
  assert.throws(() => parseWeather([], CITIES));
  assert.throws(() => parseWeather([{}], [CITIES[0]]));
});

test('weather code labels are explicit and unknown values are not guessed', () => {
  assert.equal(weatherDescription(0).label, '快晴');
  assert.equal(weatherDescription(95).label, '雷雨');
  assert.equal(weatherDescription(999).label, '不明');
});
