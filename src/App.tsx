import { useCallback, useEffect, useRef, useState } from 'react';
import EarthGlobe, { type EarthGlobeHandle } from './components/EarthGlobe';

const formatUtc = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

export default function App() {
  const globeRef = useRef<EarthGlobeHandle>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utc, setUtc] = useState(() => formatUtc(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setUtc(formatUtc(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleReady = useCallback(() => setIsReady(true), []);
  const handleError = useCallback((message: string) => {
    setError(message);
    setIsReady(false);
  }, []);

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
          <span className="topbar-stage">INTERACTIVE GLOBE · 01</span>
          <span className="topbar-divider" />
          <span className="utc-time"><span className="live-dot" /> {utc} UTC</span>
        </div>
      </header>

      <main className="main-stage">
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-line" /> EARTH VIEW / 001</div>
          <h1 id="page-title">World<br /><span>Weather.</span></h1>
          <p>世界の天気を、地球儀から。</p>
          <p className="intro-note">まずは地球を自由に回して、世界を見渡す。</p>
          <div className="stage-status">
            <span className="status-pin" />
            <div>
              <span className="status-label">CURRENT STAGE</span>
              <strong>地球儀の表示・操作</strong>
            </div>
          </div>
        </section>

        <section className="globe-stage" aria-label="インタラクティブな地球儀">
          <div className="globe-backlight" aria-hidden="true" />
          <div className="orbit-decoration orbit-decoration-a" aria-hidden="true" />
          <div className="orbit-decoration orbit-decoration-b" aria-hidden="true" />
          <EarthGlobe
            ref={globeRef}
            autoRotate={autoRotate}
            onReady={handleReady}
            onError={handleError}
          />

          {error && <div className="globe-message" role="alert">{error}</div>}
          {!isReady && !error && <div className="globe-message">地球儀を読み込んでいます…</div>}

          <div className="globe-caption">
            <span className="caption-line" />
            <span>PLANET EARTH <small>/ 3D VIEW</small></span>
          </div>
        </section>

        <aside className="control-panel" aria-label="地球儀の操作">
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
            <button type="button" aria-label="拡大" title="拡大" disabled={!isReady} onClick={() => globeRef.current?.zoomIn()}>+</button>
            <button type="button" aria-label="縮小" title="縮小" disabled={!isReady} onClick={() => globeRef.current?.zoomOut()}>−</button>
            <button type="button" className="reset-button" disabled={!isReady} onClick={() => globeRef.current?.resetView()}>↺ <span>RESET</span></button>
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
          <p className="control-footnote">天気情報・都市表示・昼夜連動は次の段階で追加します。</p>
        </aside>
      </main>

      <footer className="footer">
        <span>WORLD WEATHER <span className="footer-muted">/ EXPERIMENTAL BUILD 0.1</span></span>
        <span className="footer-links">
          <a href="https://github.com/naoiw/world-weather" target="_blank" rel="noreferrer">GITHUB ↗</a>
          <span className="footer-separator">·</span>
          <span>3D: THREE.JS</span>
          <span className="footer-separator">·</span>
          <span>EARTH TEXTURE: THREE-GLOBE</span>
        </span>
      </footer>
    </div>
  );
}
