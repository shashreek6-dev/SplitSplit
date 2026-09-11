import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './index.css';

// --- CRAZYGAMES SDK TYPE DEFINITIONS ---
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
  { id: 'solar_sovereign', name: 'Solar Sovereign', archetype: 'Celestial Nova', cost: 320, unlocked: false, colorA: 0xffb703, colorB: 0xfb8500, geoShape: 'solar' },
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
            <line x1="14" y1="22" x2="50" y2="42" stroke={cA} strokeWidth="1.5" />
            <line x1="14" y1="42" x2="50" y2="22" stroke={cB} strokeWidth="1.5" />
          </g>
        )}

        {shape === 'prism' && (
          <g filter={`url(#${glowId})`}>
            <polygon points="32,8 54,32 32,56 10,32" fill={`url(#${gradId})`} />
            <line x1="10" y1="32" x2="54" y2="32" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
            <polygon points="32,8 40,32 32,56 24,32" fill="none" stroke="#ffffff" strokeWidth="1.8" />
          </g>
        )}

        {shape === 'hazard' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="12" fill={`url(#${gradId})`} />
            <polygon points="32,6 36,18 28,18" fill={cA} />
            <polygon points="32,58 36,46 28,46" fill={cA} />
            <polygon points="6,32 18,28 18,36" fill={cB} />
            <polygon points="58,32 46,28 46,36" fill={cB} />
            <circle cx="32" cy="32" r="5" fill="#030408" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}

        {shape === 'blackhole' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="20" fill="none" stroke={`url(#${gradId})`} strokeWidth="5.5" />
            <ellipse cx="32" cy="32" rx="26" ry="7" fill="none" stroke="#ffffff" strokeWidth="1.8" transform="rotate(35 32 32)" />
            <circle cx="32" cy="32" r="11" fill="#030408" />
            <circle cx="32" cy="32" r="8" fill="none" stroke={cA} strokeWidth="1.2" strokeDasharray="3 3" />
          </g>
        )}

        {shape === 'solar' && (
          <g filter={`url(#${glowId})`}>
            <circle cx="32" cy="32" r="15" fill={`url(#${gradId})`} />
            <circle cx="32" cy="32" r="21" fill="none" stroke={cB} strokeWidth="2" strokeDasharray="4 3" />
            <line x1="32" y1="4" x2="32" y2="60" stroke={cA} strokeWidth="1.5" />
            <line x1="4" y1="32" x2="60" y2="32" stroke={cA} strokeWidth="1.5" />
            <line x1="12" y1="12" x2="52" y2="52" stroke={cB} strokeWidth="1.5" />
            <line x1="12" y1="52" x2="52" y2="12" stroke={cB} strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(Number(localStorage.getItem('split_best') || 0));
  const [shards, setShards] = useState(Number(localStorage.getItem('split_shards') || 0));
  const [gatesCleared, setGatesCleared] = useState(0);
  const [feverPct, setFeverPct] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tutorialHint, setTutorialHint] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<{ title: string; sub: string } | null>(null);
  
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

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

  const gameStateRef = useRef<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const isFeverRef = useRef<boolean>(false);

  const engineRef = useRef<{
    triggerSwap: () => void;
    triggerSpread: () => void;
    startGame: () => void;
    revivePlayer: () => void;
    goToMainMenu: () => void;
    updateEquippedMesh: (skin: CosmeticItem) => void;
    toggleMute: () => void;
  } | null>(null);

  // Keep ref synchronized with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080a1a');
    scene.fog = new THREE.FogExp2('#080a1a', 0.016);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3.2, 7.8);
    camera.lookAt(0, 1.2, -18.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xdbeafe, 0.65));
    const mainLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    mainLight.position.set(12, 28, 14);
    scene.add(mainLight);

    const trackFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 260),
      new THREE.MeshStandardMaterial({ color: 0x0d1124, roughness: 0.3, metalness: 0.8 })
    );
    trackFloor.rotation.x = -Math.PI / 2;
    trackFloor.position.set(0, -0.02, -50);
    scene.add(trackFloor);

    let gridHelper = new THREE.GridHelper(260, 65, 0x00e5ff, 0x1e294b);
    gridHelper.position.set(0, 0.01, 0);
    scene.add(gridHelper);

    const LANE_CENTERS = [-3.0, -1.0, 1.0, 3.0];

    const parentCoreRed = new THREE.Group();
    const parentCoreBlue = new THREE.Group();
    parentCoreRed.position.set(LANE_CENTERS[1], 0.5, 0);
    parentCoreBlue.position.set(LANE_CENTERS[2], 0.5, 0);
    scene.add(parentCoreRed);
    scene.add(parentCoreBlue);

    let activeSkinConfig = COSMETIC_CATALOG[0];

    const buildCoreMesh = (colorHex: number) => {
      const g = new THREE.Group();
      const geom = new THREE.SphereGeometry(0.42, 28, 28);
      const mainMesh = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 1.4 })
      );
      g.add(mainMesh);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.025, 12, 32),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      g.add(ring);
      return { group: g, ring };
    };

    let redMeshInstance = buildCoreMesh(0xff2a6d);
    let blueMeshInstance = buildCoreMesh(0x00e5ff);
    parentCoreRed.add(redMeshInstance.group);
    parentCoreBlue.add(blueMeshInstance.group);

    const updateEquippedMesh = (skin: CosmeticItem) => {
      activeSkinConfig = skin;
      parentCoreRed.remove(redMeshInstance.group);
      parentCoreBlue.remove(blueMeshInstance.group);

      redMeshInstance = buildCoreMesh(skin.colorA);
      blueMeshInstance = buildCoreMesh(skin.colorB);
      parentCoreRed.add(redMeshInstance.group);
      parentCoreBlue.add(blueMeshInstance.group);
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

    const createGate = (z: number, redLane: number, blueLane: number): Gate3D => {
      const group = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d1124, roughness: 0.4 });
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.35, 0.45), frameMat);
      topBar.position.y = 2.4;
      group.add(topBar);

      const shardGroup = new THREE.Group();
      const createPortal = (laneIdx: number, colorHex: number) => {
        const pGroup = new THREE.Group();
        const x = LANE_CENTERS[laneIdx];
        const pMat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 1.6 });
        const curtain = new THREE.Mesh(
          new THREE.PlaneGeometry(1.58, 2.05),
          new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
        );
        curtain.position.set(0, 1.15, 0);
        pGroup.add(curtain);
        pGroup.position.x = x;
        return pGroup;
      };

      group.add(createPortal(redLane, activeSkinConfig.colorA));
      group.add(createPortal(blueLane, activeSkinConfig.colorB));
      group.position.z = z;
      scene.add(group);

      return { group, shardGroup, laneRed: redLane, laneBlue: blueLane, z, passed: false, shattered: false };
    };

    let speed = 13;
    let isSwapped = false;
    let isSpread = false;

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
    };

    const triggerSpread = () => {
      if (gameStateRef.current !== 'PLAYING') return;
      initAudio();
      isSpread = !isSpread;
    };

    const spawnNextGate = (zPos: number) => {
      const patterns = [{ r: 1, b: 2 }, { r: 0, b: 3 }, { r: 2, b: 1 }, { r: 3, b: 0 }];
      const p = patterns[Math.floor(Math.random() * patterns.length)];
      gates.push(createGate(zPos, p.r, p.b));
    };

    const resetGame = () => {
      initAudio();
      gates.forEach(g => scene.remove(g.group));
      gates.length = 0;

      speed = 13;
      isSwapped = false;
      isSpread = false;

      setScore(0);
      setGatesCleared(0);
      setGameState('PLAYING');

      for (let i = 1; i <= 5; i++) {
        spawnNextGate(-i * 38);
      }
    };

    const goToMainMenu = () => {
      gates.forEach(g => scene.remove(g.group));
      gates.length = 0;
      setGameState('START');
    };

    const revivePlayer = () => {
      initAudio();
      setGameState('PLAYING');
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

    let lastTime = performance.now();
    let animId: number;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (gameStateRef.current === 'START') {
        camera.position.set(0, 3.2, 7.8);
        camera.lookAt(0, 1.2, -18.0);
        gridHelper.position.z = (gridHelper.position.z + 15 * dt) % 4;
        parentCoreRed.rotation.y += dt * 1.5;
        parentCoreBlue.rotation.y += dt * 1.5;
      } else {
        camera.position.set(0, 3.2, 7.8);
        camera.lookAt(0, 1.2, -18.0);
        gridHelper.position.z = (gridHelper.position.z + speed * dt) % 4;

        const targets = resolveLanes();
        const smoothLerpFactor = 1 - Math.exp(-32 * dt);
        parentCoreRed.position.x += (LANE_CENTERS[targets.r] - parentCoreRed.position.x) * smoothLerpFactor;
        parentCoreBlue.position.x += (LANE_CENTERS[targets.b] - parentCoreBlue.position.x) * smoothLerpFactor;

        for (let i = gates.length - 1; i >= 0; i--) {
          const gate = gates[i];
          const prevZ = gate.z;
          gate.z += speed * dt;
          gate.group.position.z = gate.z;

          if (!gate.passed && prevZ <= 0 && gate.z >= 0) {
            gate.passed = true;
            const matched = targets.r === gate.laneRed && targets.b === gate.laneBlue;
            if (matched) {
              setScore(s => s + 1);
              setShards(sh => sh + 1);
            } else {
              setGameState('GAMEOVER');
            }
          }

          if (gate.z > 14) {
            scene.remove(gate.group);
            gates.splice(i, 1);
            spawnNextGate(-150);
          }
        }
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div id="game-container" className={isFever ? 'fever-overdrive-active' : ''}>
      <div id="fever-flash-fx" />
      <div ref={mountRef} id="canvas-viewport" />

      {/* TOP IN-GAME HUD */}
      <div className={`hud-layer ${gameState === 'PLAYING' ? 'active' : ''}`}>
        <div className="top-header">
          <div className="pill-card">
            <span>BEST:</span>
            <span className="gold">{bestScore}</span>
          </div>

          <div className="score-number">{score}</div>

          <div className="pill-card" onClick={() => setIsShopOpen(true)}>
            <span>💎</span>
            <span className="gold">{shards}</span>
          </div>
        </div>

        {/* BOTTOM TOUCH CONTROLS */}
        <div className="touch-row">
          <div className="neon-btn btn-swap" onPointerDown={() => engineRef.current?.triggerSwap()}>
            <div className="btn-label">SWAP</div>
          </div>
          <div className="neon-btn btn-spread" onPointerDown={() => engineRef.current?.triggerSpread()}>
            <div className="btn-label">SPREAD</div>
          </div>
        </div>
      </div>

      {/* START SCREEN MODAL */}
      {gameState === 'START' && (
        <div className="modal-overlay">
          <div className="cyber-panel-card">
            <div className="brand-hero-title">SPLIT REACTION</div>
            <div className="brand-hero-sub">NEON OVERDRIVE 3D</div>

            <button className="cyber-play-btn" onClick={() => engineRef.current?.startGame()}>
              PLAY RUN
            </button>

            <button className="cyber-secondary-btn" onClick={() => setIsShopOpen(true)}>
              CUSTOMIZE CORES
            </button>
          </div>
        </div>
      )}

      {/* GAMEOVER SCREEN */}
      {gameState === 'GAMEOVER' && (
        <div className="modal-overlay">
          <div className="cyber-panel-card">
            <div className="brand-hero-title" style={{ color: '#ff2a6d' }}>CIRCUIT CRASHED</div>
            <button className="cyber-play-btn" onClick={() => engineRef.current?.startGame()}>
              RETRY RUN
            </button>
            <button className="cyber-secondary-btn" onClick={() => engineRef.current?.goToMainMenu()}>
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* SHOP LOCKER */}
      {isShopOpen && (
        <div className="modal-overlay">
          <div className="shop-card">
            <div style={{ fontSize: 20, fontWeight: 900 }}>COSMETICS LOCKER</div>
            <div className="shop-grid">
              {skins.map(item => (
                <div key={item.id} className="shop-item-card" onClick={() => {
                  setEquippedSkinId(item.id);
                  engineRef.current?.updateEquippedMesh(item);
                }}>
                  <div className="shop-item-name">{item.name}</div>
                  <button className="shop-item-btn">{item.id === equippedSkinId ? 'EQUIPPED' : 'EQUIP'}</button>
                </div>
              ))}
            </div>
            <button className="cyber-secondary-btn" onClick={() => setIsShopOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}