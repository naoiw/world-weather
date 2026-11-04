import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CITIES, cityLocalTime, type City } from '../lib/cities';
import { geoToCartesian, isSurfaceVisible, subsolarPoint } from '../lib/astronomy';
import { weatherDescription, type WeatherByCity } from '../lib/weather';

export interface EarthGlobeHandle {
  resetView(): void;
  zoomIn(): void;
  zoomOut(): void;
}

interface EarthGlobeProps {
  autoRotate: boolean;
  selectedCityId: string;
  weather: WeatherByCity;
  now: Date;
  onSelectCity(cityId: string): void;
  onReady(): void;
  onError(message: string): void;
}

interface CityPin {
  id: string;
  px: number;
  py: number;
  cardX: number;
  cardY: number;
  side: 'left' | 'right';
  distance: number;
}

const RADIUS = 1.55;
const INITIAL_DISTANCE = 5.2;
const IMAGE_BASE = 'https://unpkg.com/three-globe@2.45.2/example/img/';
const DAY_IMAGE = IMAGE_BASE + 'earth-blue-marble.jpg';
const NIGHT_IMAGE = IMAGE_BASE + 'earth-night.jpg';

function createStars(): THREE.Points {
  const positions: number[] = [];
  let seed = 41839;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1100; i += 1) {
    const y = random() * 2 - 1;
    const a = random() * 2 * Math.PI;
    const radius = 22 + random() * 20;
    const p = Math.sqrt(1 - y * y);
    positions.push(radius * p * Math.cos(a), radius * y, radius * p * Math.sin(a));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xa5c8df,
    size: 0.09,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
  }));
}

function createEarthMaterial(): THREE.ShaderMaterial {
  const position = subsolarPoint(new Date());
  const [x, y, z] = geoToCartesian(position.latitude, position.longitude);
  return new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: null },
      nightMap: { value: null },
      hasDayMap: { value: false },
      hasNightMap: { value: false },
      sunDirection: { value: new THREE.Vector3(x, y, z) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vSphereNormal;
      void main() {
        vUv = uv;
        vSphereNormal = normalize(normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform bool hasDayMap;
      uniform bool hasNightMap;
      uniform vec3 sunDirection;
      varying vec2 vUv;
      varying vec3 vSphereNormal;
      void main() {
        float light = dot(normalize(vSphereNormal), normalize(sunDirection));
        float dayAmount = smoothstep(-0.08, 0.14, light);
        vec3 dayColor = hasDayMap ? texture2D(dayMap, vUv).rgb : vec3(0.13, 0.34, 0.55);
        vec3 nightColor = hasNightMap ? texture2D(nightMap, vUv).rgb : vec3(0.015, 0.033, 0.065);
        vec3 sunlit = dayColor * (0.68 + 0.46 * max(light, 0.0));
        vec3 dark = nightColor * 0.88 + vec3(0.008, 0.014, 0.025);
        vec3 finalColor = mix(dark, sunlit, dayAmount);
        gl_FragColor = vec4(finalColor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createGlow(): { mesh: THREE.Mesh; geometry: THREE.SphereGeometry; material: THREE.ShaderMaterial } {
  const geometry = new THREE.SphereGeometry(RADIUS + 0.15, 96, 64);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { glowColor: { value: new THREE.Color('#36b8da') } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        float halo = pow(1.0 - abs(vNormal.z), 3.2);
        gl_FragColor = vec4(glowColor, halo * 0.30);
      }
    `,
  });
  return { mesh: new THREE.Mesh(geometry, material), geometry, material };
}

function calculatePins(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  selectedCityId: string,
): CityPin[] {
  const cameraPoint = camera.position.toArray();
  const eligible = CITIES.flatMap((city) => {
    const xyz = geoToCartesian(city.latitude, city.longitude, RADIUS + 0.008);
    if (!isSurfaceVisible(xyz, cameraPoint, RADIUS)) return [];
    const projected = new THREE.Vector3(...xyz).project(camera);
    const px = (projected.x * 0.5 + 0.5) * width;
    const py = (-projected.y * 0.5 + 0.5) * height;
    if (px < 5 || px > width - 5 || py < 10 || py > height - 10) return [];
    return [{
      id: city.id,
      px,
      py,
      distance: xyz[0] * cameraPoint[0] + xyz[1] * cameraPoint[1] + xyz[2] * cameraPoint[2],
      side: px < width / 2 ? 'left' as const : 'right' as const,
    }];
  });

  // Limit labels to prevent an unreadable cluster, preferring the central viewpoint.
  eligible.sort((a, b) =>
    (b.distance + (b.id === selectedCityId ? 1.2 : 0)) -
    (a.distance + (a.id === selectedCityId ? 1.2 : 0)),
  );
  const maximum = width < 560 ? 3 : width < 790 ? 4 : 6;
  const visible = eligible.slice(0, maximum);
  const result: CityPin[] = [];
  const cardWidth = width < 560 ? 136 : 164;
  const cardHeight = width < 560 ? 70 : 78;
  const left = visible.filter((pin) => pin.side === 'left').sort((a, b) => a.py - b.py);
  const right = visible.filter((pin) => pin.side === 'right').sort((a, b) => a.py - b.py);

  for (const group of [left, right]) {
    group.forEach((pin, index) => {
      const slotCenter = ((index + 1) * height) / (group.length + 1);
      const cardY = Math.max(12, Math.min(height - cardHeight - 12, slotCenter - cardHeight / 2));
      const cardX = pin.side === 'left' ? 12 : width - cardWidth - 12;
      result.push({ ...pin, cardX, cardY });
    });
  }
  return result;
}

function CityLabel({ pin, city, weather, now, selected, onSelect }: {
  pin: CityPin;
  city: City;
  weather: WeatherByCity[typeof city.id] | undefined;
  now: Date;
  selected: boolean;
  onSelect(): void;
}) {
  const condition = weather ? weatherDescription(weather.code) : null;
  return (
    <button
      type="button"
      className={`globe-city-label ${pin.side} ${selected ? 'selected' : ''}`}
      style={{ left: pin.cardX, top: pin.cardY }}
      onClick={onSelect}
      title={`${city.name} の天気詳細`}
    >
      <span className="city-label-top">
        <span className="city-label-name">{city.name}</span>
        <span className="city-label-weather">{condition?.symbol ?? '·'}</span>
      </span>
      <span className="city-label-bottom">
        <strong>{weather ? `${Math.round(weather.temperature)}°` : '—°'}</strong>
        <span>{cityLocalTime(city, now)}</span>
      </span>
      <span className="city-label-humidity">{weather ? `湿度 ${Math.round(weather.humidity)}%` : '天気データなし'}</span>
    </button>
  );
}

const EarthGlobe = forwardRef<EarthGlobeHandle, EarthGlobeProps>(function EarthGlobe(
  { autoRotate, selectedCityId, weather, now, onSelectCity, onReady, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const selectedIdRef = useRef(selectedCityId);
  const [pins, setPins] = useState<CityPin[]>([]);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });

  useEffect(() => { selectedIdRef.current = selectedCityId; }, [selectedCityId]);

  useImperativeHandle(ref, () => ({
    resetView() {
      if (!cameraRef.current || !controlsRef.current) return;
      cameraRef.current.position.set(0, 0, INITIAL_DISTANCE);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    },
    zoomIn() {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      camera.position.setLength(Math.max(controls.minDistance, camera.position.length() * 0.85));
      controls.update();
    },
    zoomOut() {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      camera.position.setLength(Math.min(controls.maxDistance, camera.position.length() * 1.18));
      controls.update();
    },
  }), []);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      onError('3D描画を開始できませんでした。WebGL対応ブラウザでお試しください。');
      return;
    }

    let disposed = false;
    let frame = 0;
    let lastPinUpdate = 0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;
    renderer.domElement.setAttribute('aria-label', 'ドラッグまたはスワイプで回転する3D地球儀');
    renderer.domElement.className = 'globe-canvas';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, INITIAL_DISTANCE);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 3.5;
    controls.maxDistance = 8.5;
    controls.rotateSpeed = 0.65;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.45;
    controlsRef.current = controls;

    const geometry = new THREE.SphereGeometry(RADIUS, 96, 64);
    const material = createEarthMaterial();
    scene.add(new THREE.Mesh(geometry, material));
    const glow = createGlow();
    scene.add(glow.mesh);
    const stars = createStars();
    scene.add(stars);

    const textures: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    const loadImage = (url: string, name: 'day' | 'night') => {
      loader.load(url, (texture) => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.push(texture);
        material.uniforms[name === 'day' ? 'dayMap' : 'nightMap'].value = texture;
        material.uniforms[name === 'day' ? 'hasDayMap' : 'hasNightMap'].value = true;
      }, undefined, () => {
        // Keep the solid-color fallback and continue rendering if CDN fails.
      });
    };
    loadImage(DAY_IMAGE, 'day');
    loadImage(NIGHT_IMAGE, 'night');

    const updateSun = () => {
      const sun = subsolarPoint(new Date());
      material.uniforms.sunDirection.value.set(...geoToCartesian(sun.latitude, sun.longitude));
    };
    updateSun();
    const sunTimer = window.setInterval(updateSun, 60_000);

    const resize = () => {
      if (disposed) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const desiredDistance = width < 520 ? 6.65 : width < 790 ? 5.8 : INITIAL_DISTANCE;
      if (camera.position.length() < desiredDistance) {
        camera.position.setLength(desiredDistance);
        controls.update();
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      setViewport({ width, height });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const animate = (frameTime: number) => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      if (frameTime - lastPinUpdate > 130) {
        lastPinUpdate = frameTime;
        setPins(calculatePins(camera, Math.max(1, container.clientWidth),
          Math.max(1, container.clientHeight), selectedIdRef.current));
      }
    };
    frame = window.requestAnimationFrame(animate);
    onReady();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(sunTimer);
      observer.disconnect();
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      geometry.dispose();
      material.dispose();
      glow.geometry.dispose();
      glow.material.dispose();
      stars.geometry.dispose();
      if (Array.isArray(stars.material)) stars.material.forEach((entry) => entry.dispose());
      else stars.material.dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady, onError]); // Scene is retained when React weather/time state changes.

  return (
    <div className="globe-wrap">
      <div ref={containerRef} className="globe-viewport" />
      <div className="globe-label-overlay" aria-label="地球儀上の都市と天気">
        <svg className="globe-leaders" width={viewport.width} height={viewport.height}
          viewBox={`0 0 ${viewport.width} ${viewport.height}`} aria-hidden="true">
          {pins.map((pin) => {
            const endX = pin.side === 'left' ? pin.cardX + (viewport.width < 560 ? 136 : 164) : pin.cardX;
            const endY = pin.cardY + (viewport.width < 560 ? 35 : 39);
            const elbow = pin.side === 'left' ? endX + 14 : endX - 14;
            return (
              <g key={pin.id} className={pin.id === selectedCityId ? 'leader-selected' : ''}>
                <path d={`M${pin.px.toFixed(1)},${pin.py.toFixed(1)} L${elbow},${endY} L${endX},${endY}`} />
                <circle cx={pin.px} cy={pin.py} r="4" />
                <circle cx={pin.px} cy={pin.py} r="8" className="city-ring" />
              </g>
            );
          })}
        </svg>
        {pins.map((pin) => {
          const city = CITIES.find((entry) => entry.id === pin.id);
          if (!city) return null;
          return (
            <CityLabel key={pin.id} pin={pin} city={city} now={now}
              weather={weather[pin.id]} selected={pin.id === selectedCityId}
              onSelect={() => onSelectCity(pin.id)} />
          );
        })}
      </div>
    </div>
  );
});

export default EarthGlobe;
