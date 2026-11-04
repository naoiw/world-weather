import { useCallback, useEffect, useRef, useState } from 'react';
import EarthGlobe, { type EarthGlobeHandle } from './components/EarthGlobe';
import { CITIES, cityLocalTime } from './lib/cities';
import { weatherDescription } from './lib/weather';
import { useWeather } from './hooks/useWeather';

const formatUtc = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);

export default function App() {
  const globeRef = useRef<EarthGlobeHandle>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [selectedCityId, setSelectedCityId] = useState('tokyo');
  const { observations, fetchedAt, status, error: weatherError, isStale, refresh } = useWeather();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleReady = useCallback(() => setIsReady(true), []);
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
          <span className="topbar-stage">LIVE WEATHER · 16 CITIES</span>
          <span className="topbar-divider" />
          <span className="utc-time"><span className="live-dot" /> {formatUtc(now)} UTC</span>
        </div>
      </header>

      <main className="main-stage">
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-line" /> WORLD VIEW / 002</div>
          <h1 id="page-title">World<br /><span>Weather.</span></h1>
          <p>世界の天気を、地球儀から。</p>
          <p className="intro-note">地球を回すと、手前の都市の天気が見えてきます。</p>
          <div className="stage-status">
            <span className="status-pin" />
            <div>
              <span className="status-label">WEATHER STATUS</span>
              <strong>{status === 'loading' ? '天気情報を取得中'
                : status === 'error' ? '天気情報の更新に失敗'
                  : isStale ? '保存済みデータを表示中' : '天気情報を表示中'}</strong>
            </div>
          </div>
          <div className="data-update">
            <span>最終取得：{fetchedLabel} JST{isStale ? ' · 古いデータ' : ''}</span>
            <button type="button" onClick={refresh} aria-label="天気情報を再取得">↻ 更新</button>
          </div>
          {weatherError && <p className="weather-alert" role="status">{weatherError}</p>}
        </section>

        <section className="globe-stage" aria-label="インタラクティブな地球儀と世界の天気">
          <div className="globe-backlight" aria-hidden="true" />
          <div className="orbit-decoration orbit-decoration-a" aria-hidden="true" />
          <div className="orbit-decoration orbit-decoration-b" aria-hidden="true" />
          <EarthGlobe
            ref={globeRef}
            autoRotate={autoRotate}
            selectedCityId={selectedCityId}
            weather={observations}
            now={now}
            onSelectCity={setSelectedCityId}
            onReady={handleReady}
            onError={handleError}
          />
          {error && <div className="globe-message" role="alert">{error}</div>}
          {!isReady && !error && <div className="globe-message">地球儀を読み込んでいます…</div>}
          <div className="globe-caption">
            <span className="caption-line" />
            <span>PLANET EARTH <small>/ SOLAR DAY · NIGHT</small></span>
          </div>
        </section>

        <aside className="control-panel" aria-label="都市情報と地球儀の操作">
          <div className="city-feature">
            <div className="city-feature-eyebrow">SELECTED CITY / LIVE</div>
            <label className="city-select-label" htmlFor="city-picker">表示都市</label>
            <select id="city-picker" className="city-picker" value={selectedCityId}
              onChange={(event) => setSelectedCityId(event.target.value)}>
              {CITIES.map((city) => <option key={city.id} value={city.id}>{city.name} · {city.country}</option>)}
            </select>
            <div className="city-feature-time">{cityLocalTime(selectedCity, now)} <span>LOCAL TIME</span></div>
            <div className="city-feature-temperature">
              <strong>{selectedWeather ? `${selectedWeather.temperature.toFixed(1)}°` : '—°'}</strong>
              <span className="city-feature-symbol" aria-hidden="true">{condition?.symbol ?? '·'}</span>
            </div>
            <div className="city-feature-meta">
              <span>{condition?.label ?? '天気データなし'}</span>
              <span>湿度 {selectedWeather ? `${Math.round(selectedWeather.humidity)}%` : '—'}</span>
            </div>
            {selectedWeather && (
              <div className="city-feature-observed">
                観測時刻：{cityLocalTime(selectedCity, new Date(selectedWeather.observedAt))}
                {' · '}{selectedWeather.isDay ? '現地の昼' : '現地の夜'}
              </div>
            )}
          </div>
          <div className="panel-heading">NAVIGATION <span>01 — 03</span></div>
          <div className="guide">
            <div className="guide-symbol">↔</div>
            <div>
              <strong>DRAG TO ROTATE</strong>
              <p>ドラッグ・スワイプで左右に回転</p>
            </div>
          </div>
          <div className="guide">
            <div className="guide-symbol">⊕</div>
            <div>
              <strong>ZOOM</strong>
              <p>ホイール・ピンチで拡大縮小</p>
            </div>
          </div>
          <div className="control-divider" />
          <div className="control-label">VIEW CONTROLS</div>
          <div className="zoom-controls">
            <button type="button" aria-label="拡大" title="拡大" disabled={!isReady}
              onClick={() => globeRef.current?.zoomIn()}>+</button>
            <button type="button" aria-label="縮小" title="縮小" disabled={!isReady}
              onClick={() => globeRef.current?.zoomOut()}>−</button>
            <button type="button" className="reset-button" disabled={!isReady}
              onClick={() => globeRef.current?.resetView()}>↺ <span>RESET</span></button>
          </div>
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
          <p className="control-footnote">
            地球表面の昼夜は現在のUTCと太陽位置から計算しています。
            天気はOpen-Meteoの気象モデルに基づく値です。
          </p>
        </aside>
      </main>

      <footer className="footer">
        <span>WORLD WEATHER <span className="footer-muted">/ EXPERIMENTAL BUILD 0.2</span></span>
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
