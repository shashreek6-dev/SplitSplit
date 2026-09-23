import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './index.css';

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        game: {
          gameplayStart: () => void;
          gameplayStop: () => void;
          happytime: () => void;
        };
        ad: {
          requestAd: (
            type: 'midgame' | 'rewarded',
            callbacks?: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (err: any) => void;
            }
          ) => void;
        };
      };
    };
  }
}

interface CosmeticItem {
  id: string;
  name: string;
  archetype: string;
  cost: number;
  unlocked: boolean;
  colorA: number;
  colorB: number;
  geoShape: 'sphere' | 'icosa' | 'prism' | 'hazard' | 'blackhole' | 'solar';
}

const COSMETIC_CATALOG: CosmeticItem[] = [
  { id: 'neon_classic', name: 'Cyber Neon', archetype: 'Standard Dual Core', cost: 0, unlocked: true, colorA: 0xff2a6d, colorB: 0x00e5ff, geoShape: 'sphere' },
  { id: 'plasma_pulsar', name: 'Plasma Pulsar', archetype: 'Ionic Resonance', cost: 35, unlocked: false, colorA: 0xec4899, colorB: 0x38bdf8, geoShape: 'icosa' },
  { id: 'chrono_prism', name: 'Chrono Prism', archetype: 'Refractive Gem', cost: 75, unlocked: false, colorA: 0xa855f7, colorB: 0x06b6d4, geoShape: 'prism' },
  { id: 'bio_hazard', name: 'Bio-Flux', archetype: 'Radioactive Core', cost: 130, unlocked: false, colorA: 0x10b981, colorB: 0xfacc15, geoShape: 'hazard' },
  { id: 'void_singularity', name: 'Void Singularity', archetype: 'Gravitational Node', cost: 200, unlocked: false, colorA: 0x6366f1, colorB: 0x8b5cf6, geoShape: 'blackhole' },
  { id: 'solar_sovereign', name: 'Solar Sovereign', archetype: 'Celestial Nova', cost: 320, unlocked: false, colorA: 0xffd700, colorB: 0xff4500, geoShape: 'solar' }, // High-contrast core colors
];

function ArchetypeMeshIcon({ shape, colorA, colorB }: { shape: string; colorA: number; colorB: number }) {
  const cA = `#${(colorA || 0xff2a6d).toString(16).padStart(6, '0')}`;
  const cB = `#${(colorB || 0x00e5ff).toString(16).padStart(6, '0')}`;
  const gradId = `grad-${shape}-${colorA || 0}`;
  const glowId = `glow-${shape}-${colorA || 0}`;

  return (
    <div className="archetype-preview-container">
      <svg viewBox="0 0 64 64" className="archetype-svg-spin">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cA} />
            <stop offset="100%" stopColor={cB} />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {shape === 'sphere' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="14" fill={`url(#${gradId})`} />
            <ellipse cx="32" cy="32" rx="22" ry="6" fill="none" stroke={cB} strokeWidth="2.2" transform="rotate(-25 32 32)" />
            <circle cx="28" cy="28" r="3" fill="#ffffff" opacity="0.7" />
          </g>
        )}
        {shape === 'icosa' && (
          <g filter={`url(#${glowId})`}>
            <polygon points="32,10 50,22 50,42 32,54 14,42 14,22" fill={`url(#${gradId})`} opacity="0.85" />
            <polygon points="32,10 42,32 32,54 22,32" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
          </g>
        )}
        {shape === 'prism' && (
          <g filter={`url(#${glowId})`}>
            <polygon points="32,8 54,32 32,56 10,32" fill={`url(#${gradId})`} />
            <polygon points="32,8 40,32 32,56 24,32" fill="none" stroke="#ffffff" strokeWidth="1.8" />
          </g>
        )}
        {shape === 'hazard' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="12" fill={`url(#${gradId})`} />
            <circle cx="32" cy="32" r="5" fill="#030408" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
        {shape === 'blackhole' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="20" fill="none" stroke={`url(#${gradId})`} strokeWidth="5.5" />
            <circle cx="32" cy="32" r="11" fill="#030408" />
          </g>
        )}
        {shape === 'solar' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="15" fill={`url(#${gradId})`} />
            <circle cx="32" cy="32" r="21" fill="none" stroke={cB} strokeWidth="2" strokeDasharray="4 3" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(Number(localStorage.getItem('split_best') || 0));
  const [shards, setShards] = useState(Number(localStorage.getItem('split_shards') || 0));
  const [gatesCleared, setGatesCleared] = useState(0);
  const [feverPct, setFeverPct] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tutorialHint, setTutorialHint] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<{ title: string; sub: string } | null>(null);

  const [gameState, setGameState] = useState<'INTRO' | 'START' | 'PLAYING' | 'GAMEOVER'>('INTRO');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [skins, setSkins] = useState<CosmeticItem[]>(() => {
    try {
      const saved = localStorage.getItem('split_skins_v2');
      return saved ? JSON.parse(saved) : COSMETIC_CATALOG;
    } catch {
      return COSMETIC_CATALOG;
    }
  });
  const [equippedSkinId, setEquippedSkinId] = useState(
    localStorage.getItem('split_equipped_skin_v2') || 'neon_classic'
  );

  const gameStateRef = useRef<'INTRO' | 'START' | 'PLAYING' | 'GAMEOVER'>('INTRO');
  const isFeverRef = useRef<boolean>(false);
  const introTimerRef = useRef<number>(0);

  const engineRef = useRef<{
    triggerSwap: () => void;
    triggerSpread: () => void;
    startGame: () => void;
    revivePlayer: () => void;
    goToMainMenu: () => void;
    updateEquippedMesh: (skin: CosmeticItem) => void;
    toggleMute: () => void;
  } | null>(null);

  useEffect(() => {
    const handleWindowResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    let audioCtx: AudioContext | null = null;
    let musicBus: GainNode | null = null;
    let sfxBus: GainNode | null = null;
    let masterGain: GainNode | null = null;
    let bgmTimer: number | null = null;
    let bgmStep = 0;
    let mutedInternal = false;

    const initAudio = () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-16, audioCtx.currentTime);
        compressor.knee.setValueAtTime(10, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(5, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.1, audioCtx.currentTime);

        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        musicBus = audioCtx.createGain();
        musicBus.gain.setValueAtTime(0.65, audioCtx.currentTime);
        sfxBus = audioCtx.createGain();
        sfxBus.gain.setValueAtTime(0.9, audioCtx.currentTime);

        musicBus.connect(compressor);
        sfxBus.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(audioCtx.destination);
        startSynthwaveTrack();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    };

    const toggleMute = () => {
      mutedInternal = !mutedInternal;
      setIsMuted(mutedInternal);
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(mutedInternal ? 0 : 0.3, audioCtx.currentTime);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
      } else if (!document.hidden && masterGain && audioCtx && !mutedInternal) {
        masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const duckMusic = (amount = 0.35, dur = 0.08) => {
      if (!musicBus || !audioCtx || mutedInternal) return;
      const now = audioCtx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(amount, now);
      musicBus.gain.linearRampToValueAtTime(0.65, now + dur);
    };

    const startSynthwaveTrack = () => {
      if (bgmTimer) return;
      const bassSeq = [43.65, 43.65, 51.91, 38.89, 43.65, 43.65, 58.27, 48.99];

      bgmTimer = window.setInterval(() => {
        if (!audioCtx || !musicBus || gameStateRef.current !== 'PLAYING' || mutedInternal) return;

        const now = audioCtx.currentTime;
        const beatInBar = bgmStep % 16;
        const isOverdrive = isFeverRef.current;

        if (beatInBar % 4 === 0) {
          const kickOsc = audioCtx.createOscillator();
          const kickGain = audioCtx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(130, now);
          kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.08);
          kickGain.gain.setValueAtTime(isOverdrive ? 0.75 : 0.55, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          kickOsc.connect(kickGain);
          kickGain.connect(musicBus);
          kickOsc.start(now);
          kickOsc.stop(now + 0.1);
        }

        if (beatInBar % 4 === 2) {
          const bufSize = Math.floor(audioCtx.sampleRate * 0.035);
          const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.009));

          const hat = audioCtx.createBufferSource();
          hat.buffer = buf;
          const hatFilter = audioCtx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(6500, now);
          const hatGain = audioCtx.createGain();
          hatGain.gain.setValueAtTime(0.08, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          hat.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(musicBus);
          hat.start(now);
          hat.stop(now + 0.035);
        }

        const bassOsc = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        const bFilter = audioCtx.createBiquadFilter();
        const root = bassSeq[Math.floor(bgmStep / 4) % bassSeq.length] * (isOverdrive ? 1.5 : 1.0);
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(root, now);
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(isOverdrive ? 600 : 320, now);
        bFilter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        bassGain.gain.setValueAtTime(0.22, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        bassOsc.connect(bFilter);
        bFilter.connect(bassGain);
        bassGain.connect(musicBus);
        bassOsc.start(now);
        bassOsc.stop(now + 0.1);

        bgmStep++;
      }, 117);
    };

    const playSwapFoley = () => {
      if (!audioCtx || !sfxBus || mutedInternal) return;
      duckMusic(0.3, 0.08);
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.07);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(3.0, now);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.07);
    };

    const playSpreadFoley = () => {
      if (!audioCtx || !sfxBus || mutedInternal) return;
      duckMusic(0.3, 0.08);
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.06);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.06);
    };

    const playGateChime = () => {
      if (!audioCtx || !sfxBus || mutedInternal) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.09);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.09);
    };

    const playFeverBassDrop = () => {
      if (!audioCtx || !sfxBus || mutedInternal) return;
      const now = audioCtx.currentTime;
      const subOsc = audioCtx.createOscillator();
      const subGain = audioCtx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.7);
      subGain.gain.setValueAtTime(0.75, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      subOsc.connect(subGain);
      subGain.connect(sfxBus);
      subOsc.start(now);
      subOsc.stop(now + 0.7);
    };

    const playShatterHeavy = () => {
      if (!audioCtx || !sfxBus || mutedInternal) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(g);
      g.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.18);
    };

    const playDeathImpact = () => {
      if (!audioCtx || !sfxBus || mutedInternal) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.45);
      g.gain.setValueAtTime(0.6, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(g);
      g.connect(sfxBus);
      osc.start(now);
      osc.stop(now + 0.45);
    };

    // --- 2. THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030408');
    scene.fog = new THREE.FogExp2('#030408', 0.013);

    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 24.0, 75.0);
    camera.lookAt(0, 1.2, -18.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xdbeafe, 0.8));
    const mainLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    mainLight.position.set(12, 32, 18);
    scene.add(mainLight);

    const pinkNeonLight = new THREE.PointLight(0xff2a6d, 3.5, 60);
    pinkNeonLight.position.set(-6, 4, -20);
    scene.add(pinkNeonLight);

    const cyanNeonLight = new THREE.PointLight(0x00e5ff, 3.5, 60);
    cyanNeonLight.position.set(6, 4, -20);
    scene.add(cyanNeonLight);

    const sunGeo = new THREE.CircleGeometry(22, 48);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.45 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 16, -140);
    scene.add(sunMesh);

    const trackFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 280),
      new THREE.MeshStandardMaterial({ 
        color: 0x070914, 
        roughness: 0.15, 
        metalness: 0.92,
        emissive: 0x020308,
        emissiveIntensity: 0.5
      })
    );
    trackFloor.rotation.x = -Math.PI / 2;
    trackFloor.position.set(0, -0.02, -50);
    scene.add(trackFloor);

    let gridHelper = new THREE.GridHelper(280, 70, 0x00e5ff, 0x151c36);
    gridHelper.position.set(0, 0.01, 0);
    scene.add(gridHelper);

    const curbs: THREE.Mesh[] = [];
    [-5.25, 5.25].forEach(x => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.45, 280),
        new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.6, roughness: 0.1 })
      );
      curb.position.set(x, 0.22, -50);
      scene.add(curb);
      curbs.push(curb);
    });

    const checkIsMobile = () => window.innerWidth <= 768;
    const LANE_CENTERS = checkIsMobile() ? [-1.9, -0.65, 0.65, 1.9] : [-3.0, -1.0, 1.0, 3.0];

    [-2.0, 0.0, 2.0].forEach((lx, idx) => {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lx, 0.03, 10),
        new THREE.Vector3(lx, 0.03, -130),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: idx === 1 ? 0xff2a6d : 0x00e5ff,
        transparent: true,
        opacity: idx === 1 ? 0.6 : 0.35,
      });
      scene.add(new THREE.Line(lineGeo, lineMat));
    });

    for (let z = -120; z <= 20; z += 18) {
      [-6.8, 6.8].forEach(px => {
        const pylon = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 4.0, 0.28),
          new THREE.MeshStandardMaterial({
            color: px < 0 ? 0xff2a6d : 0x00e5ff,
            emissive: px < 0 ? 0xff2a6d : 0x00e5ff,
            emissiveIntensity: 1.2,
            roughness: 0.2,
          })
        );
        pylon.position.set(px, 2.0, z);
        scene.add(pylon);
      });
    }

    const dustCount = 35;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 24;
      dustPositions[i + 1] = Math.random() * 8;
      dustPositions[i + 2] = (Math.random() - 0.5) * 180;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.16,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const dustField = new THREE.Points(dustGeo, dustMat);
    scene.add(dustField);

    const parentCoreRed = new THREE.Group();
    const parentCoreBlue = new THREE.Group();
    parentCoreRed.position.set(LANE_CENTERS[1], 1.0, 0);
    parentCoreBlue.position.set(LANE_CENTERS[2], 1.0, 0);
    scene.add(parentCoreRed);
    scene.add(parentCoreBlue);

    const coreScale = checkIsMobile() ? 0.58 : 0.75;
    parentCoreRed.scale.set(coreScale, coreScale, coreScale);
    parentCoreBlue.scale.set(coreScale, coreScale, coreScale);

    let activeSkinConfig = skins.find(s => s.id === equippedSkinId) || skins[0];

    const buildCoreMesh = (colorHex: number, shapeType: string) => {
      const g = new THREE.Group();
      let geom: THREE.BufferGeometry;
      if (shapeType === 'icosa') geom = new THREE.IcosahedronGeometry(0.42, 0);
      else if (shapeType === 'prism') geom = new THREE.OctahedronGeometry(0.44, 0);
      else if (shapeType === 'hazard') geom = new THREE.DodecahedronGeometry(0.42, 0);
      else if (shapeType === 'blackhole') geom = new THREE.TorusGeometry(0.32, 0.14, 16, 32);
      else if (shapeType === 'solar') geom = new THREE.SphereGeometry(0.46, 32, 32);
      else geom = new THREE.SphereGeometry(0.42, 28, 28);

      const mainMesh = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 2.2,
          roughness: 0.05,
          metalness: 0.8,
        })
      );
      g.add(mainMesh);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.03, 16, 36),
        new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 2.5 })
      );
      g.add(ring);

      return { group: g, ring };
    };

    let redMeshInstance = buildCoreMesh(activeSkinConfig.colorA, activeSkinConfig.geoShape);
    let blueMeshInstance = buildCoreMesh(activeSkinConfig.colorB, activeSkinConfig.geoShape);
    parentCoreRed.add(redMeshInstance.group);
    parentCoreBlue.add(blueMeshInstance.group);

    const updateEquippedMesh = (skin: CosmeticItem) => {
      activeSkinConfig = skin;
      parentCoreRed.remove(redMeshInstance.group);
      parentCoreBlue.remove(blueMeshInstance.group);

      redMeshInstance = buildCoreMesh(skin.colorA, skin.geoShape);
      blueMeshInstance = buildCoreMesh(skin.colorB, skin.geoShape);
      parentCoreRed.add(redMeshInstance.group);
      parentCoreBlue.add(blueMeshInstance.group);
    };

    const maxParticles = 22;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(maxParticles * 3 * 2);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 0.24,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const trailPoints = new THREE.Points(trailGeo, trailMat);
    scene.add(trailPoints);

    const trailHistory: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }[] = [];

    interface ShatterParticle {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      life: number;
    }
    const shatterParticles: ShatterParticle[] = [];
    const shatterGeom = new THREE.TetrahedronGeometry(0.28, 0);
    const shatterMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 3.0 });

    const spawn3DShatterExplosion = (x: number, y: number, z: number) => {
      for (let p = 0; p < 16; p++) {
        const frag = new THREE.Mesh(shatterGeom, shatterMat);
        frag.position.set(x + (Math.random() - 0.5) * 4, y, z);
        scene.add(frag);
        shatterParticles.push({
          mesh: frag,
          vx: (Math.random() - 0.5) * 16,
          vy: Math.random() * 8 + 4,
          vz: -Math.random() * 12 + 2,
          life: 0.55,
        });
      }
    };

    interface Gate3D {
      group: THREE.Group;
      shardGroup: THREE.Group;
      laneRed: number;
      laneBlue: number;
      z: number;
      passed: boolean;
      shattered: boolean;
    }

    const gates: Gate3D[] = [];

    // --- CIRCULAR GATES WITH LOCKED COLORS ---
    const createGate = (z: number, redLane: number, blueLane: number): Gate3D => {
      const group = new THREE.Group();
      
      const frameMat = new THREE.MeshStandardMaterial({ 
        color: 0x1e294b, 
        roughness: 0.15, 
        metalness: 0.95,
        emissive: 0x0f172a,
        emissiveIntensity: 0.8
      });

      const outerRingGeo = new THREE.TorusGeometry(5.3, 0.14, 24, 64);
      const outerRing = new THREE.Mesh(outerRingGeo, frameMat);
      outerRing.position.y = 1.0;
      group.add(outerRing);

      const shardGroup = new THREE.Group();

      const createCircularPortal = (laneIdx: number, colorHex: number) => {
        const pGroup = new THREE.Group();
        const x = LANE_CENTERS[laneIdx];
        const pMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 2.8,
          roughness: 0.1,
          metalness: 0.5
        });

        const radius = 0.50;

        const ringGeo = new THREE.TorusGeometry(radius, 0.08, 16, 48);
        const ringMesh = new THREE.Mesh(ringGeo, pMat);
        pGroup.add(ringMesh);

        const diskGeo = new THREE.CircleGeometry(radius, 32);
        const diskMat = new THREE.MeshBasicMaterial({ 
          color: colorHex, 
          transparent: true, 
          opacity: 0.32, 
          side: THREE.DoubleSide 
        });
        const diskMesh = new THREE.Mesh(diskGeo, diskMat);
        pGroup.add(diskMesh);

        const shard = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.22, 0),
          new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 2.5 })
        );
        shard.position.set(x, 1.0, 0);
        shardGroup.add(shard);

        pGroup.position.set(x, 1.0, 0);
        return pGroup;
      };

      group.add(createCircularPortal(redLane, activeSkinConfig.colorA));
      group.add(createCircularPortal(blueLane, activeSkinConfig.colorB));
      group.add(shardGroup);

      group.position.z = z;
      scene.add(group);

      return { group, shardGroup, laneRed: redLane, laneBlue: blueLane, z, passed: false, shattered: false };
    };

    let localScore = 0;
    let localGatesCleared = 0;
    let localFever = 0;
    let feverDuration = 5.0;
    let speed = 13;
    let isSwapped = false;
    let isSpread = false;
    let currentThemeIdx = 0;

    const worldThemes = [
      { bg: '#030408', sun: 0xff007f },
      { bg: '#080214', sun: 0x06b6d4 },
      { bg: '#02100d', sun: 0xfacc15 },
      { bg: '#140702', sun: 0xff2a6d },
    ];

    const applyWorldTheme = (themeIdx: number) => {
      const th = worldThemes[themeIdx % worldThemes.length];
      scene.background = new THREE.Color(th.bg);
      scene.fog = new THREE.FogExp2(th.bg, 0.013);
      sunMesh.material.color.setHex(th.sun);
    };

    const triggerFeverOverdrive = () => {
      isFeverRef.current = true;
      localFever = 100;
      feverDuration = 5.0;
      setIsFever(true);

      playFeverBassDrop();

      const flashEl = document.getElementById('fever-flash-fx');
      if (flashEl) {
        flashEl.style.background = 'radial-gradient(circle at center, rgba(255, 204, 0, 0.45) 0%, rgba(255, 42, 109, 0.2) 60%, transparent 80%)';
        flashEl.classList.add('flash');
        setTimeout(() => flashEl.classList.remove('flash'), 450);
      }

      sunMesh.material.color.setHex(0xffcc00);
      sunMesh.material.opacity = 0.75;
      trailMat.color.setHex(0xffcc00);

      if (window.CrazyGames?.SDK?.game) {
        window.CrazyGames.SDK.game.happytime();
      }
    };

    const restoreNormalAesthetics = () => {
      isFeverRef.current = false;
      localFever = 0;
      setIsFever(false);
      setFeverPct(0);
      applyWorldTheme(currentThemeIdx);
      trailMat.color.setHex(0x38bdf8);
    };

    const resolveLanes = () => {
      let r = 1, b = 2;
      if (!isSpread) {
        r = isSwapped ? 2 : 1;
        b = isSwapped ? 1 : 2;
      } else {
        r = isSwapped ? 3 : 0;
        b = isSwapped ? 0 : 3;
      }
      return { r, b };
    };

    const triggerSwap = () => {
      if (gameStateRef.current !== 'PLAYING') return;
      initAudio();
      isSwapped = !isSwapped;
      playSwapFoley();
      if (navigator.vibrate) navigator.vibrate(10);
    };

    const triggerSpread = () => {
      if (gameStateRef.current !== 'PLAYING') return;
      initAudio();
      isSpread = !isSpread;
      playSpreadFoley();
      if (navigator.vibrate) navigator.vibrate(10);
    };

    const spawnNextGate = (zPos: number) => {
      const patterns = [
        { r: 1, b: 2 },
        { r: 0, b: 3 },
        { r: 2, b: 1 },
        { r: 3, b: 0 },
      ];
      const p = patterns[Math.floor(Math.random() * patterns.length)];
      gates.push(createGate(zPos, p.r, p.b));
    };

    const resetGame = () => {
      initAudio();
      setIsTransitioning(true);

      // Clear any remaining death flash overlay immediately on reset
      const flashEl = document.getElementById('fever-flash-fx');
      if (flashEl) {
        flashEl.classList.remove('flash');
        flashEl.style.background = 'radial-gradient(circle at center, rgba(255, 204, 0, 0.45) 0%, rgba(255, 42, 109, 0.2) 60%, transparent 80%)';
      }

      setTimeout(() => {
        gates.forEach(g => scene.remove(g.group));
        gates.length = 0;

        shatterParticles.forEach(p => scene.remove(p.mesh));
        shatterParticles.length = 0;

        localScore = 0;
        localGatesCleared = 0;
        speed = 13;
        isSwapped = false;
        isSpread = false;
        currentThemeIdx = 0;
        restoreNormalAesthetics();

        setScore(0);
        setGatesCleared(0);
        setMilestone(null);
        gameStateRef.current = 'PLAYING';
        setGameState('PLAYING');
        setIsTransitioning(false);

        setTutorialHint(isMobile ? 'TAP SWAP OR SPREAD TO SHIFT CORES' : 'SWAP: [A] / [Q] / [LEFT] • SPREAD: [D] / [RIGHT]');
        setTimeout(() => setTutorialHint(null), 4000);

        for (let i = 1; i <= 5; i++) {
          spawnNextGate(-i * 45);
        }

        if (window.CrazyGames?.SDK?.game) {
          window.CrazyGames.SDK.game.gameplayStart();
        }
      }, 250);
    };

    const goToMainMenu = () => {
      const flashEl = document.getElementById('fever-flash-fx');
      if (flashEl) {
        flashEl.classList.remove('flash');
        flashEl.style.background = 'radial-gradient(circle at center, rgba(255, 204, 0, 0.45) 0%, rgba(255, 42, 109, 0.2) 60%, transparent 80%)';
      }

      gates.forEach(g => scene.remove(g.group));
      gates.length = 0;
      shatterParticles.forEach(p => scene.remove(p.mesh));
      shatterParticles.length = 0;

      gameStateRef.current = 'START';
      setGameState('START');
      setScore(0);
      setTutorialHint(null);
      setMilestone(null);
      currentThemeIdx = 0;
      restoreNormalAesthetics();

      parentCoreRed.position.set(LANE_CENTERS[1], 1.0, 0);
      parentCoreBlue.position.set(LANE_CENTERS[2], 1.0, 0);

      if (window.CrazyGames?.SDK?.game) {
        window.CrazyGames.SDK.game.gameplayStop();
      }
    };

    const revivePlayer = () => {
      initAudio();
      const flashEl = document.getElementById('fever-flash-fx');
      if (flashEl) {
        flashEl.classList.remove('flash');
        flashEl.style.background = 'radial-gradient(circle at center, rgba(255, 204, 0, 0.45) 0%, rgba(255, 42, 109, 0.2) 60%, transparent 80%)';
      }

      gates.forEach(g => {
        if (g.z > -18 && g.z < 12) {
          scene.remove(g.group);
          g.shattered = true;
        }
      });
      triggerFeverOverdrive();
      feverDuration = 4.0;
      gameStateRef.current = 'PLAYING';
      setGameState('PLAYING');

      if (window.CrazyGames?.SDK?.game) {
        window.CrazyGames.SDK.game.gameplayStart();
      }
    };

    engineRef.current = {
      triggerSwap,
      triggerSpread,
      startGame: resetGame,
      revivePlayer,
      goToMainMenu,
      updateEquippedMesh,
      toggleMute,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyA' || e.code === 'KeyQ' || e.code === 'ArrowLeft') triggerSwap();
      if (e.code === 'KeyD' || e.code === 'ArrowRight' || e.code === 'Space') triggerSpread();
      if (e.code === 'KeyM') toggleMute();
    };
    window.addEventListener('keydown', handleKeyDown);

    introTimerRef.current = window.setTimeout(() => {
      if (gameStateRef.current === 'INTRO') {
        gameStateRef.current = 'START';
        setGameState('START');
      }
    }, 1400);

    let lastTime = performance.now();
    let animId: number;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const dustPos = dustGeo.attributes.position.array as Float32Array;
      for (let i = 2; i < dustPos.length; i += 3) {
        dustPos[i] += speed * 1.5 * dt;
        if (dustPos[i] > 20) dustPos[i] = -180;
      }
      dustGeo.attributes.position.needsUpdate = true;

      for (let s = shatterParticles.length - 1; s >= 0; s--) {
        const sp = shatterParticles[s];
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.vy -= 22 * dt;
        sp.mesh.rotation.x += dt * 8;
        sp.mesh.rotation.y += dt * 10;
        sp.life -= dt;
        if (sp.life <= 0) {
          scene.remove(sp.mesh);
          shatterParticles.splice(s, 1);
        }
      }

      if (gameStateRef.current === 'INTRO') {
        camera.position.z += (7.8 - camera.position.z) * (1 - Math.exp(-4 * dt));
        camera.position.y += (3.2 - camera.position.y) * (1 - Math.exp(-4 * dt));
        camera.lookAt(0, 1.2, -18.0);
        gridHelper.position.z = (gridHelper.position.z + 20 * dt) % 4;

        parentCoreRed.rotation.y += dt * 2.0;
        parentCoreBlue.rotation.y += dt * 2.0;
      } else if (gameStateRef.current === 'START') {
        camera.position.set(0, 3.2, 7.8);
        camera.lookAt(0, 1.2, -18.0);
        gridHelper.position.z = (gridHelper.position.z + 15 * dt) % 4;

        parentCoreRed.rotation.y += dt * 1.5;
        parentCoreBlue.rotation.y += dt * 1.5;
        redMeshInstance.ring.rotation.x += dt * 2.0;
        blueMeshInstance.ring.rotation.x += dt * 2.0;
      } else {
        camera.position.set(0, 3.2, 7.8);
        camera.lookAt(0, 1.2, -18.0);

        gridHelper.position.z = (gridHelper.position.z + speed * dt) % 4;

        const smoothLerpFactor = 1 - Math.exp(-32 * dt);
        const targets = resolveLanes();
        parentCoreRed.position.x += (LANE_CENTERS[targets.r] - parentCoreRed.position.x) * smoothLerpFactor;
        parentCoreBlue.position.x += (LANE_CENTERS[targets.b] - parentCoreBlue.position.x) * smoothLerpFactor;

        const tiltTarget = (LANE_CENTERS[targets.r] - parentCoreRed.position.x) * 0.35;
        parentCoreRed.rotation.z += (-tiltTarget - parentCoreRed.rotation.z) * (1 - Math.exp(-20 * dt));
        parentCoreBlue.rotation.z += (-tiltTarget - parentCoreBlue.rotation.z) * (1 - Math.exp(-20 * dt));

        redMeshInstance.ring.rotation.x += dt * 3.5;
        redMeshInstance.ring.rotation.y += dt * 2.0;
        blueMeshInstance.ring.rotation.x += dt * 3.5;
        blueMeshInstance.ring.rotation.y += dt * 2.0;

        trailHistory.unshift({
          x1: parentCoreRed.position.x,
          y1: parentCoreRed.position.y,
          z1: parentCoreRed.position.z + 0.3,
          x2: parentCoreBlue.position.x,
          y2: parentCoreBlue.position.y,
          z2: parentCoreBlue.position.z + 0.3,
        });
        if (trailHistory.length > maxParticles) trailHistory.pop();

        const tPos = trailGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < trailHistory.length; i++) {
          const h = trailHistory[i];
          tPos[i * 6] = h.x1;
          tPos[i * 6 + 1] = h.y1;
          tPos[i * 6 + 2] = h.z1 + i * 0.25;
          tPos[i * 6 + 3] = h.x2;
          tPos[i * 6 + 4] = h.y2;
          tPos[i * 6 + 5] = h.z2 + i * 0.25;
        }
        trailGeo.attributes.position.needsUpdate = true;

        if (isFeverRef.current) {
          camera.fov += (82 - camera.fov) * (1 - Math.exp(-8 * dt));
          feverDuration -= dt;
          setFeverPct(Math.max(0, (feverDuration / 5.0) * 100));
          if (feverDuration <= 0) {
            restoreNormalAesthetics();
          }
        } else {
          camera.fov += (72 - camera.fov) * (1 - Math.exp(-8 * dt));
        }
        camera.updateProjectionMatrix();

        // Continuous Collision Detection
        for (let i = gates.length - 1; i >= 0; i--) {
          const gate = gates[i];
          const prevZ = gate.z;
          gate.z += speed * dt;
          gate.group.position.z = gate.z;

          gate.shardGroup.children.forEach(c => {
            c.rotation.y += dt * 3;
            c.rotation.x += dt * 1.5;
          });

          if (!gate.passed && !gate.shattered) {
            if (prevZ <= 0 && gate.z >= 0) {
              gate.passed = true;

              if (isFeverRef.current) {
                gate.shattered = true;
                scene.remove(gate.group);
                localScore += 2;
                localGatesCleared += 1;
                spawn3DShatterExplosion(0, 1.0, 0);
                playShatterHeavy();
                if (navigator.vibrate) navigator.vibrate([25, 20, 30]);
              } else {
                const matched = targets.r === gate.laneRed && targets.b === gate.laneBlue;

                if (matched) {
                  localScore += 1;
                  localGatesCleared += 1;
                  localFever = Math.min(100, localFever + 100 / 6);
                  setFeverPct(localFever);
                  playGateChime();
                  if (navigator.vibrate) navigator.vibrate(12);

                  setShards(s => {
                    const next = s + 1;
                    localStorage.setItem('split_shards', String(next));
                    return next;
                  });

                  if (localScore % 10 === 0) {
                    currentThemeIdx = (currentThemeIdx + 1) % worldThemes.length;
                    if (!isFeverRef.current) applyWorldTheme(currentThemeIdx);
                  }

                  if (localScore === 10) {
                    setMilestone({ title: 'HYPER VELOCITY', sub: 'WORLD THEME SHIFTED' });
                    setTimeout(() => setMilestone(null), 1800);
                  } else if (localScore === 25) {
                    setMilestone({ title: 'NEURAL MASTER', sub: 'COMBO X2 MULTIPLIER' });
                    setTimeout(() => setMilestone(null), 1800);
                  }

                  if (localFever >= 99.9) {
                    triggerFeverOverdrive();
                  }
                } else {
                  const flashEl = document.getElementById('fever-flash-fx');
                  if (flashEl) {
                    flashEl.style.background = 'radial-gradient(circle at center, rgba(255, 42, 109, 0.8) 0%, rgba(255, 0, 0, 0.5) 70%)';
                    flashEl.classList.add('flash');
                  }

                  gameStateRef.current = 'GAMEOVER';
                  setGameState('GAMEOVER');
                  playDeathImpact();
                  if (navigator.vibrate) navigator.vibrate([60, 50, 90]);

                  setBestScore(prev => {
                    const next = Math.max(prev, localScore);
                    localStorage.setItem('split_best', String(next));
                    return next;
                  });

                  if (window.CrazyGames?.SDK?.game) {
                    window.CrazyGames.SDK.game.gameplayStop();
                  }
                  break;
                }
              }

              setScore(localScore);
              setGatesCleared(localGatesCleared);
            }
          }

          if (gate.z > 14) {
            scene.remove(gate.group);
            gates.splice(i, 1);
            
            const furthestZ = gates.length > 0 
              ? gates.reduce((min, g) => Math.min(min, g.z), gates[0].z) 
              : 0;

            const safeMinSpacing = 42;
            const spacing = Math.max(safeMinSpacing, 50 - localScore * 0.1);
            spawnNextGate(furthestZ - spacing);
          }
        }

        speed = 13 + Math.min(12, localScore * 0.28);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (bgmTimer) clearInterval(bgmTimer);
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  const handleBuyOrEquip = (item: CosmeticItem) => {
    if (item.unlocked) {
      setEquippedSkinId(item.id);
      localStorage.setItem('split_equipped_skin_v2', item.id);
      engineRef.current?.updateEquippedMesh(item);
    } else if (shards >= item.cost) {
      const updatedShards = shards - item.cost;
      setShards(updatedShards);
      localStorage.setItem('split_shards', String(updatedShards));

      const updatedSkins = skins.map(s => (s.id === item.id ? { ...s, unlocked: true } : s));
      setSkins(updatedSkins);
      localStorage.setItem('split_skins_v2', JSON.stringify(updatedSkins));
      setEquippedSkinId(item.id);
      localStorage.setItem('split_equipped_skin_v2', item.id);
      engineRef.current?.updateEquippedMesh(item);
    }
  };

  return (
    <div id="game-container" className={isFever ? 'fever-overdrive-active' : ''}>
      <div id="fever-flash-fx" />
      <div ref={mountRef} id="canvas-viewport" />

      {tutorialHint && (
        <div className="onboarding-hint-banner">
          {tutorialHint}
        </div>
      )}

      {milestone && (
        <div className="milestone-announcement show">
          <div className="milestone-title-text">{milestone.title}</div>
          <div className="milestone-sub-text">{milestone.sub}</div>
        </div>
      )}

      {/* TOP IN-GAME HUD - VISIBLE ON PLAYING AND START */}
      <div className={`hud-layer ${gameState === 'PLAYING' || gameState === 'START' ? 'active' : ''}`}>
        <div className="top-header">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="pill-card">
              <span>BEST:</span>
              <span className="gold">{bestScore}</span>
            </div>

            <button
              className="hud-btn-icon"
              title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
              onClick={() => engineRef.current?.toggleMute()}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          <div className="score-hud-center">
            <div className={`score-number ${isFever ? 'fever' : ''}`}>{score}</div>
            <div className="fever-bar-wrap">
              <div className={`fever-track ${isFever ? 'active-overdrive' : ''}`}>
                <div
                  className={`fever-fill ${isFever ? 'active-overdrive' : ''}`}
                  style={{ width: `${feverPct}%` }}
                />
              </div>
              <div className={`fever-label ${isFever ? 'active-overdrive' : ''}`}>
                {isFever ? '⚡ OVERDRIVE DESTROYER 2X ⚡' : `FEVER CHARGE ${Math.round(feverPct)}%`}
              </div>
            </div>
          </div>

          <div className="pill-card" onClick={() => setIsShopOpen(true)}>
            <span>💎</span>
            <span className="gold">{shards}</span>
          </div>
        </div>
      </div>

      {/* PERSISTENT MOBILE THUMB-ZONE TOUCH BAR */}
      {isMobile && gameState === 'PLAYING' && (
        <div id="persistent-touch-bar">
          <div className="neon-btn btn-swap" onPointerDown={() => engineRef.current?.triggerSwap()}>
            <div className="btn-label">SWAP [TAP]</div>
            <div className="btn-sub">INVERT ORDER</div>
          </div>

          <div className="neon-btn btn-spread" onPointerDown={() => engineRef.current?.triggerSpread()}>
            <div className="btn-label">SPREAD [HOLD/TAP]</div>
            <div className="btn-sub">WIDE / NARROW</div>
          </div>
        </div>
      )}

      {/* START SCREEN MODAL */}
      {gameState === 'START' && (
        <div className={`modal-overlay ${isTransitioning ? 'transitioning-out' : ''}`}>
          <div className="cyber-panel-card">
            <div className="brand-hero-title">SPLIT REACTION</div>
            <div className="brand-hero-sub">NEON OVERDRIVE 3D</div>

            <div className="hero-badge-pill">
              <span>★ RECORD:</span>
              <span style={{ color: '#ffffff', fontWeight: 900 }}>{bestScore} PTS</span>
            </div>

            <button className="cyber-play-btn" onClick={() => engineRef.current?.startGame()}>
              <span>▶</span>
              <span>PLAY RUN</span>
            </button>

            <button className="cyber-secondary-btn" onClick={() => setIsShopOpen(true)}>
              CUSTOMIZE CORES
            </button>

            <button className="cyber-secondary-btn" style={{ borderColor: 'rgba(255, 204, 0, 0.4)', color: '#ffcc00' }} onClick={() => setIsHelpOpen(true)}>
              HOW TO PLAY
            </button>

            <div className="controls-hint-row">
              {isMobile ? (
                <span>TAP BOTTOM BUTTONS TO SWAP / SPREAD</span>
              ) : (
                <>
                  <span><span className="keycap">A</span> / <span className="keycap">Q</span> SWAP</span>
                  <span>•</span>
                  <span><span className="keycap">D</span> / <span className="keycap">SPACE</span> SPREAD</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GAMEOVER SCREEN */}
      {gameState === 'GAMEOVER' && (
        <div className="modal-overlay">
          <div className="cyber-panel-card" style={{ borderColor: 'rgba(255, 42, 109, 0.45)' }}>
            <div className="brand-hero-title" style={{ color: '#ff2a6d', textShadow: '0 0 35px rgba(255, 42, 109, 0.9)' }}>
              CIRCUIT CRASHED
            </div>
            <div className="brand-hero-sub" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
              NEURAL LINK SEVERED
            </div>

            <div className="stats-grid-card">
              <div className="stat-tile">
                <span className="stat-tile-label">FINAL SCORE</span>
                <span className="stat-tile-val cyan">{score}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">BEST RECORD</span>
                <span className="stat-tile-val gold">{bestScore}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">GATES CLEARED</span>
                <span className="stat-tile-val">{gatesCleared}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-tile-label">SHARDS</span>
                <span className="stat-tile-val gold">+{score}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button
                className="btn-revive-glow"
                onClick={() => {
                  if (window.CrazyGames?.SDK?.ad) {
                    window.CrazyGames.SDK.ad.requestAd('rewarded', {
                      adFinished: () => engineRef.current?.revivePlayer(),
                      adError: () => engineRef.current?.revivePlayer(),
                    });
                  } else {
                    engineRef.current?.revivePlayer();
                  }
                }}
              >
                <span>📺</span>
                <span>REVIVE WITH SHIELD</span>
              </button>

              <button className="cyber-play-btn" style={{ padding: '14px 20px', fontSize: 16 }} onClick={() => engineRef.current?.startGame()}>
                RETRY RUN
              </button>

              <button
                className="cyber-secondary-btn"
                style={{ borderColor: 'rgba(0, 229, 255, 0.4)' }}
                onClick={() => engineRef.current?.goToMainMenu()}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY INSTRUCTIONS MODAL */}
      {isHelpOpen && (
        <div className="modal-overlay">
          <div className="cyber-panel-card" style={{ maxWidth: 480 }}>
            <div className="brand-hero-title" style={{ fontSize: 28 }}>HOW TO PLAY</div>
            <div className="brand-hero-sub">NEURAL LINK GUIDE</div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, margin: '10px 0 20px 0', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.5, textAlign: 'left' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ color: '#00e5ff', display: 'block', marginBottom: 4 }}>🎯 OBJECTIVE</strong>
                Match your dual cores to the correct incoming colored portal rings. Clear gates to build your score and fill your Fever gauge.
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ color: '#ff2a6d', display: 'block', marginBottom: 4 }}>🎮 CONTROLS ({isMobile ? 'MOBILE' : 'DESKTOP'})</strong>
                {isMobile ? (
                  <span>• <b>SWAP [TAP]:</b> Inverts your core positions instantly.<br />• <b>SPREAD [HOLD/TAP]:</b> Toggles wide or narrow lane formation.</span>
                ) : (
                  <span>• <b>SWAP:</b> Press <span className="keycap">A</span>, <span className="keycap">Q</span>, or <span className="keycap">←</span>.<br />• <b>SPREAD:</b> Press <span className="keycap">D</span>, <span className="keycap">→</span>, or <span className="keycap">SPACE</span>.</span>
                )}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ color: '#ffcc00', display: 'block', marginBottom: 4 }}>⚡ FEVER OVERDRIVE</strong>
                Filling your gauge triggers Overdrive mode, doubling points and letting you smash straight through incoming gates automatically!
              </div>
            </div>

            <button className="cyber-play-btn" style={{ padding: '14px 20px', fontSize: 15 }} onClick={() => setIsHelpOpen(false)}>
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* 6-ARCHETYPE COSMETICS LOCKER */}
      {isShopOpen && (
        <div className="modal-overlay">
          <div className="shop-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px' }}>COSMETICS LOCKER</div>
                <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Select 3D Core Archetype</div>
              </div>
              <div className="pill-card" style={{ padding: '6px 14px' }}>
                <span>💎</span>
                <span className="gold">{shards}</span>
              </div>
            </div>

            <div className="shop-grid">
              {skins.map(item => {
                const isEquipped = item.id === equippedSkinId;
                return (
                  <div
                    key={item.id}
                    className={`shop-item-card ${isEquipped ? 'equipped' : item.unlocked ? 'unlocked' : ''}`}
                    onClick={() => handleBuyOrEquip(item)}
                  >
                    <div className="shop-icon-wrap">
                      <ArchetypeMeshIcon
                        shape={item.geoShape}
                        colorA={item.colorA}
                        colorB={item.colorB}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="shop-item-name">{item.name}</div>
                      <div className="shop-item-type">{item.archetype}</div>
                    </div>
                    <button className="shop-item-btn">
                      {isEquipped ? 'EQUIPPED' : item.unlocked ? 'EQUIP' : `💎 ${item.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <button className="cyber-secondary-btn" style={{ width: '100%', marginTop: 6, padding: '12px 20px', fontSize: '13px' }} onClick={() => setIsShopOpen(false)}>
              RETURN TO ARENA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}