

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { 
  generateRandomPath,
  TOWER_STATS, 
  GRID_SIZE,
  INITIAL_STATE,
  generateBoss,
  generateProceduralEnemyTemplate,
  ROMAN_NUMERALS,
  SECTOR_THEMES
} from '../constants';
import { Enemy, Tower, Projectile, Particle, GameState, TowerType, Vector2D, BossTrait, EnemyShape, EnemyTrait, GolemType } from '../types';
import { getTacticalAnalysis } from '../services/gemini';
import { playSound } from '../services/audio';
import { FastForward, Play, ZoomIn, ZoomOut } from 'lucide-react';

interface GameCanvasProps {
  gameWidth: number;
  gameHeight: number;
  selectedTower: TowerType | null;
  onPlaceTower: () => void;
  onMoneyChange: (money: number) => void;
  onLivesChange: (lives: number) => void;
  onWaveChange: (wave: number, level: number) => void;
  onAnalysisUpdate: (text: string) => void;
  onSectorComplete: (currentLevel: number) => void;
  onGalaxyComplete: () => void;
  onModuleCollect: (tier: number) => void;
  onModuleSold: (tier: number) => void;
  towerLevels: Partial<Record<TowerType, number>>;
  inventory: Record<number, number>;
  resetTrigger: number; 
  fullResetTrigger: number;
  galaxy: number;
  modifiers: GameState['modifiers'];
  isConMode: boolean;
  isPaused: boolean;
  className?: string;
  // New props for Quantum mechanic
  isQuantumSelection?: boolean;
  onQuantumUsed?: () => void;
  onReturnToMenu?: () => void;
}

// Helper: Distance
const getDist = (a: Vector2D, b: Vector2D) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameWidth,
  gameHeight,
  selectedTower, 
  onPlaceTower,
  onMoneyChange,
  onLivesChange,
  onWaveChange,
  onAnalysisUpdate,
  onSectorComplete,
  onGalaxyComplete,
  onModuleCollect,
  onModuleSold,
  towerLevels,
  inventory,
  resetTrigger,
  fullResetTrigger,
  galaxy,
  modifiers,
  isConMode,
  isPaused,
  className = "",
  isQuantumSelection = false,
  onQuantumUsed,
  onReturnToMenu
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Viewport State (Zoom & Pan)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 }); // To differentiate click vs drag
  const worldWidthRef = useRef(gameWidth);

  // Game State Refs
  const pathsRef = useRef<Vector2D[][]>([generateRandomPath(gameWidth, gameHeight, undefined, undefined, gameWidth)]);
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const screenFlashRef = useRef<number>(0); // White screen flash opacity
  
  const gameStateRef = useRef<GameState>({ ...INITIAL_STATE, isPlaying: false, isGameOver: false });
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0); // Virtual game time accumulator
  
  // Wave Management
  const waveActiveRef = useRef<boolean>(false);
  const wavesQueuedRef = useRef<number>(0);
  const waveDelayTimerRef = useRef<number>(0);
  // Store the full enemy template to spawn
  const enemiesToSpawnRef = useRef<{ template: Partial<Enemy>; time: number }[]>([]);
  const waveStartTimeRef = useRef<number>(0);

  // UI Interaction Refs
  const lastStorageClickTimeRef = useRef<number>(0);

  // Speed Control
  const [speedMult, setSpeedMult] = useState(1);

  // Initialize Paths based on Galaxy & Width
  const generateGalaxyPaths = (galaxyNum: number) => {
      // Calculate World Width: Base + (50% per extra galaxy level)
      const newWorldWidth = gameWidth * (1 + (galaxyNum - 1) * 0.5);
      worldWidthRef.current = newWorldWidth;

      if (galaxyNum === 2) {
          // Galaxy 2: Double Path (V-Shape rotated)
          const p1 = generateRandomPath(gameWidth, gameHeight, gameHeight * 0.25, gameHeight * 0.5, newWorldWidth);
          const p2 = generateRandomPath(gameWidth, gameHeight, gameHeight * 0.75, gameHeight * 0.5, newWorldWidth);
          return [p1, p2];
      } else {
          // Galaxy 1 or 3+: Single Path
          return [generateRandomPath(gameWidth, gameHeight, undefined, undefined, newWorldWidth)];
      }
  };

  // Handle Viewport Inputs
  const handleWheel = useCallback((e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = 1.05; // Smoother zoom
      const delta = -Math.sign(e.deltaY);
      const newScale = delta > 0 ? view.scale * scaleFactor : view.scale / scaleFactor;
      
      // Clamp Scale
      const clampedScale = Math.min(Math.max(newScale, 0.3), 3.0);
      
      // Calculate mouse pos relative to canvas to zoom towards mouse
      if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // Calculate world coordinates of mouse before zoom
          const worldX = (mouseX - view.x) / view.scale;
          const worldY = (mouseY - view.y) / view.scale;

          // Calculate new offset to keep mouse over the same world coordinate
          const newX = mouseX - worldX * clampedScale;
          const newY = mouseY - worldY * clampedScale;

          setView({ x: newX, y: newY, scale: clampedScale });
      } else {
          setView(prev => ({ ...prev, scale: clampedScale }));
      }
  }, [view]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      lastMousePosRef.current = { x: clientX, y: clientY };
      dragStartPosRef.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const dx = clientX - lastMousePosRef.current.x;
      const dy = clientY - lastMousePosRef.current.y;
      
      setView(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy
      }));
      
      lastMousePosRef.current = { x: clientX, y: clientY };
  };

  const handleMouseUp = () => {
      isDraggingRef.current = false;
  };
  
  const zoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setView(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3.0) })); };
  const zoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setView(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.3) })); };


  // Detect Galaxy Change (Ascension)
  useEffect(() => {
      if (galaxy > gameStateRef.current.galaxy) {
          performGalaxyReset();
      }
  }, [galaxy]);

  // Detect Full Reset (New Game)
  useEffect(() => {
      if (fullResetTrigger > 0) {
          performGalaxyReset();
      }
  }, [fullResetTrigger]);

  // Detect Sector Jump
  useEffect(() => {
    if (resetTrigger > 0) {
       performSectorJump();
    }
  }, [resetTrigger]);

  const performGalaxyReset = () => {
    // Full Reset logic for new Galaxy
    gameStateRef.current.galaxy = galaxy;
    gameStateRef.current.level = 1;
    gameStateRef.current.wave = 1;
    
    // Scaling Starting Money: 200 * (1.5 ^ (galaxy-1))
    // G1: 200, G2: 300, G3: 450
    const startingMoney = Math.floor(200 * Math.pow(1.5, galaxy - 1));
    gameStateRef.current.money = startingMoney;
    
    gameStateRef.current.lives = 20;
    gameStateRef.current.score = 0;
    gameStateRef.current.isGameOver = false;
    
    // Clear entities
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    enemiesToSpawnRef.current = [];
    screenFlashRef.current = 0;
    
    // New Paths
    pathsRef.current = generateGalaxyPaths(galaxy);
    
    // Reset View
    setView({ x: 0, y: 0, scale: 1 });

    // Sync UI
    onMoneyChange(gameStateRef.current.money);
    onLivesChange(gameStateRef.current.lives);
    onWaveChange(1, 1);
    
    wavesQueuedRef.current = 0;
    waveActiveRef.current = false;
    
    playSound('START');
  };

  // --- FX Helpers ---
  const spawnParticles = (x: number, y: number, color: string, count: number, type: 'SPARK' | 'SMOKE' | 'RING' | 'IMPLOSION' | 'TEXT' | 'SHELL' | 'CLOUD' = 'SPARK', text?: string, rotation?: number) => {
    // PERFORMANCE: Hard cap on total particles. If over 120, ignore non-critical particles
    if (particlesRef.current.length > 120 && type !== 'TEXT' && type !== 'IMPLOSION') {
        return;
    }

    if (type === 'TEXT' && text) {
        particlesRef.current.push({
            id: Math.random().toString(36),
            x, y,
            vx: 0, vy: -1.5, // Float up
            life: 2.0,
            decay: 0.03, // Faster decay
            color,
            size: 14,
            type,
            text
        });
        return;
    }

    if (type === 'SHELL' && rotation !== undefined) {
         // Eject shell casing logic
         // Eject roughly perpendicular to rotation (to the right of gun)
         const ejectAngle = rotation + Math.PI/2 + (Math.random() * 0.2); 
         const speed = 3 + Math.random() * 2;
         particlesRef.current.push({
            id: Math.random().toString(36),
            x, y,
            vx: Math.cos(ejectAngle) * speed,
            vy: Math.sin(ejectAngle) * speed,
            life: 0.6, // Short life
            decay: 0.1, // Fade very fast
            color: '#facc15', 
            size: 2 + Math.random(),
            type: 'SHELL',
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.8
         });
         return;
    }

    // Optimization: Cap standard particle bursts severely
    // For simple hits, we only want 1-3 particles maximum
    let safeCount = count;
    if (type === 'SPARK' || type === 'SMOKE') {
        safeCount = Math.min(count, 3);
    }

    for (let i = 0; i < safeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'IMPLOSION' ? Math.random() * 2 + 4 : Math.random() * 3 + 1;
      particlesRef.current.push({
        id: Math.random().toString(36),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.05, // Fast decay to clear array
        color,
        size: type === 'RING' || type === 'IMPLOSION' ? 1 : (Math.random() * 3 + 1), // Smaller particles
        type
      });
    }
  };

  const spawnExplosion = (x: number, y: number, color: string, scale: number) => {
      // Optimized Explosion: Uses 1 Flash + 1 Ring + Fixed small count of clouds
      // This prevents lag on large explosions

      // 1. Flash Center
      particlesRef.current.push({
          id: Math.random().toString(36),
          x, y, vx: 0, vy: 0,
          life: 0.3, decay: 0.1,
          color: '#fff', size: scale,
          type: 'CLOUD'
      });

      // 2. Shockwave Ring
      particlesRef.current.push({
          id: Math.random().toString(36),
          x, y, vx: 0, vy: 0,
          life: 0.5, decay: 0.08,
          color: color, size: scale * 0.8,
          type: 'RING'
      });

      // 3. Minimal Cloud Puffs (Fixed Count: 3 max)
      const count = 3;
      for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 1.5;
          particlesRef.current.push({
              id: Math.random().toString(36),
              x: x + (Math.random() - 0.5) * (scale * 0.2),
              y: y + (Math.random() - 0.5) * (scale * 0.2),
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.4 + Math.random() * 0.2,
              decay: 0.08,
              color: color,
              size: scale * 0.4,
              type: 'CLOUD'
          });
      }
  };

  // --- Wave Logic ---
  const prepareWave = async (waveNum: number) => {
    waveActiveRef.current = true;
    // IMPORTANT: Use Virtual Game Time for wave spawning sync
    waveStartTimeRef.current = gameTimeRef.current;
    waveDelayTimerRef.current = 0;
    playSound('START');
    
    const currentLevel = gameStateRef.current.level;
    const isBossWave = waveNum === 5; // Boss is always Wave 5 of the Sector

    const spawnList: { template: Partial<Enemy>; time: number }[] = [];
    const analysisDescriptions: string[] = [];
    let bossInfoStr = undefined;

    if (isBossWave) {
        // Spawn Boss
        const bossConfig = generateBoss(currentLevel);
        spawnList.push({
            template: bossConfig,
            time: 2000
        });
        bossInfoStr = bossConfig.bossData?.name || "Unknown Titan";
        
        // Minions (Mixed bag of unlocked Tiers)
        const minionCount = 8 + (currentLevel * 3);
        for (let i = 0; i < minionCount; i++) {
             const minion = generateProceduralEnemyTemplate(currentLevel, waveNum);
             spawnList.push({
                 template: minion,
                 time: 4000 + (i * 400) // Fast stream after boss appears
             });
        }
        onAnalysisUpdate(`WARNING: ${bossInfoStr} DETECTED.`);
        playSound('ALARM');
    } else {
        // Standard Wave: MIXED ENEMIES
        const availableArchetypes: Partial<Enemy>[] = [];
        const maxAvailableTier = Math.min(5, currentLevel); 

        // Always include Tier 1 Fodder
        availableArchetypes.push(generateProceduralEnemyTemplate(currentLevel, waveNum, 1));
        
        // Add unlocked tiers to pool
        if (maxAvailableTier >= 2) availableArchetypes.push(generateProceduralEnemyTemplate(currentLevel, waveNum, 2));
        if (maxAvailableTier >= 3) availableArchetypes.push(generateProceduralEnemyTemplate(currentLevel, waveNum, 3));
        if (maxAvailableTier >= 4) availableArchetypes.push(generateProceduralEnemyTemplate(currentLevel, waveNum, 4));
        if (maxAvailableTier >= 5) availableArchetypes.push(generateProceduralEnemyTemplate(currentLevel, waveNum, 5));

        // Describe them for the analysis text
        availableArchetypes.forEach(a => analysisDescriptions.push(describeEnemy(a)));

        // Generate the spawn queue
        const waveDensity = 8 + Math.floor(waveNum * 1.5) + (currentLevel * 2);
        let currentTime = 500;

        for (let i = 0; i < waveDensity; i++) {
            let selectedIndex = Math.floor(Math.random() * availableArchetypes.length);
            
            if (selectedIndex === availableArchetypes.length - 1 && availableArchetypes.length > 1 && Math.random() < 0.3) {
                 selectedIndex = Math.floor(Math.random() * availableArchetypes.length);
            }
            
            const selected = availableArchetypes[selectedIndex];
            const isCluster = Math.random() > 0.8;
            const clusterSize = isCluster ? (selected.tier === 1 ? 4 : 2) : 1;

            for (let c=0; c<clusterSize; c++) {
                spawnList.push({
                    template: selected,
                    time: currentTime
                });
                currentTime += (selected.tier || 1) * 250; 
            }
            
            if (isCluster) currentTime += 800; 
        }
    }
    
    enemiesToSpawnRef.current = spawnList;

    if (wavesQueuedRef.current === 5 || wavesQueuedRef.current === 1 || isBossWave) {
       if (!isBossWave) onAnalysisUpdate(`Sector ${currentLevel} / Wave ${waveNum}: Scanning...`);
       
       if (Math.random() > 0.5 || isBossWave) {
           const advice = await getTacticalAnalysis(waveNum, analysisDescriptions, bossInfoStr);
           onAnalysisUpdate(advice);
       }
    }
  };

  const describeEnemy = (e: Partial<Enemy>) => {
      const tiers = ['Light', 'Elite', 'Champion', 'Titan', 'Behemoth'];
      const tierStr = tiers[(e.tier || 1) - 1] || 'Unknown';
      const shapeName = e.shape || 'Unknown Form';
      const traits = e.traits && e.traits.length > 0 ? e.traits.join(' & ') : 'Standard';
      return `${tierStr} ${traits} ${shapeName}`;
  };

  const performSectorJump = () => {
      let refundAmount = 0;
      towersRef.current.forEach(t => {
          refundAmount += TOWER_STATS[t.type].cost;
      });
      // Strict Integer Math for Refunds
      refundAmount = Math.floor(refundAmount * 0.8);
      
      gameStateRef.current.money = Math.floor(gameStateRef.current.money + refundAmount);
      gameStateRef.current.level += 1;
      // Reset wave to 1 for the new sector
      gameStateRef.current.wave = 1;
      
      towersRef.current = [];
      projectilesRef.current = [];
      enemiesRef.current = [];
      particlesRef.current = [];
      enemiesToSpawnRef.current = [];
      screenFlashRef.current = 0;
      
      // Re-generate paths based on current Galaxy
      pathsRef.current = generateGalaxyPaths(galaxy);
      
      playSound('START');
      onMoneyChange(gameStateRef.current.money);
      onWaveChange(gameStateRef.current.wave, gameStateRef.current.level);
      
      wavesQueuedRef.current = 0;
      waveActiveRef.current = false;
  };

  const handleDeployClick = useCallback(() => {
    if (gameStateRef.current.isGameOver || waveActiveRef.current || wavesQueuedRef.current > 0) return;
    wavesQueuedRef.current = 5;
    prepareWave(gameStateRef.current.wave);
  }, [onAnalysisUpdate]);

  // --- Input Handling ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (gameStateRef.current.isGameOver || isPaused) return;
    
    // Differentiate between drag and click
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    if (Math.sqrt(dx*dx + dy*dy) > 5) return; // It was a drag operation

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = gameWidth / rect.width;
    const scaleY = gameHeight / rect.height;
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    // Check Storage Area Click (Fixed UI element - Untransformed)
    const storageX = gameWidth - 60;
    const storageY = 60;
    const storageSize = 50;

    if (rawX >= storageX && rawX <= storageX + storageSize && rawY >= storageY && rawY <= storageY + storageSize) {
        const now = Date.now();
        if (now - lastStorageClickTimeRef.current < 400) {
            const heldTierStr = Object.keys(inventory).find(k => inventory[parseInt(k)] > 0);
            if (heldTierStr) {
                const tier = parseInt(heldTierStr);
                // STRICT INTEGER MATH
                const sellPrice = Math.floor(tier * 100 * modifiers.incomeMult);
                
                gameStateRef.current.money = Math.floor(gameStateRef.current.money + sellPrice);
                onMoneyChange(gameStateRef.current.money);
                onModuleSold(tier);
                
                spawnParticles(rawX + 25, rawY + 25, '#ffff00', 1, 'TEXT', `+${sellPrice}`);
                spawnParticles(rawX + 25, rawY + 25, '#ffff00', 5, 'SPARK');
                playSound('BUILD');
            }
        }
        lastStorageClickTimeRef.current = now;
        return; 
    }

    if (!selectedTower) {
        // Tap to shoot mechanic
        const worldX = (rawX - view.x) / view.scale;
        const worldY = (rawY - view.y) / view.scale;

        const damageRadius = 40;
        const damageAmount = 10 * modifiers.damageMult; // Base tap damage
        let hit = false;
        
        enemiesRef.current.forEach(enemy => {
            if (getDist({x: worldX, y: worldY}, enemy.position) < damageRadius + enemy.radius) {
                enemy.hp -= damageAmount;
                enemy.damageFlashTimer = 100;
                hit = true;
                
                // Spawn damage text
                spawnParticles(enemy.position.x, enemy.position.y - 10, '#ffffff', 1, 'TEXT', `-${Math.floor(damageAmount)}`);
            }
        });

        if (hit) {
            playSound('HIT');
            spawnParticles(worldX, worldY, '#00ffff', 10, 'SPARK');
        } else {
            // Just visual effect for tapping
            spawnParticles(worldX, worldY, '#00ffff', 3, 'SPARK');
        }
        return;
    }

    // TRANSFORM MOUSE TO WORLD COORDS
    // worldX = (screenX - panX) / scale
    const worldX = (rawX - view.x) / view.scale;
    const worldY = (rawY - view.y) / view.scale;

    const gridX = Math.floor(worldX / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridY = Math.floor(worldY / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    if (gridX < 0 || gridX > worldWidthRef.current || gridY < 0 || gridY > gameHeight) return;

    // Check collision with ALL paths (Grid Cell Based)
    let onPath = false;
    pathsRef.current.forEach(path => {
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            // Vertical Segment
            if (Math.abs(p1.x - p2.x) < 0.1) { 
                if (Math.abs(gridX - p1.x) < 0.1) { // Same Column
                     const minY = Math.min(p1.y, p2.y);
                     const maxY = Math.max(p1.y, p2.y);
                     if (gridY >= minY - 0.1 && gridY <= maxY + 0.1) onPath = true;
                }
            } 
            // Horizontal Segment
            else if (Math.abs(p1.y - p2.y) < 0.1) {
                if (Math.abs(gridY - p1.y) < 0.1) { // Same Row
                     const minX = Math.min(p1.x, p2.x);
                     const maxX = Math.max(p1.x, p2.x);
                     if (gridX >= minX - 0.1 && gridX <= maxX + 0.1) onPath = true;
                }
            }
        }
    });
    if (onPath) return;

    const collision = towersRef.current.some(t => getDist(t.position, {x: gridX, y: gridY}) < GRID_SIZE * 0.8);
    if (collision) return;

    const stats = TOWER_STATS[selectedTower];
    
    // --- COST LOGIC ---
    let cost = stats.cost;
    if (isConMode) {
        cost = 1;
    } else if (isQuantumSelection) {
        cost = 50; // Quantum Clone Cost
    }

    if (gameStateRef.current.money >= cost) {
      gameStateRef.current.money = Math.floor(gameStateRef.current.money - cost);
      
      towersRef.current.push({
        id: Math.random().toString(36).substr(2, 9),
        type: selectedTower,
        position: { x: gridX, y: gridY },
        range: stats.range,
        damage: stats.damage * modifiers.damageMult, // Apply Damage Mod
        cooldown: stats.cooldown,
        lastFired: gameTimeRef.current, // Initial cooldown
        targetId: null,
        angle: 0,
        level: 0, 
        burstCount: 0,
        inBurst: false,
        // Everymech initial state
        mechMode: 'MG',
        mgRampUp: 0,
        consecutiveTime: 0,
        // OSAPM Secondary
        lastSecondaryFired: 0
      });
      
      if (isQuantumSelection) {
          spawnParticles(gridX, gridY, '#f97316', 12, 'IMPLOSION'); // Quantum Effect
          spawnParticles(gridX, gridY, '#fff', 5, 'SPARK');
          if (onQuantumUsed) onQuantumUsed();
      } else {
          spawnParticles(gridX, gridY, '#00ffcc', 8, 'SPARK');
      }
      
      playSound('BUILD');
      onMoneyChange(gameStateRef.current.money);
      onPlaceTower();
    }
  };

  // --- Game Loop Logic ---
  const update = (gameTime: number, dt: number) => {
    // PAUSE LOGIC
    if (isPaused) return;

    if (gameStateRef.current.isGameOver) return;
    
    // Screen flash decay
    if (screenFlashRef.current > 0) {
        screenFlashRef.current -= 0.02 * (dt / 16);
        if (screenFlashRef.current < 0) screenFlashRef.current = 0;
    }

    // Wave Spawn
    if (waveActiveRef.current) {
        if (enemiesToSpawnRef.current.length > 0) {
            const elapsedWaveTime = gameTime - waveStartTimeRef.current;
            if (elapsedWaveTime >= enemiesToSpawnRef.current[0].time) {
                const spawnData = enemiesToSpawnRef.current.shift();
                if (spawnData) {
                  // Determine spawn path based on Galaxy Logic
                  const numPaths = pathsRef.current.length;
                  const pathId = numPaths > 1 ? Math.floor(Math.random() * numPaths) : 0;

                  // GALAXY DIFFICULTY SCALING
                  // Enemies get tougher each galaxy: +50% HP compounding, +10% Speed linear
                  const galaxyHpMult = Math.pow(1.5, gameStateRef.current.galaxy - 1);
                  const galaxySpeedMult = 1 + ((gameStateRef.current.galaxy - 1) * 0.1);

                  // Apply Modifiers to Spawn
                  const hp = (spawnData.template.hp || 10) * modifiers.enemyHpMult * galaxyHpMult;
                  const maxHp = (spawnData.template.maxHp || 10) * modifiers.enemyHpMult * galaxyHpMult;
                  const speed = (spawnData.template.speed || 1) * modifiers.enemySpeedMult * galaxySpeedMult;

                  enemiesRef.current.push({
                      id: Math.random().toString(36).substr(2, 9),
                      type: GolemType.PROCEDURAL,
                      position: { ...pathsRef.current[pathId][0] },
                      pathIndex: 0,
                      pathId: pathId,
                      distanceTraveled: 0,
                      hp,
                      maxHp,
                      speed,
                      reward: (spawnData.template.reward || 1) * modifiers.incomeMult,
                      color: spawnData.template.color || '#fff',
                      radius: spawnData.template.radius || 15,
                      shape: spawnData.template.shape || EnemyShape.ORB,
                      traits: spawnData.template.traits || [],
                      frozenFactor: 1,
                      frozenTimer: 0,
                      damageFlashTimer: 0,
                      irradiatedTimer: 0,
                      stunTimer: 0,
                      isBoss: spawnData.template.isBoss,
                      bossData: spawnData.template.bossData,
                      tier: spawnData.template.tier || 1
                  });
                }
            }
        } else if (enemiesRef.current.length === 0) {
            // Wave Clear
            waveActiveRef.current = false;
            
            if (gameStateRef.current.wave >= 5) {
                // Sector Complete (Wave 5 done)
                onSectorComplete(gameStateRef.current.level);
                wavesQueuedRef.current = 0; 
            } else {
                gameStateRef.current.wave += 1;
                // STRICT INTEGER MATH
                const waveBonus = Math.floor((150 + (gameStateRef.current.wave * 30)) * modifiers.incomeMult);
                gameStateRef.current.money = Math.floor(gameStateRef.current.money + waveBonus);
                
                onMoneyChange(gameStateRef.current.money);
                onWaveChange(gameStateRef.current.wave, gameStateRef.current.level);
                
                if (wavesQueuedRef.current > 1) {
                    wavesQueuedRef.current -= 1;
                    waveDelayTimerRef.current = 2000; 
                } else {
                    wavesQueuedRef.current = 0;
                }
            }
        }
    } else {
        if (wavesQueuedRef.current > 0) {
            waveDelayTimerRef.current -= dt;
            if (waveDelayTimerRef.current <= 0) prepareWave(gameStateRef.current.wave);
        }
    }

    // Update Enemies
    enemiesRef.current = enemiesRef.current.filter(enemy => {
      // Status Effects
      if (enemy.stunTimer && enemy.stunTimer > 0) {
          enemy.stunTimer -= dt;
          enemy.frozenFactor = 0; // Full stop
      } else {
        if (enemy.frozenTimer > 0) {
            enemy.frozenTimer -= dt;
            if (enemy.frozenTimer <= 0) enemy.frozenFactor = 1;
        }
        
        // Radiation Decay
        if (enemy.irradiatedTimer > 0) {
            enemy.irradiatedTimer -= dt;
            // Radiation slows enemies by 50%
            if (enemy.frozenTimer <= 0) enemy.frozenFactor = 0.5; 
        } else if (enemy.frozenTimer <= 0) {
            enemy.frozenFactor = 1;
        }
      }

      // Decrement flash timer
      if (enemy.damageFlashTimer > 0) {
          enemy.damageFlashTimer -= dt;
      }

      // Traits Logic
      if (enemy.traits.includes(EnemyTrait.REGEN)) {
          if (enemy.hp < enemy.maxHp) enemy.hp += (enemy.maxHp * 0.001) * (dt/16);
      }
      if (enemy.isBoss && enemy.bossData?.traits.includes(BossTrait.REGEN)) {
          if (enemy.hp < enemy.maxHp) enemy.hp += (enemy.maxHp * 0.0005) * (dt/16);
      }
      if (enemy.isBoss && enemy.bossData?.traits.includes(BossTrait.SPEEDSTER)) {
          if (Math.floor(gameTime / 3000) % 2 === 0) enemy.frozenFactor = 1.5;
          else if (enemy.frozenTimer <= 0 && enemy.irradiatedTimer <= 0) enemy.frozenFactor = 1.0;
      }

      const speed = (enemy.speed * enemy.frozenFactor * dt) / 16; 
      
      // Ensure pathId is valid
      const path = pathsRef.current[enemy.pathId] || pathsRef.current[0];
      
      // Calculate path movement
      let nextDist = enemy.distanceTraveled + speed;
      
      // Update position based on distance along path
      // Simple path interpolation logic
      let accumulatedDist = 0;
      let foundPos = false;
      
      for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i + 1];
          const segDist = getDist(p1, p2);
          
          if (nextDist <= accumulatedDist + segDist) {
              const t = (nextDist - accumulatedDist) / segDist;
              enemy.position.x = p1.x + (p2.x - p1.x) * t;
              enemy.position.y = p1.y + (p2.y - p1.y) * t;
              enemy.pathIndex = i;
              enemy.distanceTraveled = nextDist;
              foundPos = true;
              break;
          }
          accumulatedDist += segDist;
      }

      if (!foundPos) {
        // Reached end of path
        const dmg = enemy.isBoss ? 10 : enemy.tier; 
        gameStateRef.current.lives -= dmg;
        onLivesChange(gameStateRef.current.lives);
        playSound('ALARM');
        if (gameStateRef.current.lives <= 0) {
          gameStateRef.current.isGameOver = true;
          playSound('EXPLOSION');
          onAnalysisUpdate("CRITICAL FAILURE. BASE OVERRUN.");
        }
        return false;
      }

      return true;
    });

    // Towers Fire
    towersRef.current.forEach(tower => {
      const globalLevel = towerLevels[tower.type] || 0;
      const levelMultiplier = 1 + (globalLevel * 0.3);
      let currentDamage = Math.floor(tower.damage * levelMultiplier);

      // Constant Smoke for SIGMANATOR
      if (tower.type === TowerType.SIGMANATOR) {
          if (Math.random() < 0.2) { 
              const angle = Math.random() * Math.PI * 2;
              const ventX = tower.position.x - Math.cos(tower.angle) * 15;
              const ventY = tower.position.y - Math.sin(tower.angle) * 15;
              
              particlesRef.current.push({
                  id: Math.random().toString(),
                  x: ventX + (Math.random() - 0.5) * 10,
                  y: ventY + (Math.random() - 0.5) * 10,
                  vx: Math.cos(angle) * 0.2,
                  vy: -0.5 - Math.random(), 
                  life: 0.6,
                  decay: 0.05,
                  color: 'rgba(50, 50, 50, 0.4)',
                  size: 2 + Math.random() * 3,
                  type: 'SMOKE'
              });
          }
      }

      // OSAPM LOGIC - Main Attack (Orbital Strike)
      if (tower.type === TowerType.OSAPM) {
          const timeSinceFire = gameTime - tower.lastFired;
          
          // --- SECONDARY WEAPON: Small Missile Launcher (Front-Left) ---
          const secondaryCooldown = 750; // 0.75s fire rate (2x Faster)
          const secTimeSinceFire = gameTime - (tower.lastSecondaryFired || 0);

          if (secTimeSinceFire >= secondaryCooldown) {
              const secRange = 280; // Shorter range than main
              const enemiesInSecRange = enemiesRef.current.filter(e => getDist(tower.position, e.position) <= secRange);
              
              if (enemiesInSecRange.length > 0) {
                  // Target First Enemy (Closest to Base / Furthest Distance)
                  enemiesInSecRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
                  const secTarget = enemiesInSecRange[0];
                  
                  // Calculate angle for visual launcher
                  // Launcher Base relative to tower center: (-21 * 1.8, 0)
                  const launcherBaseX = tower.position.x - 38; 
                  const launcherBaseY = tower.position.y;
                  
                  const dx = secTarget.position.x - launcherBaseX;
                  const dy = secTarget.position.y - launcherBaseY;
                  tower.secondaryAngle = Math.atan2(dy, dx);
                  
                  // Fire Secondary Missile
                  tower.lastSecondaryFired = gameTime;
                  
                  // Calculate muzzle position based on rotated offset
                  // Barrel Length approx 10
                  const muzzleX = launcherBaseX + Math.cos(tower.secondaryAngle) * 10;
                  const muzzleY = launcherBaseY + Math.sin(tower.secondaryAngle) * 10;
                  
                  projectilesRef.current.push({
                      id: Math.random().toString(36).substr(2, 9),
                      type: 'OSAPM_MINI_MISSILE', 
                      position: { x: muzzleX, y: muzzleY },
                      targetId: secTarget.id,
                      speed: 16,
                      damage: 1000 * levelMultiplier * modifiers.damageMult, // Halved Damage
                      color: '#f97316', // Orange projectile
                      radius: 4,
                      splashRadius: 30, // Small Splash
                      angle: tower.secondaryAngle
                  });
                  
                  playSound('ROCKET');
                  // Visual flash
                  spawnParticles(muzzleX, muzzleY, '#f97316', 3, 'SPARK');
              }
          }

          // Reload Phase: 15s
          if (timeSinceFire > 15000 && !tower.ammoType) {
             tower.ammoType = Math.random() < 0.05 ? 'SPECIAL' : 'NORMAL';
             playSound('BUILD'); 
          }
          
          // Aiming/Wait Phase: 25s Total Cycle
          if (timeSinceFire < 25000) return;
          if (!tower.ammoType) return; 
      }

      // EVERYMECH Logic Setup
      if (tower.type === TowerType.EVERYMECH) {
          // Ramp Up Logic for MG
          if (tower.mechMode === 'MG' && tower.lastTargetId) {
              const targetExists = enemiesRef.current.find(e => e.id === tower.lastTargetId);
              if (targetExists) {
                  tower.consecutiveTime = (tower.consecutiveTime || 0) + dt;
                  const rampFactor = Math.min(1, tower.consecutiveTime / 2000);
                  tower.mgRampUp = 1 + (rampFactor * 4); 
              } else {
                  tower.lastTargetId = null;
                  tower.mgRampUp = 1;
                  tower.consecutiveTime = 0;
              }
          } else {
               tower.mgRampUp = 1;
               tower.consecutiveTime = 0;
          }
      }

      // Cooldown Check (Standard)
      if (tower.type !== TowerType.EVERYMECH) {
          if (tower.type === TowerType.ROCKET || tower.type === TowerType.BLASTER) {
            if (tower.inBurst) {
               const burstDelay = tower.type === TowerType.BLASTER ? 500 : 200; 
               if (gameTime - tower.lastFired < burstDelay) return;
            } else {
               if (gameTime - tower.lastFired < tower.cooldown) return;
            }
          } else if (tower.type !== TowerType.OSAPM) {
            if (gameTime - tower.lastFired < tower.cooldown) return;
          }
      }

      let target: Enemy | undefined;
      const enemiesInRange = enemiesRef.current.filter(e => getDist(tower.position, e.position) <= tower.range);
      if (enemiesInRange.length === 0) {
        tower.targetId = null;
        if (tower.type === TowerType.EVERYMECH) {
            tower.lastTargetId = null;
            tower.mgRampUp = 1;
            tower.consecutiveTime = 0;
        }
        return;
      }
      
      if (tower.type === TowerType.OSAPM) {
          // Target Highest Health
          enemiesInRange.sort((a, b) => b.hp - a.hp);
          target = enemiesInRange[0];
      } else if (tower.type === TowerType.EVERYMECH) {
          const boss = enemiesInRange.find(e => e.isBoss);
          if (boss) target = boss;
          else {
              enemiesInRange.sort((a, b) => getDist(tower.position, a.position) - getDist(tower.position, b.position));
              target = enemiesInRange[0];
          }
      } else {
          const boss = enemiesInRange.find(e => e.isBoss);
          if (boss) {
              target = boss;
          } else {
              enemiesInRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
              target = enemiesInRange[0];
          }
      }
      
      tower.targetId = target.id;
      const targetAngle = Math.atan2(target.position.y - tower.position.y, target.position.x - tower.position.x);
      
      if (tower.type !== TowerType.SIGMANATOR) {
          tower.angle = targetAngle;
      }

      // EVERYMECH Special Firing Logic
      if (tower.type === TowerType.EVERYMECH) {
          const dist = getDist(tower.position, target.position);
          
          let newMode: 'SNIPER' | 'MG' | 'HAMMER' = 'SNIPER';
          if (dist < 150) newMode = 'HAMMER'; 
          else if (dist < 400) newMode = 'MG';
          
          if (tower.mechMode !== newMode) {
              tower.mechMode = newMode;
              tower.lastTargetId = null;
              tower.mgRampUp = 1;
              tower.consecutiveTime = 0;
          }
          
          let effectiveCooldown = 1000;
          if (newMode === 'SNIPER') effectiveCooldown = 2000;
          else if (newMode === 'HAMMER') effectiveCooldown = 1000;
          else if (newMode === 'MG') {
               effectiveCooldown = 400 / (tower.mgRampUp || 1);
          }

          if (gameTime - tower.lastFired < effectiveCooldown) return;

          tower.lastFired = gameTime;
          tower.lastTargetId = target.id;
          tower.lastSpecialProc = false; 

          const baseDmg = Math.floor(currentDamage * (modifiers.damageMult || 1));
          
          if (newMode === 'SNIPER') {
              const sniperDmg = 5000 * levelMultiplier * modifiers.damageMult;
              
              if (Math.random() < 0.25) {
                  tower.lastSpecialProc = true; 
                  playSound('ROCKET');
                  projectilesRef.current.push({
                      id: Math.random().toString(),
                      type: 'EM_MISSILE',
                      position: { x: tower.position.x, y: tower.position.y }, 
                      targetId: target.id,
                      speed: 7, 
                      damage: sniperDmg, 
                      color: '#06b6d4', 
                      radius: 10,
                      splashRadius: 180, 
                      angle: targetAngle
                  });
              }

              playSound('LASER'); 
              const muzzleX = tower.position.x + Math.cos(targetAngle) * 70;
              const muzzleY = tower.position.y + Math.sin(targetAngle) * 70;
              
               projectilesRef.current.push({
                  id: Math.random().toString(),
                  type: 'EM_SNIPER',
                  position: { x: muzzleX, y: muzzleY },
                  targetId: target.id,
                  speed: 25, 
                  damage: sniperDmg,
                  color: '#f8fafc',
                  radius: 4,
                  angle: targetAngle
              });
              
              if (Math.random() < 0.5) spawnParticles(muzzleX, muzzleY, '#ffffff', 3, 'SMOKE');
              spawnParticles(muzzleX, muzzleY, '#fef08a', 2, 'SPARK');

          } else if (newMode === 'MG') {
              const mgDmg = 500 * levelMultiplier * modifiers.damageMult;
              
              const forwardOffset = 60;
              const rightOffset = 20;
              
              const muzzleX = tower.position.x + (forwardOffset * Math.cos(tower.angle)) - (rightOffset * Math.sin(tower.angle));
              const muzzleY = tower.position.y + (forwardOffset * Math.sin(tower.angle)) + (rightOffset * Math.cos(tower.angle));
              
              const firingAngle = Math.atan2(target.position.y - muzzleY, target.position.x - muzzleX);

              if (Math.random() > 0.6) playSound('PLASMA'); 

              if (Math.random() < 0.3) { 
                  const rightPerpAngle = tower.angle + Math.PI / 2;
                  const shellX = tower.position.x + Math.cos(tower.angle) * 10 + Math.cos(rightPerpAngle) * 10;
                  const shellY = tower.position.y + Math.sin(tower.angle) * 10 + Math.sin(rightPerpAngle) * 10;
                  
                  spawnParticles(shellX, shellY, '#facc15', 1, 'SHELL', undefined, tower.angle);
              }

              if (Math.random() < 0.05) {
                  tower.lastSpecialProc = true;
                  projectilesRef.current.push({
                      id: Math.random().toString(),
                      type: 'EM_GRENADE',
                      position: { x: tower.position.x, y: tower.position.y }, 
                      targetId: target.id,
                      speed: 6, 
                      damage: mgDmg, 
                      color: '#57534e', 
                      radius: 9, 
                      splashRadius: 100,
                      irradiateDuration: 10000, 
                      angle: targetAngle 
                  });
                  playSound('ROCKET'); 
              } else {
                   projectilesRef.current.push({
                      id: Math.random().toString(),
                      type: 'EM_BULLET',
                      position: { x: muzzleX, y: muzzleY },
                      targetId: target.id,
                      speed: 16,
                      damage: mgDmg,
                      color: '#fbbf24',
                      radius: 3,
                      angle: firingAngle 
                  });
                  if (Math.random() < 0.3) spawnParticles(muzzleX, muzzleY, '#fbbf24', 1, 'SPARK');
              }

          } else if (newMode === 'HAMMER') {
              const swordDmg = 3000 * levelMultiplier * modifiers.damageMult;
              
              playSound('LASER'); 

              const isKnockback = Math.random() < 0.5;
              if (isKnockback) tower.lastSpecialProc = true; 
              
              projectilesRef.current.push({
                  id: Math.random().toString(36),
                  type: 'EM_SLASH',
                  position: { x: target.position.x, y: target.position.y },
                  targetId: target.id,
                  speed: 0,
                  damage: swordDmg,
                  color: '#ef4444', 
                  radius: 60, 
                  splashRadius: 90,
                  timer: 200, 
                  hasDealtDamage: false,
                  knockbackForce: isKnockback ? 80 : 0 
              });
          }

          return;
      }


      if (tower.type === TowerType.LASER) {
         tower.lastFired = gameTime;
         let dmg = currentDamage;
         if (target.traits.includes(EnemyTrait.ARMORED) || (target.bossData?.traits.includes(BossTrait.ARMORED))) {
             dmg *= 0.6; 
         }
         
         if (target.irradiatedTimer > 0) dmg *= 5;

         target.hp -= dmg;
         target.damageFlashTimer = 50;
         
         if (Math.random() > 0.9) spawnParticles(target.position.x, target.position.y, '#ff00ff', 1, 'SPARK');
         if (Math.random() > 0.9) playSound('LASER');
      } else {
        
        if (tower.type === TowerType.ROCKET) {
            if (!tower.inBurst) {
                tower.inBurst = true;
                tower.burstCount = 0;
            }
            tower.burstCount = (tower.burstCount || 0) + 1;
            tower.lastFired = gameTime;
            if (tower.burstCount >= 5) {
                tower.inBurst = false;
                tower.burstCount = 0;
            }
        } else if (tower.type === TowerType.BLASTER) {
            if (!tower.inBurst) {
                tower.inBurst = true;
                tower.burstCount = 0;
            }
            tower.burstCount = (tower.burstCount || 0) + 1;
            tower.lastFired = gameTime;
            if (tower.burstCount >= 2) {
                tower.inBurst = false;
                tower.burstCount = 0;
            }
        } else {
             tower.lastFired = gameTime;
        }

        if (tower.type !== TowerType.BLACKHOLE) playSound(tower.type === TowerType.PLASMA ? 'PLASMA' : 'LASER');
        
        let muzzleOffset = 25;
        let muzzleX = tower.position.x + Math.cos(targetAngle) * muzzleOffset;
        let muzzleY = tower.position.y + Math.sin(targetAngle) * muzzleOffset;
        
        let projType: Projectile['type'] = 'BULLET';
        let speed = 14;
        let radius = 4;
        let splash = 0;
        let isGiant = false;
        let pathIndex = undefined;
        let piercing = false;
        let spawnPos = { x: muzzleX, y: muzzleY };
        let color = TOWER_STATS[tower.type].color;
        let projectileAngle = targetAngle;

        const shotAmmoType = tower.ammoType;

        if (tower.type === TowerType.PLASMA) {
             projType = 'PLASMA'; speed = 9; radius = 8; splash = 70;
        } else if (tower.type === TowerType.ROCKET) {
             projType = 'MISSILE'; speed = 12; radius = 6; splash = 25; 
        } else if (tower.type === TowerType.BLASTER) {
             projType = 'ARTILLERY'; speed = 6; radius = 6; splash = 0; color = '#9ca3af';
        } else if (tower.type === TowerType.SIGMANATOR) {
             const isPrecisionShot = Math.random() < 0.25;
             tower.lastShotWasPrecision = isPrecisionShot; 
             
             if (!isPrecisionShot) {
                 const spread = 1.6; 
                 const randomOffset = (Math.random() * spread) - (spread / 2);
                 projectileAngle = targetAngle + randomOffset;
             } else {
                 projectileAngle = targetAngle;
             }
             
             tower.angle = projectileAngle;

             muzzleX = tower.position.x + Math.cos(projectileAngle) * 40;
             muzzleY = tower.position.y + Math.sin(projectileAngle) * 40;
             spawnPos = { x: muzzleX, y: muzzleY };

             projType = 'SIGMA_SHELL'; 
             speed = 16; 
             radius = 14; 
             splash = 0; 
             color = '#8b5cf6'; 
             piercing = false;
             
             playSound('EXPLOSION'); 
             spawnParticles(muzzleX, muzzleY, '#000000', 8, 'SMOKE');
             spawnParticles(muzzleX, muzzleY, color, 5, 'SPARK');
             
             if (isPrecisionShot) {
                 spawnParticles(muzzleX, muzzleY, '#ffffff', 2, 'RING'); 
             }
             
        } else if (tower.type === TowerType.BLACKHOLE) {
             projType = 'BLACKHOLE'; speed = 3; radius = 24; piercing = true; 
             if (Math.random() < 0.10) {
                isGiant = true; radius = 60; speed = 1.5; color = '#60a5fa'; 
             }
             tower.lastShotWasGiant = isGiant; 
             pathIndex = target.pathIndex;
             spawnPos = { x: tower.position.x, y: tower.position.y };
             playSound('PLASMA');
        } else if (tower.type === TowerType.OSAPM) {
             projType = 'OSAPM_UP';
             spawnPos = { x: tower.position.x + 7, y: tower.position.y - 80 }; 
             speed = 4; 
             color = shotAmmoType === 'SPECIAL' ? '#ff5500' : '#ffffff';
             
             projectilesRef.current.push({
                id: Math.random().toString(36),
                type: 'OSAPM_MARKER',
                position: { ...target.position },
                targetId: target.id,
                speed: 0,
                damage: currentDamage, 
                color: color,
                radius: 50, 
                splashRadius: shotAmmoType === 'SPECIAL' ? 250 : 0,
                timer: 300, 
                maxTimer: 300,
                ammoType: shotAmmoType
             });
             
             playSound('ROCKET');
             tower.ammoType = undefined;
             spawnParticles(spawnPos.x, spawnPos.y, '#ffffff', 5, 'SMOKE');
             spawnParticles(spawnPos.x, spawnPos.y, '#f97316', 5, 'SPARK');
        }

        if (tower.type !== TowerType.OSAPM || projType === 'OSAPM_UP') {
            projectilesRef.current.push({
              id: Math.random().toString(36).substr(2, 9),
              type: projType,
              position: spawnPos,
              targetId: target.id, 
              speed,
              damage: isGiant ? (currentDamage * 10) : (tower.type === TowerType.BLACKHOLE ? currentDamage * 3 : currentDamage),
              color: color,
              radius,
              splashRadius: splash,
              slowEffect: tower.type === TowerType.CRYO,
              angle: projectileAngle, 
              isGiant,
              pathIndex,
              piercing,
              ammoType: shotAmmoType
            });
        }
      }
    });

    // Update Projectiles
    projectilesRef.current = projectilesRef.current.filter(proj => {
      const target = enemiesRef.current.find(e => e.id === proj.targetId);
      
      // --- EVERYMECH PROJECTILE HANDLING ---
      if (proj.type === 'EM_SLASH') {
          if (proj.timer !== undefined) {
              proj.timer -= dt;
              if (proj.timer <= 0) return false;
          }
          
          if (!proj.hasDealtDamage) {
             proj.hasDealtDamage = true; 
             
             enemiesRef.current.forEach(e => {
                 if (getDist(proj.position, e.position) <= (proj.splashRadius || 0)) {
                     let dmg = proj.damage;
                     if (e.irradiatedTimer > 0) dmg *= 5;
                     e.hp -= dmg;
                     e.damageFlashTimer = 200;
                     
                     if (proj.knockbackForce && proj.knockbackForce > 0) {
                         const force = e.isBoss ? proj.knockbackForce * 0.1 : proj.knockbackForce;
                         e.distanceTraveled = Math.max(0, e.distanceTraveled - force);
                     }
                     
                     spawnParticles(e.position.x, e.position.y, '#ef4444', 3, 'SPARK');
                 }
             });
          }
          return true; 
      }

      if (proj.type === 'EM_GRENADE') {
           const targetPos = target ? target.position : proj.position;
           const dx = targetPos.x - proj.position.x;
           const dy = targetPos.y - proj.position.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           const move = (proj.speed * dt) / 16;
           
           if (dist < move || dist < 10) {
               playSound('EXPLOSION');
               spawnParticles(proj.position.x, proj.position.y, '#22c55e', 12, 'SMOKE'); 
               spawnExplosion(proj.position.x, proj.position.y, '#22c55e', 45); 
               spawnParticles(proj.position.x, proj.position.y, '#4ade80', 8, 'SPARK'); 
               spawnParticles(proj.position.x, proj.position.y, '#fff', 1, 'RING'); 

               enemiesRef.current.forEach(e => {
                   if (getDist(proj.position, e.position) <= (proj.splashRadius || 0)) {
                       let dmg = proj.damage;
                       if (e.irradiatedTimer > 0) dmg *= 5;
                       e.hp -= dmg;
                       e.damageFlashTimer = 150;
                       if (proj.irradiateDuration) e.irradiatedTimer = proj.irradiateDuration;
                   }
               });
               return false;
           } else {
               proj.position.x += (dx/dist) * move;
               proj.position.y += (dy/dist) * move;
               return true;
           }
      }
      
      if (proj.type === 'OSAPM_MARKER') {
          if (target) {
              proj.position = { ...target.position };
          }
          
          if (proj.timer !== undefined) {
              proj.timer -= dt / 16; 
              if (proj.timer <= 0) {
                  playSound('EXPLOSION');
                  
                  if (proj.ammoType === 'SPECIAL') {
                      
                      spawnParticles(proj.position.x, proj.position.y, '#ffffff', 15, 'SPARK');
                      spawnParticles(proj.position.x, proj.position.y, '#fef08a', 20, 'SMOKE'); 

                      spawnExplosion(proj.position.x, proj.position.y, '#f97316', 80);

                      for(let i=0; i<12; i++) {
                          const angle = (Math.PI * 2 / 12) * i;
                          const speed = 8 + Math.random() * 4;
                          particlesRef.current.push({
                              id: Math.random().toString(),
                              x: proj.position.x,
                              y: proj.position.y,
                              vx: Math.cos(angle) * speed,
                              vy: Math.sin(angle) * speed,
                              life: 1.5,
                              decay: 0.05,
                              color: '#78716c', 
                              size: 10 + Math.random() * 10,
                              type: 'SMOKE'
                          });
                      }
                      
                      for(let i=0; i<6; i++) {
                          particlesRef.current.push({
                              id: Math.random().toString(),
                              x: proj.position.x + (Math.random()-0.5) * 20,
                              y: proj.position.y,
                              vx: (Math.random()-0.5) * 1,
                              vy: -5 - Math.random() * 3, 
                              life: 2.5,
                              decay: 0.02,
                              color: '#1c1917', 
                              size: 25,
                              type: 'SMOKE'
                          });
                      }

                      screenFlashRef.current = 1.0;
                      
                      enemiesRef.current.forEach(e => {
                         if (getDist(proj.position, e.position) <= (proj.splashRadius || 0)) {
                             e.hp -= proj.damage;
                             e.damageFlashTimer = 200;
                         }
                         e.irradiatedTimer = 10000; 
                      });
                      
                      onAnalysisUpdate("WARNING: TACTICAL NUCLEAR DETONATION DETECTED.");

                  } else {
                      spawnExplosion(proj.position.x, proj.position.y, '#cbd5e1', 40);
                      spawnParticles(proj.position.x, proj.position.y, '#f97316', 8, 'SPARK');
                      
                      const smallSplash = 60;
                      let hasHitMain = false;
                      
                      enemiesRef.current.forEach(e => {
                         if (getDist(proj.position, e.position) <= smallSplash) {
                             let dmg = proj.damage;
                             if (e.irradiatedTimer > 0) dmg *= 5;
                             e.hp -= dmg;
                             e.damageFlashTimer = 200;
                             if (target && e.id === target.id) hasHitMain = true;
                         }
                      });
                      
                      if (target && !hasHitMain) {
                           let dmg = proj.damage;
                           if (target.irradiatedTimer > 0) dmg *= 5;
                           target.hp -= dmg;
                           target.damageFlashTimer = 200;
                      }
                  }
                  return false;
              }
          }
          return true;

      } else if (proj.type === 'OSAPM_UP') {
          proj.speed += 0.5;
          proj.position.y -= (proj.speed * dt) / 16;
          if (Math.random() > 0.1) {
             spawnParticles(proj.position.x, proj.position.y + 30, proj.ammoType === 'SPECIAL' ? '#f97316' : '#fbbf24', 1, 'SMOKE');
          }
          if (proj.position.y < -150) return false;
          return true;

      } else if (proj.type === 'BLACKHOLE' && typeof proj.pathIndex === 'number') {
          const targetEnemy = target;
          const pathId = targetEnemy ? targetEnemy.pathId : 0;
          const path = pathsRef.current[pathId] || pathsRef.current[0];
          
          const targetPos = path[proj.pathIndex];
          
          if (targetPos) {
              if (proj.isGiant) {
                  const pullRadius = 200;
                  enemiesRef.current.forEach(e => {
                      const d = getDist(proj.position, e.position);
                      if (d < pullRadius) {
                          const pullForce = (e.isBoss ? 0.5 : 5.0) * (dt / 16); 
                          
                          if (proj.pathIndex !== undefined) {
                              if (e.pathIndex > proj.pathIndex) {
                                  e.distanceTraveled = Math.max(0, e.distanceTraveled - pullForce);
                              } else if (e.pathIndex < proj.pathIndex) {
                                  e.distanceTraveled += pullForce;
                              } else {
                                  e.frozenFactor = 0; 
                                  e.distanceTraveled = Math.max(0, e.distanceTraveled - (pullForce * 0.5));
                              }
                          }
                      }
                  });
              }
              const dx = targetPos.x - proj.position.x;
              const dy = targetPos.y - proj.position.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const move = (proj.speed * dt) / 16;
              if (dist < move) {
                  proj.position = { ...targetPos };
                  proj.pathIndex--; 
                  if (proj.pathIndex < 0) {
                      if (proj.isGiant) {
                          spawnParticles(proj.position.x, proj.position.y, '#3b82f6', 10, 'IMPLOSION');
                          spawnExplosion(proj.position.x, proj.position.y, '#3b82f6', 40); 
                          spawnParticles(proj.position.x, proj.position.y, '#ffffff', 5, 'RING');
                          playSound('EXPLOSION');
                          enemiesRef.current.forEach(e => {
                             if (getDist(proj.position, e.position) < 300) {
                                 let dmg = (proj.damage * 5);
                                 if (e.irradiatedTimer > 0) dmg *= 5;
                                 e.hp -= dmg;
                                 e.damageFlashTimer = 150;
                             }
                          });
                      }
                      return false; 
                  }
              } else {
                  proj.position.x += (dx / dist) * move;
                  proj.position.y += (dy / dist) * move;
              }
          } else {
              return false;
          }

      } else if ((proj.type === 'MISSILE' || proj.type === 'EM_MISSILE' || proj.type === 'OSAPM_MINI_MISSILE') && target) {
          const targetAngle = Math.atan2(target.position.y - proj.position.y, target.position.x - proj.position.x);
          const currentAngle = proj.angle || 0;
          let deltaAngle = targetAngle - currentAngle;
          while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
          while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
          const turnRate = 0.15; 
          const newAngle = currentAngle + Math.max(-turnRate, Math.min(turnRate, deltaAngle));
          proj.angle = newAngle;
          proj.position.x += Math.cos(newAngle) * (proj.speed * dt) / 16;
          proj.position.y += Math.sin(newAngle) * (proj.speed * dt) / 16;
          
          if (proj.type === 'OSAPM_MINI_MISSILE') {
             const trailX = proj.position.x - Math.cos(proj.angle||0) * 4;
             const trailY = proj.position.y - Math.sin(proj.angle||0) * 4;
             particlesRef.current.push({
                id: Math.random().toString(),
                x: trailX + (Math.random()-0.5)*2,
                y: trailY + (Math.random()-0.5)*2,
                vx: 0, vy: 0,
                life: 0.25,
                decay: 0.04,
                color: 'rgba(249, 115, 22, 0.6)',
                size: 4,
                type: 'SMOKE'
             });
          } else {
              if (Math.random() > 0.7) {
                 particlesRef.current.push({
                    id: Math.random().toString(),
                    x: proj.position.x - Math.cos(newAngle) * 10,
                    y: proj.position.y - Math.sin(newAngle) * 10,
                    vx: -Math.cos(newAngle) * 0.5 + (Math.random()-0.5),
                    vy: -Math.sin(newAngle) * 0.5 + (Math.random()-0.5),
                    life: 0.5,
                    decay: 0.08,
                    color: 'rgba(200, 200, 200, 0.5)',
                    size: 3,
                    type: 'SMOKE'
                 });
              }
          }
      } else if (proj.type === 'SIGMA_SHELL' || proj.type === 'EM_SNIPER' || proj.type === 'EM_BULLET') {
          const currentAngle = proj.angle || 0;
          const move = (proj.speed * dt) / 16;
          proj.position.x += Math.cos(currentAngle) * move;
          proj.position.y += Math.sin(currentAngle) * move;
          
          if (proj.type === 'SIGMA_SHELL') {
             if (Math.random() > 0.5) {
                particlesRef.current.push({
                    id: Math.random().toString(),
                    x: proj.position.x - Math.cos(currentAngle) * 15,
                    y: proj.position.y - Math.sin(currentAngle) * 15,
                    vx: (Math.random()-0.5) * 0.5, 
                    vy: (Math.random()-0.5) * 0.5,
                    life: 0.3,
                    decay: 0.1,
                    color: '#a855f7',
                    size: 6,
                    type: 'SMOKE'
                });
             }
          }

          if (proj.position.x < -50 || proj.position.x > worldWidthRef.current + 50 || proj.position.y < -50 || proj.position.y > gameHeight + 50) {
              return false;
          }

          const hitEnemy = enemiesRef.current.find(e => getDist(proj.position, e.position) < (e.radius + proj.radius));
          if (hitEnemy) {
             playSound(proj.type === 'SIGMA_SHELL' ? 'HIT' : 'HIT');
             
             if (proj.type === 'SIGMA_SHELL') {
                 spawnExplosion(proj.position.x, proj.position.y, proj.color, 15); 
             } else {
                 if (Math.random() < 0.3) spawnParticles(proj.position.x, proj.position.y, proj.color, 2, 'SPARK'); 
             }
             
             if (proj.type !== 'EM_BULLET') {
                 if (Math.random() < 0.3) spawnParticles(proj.position.x, proj.position.y, '#000000', 3, 'SMOKE'); 
             }
             
             let dmg = proj.damage;
             if (hitEnemy.traits.includes(EnemyTrait.ARMORED) || hitEnemy.bossData?.traits.includes(BossTrait.ARMORED)) {
                dmg *= 0.6;
             }
             if (hitEnemy.irradiatedTimer > 0) dmg *= 5;
             
             hitEnemy.hp -= dmg;
             hitEnemy.damageFlashTimer = 150;
             
             return false; 
          }
          return true;
      } else {
          const dest = target ? target.position : proj.position;
          if (!target && !proj.splashRadius) return false; 
          const dx = dest.x - proj.position.x;
          const dy = dest.y - proj.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const move = (proj.speed * dt) / 16;
          proj.angle = Math.atan2(dy, dx); 
          if (dist < move || (target && dist < target.radius)) {
          } else {
              proj.position.x += (dx / dist) * move;
              proj.position.y += (dy / dist) * move;
          }
      }

      let hasHit = false;
      let hitTarget: Enemy | undefined = undefined;

      if (proj.piercing) {
          if (!proj.isGiant) {
            enemiesRef.current.forEach(e => {
                if (getDist(proj.position, e.position) < (proj.radius + e.radius)) {
                    let dmg = (proj.damage * (dt / 16));
                    if (e.irradiatedTimer > 0) dmg *= 5; 
                    e.hp -= dmg; 
                    e.damageFlashTimer = 50;
                }
            });
          }
      } else {
          const distToTarget = target ? getDist(proj.position, target.position) : 9999;
          if (target && distToTarget < target.radius + proj.radius && proj.type !== 'SIGMA_SHELL' && proj.type !== 'EM_SNIPER' && proj.type !== 'EM_BULLET') {
              hasHit = true;
              hitTarget = target;
          }
          else if (proj.splashRadius) {
               const dest = target ? target.position : proj.position;
               if (getDist(proj.position, dest) < 10) hasHit = true;
          }

          if (hasHit) {
            playSound(proj.splashRadius ? 'EXPLOSION' : 'HIT');
            if (proj.splashRadius) {
              
              if (proj.type === 'EM_MISSILE') {
                 spawnExplosion(proj.position.x, proj.position.y, proj.color, 60); 
                 spawnParticles(proj.position.x, proj.position.y, '#fff', 8, 'CLOUD'); 
                 spawnParticles(proj.position.x, proj.position.y, '#cffafe', 10, 'SPARK');
                 spawnParticles(proj.position.x, proj.position.y, '#06b6d4', 2, 'RING');
              } else if (proj.type === 'OSAPM_MINI_MISSILE') {
                 spawnExplosion(proj.position.x, proj.position.y, '#f97316', 35);
                 spawnParticles(proj.position.x, proj.position.y, '#fdba74', 6, 'SPARK');
              } else {
                 spawnExplosion(proj.position.x, proj.position.y, proj.color, proj.splashRadius * 0.5);
                 spawnParticles(proj.position.x, proj.position.y, '#ffaa00', 2, 'SMOKE'); 
              }
              
              enemiesRef.current.forEach(e => {
                const isDirectHit = hitTarget && e.id === hitTarget.id;
                const inSplash = getDist(proj.position, e.position) <= (proj.splashRadius || 0);

                if (isDirectHit || inSplash) {
                    let dmg = proj.damage;
                    if (e.irradiatedTimer > 0) dmg *= 5;
                    e.hp -= dmg;
                    e.damageFlashTimer = 150; 
                    
                    if (proj.type === 'EM_MISSILE') {
                        e.frozenFactor = 0.5; 
                        e.frozenTimer = 15000; 
                    }
                }
              });
            } else if (hitTarget) {
              hitTarget.damageFlashTimer = 100; 
              
              let dmg = proj.damage;
              if (hitTarget.traits.includes(EnemyTrait.ARMORED) || hitTarget.bossData?.traits.includes(BossTrait.ARMORED)) {
                  dmg *= 0.6;
                  if (Math.random() < 0.3) spawnParticles(hitTarget.position.x, hitTarget.position.y, '#ffffff', 1, 'SPARK'); 
              }
              if (hitTarget.irradiatedTimer > 0) dmg *= 5;
              
              hitTarget.hp -= dmg;
              if (proj.slowEffect) {
                hitTarget.frozenFactor = 0.6;
                hitTarget.frozenTimer = 1500;
              }
            }
            return false; 
          }
      }
      return true;
    });

    // Update Particles
    particlesRef.current = particlesRef.current.filter(p => {
        if (p.type === 'CLOUD') {
             p.x += p.vx;
             p.y += p.vy;
             p.size += 0.5; // Expand
             p.vx *= 0.9;   // Drag
             p.vy *= 0.9;
        } else if (p.type === 'IMPLOSION') {
             p.x -= p.vx;
             p.y -= p.vy;
        } else if (p.type === 'TEXT') {
             p.y += p.vy; // Float Up
        } else if (p.type === 'SHELL') {
             p.x += p.vx;
             p.y += p.vy;
             p.rotation = (p.rotation || 0) + (p.vRot || 0);
        } else {
             p.x += p.vx;
             p.y += p.vy;
        }
        p.life -= p.decay;
        if (p.type === 'RING') p.size += 1.5;
        return p.life > 0;
    });

    // Death Check
    enemiesRef.current = enemiesRef.current.filter(e => {
      if (e.hp <= 0) {
        const reward = e.reward || 1;
        // STRICT INTEGER MATH
        gameStateRef.current.money = Math.floor(gameStateRef.current.money + reward);
        gameStateRef.current.score += Math.floor(reward * 10);
        
        const dropChance = 0.005 + ((gameStateRef.current.galaxy - 1) * 0.002);
        
        if (Math.random() < dropChance) {
            const droppedTier = e.tier || 1;
            const hasAnyModule = Object.values(inventory).some((count: any) => count > 0);
            if (!hasAnyModule) {
                onModuleCollect(droppedTier);
                spawnParticles(e.position.x, e.position.y, '#ffff00', 1, 'TEXT', `MOD [${ROMAN_NUMERALS[droppedTier]}]`);
                playSound('BUILD');
            }
        }

        if (e.isBoss) {
            spawnExplosion(e.position.x, e.position.y, e.color, 40); 
            spawnParticles(e.position.x, e.position.y, e.color, 20, 'SPARK');
            playSound('EXPLOSION');
            onAnalysisUpdate(`BOSS ELIMINATED. SECTOR SECURE.`);
        } else if (e.tier > 2) {
            spawnExplosion(e.position.x, e.position.y, e.color, 20);
            playSound('EXPLOSION');
        } else {
            spawnParticles(e.position.x, e.position.y, e.color, 3, 'SMOKE');
        }
        
        onMoneyChange(gameStateRef.current.money);
        return false;
      }
      return true;
    });
  };

  // --- High Fidelity Rendering ---
  const draw = (gameTime: number) => {
    // ... existing rendering code ...
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentThemeIndex = (gameStateRef.current.level - 1) % SECTOR_THEMES.length;
    const theme = SECTOR_THEMES[currentThemeIndex];
    const time = gameTime;

    // Clear & Fill Background (Full Canvas)
    if (galaxy === 2) {
        ctx.fillStyle = '#2e1065'; 
    } else {
        ctx.fillStyle = theme.bg;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height); 

    // SAVE CONTEXT & APPLY CAMERA TRANSFORM
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    // --- Draw World Background & Grid (Scaled) ---
    if (galaxy === 2) {
        for(let i=0; i<30; i++) {
            const cx = (Math.sin(i * 123) * 5000) % worldWidthRef.current;
            const cy = (Math.cos(i * 456) * 5000) % gameHeight;
            const r = 20 + (i * 5);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(Math.abs(cx), Math.abs(cy), r, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    } else {
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let x=0; x<=worldWidthRef.current; x+=GRID_SIZE) { ctx.moveTo(x,0); ctx.lineTo(x, gameHeight); }
        for(let y=0; y<=gameHeight; y+=GRID_SIZE) { ctx.moveTo(0,y); ctx.lineTo(worldWidthRef.current,y); }
        ctx.stroke();
    }
    
    // --- Paths ---
    pathsRef.current.forEach(path => {
        if (path.length < 2) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = GRID_SIZE * 0.7; 
        ctx.strokeStyle = theme.path; 
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for(let i=1; i<path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme.pathGlow;
        ctx.strokeStyle = theme.pathGlow;
        ctx.lineWidth = 4;
        ctx.stroke(); 
        const dashOffset = -time * 0.05;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 20]);
        ctx.lineDashOffset = dashOffset;
        ctx.shadowBlur = 5;
        ctx.stroke(); 
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        const start = path[0];
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(start.x, start.y, 10, 0, Math.PI*2); ctx.fill();
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 15;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(start.x, start.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    if (pathsRef.current.length > 0) {
        const lastPath = pathsRef.current[0];
        const base = lastPath[lastPath.length - 1];
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(base.x, base.y, 12, 0, Math.PI*2); ctx.fill();
        ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 20;
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(base.x, base.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Entity Rendering
    const highTierCount = enemiesRef.current.reduce((count, e) => ((e.tier || 1) > 3 ? count + 1 : count), 0);
    const globalSimplify = enemiesRef.current.length > 40;
    const heavySimplify = highTierCount > 3;

    const renderList = [
        ...towersRef.current.map(t => ({ type: 'TOWER', y: t.position.y, obj: t })),
        ...enemiesRef.current.map(e => ({ type: 'ENEMY', y: e.position.y, obj: e }))
    ];
    renderList.sort((a, b) => a.y - b.y);

    renderList.forEach(item => {
        if (item.type === 'TOWER') drawTower3D(ctx, item.obj as Tower, time);
        else {
            const e = item.obj as Enemy;
            if (e.isBoss) drawBoss(ctx, e, time);
            else {
                drawProceduralEnemy(ctx, e, time, globalSimplify || (heavySimplify && (e.tier||1) > 3));
            }
        }
    });

    // Projectiles
    projectilesRef.current.forEach(proj => {
        // ... (Keep existing projectile logic) ...
        ctx.save();
        if (proj.type === 'EM_SNIPER') {
             ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath();
             const tailLen = 20;
             ctx.moveTo(proj.position.x, proj.position.y);
             ctx.lineTo(proj.position.x - Math.cos(proj.angle||0)*tailLen, proj.position.y - Math.sin(proj.angle||0)*tailLen);
             ctx.stroke();
             ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, 2, 0, Math.PI*2); ctx.fill();
        } else if (proj.type === 'EM_BULLET') {
             ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 5;
             ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, 3, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        } else if (proj.type === 'EM_SLASH') {
             const progress = (proj.timer || 0) / 200; 
             ctx.translate(proj.position.x, proj.position.y);
             ctx.rotate(parseInt(proj.id.substr(0,2), 36) % 6); 
             ctx.globalAlpha = progress; ctx.scale(1 + (1-progress), 1 + (1-progress)); 
             ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20;
             ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 40, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
             ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 35, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
             ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        } else if (proj.type === 'EM_GRENADE') {
             ctx.translate(proj.position.x, proj.position.y); ctx.rotate(proj.angle || 0); ctx.scale(1.5, 1.5); 
             const grad = ctx.createLinearGradient(-4, -3, 4, 3);
             grad.addColorStop(0, '#57534e'); grad.addColorStop(0.5, '#a8a29e'); grad.addColorStop(1, '#44403c'); 
             ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(2, -3); ctx.quadraticCurveTo(5, 0, 2, 3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
             ctx.fillStyle = '#292524'; ctx.fillRect(-5, -3, 1, 6); ctx.fillStyle = '#b45309'; ctx.fillRect(-2, -3.2, 2, 6.4);
        } else if (proj.type === 'EM_MISSILE') {
             ctx.translate(proj.position.x, proj.position.y); ctx.rotate(proj.angle || 0); const scale = 1.5; ctx.scale(scale, scale);
             ctx.fillStyle = '#0891b2'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.lineTo(-10, 4); ctx.fill();
             const grad = ctx.createLinearGradient(-10, -3, 6, 3); grad.addColorStop(0, '#06b6d4'); grad.addColorStop(0.5, '#cffafe'); grad.addColorStop(1, '#06b6d4');
             ctx.fillStyle = grad; ctx.fillRect(-10, -3, 16, 6);
             const headGrad = ctx.createLinearGradient(6, 0, 14, 0); headGrad.addColorStop(0, '#06b6d4'); headGrad.addColorStop(1, '#ecfeff'); 
             ctx.fillStyle = headGrad; ctx.beginPath(); ctx.moveTo(6, -3); ctx.bezierCurveTo(12, -4, 14, 0, 14, 0); ctx.bezierCurveTo(14, 0, 12, 4, 6, 3); ctx.fill();
             if (Math.random() < 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-12 - Math.random()*4, (Math.random()-0.5)*4, 1, 0, Math.PI*2); ctx.fill(); }
        } else if (proj.type === 'OSAPM_MINI_MISSILE') {
            ctx.translate(proj.position.x, proj.position.y);
            ctx.rotate(proj.angle || 0);
            
            // Energy Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f97316';
            ctx.globalCompositeOperation = 'lighter';
            
            // Sharp Short Triangle
            ctx.fillStyle = '#f97316'; // Fully orange
            ctx.beginPath();
            ctx.moveTo(8, 0); // Tip
            ctx.lineTo(-4, 5); // Back
            ctx.lineTo(-2, 0); // Notch
            ctx.lineTo(-4, -5); // Back
            ctx.closePath();
            ctx.fill();
            
            // Core Highlight (still orange but brighter)
            ctx.fillStyle = '#fed7aa'; 
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.lineTo(-2, 2);
            ctx.lineTo(-2, -2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
        } else if (proj.type === 'OSAPM_MARKER') {
             const progress = (proj.timer || 0) / (proj.maxTimer || 1);
             const size = 30 + (progress * 100); 
             const color = proj.ammoType === 'SPECIAL' ? '#f97316' : '#f8fafc';
             ctx.translate(proj.position.x, proj.position.y); ctx.rotate(time * 0.005);
             ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + (Math.sin(time * 0.02) * 0.3);
             ctx.beginPath();
             ctx.moveTo(-size, -size/2); ctx.lineTo(-size, -size); ctx.lineTo(-size/2, -size);
             ctx.moveTo(size, -size/2); ctx.lineTo(size, -size); ctx.lineTo(size/2, -size);
             ctx.moveTo(-size, size/2); ctx.lineTo(-size, size); ctx.lineTo(-size/2, size);
             ctx.moveTo(size, size/2); ctx.lineTo(size, size); ctx.lineTo(size/2, size);
             ctx.stroke();
             if (proj.ammoType === 'SPECIAL') { ctx.beginPath(); ctx.arc(0, 0, size * 0.4, 0, Math.PI*2); ctx.setLineDash([4, 4]); ctx.stroke(); } 
             else { ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.setLineDash([2, 8]); ctx.stroke(); }
             ctx.globalAlpha = 1;
             const ticksToImpact = proj.timer || 0; const fallDuration = 50; 
             if (ticksToImpact <= fallDuration) {
                  const fallProgress = 1 - (ticksToImpact / fallDuration); const easeIn = fallProgress * fallProgress * fallProgress;
                  const startHeight = 900; const currentYOffset = -startHeight + (startHeight * easeIn);
                  ctx.rotate(-time * 0.005); ctx.translate(0, currentYOffset);
                  ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.rotate(Math.PI); 
                  const scale = proj.ammoType === 'SPECIAL' ? 4 : 2; ctx.scale(scale, scale); 
                  if (proj.ammoType === 'SPECIAL') {
                     const grad = ctx.createLinearGradient(-8, 0, 8, 0); grad.addColorStop(0, '#475569'); grad.addColorStop(0.5, '#0f172a'); grad.addColorStop(1, '#020617'); ctx.fillStyle = grad;
                     ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(7, -20); ctx.lineTo(-7, -20); ctx.fill();
                     const headGrad = ctx.createLinearGradient(0, -40, 0, -20); headGrad.addColorStop(0, '#fff7ed'); headGrad.addColorStop(0.4, '#f97316'); headGrad.addColorStop(1, '#7c2d12'); ctx.fillStyle = headGrad;
                     ctx.beginPath(); ctx.moveTo(-7, -20); ctx.lineTo(7, -20); ctx.lineTo(0, -45); ctx.fill();
                     ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5;
                     ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-16, 15); ctx.lineTo(-6, 15); ctx.fill(); ctx.stroke();
                     ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(16, 15); ctx.lineTo(6, 15); ctx.fill(); ctx.stroke();
                     const pulse = Math.abs(Math.sin(time * 0.01)); ctx.fillStyle = `rgba(249, 115, 22, ${0.5 + pulse * 0.5})`; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 15; ctx.fillRect(-2, -15, 4, 30); ctx.shadowBlur = 0;
                  } else {
                    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-6, -25, 12, 50);
                    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-6, -25); ctx.lineTo(6, -25); ctx.lineTo(0, -45); ctx.fill();
                    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(-14, 30); ctx.lineTo(-6, 25); ctx.fill(); ctx.beginPath(); ctx.moveTo(6, 20); ctx.lineTo(14, 30); ctx.lineTo(6, 25); ctx.fill();
                    ctx.fillStyle = '#ef4444'; ctx.fillRect(-6, -5, 12, 2); ctx.fillStyle = '#1e293b'; ctx.font = '3px monospace'; ctx.fillText("PLUTON", -5, 5);
                  }
             }
        } else if (proj.type === 'OSAPM_UP') {
            ctx.translate(proj.position.x, proj.position.y); const scale = proj.ammoType === 'SPECIAL' ? 4 : 2; ctx.scale(scale, scale); ctx.shadowBlur = 15; ctx.shadowColor = proj.color;
            if (proj.ammoType === 'SPECIAL') {
                const grad = ctx.createLinearGradient(-8, 0, 8, 0); grad.addColorStop(0, '#475569'); grad.addColorStop(0.5, '#0f172a'); grad.addColorStop(1, '#020617'); ctx.fillStyle = grad;
                ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(7, -20); ctx.lineTo(-7, -20); ctx.fill();
                const headGrad = ctx.createLinearGradient(0, -40, 0, -20); headGrad.addColorStop(0, '#fff7ed'); headGrad.addColorStop(0.4, '#f97316'); headGrad.addColorStop(1, '#7c2d12'); ctx.fillStyle = headGrad;
                ctx.beginPath(); ctx.moveTo(-7, -20); ctx.lineTo(7, -20); ctx.lineTo(0, -45); ctx.fill();
                ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-16, 15); ctx.lineTo(-6, 15); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(16, 15); ctx.lineTo(6, 15); ctx.fill(); ctx.stroke();
                const pulse = Math.abs(Math.sin(time * 0.01)); ctx.fillStyle = `rgba(249, 115, 22, ${0.5 + pulse * 0.5})`; ctx.shadowColor = '#f97316'; ctx.shadowBlur = 15; ctx.fillRect(-2, -15, 4, 30); ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-5, -20, 10, 40); ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(5, -20); ctx.lineTo(0, -35); ctx.fill();
                ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(-5, 15); ctx.lineTo(-12, 25); ctx.lineTo(-5, 20); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, 15); ctx.lineTo(12, 25); ctx.lineTo(5, 20); ctx.fill();
                ctx.fillStyle = '#ef4444'; ctx.fillRect(-5, 0, 10, 2);
            }
            ctx.shadowBlur = 20; ctx.shadowColor = '#f97316'; ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-4, 20); ctx.lineTo(4, 20); ctx.lineTo(0, 40 + Math.random() * 10); ctx.fill();
        } else if (proj.type === 'BLACKHOLE') {
             ctx.shadowBlur = proj.isGiant ? 50 : 20; ctx.shadowColor = proj.isGiant ? '#fff' : '#3b82f6';
             ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, proj.radius, 0, Math.PI * 2); ctx.fill();
             ctx.strokeStyle = proj.isGiant ? '#fff' : '#3b82f6'; ctx.lineWidth = proj.isGiant ? 4 : 2; ctx.stroke();
             ctx.beginPath(); ctx.strokeStyle = proj.isGiant ? '#60a5fa' : '#2563eb'; ctx.lineWidth = 1; ctx.ellipse(proj.position.x, proj.position.y, proj.radius * 1.5, proj.radius * 0.4, time / 200, 0, Math.PI * 2); ctx.stroke();
        } else if (proj.type === 'MISSILE') {
            ctx.translate(proj.position.x, proj.position.y); ctx.rotate(proj.angle || 0);
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-10, 10, 20, 6); 
            ctx.shadowBlur = 5; ctx.shadowColor = '#fcd34d'; ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-8, -3, 16, 6);
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 0); ctx.lineTo(8, 3); ctx.fill();
            ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-10, -8); ctx.lineTo(-2, -3); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-10, 8); ctx.lineTo(-2, 3); ctx.fill();
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(-10, -2, 2, 4);
        } else if (proj.type === 'ARTILLERY') {
            ctx.translate(proj.position.x, proj.position.y); ctx.rotate(proj.angle || 0); ctx.shadowBlur = 0; 
            ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.lineTo(-6, 3); ctx.fill();
            ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(2, -3); ctx.quadraticCurveTo(8, 0, 2, 3); ctx.fill();
            ctx.fillStyle = '#d97706'; ctx.fillRect(-4, -3.5, 2, 7); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-4, -1, 8, 1);
        } else if (proj.type === 'SIGMA_SHELL') {
            ctx.translate(proj.position.x, proj.position.y); ctx.rotate(proj.angle || 0);
            ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20; const scale = 1.3; ctx.scale(scale, scale);
            ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(6, -5); ctx.quadraticCurveTo(12, -5, 14, 0); ctx.quadraticCurveTo(12, 5, 6, 5); ctx.lineTo(-10, 5); ctx.closePath();
            const grad = ctx.createLinearGradient(-10, -5, 14, 5); grad.addColorStop(0, '#1e1b4b'); grad.addColorStop(0.5, '#000'); grad.addColorStop(1, '#4c1d95'); ctx.fillStyle = grad; ctx.fill();
            ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(2, 5); ctx.moveTo(4, -5); ctx.lineTo(8, 5); ctx.stroke();
            ctx.beginPath(); ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)'; ctx.lineWidth = 1; ctx.ellipse(-12, 0, 3, 7, 0, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur = 0;
        } else {
            ctx.shadowBlur = 15; ctx.shadowColor = proj.color; ctx.fillStyle = proj.color; ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, proj.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, proj.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    // Particles
    ctx.globalCompositeOperation = 'lighter';
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        if (p.type === 'RING') {
            ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
        } else if (p.type === 'CLOUD') {
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'TEXT') {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.text || '', p.x, p.y);
        } else if (p.type === 'SHELL') {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation || 0); ctx.fillStyle = '#facc15'; ctx.fillRect(-1.5, -0.5, 3, 1); ctx.restore();
        } else {
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    });
    ctx.globalCompositeOperation = 'source-over';
    
    // Restore coordinate system before UI
    ctx.restore();
    
    // Screen Flash Effect
    if (screenFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlashRef.current})`;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
    }

    // Draw Single Module Storage Slot (Fixed UI, no zoom)
    ctx.save();
    const drawY = 60;
    const bx = gameWidth - 60;
    const by = drawY;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 50, by); ctx.lineTo(bx + 50, by + 50); ctx.lineTo(bx + 15, by + 50); ctx.lineTo(bx, by + 35); ctx.closePath(); ctx.fill(); ctx.stroke();
    const heldTierStr = Object.keys(inventory).find(k => inventory[parseInt(k)] > 0);
    const heldTier = heldTierStr ? parseInt(heldTierStr) : null;
    if (heldTier) {
        ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 15; ctx.fillStyle = '#06b6d4'; 
        ctx.beginPath(); ctx.rect(bx + 10, by + 10, 30, 30); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ROMAN_NUMERALS[heldTier], bx + 25, by + 25);
        ctx.font = '9px monospace'; ctx.fillStyle = '#cyan'; ctx.fillText("HELD", bx + 25, by + 42); ctx.fillStyle = '#fef08a'; ctx.font = 'bold 9px monospace'; ctx.fillText("2xTAP:SELL", bx + 25, by + 62);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("EMPTY", bx + 25, by + 25);
    }
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.textAlign = 'center'; ctx.fillText("STORAGE", bx + 25, by - 5);
    ctx.restore();
  };

  // ... (Rest of the render functions: drawBoss, drawProceduralEnemy, drawTower3D kept as is) ...
  const drawBoss = (ctx: CanvasRenderingContext2D, boss: Enemy, time: number) => {
      if (!boss.bossData) return;
      const { x, y } = boss.position;
      const isFlashing = boss.damageFlashTimer > 0;
      const baseColor = isFlashing ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0,0,0,0.6)';
      if (boss.irradiatedTimer > 0) {
          ctx.save(); const pulse = 1 + Math.sin(time * 0.01) * 0.2; ctx.fillStyle = `rgba(255, 165, 0, ${0.4 * pulse})`; ctx.shadowColor = 'orange'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(x, y, boss.radius * 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = baseColor; ctx.beginPath(); ctx.ellipse(x, y + 15, boss.radius * 1.5, boss.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      boss.bossData.parts.forEach((part, idx) => {
          ctx.save(); let px = x + part.offset.x; let py = y + part.offset.y;
          if (part.orbitRadius) { const speed = part.rotationSpeed * 0.05; px = x + Math.cos(time * speed + idx) * part.orbitRadius; py = y + Math.sin(time * speed + idx) * part.orbitRadius; }
          ctx.translate(px, py); ctx.rotate(time * part.rotationSpeed); let pulseScale = 1; if (part.pulseSpeed) pulseScale = 1 + Math.sin(time * 0.005 * part.pulseSpeed) * 0.1; ctx.scale(pulseScale, pulseScale);
          const partColor = isFlashing ? '#ef4444' : part.color; ctx.fillStyle = partColor; ctx.shadowColor = partColor; ctx.shadowBlur = 15;
          ctx.beginPath();
          if (part.shape === 'CIRCLE') ctx.arc(0, 0, part.size, 0, Math.PI*2);
          else if (part.shape === 'SQUARE') ctx.rect(-part.size/2, -part.size/2, part.size, part.size);
          else if (part.shape === 'TRIANGLE') { ctx.moveTo(0, -part.size); ctx.lineTo(part.size, part.size); ctx.lineTo(-part.size, part.size); }
          else if (part.shape === 'HEX') { for(let i=0; i<6; i++) ctx.lineTo(Math.cos(i * Math.PI/3)*part.size, Math.sin(i * Math.PI/3)*part.size); }
          else if (part.shape === 'RING') { ctx.strokeStyle = partColor; ctx.lineWidth = 3; ctx.arc(0,0, part.size, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle = 'transparent'; }
          else if (part.shape === 'SPIKE') { ctx.moveTo(0, -part.size); ctx.lineTo(part.size * 0.25, part.size); ctx.lineTo(-part.size * 0.25, part.size); }
          if (part.shape !== 'RING') ctx.fill(); if (part.shape !== 'RING') { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore();
      });
      const hpPct = Math.max(0, boss.hp / boss.maxHp); const barW = 80; const barY = y - boss.radius - 25;
      ctx.fillStyle = '#111'; ctx.fillRect(x - barW/2, barY, barW, 8); ctx.fillStyle = hpPct > 0.5 ? '#8b5cf6' : '#ef4444'; ctx.fillRect(x - barW/2, barY, barW * hpPct, 8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - barW/2, barY, barW, 8);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText(boss.bossData.name, x, barY - 5); ctx.shadowBlur = 0;
  };

  const drawProceduralEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, simplified: boolean) => {
      const { x, y } = enemy.position; const r = enemy.radius; const tier = enemy.tier || 1;
      if (!simplified) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x, y + 5, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
      const isFrozen = enemy.frozenFactor < 1; const isFlashing = enemy.damageFlashTimer > 0;
      if (enemy.stunTimer && enemy.stunTimer > 0) { ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = '#facc15'; ctx.beginPath(); ctx.arc(x, y - r - 10, 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (enemy.irradiatedTimer > 0) { ctx.save(); const pulse = 1 + Math.sin(time * 0.01) * 0.2; ctx.fillStyle = `rgba(255, 165, 0, ${0.6 * pulse})`; ctx.shadowColor = 'orange'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      const mainColor = isFlashing ? '#ef4444' : (isFrozen ? '#dbeafe' : enemy.color);
      ctx.save(); ctx.translate(x, y);
      if (tier === 5) {
          ctx.beginPath(); ctx.fillStyle = '#020617'; ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();
          if (!simplified) { ctx.save(); ctx.rotate(time * 0.001); ctx.strokeStyle = mainColor; ctx.lineWidth = 3; const s = r * 1.2; ctx.strokeRect(-s/2, -s/2, s, s); ctx.rotate(time * -0.002); ctx.lineWidth = 1; ctx.strokeRect(-s/3, -s/3, s*0.66, s*0.66); ctx.restore(); ctx.beginPath(); ctx.strokeStyle = isFlashing ? '#fff' : mainColor; ctx.lineWidth = 2; ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.stroke(); }
      } else if (tier >= 3 && !simplified) {
          ctx.save(); ctx.rotate(time * 0.001); ctx.strokeStyle = mainColor; ctx.lineWidth = tier >= 4 ? 3 : 1; ctx.globalAlpha = 0.5; ctx.beginPath(); const ringSize = r * (tier >= 4 ? 1.8 : 1.4); const segments = 3; for(let i=0; i<segments; i++) { ctx.rotate(Math.PI * 2 / segments); ctx.moveTo(ringSize, 0); ctx.lineTo(ringSize * 0.8, ringSize * 0.2); } ctx.arc(0, 0, ringSize, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (enemy.traits.includes(EnemyTrait.SHIELDED) && !isFlashing) { ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI*2); ctx.stroke(); ctx.rotate(time * 0.002); ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI*1.5); ctx.stroke(); ctx.rotate(-time * 0.002); ctx.globalAlpha = 1.0; }
      if (!simplified && !isFlashing) { ctx.shadowColor = mainColor; ctx.shadowBlur = tier >= 4 ? 20 : 10; } ctx.fillStyle = mainColor;
      const drawShape = (size: number, shapeType: EnemyShape, rotation: number = 0) => {
          ctx.save(); ctx.rotate(rotation); ctx.beginPath();
          if (shapeType === EnemyShape.ORB) { ctx.arc(0, 0, size, 0, Math.PI*2); }
          else if (shapeType === EnemyShape.BOX) { ctx.rect(-size, -size, size*2, size*2); }
          else if (shapeType === EnemyShape.CRYSTAL) { ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, -size * 0.3); ctx.lineTo(size * 0.7, size * 0.3); ctx.lineTo(0, size); ctx.lineTo(-size * 0.7, size * 0.3); ctx.lineTo(-size * 0.7, -size * 0.3); }
          else if (shapeType === EnemyShape.SPIKE) { for(let i=0; i<4; i++) { ctx.rotate(Math.PI/2); ctx.lineTo(0, -size * 1.2); ctx.lineTo(size * 0.5, 0); } }
          else if (shapeType === EnemyShape.CORE) { ctx.arc(0,0, size, 0, Math.PI*2); }
          else if (shapeType === EnemyShape.DIAMOND) { ctx.moveTo(0, -size * 1.2); ctx.lineTo(size * 0.8, 0); ctx.lineTo(0, size * 1.2); ctx.lineTo(-size * 0.8, 0); }
          else if (shapeType === EnemyShape.HEXAGON) { for(let i=0; i<6; i++) { const angle = i * Math.PI / 3; ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size); } }
          else if (shapeType === EnemyShape.VORTEX) { for(let i=0; i<3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.arc(size * 0.5, 0, size * 0.6, 0, Math.PI * 1.5); ctx.lineWidth = 3; ctx.strokeStyle = mainColor; ctx.stroke(); } ctx.beginPath(); ctx.arc(0,0, size * 0.3, 0, Math.PI*2); }
          ctx.fill(); ctx.restore();
      };
      if (tier < 5) {
          if (tier >= 2) { if (!simplified) ctx.globalAlpha = 0.7; drawShape(r, enemy.shape, time * 0.002); if (!simplified) ctx.globalAlpha = 1.0; ctx.fillStyle = (tier === 5 && !isFlashing) ? '#000' : '#000'; drawShape(r * 0.6, enemy.shape, -time * 0.002); ctx.fillStyle = (tier === 5 && !isFlashing) ? '#fff' : mainColor; drawShape(r * 0.4, enemy.shape, time * 0.005); } else { drawShape(r, enemy.shape); if (!simplified && !isFlashing) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-r/3, -r/3, r/3, 0, Math.PI*2); ctx.fill(); } }
      }
      if (tier >= 4 && tier < 5 && !simplified) { ctx.strokeStyle = isFlashing ? '#fff' : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r*1.5, 0); ctx.lineTo(r*1.5, 0); ctx.moveTo(0, -r*1.5); ctx.lineTo(0, r*1.5); ctx.stroke(); }
      if (enemy.traits.includes(EnemyTrait.REGEN) && !isFlashing) { const pulse = (Math.sin(time * 0.01) + 1) / 2; ctx.fillStyle = '#f472b6'; ctx.globalAlpha = pulse; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
      if (enemy.traits.includes(EnemyTrait.ARMORED)) { ctx.fillStyle = isFlashing ? '#ef4444' : '#94a3b8'; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, -4); ctx.lineTo(r, 0); ctx.lineTo(0, 4); ctx.fill(); }
      let iconToDraw: 'REGEN' | 'FAST' | 'ARMORED' | 'TANK' | null = null;
      if (enemy.traits.includes(EnemyTrait.REGEN)) iconToDraw = 'REGEN'; else if (enemy.traits.includes(EnemyTrait.FAST)) iconToDraw = 'FAST'; else if (enemy.traits.includes(EnemyTrait.ARMORED)) iconToDraw = 'ARMORED'; else if (enemy.traits.includes(EnemyTrait.TANK)) iconToDraw = 'TANK';
      if (iconToDraw && !simplified) {
          const ir = r * 0.5; ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; ctx.beginPath(); ctx.arc(0, 0, ir * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          if (iconToDraw === 'REGEN') { ctx.strokeStyle = '#4ade80'; ctx.beginPath(); ctx.moveTo(0, -ir * 0.6); ctx.lineTo(0, ir * 0.6); ctx.moveTo(-ir * 0.6, 0); ctx.lineTo(ir * 0.6, 0); ctx.stroke(); } else if (iconToDraw === 'FAST') { ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.moveTo(ir * 0.2, -ir * 0.8); ctx.lineTo(-ir * 0.4, 0); ctx.lineTo(0, 0); ctx.lineTo(-ir * 0.2, ir * 0.8); ctx.lineTo(ir * 0.4, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); } else if (iconToDraw === 'ARMORED') { ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.moveTo(-ir * 0.6, -ir * 0.5); ctx.lineTo(ir * 0.6, -ir * 0.5); ctx.lineTo(ir * 0.6, 0); ctx.bezierCurveTo(ir * 0.6, ir * 0.6, 0, ir * 0.8, 0, ir * 0.8); ctx.bezierCurveTo(0, ir * 0.8, -ir * 0.6, ir * 0.6, -ir * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1; ctx.stroke(); } else if (iconToDraw === 'TANK') { ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.rect(-ir * 0.5, -ir * 0.5, ir, ir); ctx.fill(); ctx.strokeStyle = '#fcd34d'; ctx.strokeRect(-ir * 0.5, -ir * 0.5, ir, ir); }
      }
      ctx.restore();
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp); const barY = y - r - 12; const barW = 24 + (tier * 4); 
      ctx.fillStyle = '#111'; ctx.fillRect(x - barW/2, barY, barW, 4); if (enemy.traits.includes(EnemyTrait.SHIELDED)) ctx.fillStyle = '#60a5fa'; else ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444'; ctx.fillRect(x - barW/2, barY, barW * hpPct, 4);
      if (tier > 1) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.fillText(ROMAN_NUMERALS[tier] || '?', x + barW/2 + 4, barY + 4); }
  };
  
  const drawTower3D = (ctx: CanvasRenderingContext2D, tower: Tower, time: number) => {
      const { x, y } = tower.position;
      const stats = TOWER_STATS[tower.type];
      const timeSinceFire = time - tower.lastFired;
      let recoil = 0;
      let recoilMax = 8;
      if (tower.type === TowerType.BLASTER) recoilMax = 24; 
      if (tower.type === TowerType.OSAPM) recoilMax = 0; 
      if (tower.type === TowerType.SIGMANATOR) recoilMax = 0; 
      if (tower.type === TowerType.EVERYMECH) recoilMax = 0; 
      if (timeSinceFire < 200 && tower.type !== TowerType.SIGMANATOR && tower.type !== TowerType.EVERYMECH) { const t = timeSinceFire / 200; recoil = t < 0.1 ? (t / 0.1) * recoilMax : (1 - (t - 0.1) / 0.9) * recoilMax; }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 8, 24, 14, 0, 0, Math.PI * 2); ctx.fill();
      const gradBase = ctx.createLinearGradient(x-15, y-10, x+15, y+10); gradBase.addColorStop(0, '#334155'); gradBase.addColorStop(1, '#0f172a');
      if (tower.type !== TowerType.OSAPM && tower.type !== TowerType.SIGMANATOR && tower.type !== TowerType.EVERYMECH) { ctx.fillStyle = gradBase; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill(); }
      if (tower.type === TowerType.SIGMANATOR && tower.lastShotWasPrecision && timeSinceFire < 500) { const fade = 1 - (timeSinceFire / 500); const rise = (timeSinceFire / 500) * 30; ctx.save(); ctx.translate(x, y - 30 - rise); ctx.globalAlpha = fade; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; const chSize = 10; ctx.beginPath(); ctx.moveTo(0, -chSize); ctx.lineTo(0, chSize); ctx.moveTo(-chSize, 0); ctx.lineTo(chSize, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0,0, chSize * 0.6, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore(); }
      ctx.save();
      if (tower.type === TowerType.SIGMANATOR) {
          let scaleX = 1; let scaleY = 1; const animDur = 300; if (timeSinceFire < animDur) { const t = timeSinceFire / animDur; if (t < 0.3) { const squash = Math.sin((t / 0.3) * Math.PI); scaleX = 1 + (squash * 0.3); scaleY = 1 - (squash * 0.2); } else { const stretch = Math.sin(((t - 0.3) / 0.7) * Math.PI); scaleX = 1 - (stretch * 0.15); scaleY = 1 + (stretch * 0.15); } }
          const jitter = 0.5 + Math.random(); ctx.translate(x + (Math.random() - 0.5) * jitter, (y) + (Math.random() - 0.5) * jitter); ctx.scale(scaleX, scaleY);
          let spinAngle = 0; if (timeSinceFire < 600) { const progress = timeSinceFire / 600; const ease = 1 - Math.pow(1 - progress, 3); spinAngle = ease * (Math.PI * 4); } ctx.rotate(tower.angle + spinAngle);
      } else if (tower.type === TowerType.EVERYMECH) { ctx.translate(x, y); ctx.rotate(tower.angle); 
      } else if (tower.type !== TowerType.BLACKHOLE && tower.type !== TowerType.OSAPM) { ctx.translate(x, y - 8); ctx.rotate(tower.angle); ctx.translate(-recoil, 0); 
      } else if (tower.type === TowerType.OSAPM) { ctx.translate(x, y); 
      } else { ctx.translate(x, y - 8); }

      if (tower.type === TowerType.PULSE) {
          ctx.fillStyle = '#1a2e05'; ctx.fillRect(0, -6, 32, 12); ctx.fillStyle = '#365314'; ctx.fillRect(28, -7, 6, 14); ctx.fillStyle = '#3f6212'; ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(-16, -12); ctx.lineTo(-20, -8); ctx.lineTo(-20, 8); ctx.lineTo(-16, 12); ctx.lineTo(10, 12); ctx.lineTo(14, 6); ctx.lineTo(14, -6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a3e635'; ctx.fillRect(-10, -12, 5, 24);
      } else if (tower.type === TowerType.BLASTER) {
          ctx.fillStyle = '#292524'; ctx.fillRect(4, 4, 38, 8); ctx.fillRect(4, -12, 38, 8); ctx.fillStyle = '#000'; ctx.fillRect(42, -11, 3, 6); ctx.fillRect(42, 5, 3, 6); ctx.fillStyle = '#854d0e'; ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(-14, -22); ctx.lineTo(-18, -10); ctx.lineTo(-18, 10); ctx.lineTo(-14, 22); ctx.lineTo(10, 18); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a16207'; ctx.fillRect(-12, -14, 20, 28); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      } else if (tower.type === TowerType.LASER) {
          ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, -6, 40, 4); ctx.fillRect(0, 2, 40, 4); ctx.fillStyle = stats.color; ctx.globalAlpha = 0.8; ctx.fillRect(4, -2, 34, 4); ctx.globalAlpha = 1.0; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-20, -14); ctx.lineTo(-12, 0); ctx.lineTo(-20, 14); ctx.lineTo(0, 10); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(-5, -4); ctx.moveTo(-15, 8); ctx.lineTo(-5, 4); ctx.stroke();
      } else if (tower.type === TowerType.CRYO) {
          ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(28, -12); ctx.lineTo(28, 12); ctx.lineTo(0, 8); ctx.fill(); ctx.fillStyle = '#1e40af'; ctx.fillRect(-18, -14, 28, 28); ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(-18, -8, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-18, 8, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#e0f2fe'; ctx.globalAlpha = 0.3; ctx.fillRect(-14, -10, 20, 20); ctx.globalAlpha = 1.0;
      } else if (tower.type === TowerType.PLASMA) {
          ctx.fillStyle = '#4c0519'; ctx.fillRect(0, -10, 28, 20); ctx.fillStyle = stats.color; ctx.beginPath(); ctx.ellipse(28, 0, 4, 8, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.arc(-4, 0, 16, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#fda4af'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-4, 0, 10, 0, Math.PI*2); ctx.stroke();
      } else if (tower.type === TowerType.ROCKET) {
          ctx.fillStyle = '#facc15'; ctx.fillRect(-16, -12, 32, 24); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.strokeRect(-16, -12, 32, 24); ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(0, -12); ctx.lineTo(-16, 0); ctx.lineTo(-16, -8); ctx.fill(); ctx.fillStyle = '#1f2937'; ctx.fillRect(16, -10, 4, 20); ctx.fillStyle = '#7f1d1d'; ctx.fillRect(16, -8, 2, 16); ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      } else if (tower.type === TowerType.EVERYMECH) {
           const mode = tower.mechMode || 'MG';
          const isFiring = timeSinceFire < 150;
          const isSpecialProc = tower.lastSpecialProc && isFiring;
          const metallicGrad = ctx.createLinearGradient(-10, -10, 10, 20); metallicGrad.addColorStop(0, '#94a3b8'); metallicGrad.addColorStop(0.5, '#334155'); metallicGrad.addColorStop(1, '#1e293b');
          const darkArmorGrad = ctx.createLinearGradient(0, -20, 0, 20); darkArmorGrad.addColorStop(0, '#0f172a'); darkArmorGrad.addColorStop(0.5, '#334155'); darkArmorGrad.addColorStop(1, '#020617');
          const neonBlue = '#22d3ee'; const neonRed = '#ef4444'; const neonGreen = '#4ade80';
          ctx.scale(2.5, 2.5);
          ctx.save();
          ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(-12, 10); ctx.lineTo(-18, 20); ctx.lineTo(-8, 20); ctx.lineTo(-4, 10); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-18, -20); ctx.lineTo(-8, -20); ctx.lineTo(-4, -10); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#64748b'; ctx.fillRect(-16, 18, 6, 4); ctx.fillRect(-16, -22, 6, 4); ctx.restore();
          ctx.save();
          if (mode === 'MG') { ctx.fillStyle = '#d97706'; ctx.fillRect(-20, 4, 12, 14); ctx.strokeStyle = '#b45309'; ctx.strokeRect(-20, 4, 12, 14); ctx.beginPath(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([2, 2]); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-5, 20, 5, 12); ctx.stroke(); ctx.setLineDash([]); } 
          else if (mode === 'SNIPER') { ctx.fillStyle = '#0f172a'; ctx.fillRect(-20, -8, 10, 16); ctx.fillStyle = isFiring ? '#fff' : neonBlue; ctx.shadowColor = neonBlue; ctx.shadowBlur = 5; ctx.fillRect(-18, -6, 2, 12); ctx.fillRect(-14, -6, 2, 12); ctx.shadowBlur = 0; }
          ctx.fillStyle = metallicGrad; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(10, -16); ctx.lineTo(14, 0); ctx.lineTo(10, 16); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
          ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(6, -10); ctx.lineTo(10, 0); ctx.lineTo(6, 10); ctx.lineTo(-5, 8); ctx.fill();
          ctx.fillStyle = mode === 'SNIPER' ? neonBlue : (mode === 'MG' ? '#fbbf24' : neonRed); if (isFiring) ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, 0, 2, 0, Math.PI*2); ctx.fill();
          let headRecoil = 0; if (isSpecialProc) headRecoil = -3;
          ctx.save(); ctx.translate(headRecoil, 0); ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(6, -6); ctx.lineTo(9, 0); ctx.lineTo(6, 6); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = mode === 'SNIPER' ? neonBlue : (mode === 'MG' ? neonGreen : neonRed); ctx.lineWidth = 1.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 5; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(7, 0); ctx.lineTo(4, 3); ctx.stroke(); ctx.shadowBlur = 0;
          if (mode === 'SNIPER') { const podOffset = isSpecialProc ? 6 : 0; ctx.fillStyle = '#334155'; ctx.fillRect(-2, -7 - podOffset, 8, 4); ctx.fillStyle = '#ef4444'; if (isSpecialProc) { ctx.beginPath(); ctx.arc(2, -7 - podOffset, 1.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, -7 - podOffset, 1.5, 0, Math.PI*2); ctx.fill(); } ctx.fillStyle = '#334155'; ctx.fillRect(-2, 3 + podOffset, 8, 4); ctx.fillStyle = '#ef4444'; if (isSpecialProc) { ctx.beginPath(); ctx.arc(2, 5 + podOffset, 1.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, 5 + podOffset, 1.5, 0, Math.PI*2); ctx.fill(); } } 
          else if (mode === 'MG') { const jawOffset = isSpecialProc ? 4 : 0; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(6 + jawOffset, 4); ctx.lineTo(6 + jawOffset, 8); ctx.lineTo(0, 8); ctx.fill(); if (isSpecialProc) { ctx.fillStyle = neonGreen; ctx.shadowColor = neonGreen; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(4, 6, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } }
          ctx.restore();
          let recoilX = 0; let recoilY = 0; if (isFiring) { recoilX = -4 + Math.random(); if (mode === 'MG') recoilX = -1 + (Math.random() * -2); }
          ctx.save(); ctx.translate(recoilX, recoilY);
          if (mode === 'SNIPER') { ctx.fillStyle = '#1e293b'; ctx.fillRect(-12, 2, 16, 6); ctx.fillStyle = '#475569'; ctx.fillRect(4, 0, 24, 10); ctx.fillStyle = '#0f172a'; ctx.fillRect(28, 2, 50, 2); ctx.fillRect(28, 6, 50, 2); if (time % 200 < 100 || isFiring) { ctx.fillStyle = neonBlue; ctx.shadowColor = neonBlue; ctx.shadowBlur = 10; ctx.fillRect(28, 4, 48, 2); ctx.shadowBlur = 0; } ctx.fillStyle = '#cbd5e1'; ctx.fillRect(78, 1, 4, 8); ctx.fillStyle = '#020617'; ctx.fillRect(8, -5, 20, 5); ctx.fillStyle = neonBlue; ctx.beginPath(); ctx.ellipse(28, -2.5, 1, 2, 0, 0, Math.PI*2); ctx.fill(); } 
          else if (mode === 'MG') { ctx.fillStyle = '#334155'; ctx.fillRect(4, 4, 20, 12); ctx.fillStyle = darkArmorGrad; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 20); ctx.lineTo(20, 18); ctx.lineTo(20, 2); ctx.fill(); ctx.fillStyle = '#94a3b8'; const spin = (time / 20) % (Math.PI * 2); ctx.fillRect(24, 6 + Math.sin(spin)*3, 24, 2); ctx.fillRect(24, 10 + Math.cos(spin)*3, 24, 2); ctx.fillRect(24, 8 - Math.sin(spin)*3, 24, 2); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.strokeRect(46, 5, 2, 10); } 
          else if (mode === 'HAMMER') { const swingDuration = 450; const t = timeSinceFire / swingDuration; let armRotation = 0; if (timeSinceFire < swingDuration) { if (t < 0.3) { const windUp = t / 0.3; const ease = windUp * windUp; armRotation = -0.8 - (ease * 1.2); } else if (t < 0.6) { const slashT = (t - 0.3) / 0.3; const ease = 1 - Math.pow(1 - slashT, 4); armRotation = -2.0 + (ease * 4.5); } else { const recT = (t - 0.6) / 0.4; const ease = recT * (2 - recT); armRotation = 2.5 - (ease * 3.3); } } else { armRotation = -0.8; } ctx.save(); ctx.translate(8, 8); ctx.rotate(armRotation); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.roundRect(0, -3, 14, 6, 2); ctx.fill(); ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(24, -3); ctx.lineTo(24, 3); ctx.lineTo(12, 4); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(26, 0, 5, 0, Math.PI*2); ctx.fill(); ctx.translate(26, 0); if (t > 0.3 && t < 0.6) { ctx.save(); ctx.rotate(Math.PI / 2); const swipeOpacity = 1 - ((t - 0.3) / 0.3); ctx.fillStyle = `rgba(239, 68, 68, ${swipeOpacity * 0.5})`; ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(-40, 120); ctx.lineTo(60, 120); ctx.lineTo(20, 20); ctx.fill(); ctx.restore(); } ctx.rotate(Math.PI / 2); const drawCleaver = (blurAlpha = 1.0) => { ctx.save(); ctx.fillStyle = `rgba(30, 41, 59, ${blurAlpha})`; ctx.fillRect(-5, -12, 10, 28); ctx.fillStyle = `rgba(15, 23, 42, ${blurAlpha})`; ctx.beginPath(); ctx.moveTo(-12, 16); ctx.lineTo(12, 16); ctx.lineTo(14, 24); ctx.lineTo(-14, 24); ctx.fill(); ctx.fillStyle = `rgba(51, 65, 85, ${blurAlpha})`; ctx.beginPath(); ctx.moveTo(-4, 24); ctx.lineTo(-8, 90); ctx.lineTo(35, 110); ctx.lineTo(45, 95); ctx.lineTo(18, 24); ctx.closePath(); ctx.fill(); if (blurAlpha === 1.0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(-4, 40); ctx.lineTo(10, 45); ctx.lineTo(5, 24); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-2, 80, 4, 4); ctx.fillRect(-2, 70, 4, 4); } ctx.fillStyle = `rgba(239, 68, 68, ${blurAlpha})`; if (blurAlpha === 1.0) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20; } ctx.beginPath(); ctx.moveTo(18, 24); ctx.lineTo(45, 95); ctx.lineTo(35, 110); ctx.lineTo(25, 105); ctx.lineTo(12, 26); ctx.closePath(); ctx.fill(); ctx.strokeStyle = `rgba(255, 255, 255, ${blurAlpha * 0.8})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 24); ctx.lineTo(45, 95); ctx.lineTo(35, 110); ctx.stroke(); ctx.shadowBlur = 0; ctx.restore(); }; if (t > 0.3 && t < 0.5) { ctx.save(); ctx.rotate(-0.4); ctx.globalAlpha = 0.4; drawCleaver(0.5); ctx.restore(); } drawCleaver(1.0); ctx.restore(); } 
          if (mode !== 'HAMMER') { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, 10, 6, 0, Math.PI*2); ctx.fill(); } else { ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.stroke(); } ctx.restore(); ctx.restore();
      } else if (tower.type === TowerType.SIGMANATOR) {
          const scale = 1.4; ctx.scale(scale, scale); ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(10, -10); ctx.lineTo(18, -4); ctx.lineTo(18, 4); ctx.lineTo(10, 10); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#1e293b'; ctx.fillRect(10, -7, 22, 14); ctx.fillStyle = '#020617'; ctx.fillRect(30, -9, 6, 18); ctx.fillStyle = '#334155'; ctx.fillRect(31, -9, 1, 18); ctx.save(); ctx.translate(0, 14); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-10, -4, 20, 10, 2); ctx.fill(); const tankGrad = ctx.createLinearGradient(-8, 0, 8, 0); tankGrad.addColorStop(0, '#000'); tankGrad.addColorStop(0.5, '#581c87'); tankGrad.addColorStop(1, '#000'); ctx.fillStyle = tankGrad; ctx.fillRect(-8, -2, 16, 6); ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8; ctx.fillRect(-6, 0, 12, 2); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-8, -2, 16, 1); ctx.restore(); ctx.strokeStyle = '#171717'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(0, 5, 5, 5, 5, 0); ctx.stroke(); ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); const isLoaded = timeSinceFire > (stats.cooldown - 1500); if (isLoaded) { ctx.save(); ctx.translate(-6, 0); ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(12, -5); ctx.lineTo(16, 0); ctx.lineTo(12, 5); ctx.lineTo(0, 5); ctx.fill(); ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 5; ctx.fillRect(4, -5, 2, 10); ctx.shadowBlur = 0; ctx.restore(); } ctx.fillStyle = '#0f172a'; ctx.fillRect(-16, -8, 12, 16); ctx.strokeStyle = '#334155'; ctx.strokeRect(-16, -8, 12, 16); ctx.fillStyle = '#000'; ctx.fillRect(-18, -6, 2, 4); ctx.fillRect(-18, 2, 2, 4); const heat = Math.max(0, 1 - (timeSinceFire / 1000)); if (heat > 0) { ctx.fillStyle = `rgba(239, 68, 68, ${heat})`; ctx.fillRect(-18, -6, 2, 4); ctx.fillRect(-18, 2, 2, 4); }
      } else if (tower.type === TowerType.OSAPM) {
          ctx.scale(1.8, 1.8); 
          const animTime = time - tower.lastFired; 
          let launcherAngle = 0; 
          const fireRecoil = animTime < 500 ? Math.sin(animTime * 0.02) * 3 : 0; 
          if (animTime > 18000) { const raiseProgress = Math.min(1, (animTime - 18000) / 5000); const ease = raiseProgress < 0.5 ? 2 * raiseProgress * raiseProgress : -1 + (4 - 2 * raiseProgress) * raiseProgress; launcherAngle = ease * (Math.PI / 2); } else if (animTime < 2000) { launcherAngle = (Math.PI / 2) * (1 - (animTime / 2000)); } else { launcherAngle = 0; } 
          ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(-28, -18, 56, 8, 2); ctx.fill(); ctx.beginPath(); ctx.roundRect(-28, 10, 56, 8, 2); ctx.fill(); 
          ctx.fillStyle = '#0f172a'; for(let i=0; i<6; i++) { const wx = -20 + (i * 8); ctx.beginPath(); ctx.arc(wx, -14, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(wx, 14, 2.5, 0, Math.PI*2); ctx.fill(); } 
          ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-32, -8); ctx.lineTo(-20, -14); ctx.lineTo(28, -14); ctx.lineTo(32, -6); ctx.lineTo(32, 6); ctx.lineTo(28, 14); ctx.lineTo(-20, 14); ctx.lineTo(-32, 8); ctx.closePath(); ctx.fill(); 
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-25, -8); ctx.lineTo(-15, -14); ctx.lineTo(-12, -14); ctx.lineTo(-22, -8); ctx.fill(); ctx.fillRect(20, -14, 4, 28); 
          
          // --- Secondary Small Missile Launcher (Replaces Plate) ---
          ctx.save();
          // Translate to where the plate was (approx x=-21, y=0)
          ctx.translate(-21, 0); 
          // Base Pivot
          ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
          // Rotation
          const secRecoil = (time - (tower.lastSecondaryFired || 0)) < 150 ? -2 * (1 - (time - (tower.lastSecondaryFired||0))/150) : 0;
          ctx.rotate(tower.secondaryAngle || 0);
          ctx.translate(secRecoil, 0);
          
          // Mini Missile Pod Body (White)
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-4, -6, 14, 12, 2); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
          // Side Detail (Orange Stripe)
          ctx.fillStyle = '#ea580c'; ctx.fillRect(-2, -6, 4, 12);
          // Pod Face
          ctx.fillStyle = '#0f172a'; ctx.fillRect(8, -5, 3, 10);
          // Missiles (1 centered)
          const isSecLoaded = (time - (tower.lastSecondaryFired || 0)) > 200;
          if (isSecLoaded) { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(9.5, 0, 2.5, 0, Math.PI*2); ctx.fill(); }
          ctx.restore();

          // Main Launcher
          ctx.save(); const pivotX = 4; const pivotY = 0; ctx.translate(pivotX, pivotY + fireRecoil); ctx.rotate(launcherAngle); 
          let podLen = 32; let podHeight = 20; if (tower.ammoType === 'SPECIAL') { const expandDur = 800; const progress = Math.min(1, Math.max(0, (animTime - 15000) / expandDur)); const ease = 1 - Math.pow(1 - progress, 3); podLen = 32 + (12 * ease); podHeight = 20 + (8 * ease); } 
          if (tower.ammoType) { const isSpecial = tower.ammoType === 'SPECIAL'; ctx.save(); ctx.translate(32, 0); if (isSpecial) { ctx.scale(2.0, 2.0); const grad = ctx.createLinearGradient(0, -6, 0, 6); grad.addColorStop(0, '#475569'); grad.addColorStop(0.5, '#0f172a'); grad.addColorStop(1, '#020617'); ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-5, 5); ctx.lineTo(-40, 6); ctx.lineTo(-40, -6); ctx.fill(); const headGrad = ctx.createLinearGradient(-65, 0, -40, 0); headGrad.addColorStop(0, '#fff7ed'); headGrad.addColorStop(0.5, '#f97316'); headGrad.addColorStop(1, '#7c2d12'); ctx.fillStyle = headGrad; ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(-40, 6); ctx.lineTo(-65, 0); ctx.fill(); const pulse = Math.abs(Math.sin(time * 0.005)); ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10; ctx.fillStyle = `rgba(249, 115, 22, ${0.6 + pulse * 0.4})`; ctx.fillRect(-35, -2, 30, 4); ctx.shadowBlur = 0; } else { ctx.shadowBlur = 5; ctx.shadowColor = '#000'; ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-60, -7, 55, 14); ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-60, -7); ctx.lineTo(-60, 7); ctx.lineTo(-78, 0); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-50, -7, 4, 14); ctx.fillRect(-40, -7, 4, 14); } ctx.restore(); } ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.roundRect(-5, -podHeight/2, podLen, podHeight, 4); ctx.fill(); ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.roundRect(-5, -podHeight/2 - 2, podLen, podHeight/2 + 2, [4,4,0,0]); ctx.fill(); ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.roundRect(-5, 0, podLen, podHeight/2 + 2, [0,0,4,4]); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(-5, -podHeight/2, podLen, podHeight); ctx.fillStyle = '#f97316'; ctx.fillRect(10, -podHeight/2 + 4, 4, podHeight - 8); ctx.restore(); if (animTime > 18000) { if (Math.floor(time / 100) % 2 === 0) { ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(18, -8, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } }
      } else if (tower.type === TowerType.BLACKHOLE) {
          const isGiantShot = tower.lastShotWasGiant || false; const animDuration = isGiantShot ? 1200 : 600; const isShooting = timeSinceFire < animDuration; const t = Math.min(1, timeSinceFire / animDuration); let scaleAnim = 0; if (isShooting) { if (t < 0.1) scaleAnim = t / 0.1; else { const releaseT = (t - 0.1) / 0.9; scaleAnim = 1 + Math.sin(releaseT * Math.PI * 5) * Math.exp(-releaseT * 3) * 0.3; } } const baseScale = 2.2; const targetScale = isGiantShot ? 4.5 : 1.4; const envelope = isShooting ? Math.pow(1 - t, 0.5) : 0; const expansion = envelope * (targetScale - 1.0); const currentScale = baseScale + expansion + (isShooting ? 0 : Math.sin(time/200)*0.05); const stretchAmt = isShooting ? (1-t) * (isGiantShot ? 0.6 : 0.3) : 0; const jitter = isGiantShot && isShooting ? (Math.random() - 0.5) * 0.1 : 0; const scaleX = currentScale * (1 - stretchAmt + jitter); const scaleY = currentScale * (1 + stretchAmt + jitter); ctx.save(); ctx.scale(scaleX, scaleY); ctx.beginPath(); ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)'; ctx.lineWidth = 2; ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke(); ctx.save(); ctx.rotate(time * 0.0005); ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; ctx.lineWidth = 1; ctx.beginPath(); const dashLen = Math.PI / 4; for(let i=0; i<4; i++) { ctx.arc(0, 0, 22, i * Math.PI/2, i * Math.PI/2 + dashLen/2); ctx.stroke(); } ctx.restore(); ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.shadowColor = '#2563eb'; ctx.shadowBlur = 10; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.shadowBlur = 0; const rotation = (time / 400) + (isShooting ? Math.pow(1-t, 2) * 25 : 0); ctx.shadowBlur = isGiantShot && isShooting ? 60 : 20; ctx.shadowColor = isGiantShot ? '#ffffff' : '#3b82f6'; ctx.lineWidth = isGiantShot ? 3 : 2.5; ctx.strokeStyle = isGiantShot ? '#bfdbfe' : '#3b82f6'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 10, rotation, 0, Math.PI*2); ctx.stroke(); ctx.strokeStyle = isGiantShot ? '#60a5fa' : '#2563eb'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 18, -rotation * 1.2, 0, Math.PI*2); ctx.stroke(); if (isGiantShot) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 32, rotation * 0.5, 0, Math.PI*2); ctx.stroke(); } ctx.fillStyle = '#fff'; for(let i=0; i<3; i++) { const ang = (time * 0.002) + (i * (Math.PI * 2 / 3)); const rx = Math.cos(ang) * 28; const ry = Math.sin(ang) * 8; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI*2); ctx.fill(); } ctx.globalAlpha = 1.0; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill(); if (isShooting && t < 0.2) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - (t/0.2); ctx.beginPath(); ctx.arc(0,0, 16, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; } ctx.restore(); ctx.shadowBlur = 0;
      }
      ctx.restore();

      if (tower.type === TowerType.LASER && tower.targetId) {
          const target = enemiesRef.current.find(e => e.id === tower.targetId);
          if (target) { const barrelLen = 40 - recoil; const muzzleX = x + Math.cos(tower.angle) * barrelLen; const muzzleY = y - 8 + Math.sin(tower.angle) * barrelLen; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = stats.color; ctx.shadowBlur = 15; ctx.strokeStyle = stats.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(muzzleX, muzzleY); ctx.lineTo(target.position.x, target.position.y - 10); ctx.stroke(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      }
  };

  useEffect(() => {
    lastTimeRef.current = performance.now(); 
    const loop = (time: number) => {
      // Calculate Delta Time based on Real Time, but scaled by speedMult
      const realDt = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;
      
      const dt = realDt * speedMult; // Apply speed multiplier to physics step
      gameTimeRef.current += dt; // Accumulate Virtual Game Time
      
      update(gameTimeRef.current, dt);
      draw(gameTimeRef.current);
      
      frameIdRef.current = requestAnimationFrame(loop);
    };
    frameIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [towerLevels, inventory, galaxy, isConMode, isPaused, speedMult, isQuantumSelection, view]); 

  return (
    <div className={`relative group w-full h-full flex items-center justify-center ${className}`}>
      <canvas 
        ref={canvasRef} 
        width={gameWidth} 
        height={gameHeight}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className="cursor-crosshair rounded-lg shadow-2xl border-2 border-zinc-800 bg-black max-w-full max-h-full object-contain touch-none"
      />
      
      {/* Speed Toggle Button - Top Left of Canvas */}
      <div className="absolute top-20 left-4 z-30 flex gap-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSpeedMult(prev => prev === 1 ? 2 : 1);
          }}
          className={`
             flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold backdrop-blur shadow-lg transition-all
             ${speedMult === 2 
                ? 'bg-yellow-500 text-black border-yellow-400 animate-pulse' 
                : 'bg-black/40 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white'
             }
          `}
        >
           {speedMult === 1 ? <Play size={10} fill="currentColor" /> : <FastForward size={10} fill="currentColor" />}
           {speedMult}x
        </button>
      </div>
      
      {/* Zoom Controls - Top Right of Canvas (Below Storage) */}
      <div className="absolute top-20 right-4 z-30 flex flex-col gap-2">
          <button onClick={zoomIn} className="bg-black/40 hover:bg-zinc-800 text-zinc-400 p-2 rounded-lg border border-zinc-700 backdrop-blur">
              <ZoomIn size={16} />
          </button>
          <button onClick={zoomOut} className="bg-black/40 hover:bg-zinc-800 text-zinc-400 p-2 rounded-lg border border-zinc-700 backdrop-blur">
              <ZoomOut size={16} />
          </button>
      </div>

      {!waveActiveRef.current && wavesQueuedRef.current === 0 && !gameStateRef.current.isGameOver && !isPaused && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
           <button 
             onClick={handleDeployClick}
             className="pointer-events-auto bg-cyan-600/90 hover:bg-cyan-500 backdrop-blur text-white font-bold py-4 px-10 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-pulse border-2 border-cyan-400 uppercase tracking-widest transform hover:scale-105 transition-all active:scale-95"
           >
             Start
           </button>
        </div>
      )}
      {gameStateRef.current.isGameOver && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 backdrop-blur-sm rounded-lg">
           <div className="text-center p-10 border-2 border-red-900/50 bg-zinc-950/90 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.5)] max-w-md mx-4">
             <h1 className="text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 mb-4 tracking-tighter">CRITICAL FAILURE</h1>
             <p className="text-xl text-red-200 mb-10 font-mono border-t border-b border-red-900 py-2">DEFENSE PERIMETER BREACHED</p>
             <button 
               onClick={() => {
                 if (onReturnToMenu) onReturnToMenu();
                 else window.location.reload();
               }} 
               className="bg-red-600 hover:bg-red-500 text-white px-10 py-4 rounded-lg font-bold tracking-[0.2em] shadow-lg transition-all hover:scale-105 hover:shadow-red-500/50"
             >
               INITIATE REBOOT
             </button>
           </div>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;