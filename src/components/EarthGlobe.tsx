import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface EarthGlobeHandle {
  resetView(): void;
  zoomIn(): void;
  zoomOut(): void;
}

interface EarthGlobeProps {
  autoRotate: boolean;
  onReady(): void;
  onError(message: string): void;
}

const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const INITIAL_DISTANCE = 5.2;

function makeStarField(): THREE.Points {
  const coordinates: number[] = [];
  let seed = 41839;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let index = 0; index < 1100; index += 1) {
    const y = next() * 2 - 1;
    const azimuth = next() * Math.PI * 2;
    const radius = 22 + next() * 20;
    const planar = Math.sqrt(1 - y * y);
    coordinates.push(
      Math.cos(azimuth) * planar * radius,
      y * radius,
      Math.sin(azimuth) * planar * radius,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xa5c8df,
      size: 0.09,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  );
}

const EarthGlobe = forwardRef<EarthGlobeHandle, EarthGlobeProps>(function EarthGlobe(
  { autoRotate, onReady, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

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

    scene.add(new THREE.AmbientLight(0x587796, 1.2));
    const sunlight = new THREE.DirectionalLight(0xfff0d6, 3.1);
    sunlight.position.set(5.5, 2.4, 6);
    scene.add(sunlight);

    const fill = new THREE.DirectionalLight(0x2b86c9, 0.7);
    fill.position.set(-5, -1, -3);
    scene.add(fill);

    const earthGeometry = new THREE.SphereGeometry(1.55, 96, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7da6,
      roughness: 0.94,
      metalness: 0,
    });
    scene.add(new THREE.Mesh(earthGeometry, earthMaterial));

    // Fresnel halo: separate from the globe's texture and lighting.
    const glowGeometry = new THREE.SphereGeometry(1.7, 96, 64);
    const glowMaterial = new THREE.ShaderMaterial({
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
    scene.add(new THREE.Mesh(glowGeometry, glowMaterial));

    const stars = makeStarField();
    scene.add(stars);

    const loader = new THREE.TextureLoader();
    let dayTexture: THREE.Texture | undefined;
    let bumpTexture: THREE.Texture | undefined;

    loader.load(
      EARTH_TEXTURE,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        dayTexture = texture;
        dayTexture.colorSpace = THREE.SRGBColorSpace;
        earthMaterial.map = dayTexture;
        earthMaterial.color.set(0xffffff);
        earthMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        // Keep the blue fallback sphere if the remote texture is unavailable.
      },
    );

    loader.load(
      BUMP_TEXTURE,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        bumpTexture = texture;
        earthMaterial.bumpMap = bumpTexture;
        earthMaterial.bumpScale = 0.035;
        earthMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        // Terrain relief is optional.
      },
    );

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

    const animate = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    onReady();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      earthGeometry.dispose();
      earthMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      stars.geometry.dispose();
      if (Array.isArray(stars.material)) stars.material.forEach((material) => material.dispose());
      else stars.material.dispose();
      dayTexture?.dispose();
      bumpTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The 3D scene is created once per mount. Rotation changes via the separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onError, onReady]);

  return <div ref={containerRef} className="globe-viewport" />;
});

export default EarthGlobe;
