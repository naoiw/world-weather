import assert from 'node:assert/strict';
import test from 'node:test';
import { CITIES } from '../src/lib/cities.ts';
import {
  forecastUrl, parseWeather, hourlyProbability, windDirectionLabel, weatherDescription,
} from '../src/lib/weather.ts';

test('all cities use the same Forecast API request and GMT timestamp', () => {
  const url = new URL(forecastUrl(CITIES));
  assert.equal(url.pathname, '/v1/forecast');
  assert.equal(url.searchParams.get('latitude')?.split(',').length, CITIES.length);
  assert.equal(url.searchParams.get('longitude')?.split(',').length, CITIES.length);
  assert.equal(url.searchParams.get('timezone'), 'GMT');
  const current = url.searchParams.get('current')?.split(',') ?? [];
  for (const variable of [
    'temperature_2m', 'relative_humidity_2m', 'weather_code', 'is_day',
    'apparent_temperature', 'wind_speed_10m', 'wind_direction_10m',
    'precipitation', 'cloud_cover',
  ]) assert.ok(current.includes(variable), `missing current variable: ${variable}`);
  assert.equal(url.searchParams.get('hourly'), 'precipitation_probability');
  assert.equal(url.searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(url.searchParams.get('precipitation_unit'), 'mm');
});

test('parseWeather maps multiple current values and same-hour probability correctly', () => {
  const data = CITIES.map((_, i) => ({
    current: {
      time: '2026-11-04T10:15', temperature_2m: 12 + i, relative_humidity_2m: 53,
      weather_code: 2, is_day: 1, apparent_temperature: 11 + i,
      wind_speed_10m: 13.6, wind_direction_10m: 225, precipitation: 0,
      cloud_cover: 85,
    },
    hourly: {
      time: ['2026-11-04T09:00', '2026-11-04T10:00', '2026-11-04T11:00'],
      precipitation_probability: [95, 40, 5],
    },
  }));
  const result = parseWeather(data, CITIES);
  assert.equal(result.tokyo.temperature, 12);
  assert.equal(CITIES.length, 20);
  assert.equal(result.auckland.temperature, 12 + CITIES.findIndex((city) => city.id === 'auckland'));
  for (const id of ['bangkok', 'moscow', 'brasilia', 'manila']) {
    assert.equal(result[id].temperature, 12 + CITIES.findIndex((city) => city.id === id));
    assert.equal(result[id].precipitationProbability, 40);
  }
  assert.equal(result.tokyo.observedAt, Date.parse('2026-11-04T10:15:00Z'));
  assert.equal(result.tokyo.apparentTemperature, 11);
  assert.equal(result.tokyo.windSpeed, 13.6);
  assert.equal(result.tokyo.windDirection, 225);
  assert.equal(result.tokyo.precipitation, 0);
  assert.equal(result.tokyo.cloudCover, 85);
  assert.equal(result.tokyo.precipitationProbability, 40);
});

test('zero values are displayed as zero, missing optional values are null', () => {
  const result = parseWeather([
    { current: {
      time: '2026-11-04T10:15', temperature_2m: 0, relative_humidity_2m: 0,
      weather_code: 0, is_day: 0, apparent_temperature: 0, wind_speed_10m: 0,
      wind_direction_10m: 360, precipitation: 0, cloud_cover: 0,
    }, hourly: {
      time: ['2026-11-04T10:00'],
      precipitation_probability: [0],
    } },
    { current: {
      time: '2026-11-04T10:15', temperature_2m: 18, relative_humidity_2m: 70,
      weather_code: 3, is_day: 0,
    } },
  ], CITIES.slice(0, 2));
  assert.equal(result.tokyo.apparentTemperature, 0);
  assert.equal(result.tokyo.windSpeed, 0);
  assert.equal(result.tokyo.windDirection, 360);
  assert.equal(result.tokyo.precipitation, 0);
  assert.equal(result.tokyo.precipitationProbability, 0);
  assert.equal(result.seoul.apparentTemperature, null);
  assert.equal(result.seoul.windSpeed, null);
  assert.equal(result.seoul.windDirection, null);
  assert.equal(result.seoul.precipitationProbability, null);
});

test('probability uses exact UTC hour, never adjacent hours or invalid values', () => {
  const hourly = {
    time: ['2026-11-04T23:00', '2026-11-05T00:00'],
    precipitation_probability: [37, 90],
  };
  assert.equal(hourlyProbability(hourly, '2026-11-04T23:45'), 37);
  assert.equal(hourlyProbability(hourly, '2026-11-05T00:15'), 90);
  assert.equal(hourlyProbability(hourly, '2026-11-05T01:00'), null);
  assert.equal(hourlyProbability({
    time: ['2026-11-04T10:00'], precipitation_probability: [null],
  }, '2026-11-04T10:15'), null);
  assert.equal(hourlyProbability({
    time: ['2026-11-04T10:00'], precipitation_probability: [105],
  }, '2026-11-04T10:15'), null);
});

test('invalid optional fields never cause fake values, valid base weather remains', () => {
  const result = parseWeather([{
    current: {
      time: '2026-11-04T10:15', temperature_2m: 18,
      relative_humidity_2m: 70, weather_code: 3, is_day: 0,
      apparent_temperature: '10', wind_speed_10m: -3, wind_direction_10m: 999,
      precipitation: -1, cloud_cover: 150,
    },
  }], [CITIES[0]]);
  assert.equal(result.tokyo.temperature, 18);
  assert.equal(result.tokyo.apparentTemperature, null);
  assert.equal(result.tokyo.windSpeed, null);
  assert.equal(result.tokyo.windDirection, null);
  assert.equal(result.tokyo.precipitation, null);
  assert.equal(result.tokyo.cloudCover, null);
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

test('compass labels follow meteorological wind-from direction', () => {
  assert.equal(windDirectionLabel(0), '北');
  assert.equal(windDirectionLabel(45), '北東');
  assert.equal(windDirectionLabel(225), '南西');
  assert.equal(windDirectionLabel(360), '北');
  assert.equal(windDirectionLabel(null), '—');
  assert.equal(windDirectionLabel(-10), '—');
});

test('weather code labels are explicit and unknown values are not guessed', () => {
  assert.equal(weatherDescription(0).label, '快晴');
  assert.equal(weatherDescription(95).label, '雷雨');
  assert.equal(weatherDescription(999).label, '不明');
});
