export interface City {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

/** Locations are fixed; weather API grid cells may differ slightly from coordinates. */
export const CITIES: readonly City[] = [
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timeZone: 'Asia/Tokyo' },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.9780, timeZone: 'Asia/Seoul' },
  { id: 'beijing', name: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timeZone: 'Asia/Shanghai' },
  { id: 'taipei', name: 'Taipei', country: 'Taiwan', latitude: 25.0330, longitude: 121.5654, timeZone: 'Asia/Taipei' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, timeZone: 'Asia/Hong_Kong' },
  { id: 'manila', name: 'Manila', country: 'Philippines', latitude: 14.5995, longitude: 120.9842, timeZone: 'Asia/Manila' },
  { id: 'hagatna', name: 'Hagåtña', country: 'Guam', latitude: 13.4757, longitude: 144.7489, timeZone: 'Pacific/Guam' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timeZone: 'Asia/Singapore' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, timeZone: 'Asia/Bangkok' },
  { id: 'delhi', name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timeZone: 'Asia/Kolkata' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timeZone: 'Asia/Dubai' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', latitude: 55.7558, longitude: 37.6173, timeZone: 'Europe/Moscow' },
  { id: 'london', name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' },
  { id: 'paris', name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris' },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timeZone: 'Africa/Cairo' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', latitude: -26.2041, longitude: 28.0473, timeZone: 'Africa/Johannesburg' },
  { id: 'new-york', name: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, timeZone: 'America/New_York' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'USA', latitude: 34.0522, longitude: -118.2437, timeZone: 'America/Los_Angeles' },
  { id: 'honolulu', name: 'Honolulu', country: 'Hawaii, USA', latitude: 21.3099, longitude: -157.8581, timeZone: 'Pacific/Honolulu' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, timeZone: 'America/Mexico_City' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timeZone: 'America/Sao_Paulo' },
  { id: 'brasilia', name: 'Brasília', country: 'Brazil', latitude: -15.7939, longitude: -47.8828, timeZone: 'America/Sao_Paulo' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', latitude: -36.8485, longitude: 174.7633, timeZone: 'Pacific/Auckland' },
];

export function cityLocalTime(city: City, date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: city.timeZone,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
