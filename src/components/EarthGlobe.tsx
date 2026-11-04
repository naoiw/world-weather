import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CITIES } from '../lib/cities';
import { geoToCartesian, subsolarPoint } from '../lib/astronomy';
import { projectVisibleCityMarkers, type CityMarker } from '../lib/globeMarkers';
import { easeInOutCubic, longitudeToAzimuth, shortestAngularDelta } from '../lib/globeNavigation';

export interface EarthGlobeHandle {
  focusCity(cityId: string): void;
}

interface EarthGlobeProps {
  autoRotate: boolean;
  selectedCityId: string;
  onSelectCity(cityId: string): void;
  onReady(): void;
  onError(message: string): void;
}

interface CameraTransition {
  start: number;
  from: number;
  delta: number;
  duration: number;
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

const EarthGlobe = forwardRef<EarthGlobeHandle, EarthGlobeProps>(function EarthGlobe(
  { autoRotate, selectedCityId, onSelectCity, onReady, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [markers, setMarkers] = useState<CityMarker[]>([]);
  const focusRef = useRef<CameraTransition | null>(null);

  useImperativeHandle(ref, () => ({
    focusCity(cityId: string) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const city = CITIES.find((entry) => entry.id === cityId);
      if (!camera || !controls || !city) return;
      focusRef.current = null;
      controls.autoRotate = false;
      controls.update();
      const from = Math.atan2(camera.position.z, camera.position.x);
      const target = longitudeToAzimuth(city.longitude);
      const delta = shortestAngularDelta(from, target);
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (reducedMotion || Math.abs(delta) < 0.0005) {
        const radius = camera.position.length();
        camera.position.set(radius * Math.cos(target), 0, radius * Math.sin(target));
        controls.update();
        return;
      }
      focusRef.current = { start: performance.now(), from, delta, duration: 2100 };
    },
  }), []);

  useEffect(() => {
    if (controlsRef.current) {
      if (autoRotate) focusRef.current = null;
      controlsRef.current.autoRotate = autoRotate;
    }
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
    let lastMarkerUpdate = 0;
    let previousMarkers: CityMarker[] = [];
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
    controls.rotateSpeed = 0.325;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.225;
    controlsRef.current = controls;
    const cancelFocus = () => { focusRef.current = null; };
    // User input always takes precedence over automatic city navigation.
    controls.addEventListener('start', cancelFocus);

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
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const animate = (frameTime: number) => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      controls.update();
      const transition = focusRef.current;
      if (transition) {
        const progress = Math.min(1, (frameTime - transition.start) / transition.duration);
        const azimuth = transition.from + transition.delta * easeInOutCubic(progress);
        const radius = camera.position.length();
        camera.position.set(radius * Math.cos(azimuth), 0, radius * Math.sin(azimuth));
        controls.update();
        if (progress >= 1) focusRef.current = null;
      }
      renderer.render(scene, camera);
      if (frameTime - lastMarkerUpdate > 50) {
        lastMarkerUpdate = frameTime;
        const next = projectVisibleCityMarkers(
          CITIES, camera.position.toArray(), RADIUS,
          container.clientWidth, container.clientHeight,
          (point) => new THREE.Vector3(...point).project(camera),
        );
        // Keep screen markers synced to the camera without needless React renders.
        const unchanged = next.length === previousMarkers.length && next.every((pin, index) => {
          const prior = previousMarkers[index];
          return pin.id === prior.id
            && Math.abs(pin.x - prior.x) < 0.3
            && Math.abs(pin.y - prior.y) < 0.3;
        });
        if (!unchanged) {
          previousMarkers = next;
          setMarkers(next);
        }
      }
    };
    frame = window.requestAnimationFrame(animate);
    onReady();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(sunTimer);
      observer.disconnect();
      controls.removeEventListener('start', cancelFocus);
      focusRef.current = null;
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
      <div className="globe-marker-layer" aria-label="地球儀の都市マーカー">
        {markers.map((marker) => {
          const city = CITIES.find((entry) => entry.id === marker.id);
          if (!city) return null;
          const selected = city.id === selectedCityId;
          return (
            <button
              type="button"
              key={city.id}
              className={`globe-marker ${selected ? 'selected' : ''}`}
              style={{ left: marker.x, top: marker.y }}
              title={city.name}
              aria-label={`${city.name}を選択`}
              aria-pressed={selected}
              onClick={() => onSelectCity(city.id)}
            />
          );
        })}
      </div>
    </div>
  );
});

export default EarthGlobe;
