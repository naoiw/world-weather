import { useCallback, useEffect, useRef, useState } from 'react';
import EarthGlobe, { type EarthGlobeHandle } from './components/EarthGlobe';
import { CITIES, cityLocalTime } from './lib/cities';
import { weatherDescription, windDirectionLabel } from './lib/weather';
import { useWeather } from './hooks/useWeather';

const formatUtc = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);

export default function App() {
  const globeRef = useRef<EarthGlobeHandle>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [selectedCityId, setSelectedCityId] = useState('tokyo');
  const { observations, fetchedAt, error: weatherError, isStale, refresh } = useWeather();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleReady = useCallback(() => setIsReady(true), []);
  const handleSelectCity = useCallback((cityId: string) => {
    setSelectedCityId(cityId);
    setAutoRotate(false);
    globeRef.current?.focusCity(cityId);
  }, []);

  // EarthGlobe starts aligned to Tokyo; no startup focus animation is needed.
  // A focusCity() call here would otherwise disable OrbitControls.autoRotate.
  const handleError = useCallback((message: string) => {
    setError(message);
    setIsReady(false);
  }, []);
  const selectedCity = CITIES.find((city) => city.id === selectedCityId) ?? CITIES[0];
  const selectedWeather = observations[selectedCity.id];
  const condition = selectedWeather ? weatherDescription(selectedWeather.code) : null;
  const fetchedLabel = fetchedAt
    ? new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
    }).format(fetchedAt)
    : '—';

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◎</span>
          <span>WORLD <strong>WEATHER</strong></span>
        </div>
        <div className="topbar-right">
          <span className="topbar-stage">LIVE WEATHER · {CITIES.length} CITIES</span>
          <span className="topbar-divider" />
          <span className="utc-time"><span className="live-dot" /> {formatUtc(now)} UTC</span>
        </div>
      </header>

      <main className="main-stage">
        <section className="globe-stage" aria-label="インタラクティブな地球儀と世界の天気">
          <div className="globe-backlight" aria-hidden="true" />
          <div className="orbit-decoration orbit-decoration-a" aria-hidden="true" />
          <div className="orbit-decoration orbit-decoration-b" aria-hidden="true" />
          <EarthGlobe
            ref={globeRef}
            autoRotate={autoRotate}
            selectedCityId={selectedCityId}
            onSelectCity={handleSelectCity}
            onReady={handleReady}
            onError={handleError}
          />
          {error && <div className="globe-message" role="alert">{error}</div>}
          {!isReady && !error && <div className="globe-message">地球儀を読み込んでいます…</div>}
        </section>

        <aside className="control-panel" aria-label="都市情報と地球儀の操作">
          <button
            type="button"
            className={`rotation-toggle ${autoRotate ? 'active' : ''}`}
            aria-pressed={autoRotate}
            disabled={!isReady}
            onClick={() => setAutoRotate((previous) => !previous)}
          >
            <span><span className="rotation-icon">{autoRotate ? 'Ⅱ' : '▶'}</span> AUTO ROTATE</span>
            <span className="toggle-track"><span /></span>
          </button>
          <div className="city-feature">
            <div className="city-feature-eyebrow">SELECTED CITY / LIVE</div>
            <label className="city-select-label" htmlFor="city-picker">表示都市</label>
            <select id="city-picker" className="city-picker" value={selectedCityId}
              onChange={(event) => handleSelectCity(event.target.value)}>
              {CITIES.map((city) => <option key={city.id} value={city.id}>{city.name} · {city.country}</option>)}
            </select>
            <p className="city-focus-note">都市を選択すると、その経度が正面へ移動します。</p>
            <div className="city-feature-time">{cityLocalTime(selectedCity, now)} <span>LOCAL TIME</span></div>
            <div className="city-feature-temperature">
              <strong>{selectedWeather ? `${selectedWeather.temperature.toFixed(1)}°` : '—°'}</strong>
              <span className="city-feature-symbol" aria-hidden="true">{condition?.symbol ?? '·'}</span>
            </div>
            <div className="city-feature-meta">
              <span>{condition?.label ?? '天気データなし'}</span>
              <span>湿度 {selectedWeather ? `${Math.round(selectedWeather.humidity)}%` : '—'}</span>
            </div>
            <dl className="weather-details-grid" aria-label="詳細な気象情報">
              <div>
                <dt>体感温度</dt>
                <dd>{selectedWeather?.apparentTemperature == null
                  ? '—' : `${selectedWeather.apparentTemperature.toFixed(1)} °C`}</dd>
              </div>
              <div>
                <dt>降水確率 <span className="weather-metric-tag">1時間予報</span></dt>
                <dd>{selectedWeather?.precipitationProbability == null
                  ? '—' : `${Math.round(selectedWeather.precipitationProbability)} %`}</dd>
              </div>
              <div>
                <dt>風速</dt>
                <dd>{selectedWeather?.windSpeed == null
                  ? '—' : `${selectedWeather.windSpeed.toFixed(1)} km/h`}</dd>
              </div>
              <div>
                <dt>風向</dt>
                <dd>{windDirectionLabel(selectedWeather?.windDirection ?? null)}</dd>
              </div>
              <div>
                <dt>降水量</dt>
                <dd>{selectedWeather?.precipitation == null
                  ? '—' : `${selectedWeather.precipitation.toFixed(1)} mm`}</dd>
              </div>
              <div>
                <dt>雲量</dt>
                <dd>{selectedWeather?.cloudCover == null
                  ? '—' : `${Math.round(selectedWeather.cloudCover)} %`}</dd>
              </div>
            </dl>
            <p className="weather-metric-note">降水確率は現在の時間帯を含む1時間の予報値です。</p>
            {selectedWeather && (
              <div className="city-feature-observed">
                観測時刻：{cityLocalTime(selectedCity, new Date(selectedWeather.observedAt))}
                {' · '}{selectedWeather.isDay ? '現地の昼' : '現地の夜'}
              </div>
            )}
          </div>
          <div className="weather-controls" aria-label="天気データの更新">
            <div className="data-update">
              <span>最終取得：{fetchedLabel} JST{isStale ? ' · 古いデータ' : ''}</span>
              <button type="button" onClick={refresh} aria-label="天気情報を再取得">↻ 更新</button>
            </div>
            {weatherError && <p className="weather-alert" role="status">{weatherError}</p>}
          </div>
        </aside>
      </main>

      <footer className="footer">
        <span>WORLD WEATHER</span>
        <span className="footer-links">
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">WEATHER: OPEN-METEO ↗</a>
          <span className="footer-separator">·</span>
          <span>3D: THREE.JS</span>
          <span className="footer-separator">·</span>
          <span>EARTH: THREE-GLOBE</span>
          <span className="footer-separator">·</span>
          <a href="https://github.com/naoiw/world-weather" target="_blank" rel="noreferrer">GITHUB ↗</a>
        </span>
      </footer>
    </div>
  );
}
