

export enum GolemType {
  STONE = 'STONE',
  IRON = 'IRON',
  CRYSTAL = 'CRYSTAL',
  MAGMA = 'MAGMA',
  DARK_MATTER = 'DARK_MATTER',
  // New Generic Type
  PROCEDURAL = 'PROCEDURAL'
}

export enum TowerType {
  PULSE = 'PULSE',
  BLASTER = 'BLASTER',
  LASER = 'LASER',
  CRYO = 'CRYO',
  PLASMA = 'PLASMA',
  ROCKET = 'ROCKET',
  BLACKHOLE = 'BLACKHOLE',
  OSAPM = 'OSAPM',
  SIGMANATOR = 'SIGMANATOR',
  EVERYMECH = 'EVERYMECH'
}

export enum ServoType {
  THE_BUILDER = 'THE_BUILDER'
}

export interface ServoSkill {
  id: string;
  name: string;
  description: string;
  baseUnlockCost: number;
  currentLevel: number;
  baseChance: number;
  chanceIncrement: number;
  damageMultiplier: number;
}

export interface ServoData {
  id: string;
  type: ServoType;
  stats: {
    damageMult: number;
    fireRateMult: number;
  }; // Random IVs
  damageLevel?: number; // Added for basic attack damage upgrade
  skills: ServoSkill[];
}

export interface ServoEntity {
  id: string;
  type: ServoType;
  position: Vector2D;
  lastFired: number;
  targetId: string | null;
  angle: number;
  data: ServoData;
  activeMinions: MinionEntity[];
}

export interface MinionEntity {
  id: string;
  type: 'LOYAL_BUDDY' | 'BETTER_BUDDY';
  position: Vector2D;
  targetId: string | null;
  spawnTime: number;
  lifeTime: number;
  lastFired: number;
  damage: number;
}

export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export enum BossTrait {
  REGEN = 'REGEN',          // Heals over time
  ARMORED = 'ARMORED',      // Takes reduced damage
  SPEEDSTER = 'SPEEDSTER',  // Moves faster periodically
  SWARMER = 'SWARMER',      // Spawns minions
  PHANTOM = 'PHANTOM'       // Becomes semi-transparent and dodges shots
}

export enum EnemyShape {
  ORB = 'ORB',
  BOX = 'BOX',
  CRYSTAL = 'CRYSTAL',
  SPIKE = 'SPIKE',
  CORE = 'CORE',
  // New Variations
  DIAMOND = 'DIAMOND',
  HEXAGON = 'HEXAGON', // Replaced STAR
  VORTEX = 'VORTEX'
}

export enum EnemyTrait {
  NONE = 'NONE',
  FAST = 'FAST',         // Higher speed, lower HP
  TANK = 'TANK',         // Lower speed, huge HP, larger size
  ARMORED = 'ARMORED',   // Takes reduced damage
  REGEN = 'REGEN',       // Heals over time
  SHIELDED = 'SHIELDED'  // Has an extra layer of HP (visualized)
}

export interface BossPart {
  shape: 'CIRCLE' | 'SQUARE' | 'TRIANGLE' | 'RING' | 'HEX' | 'SPIKE';
  color: string;
  size: number;
  offset: { x: number; y: number };
  rotationSpeed: number;
  orbitRadius?: number;
  pulseSpeed?: number;
}

export interface BossData {
  name: string;
  traits: BossTrait[];
  parts: BossPart[];
  coreColor: string;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  type: GolemType; // Kept for legacy, usually PROCEDURAL now
  position: Vector2D;
  pathIndex: number;
  pathId: number; // 0 for main, 1 for secondary (Galaxy 2)
  distanceTraveled: number;
  
  // Stats
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  tier: number; // 1=Basic, 2=Elite, 3=Champion, 4=Titan, 5=Behemoth
  
  // Visuals & Mechanics
  color: string;
  radius: number;
  shape: EnemyShape;
  traits: EnemyTrait[];
  
  // Status Effects
  frozenFactor: number; // 0 to 1
  frozenTimer: number;
  damageFlashTimer: number; // Visual feedback for hit
  stunTimer?: number; // New stun effect
  
  // Oxium Fallout Effect
  irradiatedTimer: number; 
  
  // Boss specific
  isBoss?: boolean;
  bossData?: BossData;
}

export interface Tower {
  id: string;
  type: TowerType;
  position: Vector2D;
  range: number;
  damage: number;
  cooldown: number;
  lastFired: number;
  targetId: string | null;
  angle: number;
  level: number; // Instance level (visual mostly now, since we use global levels)
  burstCount?: number; 
  inBurst?: boolean;
  lastShotWasGiant?: boolean;
  // OSAPM Specific
  ammoType?: 'NORMAL' | 'SPECIAL'; 
  lastSecondaryFired?: number; // Secondary missile
  secondaryAngle?: number; 
  // Sigmanator Specific
  lastShotWasPrecision?: boolean;
  // Everymech Specific
  mechMode?: 'SNIPER' | 'MG' | 'HAMMER';
  mgRampUp?: number; // 0 to 1 factor or raw counter
  lastTargetId?: string | null;
  consecutiveTime?: number;
  lastSpecialProc?: boolean; // For visual recoil of head pods
}

export interface Projectile {
  id: string;
  type: 'BULLET' | 'MISSILE' | 'BEAM' | 'PLASMA' | 'BLACKHOLE' | 'ARTILLERY' | 'OSAPM_MARKER' | 'OSAPM_UP' | 'OSAPM_MINI_MISSILE' | 'SIGMA_SHELL' | 'EM_SNIPER' | 'EM_MISSILE' | 'EM_GRENADE' | 'EM_BULLET' | 'EM_SLASH' | 'SERVO_BLAST';
  position: Vector2D;
  targetId: string;
  speed: number;
  damage: number;
  color: string;
  radius: number;
  splashRadius?: number;
  slowEffect?: boolean;
  startPosition?: Vector2D;
  angle?: number;
  isGiant?: boolean; 
  pathIndex?: number;
  piercing?: boolean;
  hitList?: string[];
  // OSAPM Specific
  timer?: number;
  maxTimer?: number;
  ammoType?: 'NORMAL' | 'SPECIAL';
  // Special Effects
  stunDuration?: number;
  irradiateDuration?: number;
  hasDealtDamage?: boolean;
  knockbackForce?: number; // Amount to reduce distanceTraveled
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
  type: 'SPARK' | 'SMOKE' | 'RING' | 'IMPLOSION' | 'TEXT' | 'SHELL' | 'CLOUD';
  text?: string; // For module drops
  rotation?: number; // For shells
  vRot?: number;
}

export interface WaveConfig {
  waveNumber: number;
  enemies: { type: GolemType; count: number; interval: number }[];
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  level: number;
  galaxy: number; 
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  servium: number;
  servos: ServoData[];
  // Module System
  inventory: Record<number, number>; // Tier -> Count
  towerLevels: Partial<Record<TowerType, number>>; // Type -> Level
  // Ascension Modifiers
  modifiers: {
      damageMult: number;
      enemyHpMult: number;
      incomeMult: number;
      enemySpeedMult: number;
  };
}

export interface ParadoxChoice {
    id: string;
    name: string;
    fluff: string;
    stats: {
        dmg: number;
        income: number;
        hp: number;
        speed: number;
    };
    type: 'AGGRESSIVE' | 'GREEDY' | 'BALANCED' | 'CRATE' | 'QUANTUM';
    rewardTower?: TowerType; // For Quantum/Clone logic
}
