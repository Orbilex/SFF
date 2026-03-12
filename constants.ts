

import { GolemType, TowerType, ServoType, Vector2D, Rarity, BossData, BossPart, BossTrait, Enemy, EnemyShape, EnemyTrait } from './types';

export const GRID_SIZE = 50; 
export const MOBILE_WIDTH = 600;
export const MOBILE_HEIGHT = 720;
export const PC_WIDTH = 1200;
export const PC_HEIGHT = 720;

export const SERVO_STATS = {
  [ServoType.THE_BUILDER]: {
    name: 'The Builder',
    cost: 5, // Servium cost
    damage: 30,
    cooldown: 1000, // ms
    color: '#9333ea', // Purple glows
    desc: 'An elegant angular robot with a top hat. Uses a futuristic handcannon.',
    skills: [
      {
        id: 'loyal_buddy',
        name: 'Loyal Buddy',
        description: 'Spawns a bipedal robot that follows enemies and shoots them. Explodes after 30s.',
        baseUnlockCost: 1000,
        baseChance: 0.05,
        chanceIncrement: 0.01,
        damageMultiplier: 1.5
      },
      {
        id: 'better_buddy',
        name: 'Better Buddy',
        description: 'Spawns a giant mech that shoots rapid gatling missiles. Explodes after 50s dealing map-wide damage.',
        baseUnlockCost: 5000,
        baseChance: 0.005,
        chanceIncrement: 0.001,
        damageMultiplier: 2.0
      }
    ]
  }
};

export const ROMAN_NUMERALS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Visual Themes for Sectors
export const SECTOR_THEMES = [
  { 
    name: 'NEON DISTRICT', 
    bg: '#02040a', 
    grid: '#0f172a', 
    path: 'rgba(0, 200, 255, 0.2)', 
    pathGlow: 'cyan',
    wallColor: '#1e293b'
  },
  { 
    name: 'CRIMSON MARS', 
    bg: '#0f0202', 
    grid: '#2a0f0f', 
    path: 'rgba(255, 50, 0, 0.2)', 
    pathGlow: '#ef4444',
    wallColor: '#3f1010'
  },
  { 
    name: 'TOXIC WASTE', 
    bg: '#020a02', 
    grid: '#0f2a0f', 
    path: 'rgba(0, 255, 50, 0.2)', 
    pathGlow: '#22c55e',
    wallColor: '#052e16'
  },
  { 
    name: 'VOID NEXUS', 
    bg: '#0a020a', 
    grid: '#2a0f2a', 
    path: 'rgba(200, 0, 255, 0.2)', 
    pathGlow: '#d946ef',
    wallColor: '#2e052b'
  },
  { 
    name: 'GOLDEN PALACE', 
    bg: '#0a0802', 
    grid: '#2a250f', 
    path: 'rgba(255, 200, 0, 0.2)', 
    pathGlow: '#eab308',
    wallColor: '#2e2405'
  }
];

// Procedural Path Generator
export const generateRandomPath = (gameWidth: number, gameHeight: number, startY?: number, targetY?: number, totalWidth: number = gameWidth): Vector2D[] => {
  const points: Vector2D[] = [];
  const rows = Math.floor(gameHeight / GRID_SIZE);
  const halfGrid = GRID_SIZE / 2;
  
  // Start Y Logic (Centered)
  let currentY = startY !== undefined 
      ? Math.floor(startY / GRID_SIZE) * GRID_SIZE + halfGrid
      : Math.floor(Math.random() * (rows - 4) + 2) * GRID_SIZE + halfGrid;
  
  let currentX = 0;
  points.push({ x: currentX, y: currentY });
  
  // Initial drop to a cell center to ensure vertical moves are on squares, not lines
  currentX = halfGrid; 
  points.push({ x: currentX, y: currentY });

  // Max X center to turn at (Center of the last full col approx)
  // We subtract a buffer to allow for the final exit straight line
  const maxCenterX = Math.floor(totalWidth / GRID_SIZE) * GRID_SIZE - halfGrid; 

  while(currentX < maxCenterX) {
      const moveX = Math.floor(Math.random() * 3 + 2) * GRID_SIZE;
      let nextX = currentX + moveX;
      
      if (nextX > maxCenterX) nextX = maxCenterX;
      
      points.push({ x: nextX, y: currentY });
      currentX = nextX;
      
      if (currentX >= maxCenterX) break;
      
      let nextY;
      if (targetY !== undefined && currentX > totalWidth * 0.6) {
          // Guide towards target (Center snapped)
          const tY = Math.floor(targetY / GRID_SIZE) * GRID_SIZE + halfGrid;
          const diff = tY - currentY;
          // Move significantly towards target
          const step = Math.sign(diff) * Math.min(Math.abs(diff), GRID_SIZE * 3);
          nextY = currentY + step;
      } else {
          // Random walk (Center snapped)
          nextY = Math.floor(Math.random() * (rows - 2) + 1) * GRID_SIZE + halfGrid;
          while (Math.abs(nextY - currentY) < GRID_SIZE * 2) {
               nextY = Math.floor(Math.random() * (rows - 2) + 1) * GRID_SIZE + halfGrid;
          }
      }
      
      points.push({ x: currentX, y: nextY });
      currentY = nextY;
  }
  
  // Exit point
  if (targetY !== undefined) {
      const snappedTargetY = Math.floor(targetY / GRID_SIZE) * GRID_SIZE + halfGrid;
      points.push({ x: totalWidth, y: snappedTargetY });
  } else {
      points.push({ x: totalWidth, y: currentY });
  }
  
  return points;
};

// Deprecated but kept to avoid immediate refactor errors, mapped to generic values
export const GOLEM_STATS: Record<string, any> = {}; 

// --- Procedural Enemy Generator ---
// Supports Tiers: 1 (Basic), 2 (Elite), 3 (Champion), 4 (Titan), 5 (Behemoth)
export const generateProceduralEnemyTemplate = (level: number, wave: number, forceTier?: number): Partial<Enemy> => {
    // 1. Base Stats Scaling
    // HP grows with Level (Sector) exponentially and Wave linearly
    const sectorMult = Math.pow(1.4, level - 1);
    const waveMult = 1 + (wave * 0.15);
    let baseHp = 30 * sectorMult * waveMult;
    let baseSpeed = 0.8 + (Math.random() * 0.5);
    let reward = 5 + (level * 3) + Math.floor(wave * 0.8);
    let radius = 16;
    
    // Determine Tier based on Level Unlocks
    // Level 1 -> Tier 1
    // Level 2 -> Tiers 1, 2
    // Level 3 -> Tiers 1, 2, 3 ...
    let tier = 1;
    
    if (forceTier) {
        tier = forceTier;
    } else {
        const maxTier = Math.min(5, level); // Cap at Tier 5 or current level
        const roll = Math.random();
        
        // Probability distribution favoring lower tiers but allowing maxTier
        if (maxTier >= 5 && roll < 0.05) tier = 5;      // 5% Behemoth
        else if (maxTier >= 4 && roll < 0.15) tier = 4; // 10% Titan
        else if (maxTier >= 3 && roll < 0.30) tier = 3; // 15% Champion
        else if (maxTier >= 2 && roll < 0.50) tier = 2; // 20% Elite
        else tier = 1;                                  // 50% Basic
    }

    // Tier Multipliers (Stronger & Bigger)
    if (tier === 2) { // Elite
        baseHp *= 2.5;
        radius *= 1.25;
        reward *= 2;
        baseSpeed *= 0.9;
    } else if (tier === 3) { // Champion
        baseHp *= 6.0;
        radius *= 1.5;
        reward *= 5;
        baseSpeed *= 0.8;
    } else if (tier === 4) { // Titan
        baseHp *= 15.0;
        radius *= 1.8;
        reward *= 12;
        baseSpeed *= 0.7;
    } else if (tier === 5) { // Behemoth
        baseHp *= 35.0;
        radius *= 2.2;
        reward *= 25;
        baseSpeed *= 0.5;
    }

    // 2. Traits Generation
    const traits: EnemyTrait[] = [];
    const traitChance = 0.2 + (level * 0.1) + (tier * 0.1); // Higher tiers have more traits
    
    if (Math.random() < traitChance) {
        const roll = Math.random();
        if (roll < 0.25) traits.push(EnemyTrait.FAST);
        else if (roll < 0.50) traits.push(EnemyTrait.TANK);
        else if (roll < 0.70 && level > 1) traits.push(EnemyTrait.ARMORED);
        else if (roll < 0.85 && level > 2) traits.push(EnemyTrait.REGEN);
        else if (level > 2) traits.push(EnemyTrait.SHIELDED);
    }

    // Ensure Tier 3+ always has something interesting
    if (tier >= 3 && traits.length === 0) {
        traits.push(Math.random() > 0.5 ? EnemyTrait.SHIELDED : EnemyTrait.ARMORED);
    }
    // Tier 5 always Tanky
    if (tier === 5 && !traits.includes(EnemyTrait.TANK)) {
        traits.push(EnemyTrait.TANK);
    }

    // 3. Apply Traits Modifiers
    if (traits.includes(EnemyTrait.FAST)) {
        baseSpeed *= 1.6;
        baseHp *= 0.6;
        radius *= 0.85; // Smaller
    }
    if (traits.includes(EnemyTrait.TANK)) {
        baseSpeed *= 0.6;
        baseHp *= 2.8;
        radius *= 1.3; // Bigger
        reward *= 2;
    }
    if (traits.includes(EnemyTrait.SHIELDED)) {
        baseHp *= 1.2;
    }
    if (traits.includes(EnemyTrait.ARMORED)) {
        baseSpeed *= 0.9;
    }
    
    // 4. Visuals & Shapes
    // Default shape
    let shape = EnemyShape.ORB;
    
    if (tier === 1) {
        shape = Math.random() > 0.5 ? EnemyShape.ORB : EnemyShape.BOX;
    } else if (tier === 2) {
        shape = EnemyShape.BOX;
    } else if (tier === 3) {
        // Champions
        shape = Math.random() > 0.5 ? EnemyShape.CRYSTAL : EnemyShape.DIAMOND;
    } else if (tier === 4) {
        // Titans - Replaced STAR with HEXAGON
        shape = Math.random() > 0.5 ? EnemyShape.HEXAGON : EnemyShape.SPIKE;
    } else if (tier === 5) {
        // Behemoths are cores or vortexes
        shape = Math.random() > 0.5 ? EnemyShape.CORE : EnemyShape.VORTEX;
    }

    // Color based on traits or random neon
    let hue = Math.floor(Math.random() * 360);
    let saturation = 80;
    let lightness = 60;

    if (traits.includes(EnemyTrait.FAST)) hue = 45; // Yellow/Orange
    if (traits.includes(EnemyTrait.TANK)) hue = 120; // Green
    if (traits.includes(EnemyTrait.REGEN)) hue = 300; // Pink
    if (traits.includes(EnemyTrait.ARMORED)) hue = 200; // Blue/Cyan
    
    // Higher tiers are brighter/more intense
    if (tier > 1) lightness += 5;
    if (tier === 4) { saturation = 100; lightness = 75; } // Bright Metallic/Neon
    if (tier === 5) { 
        // Behemoth special coloring
        hue = Math.random() > 0.5 ? 0 : 270; // Red or Deep Purple
        saturation = 0; // Often white/black core overrides this in drawing
        lightness = 90; 
    } 
    
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    return {
        hp: Math.floor(baseHp),
        maxHp: Math.floor(baseHp),
        speed: baseSpeed,
        reward,
        color,
        radius,
        shape,
        traits,
        frozenFactor: 1,
        frozenTimer: 0,
        type: GolemType.PROCEDURAL,
        tier
    };
};

// --- Procedural Boss Generator ---
const BOSS_NAMES_PREFIX = ['VOID', 'NEON', 'OMEGA', 'CHRONO', 'HYPER', 'CYBER', 'IRON', 'STAR', 'NIGHT', 'APEX'];
const BOSS_NAMES_SUFFIX = ['WALKER', 'CRUSHER', 'SENTINEL', 'MIND', 'BEHEMOTH', 'ENGINE', 'WRAITH'];

const getRandomColor = (hueBase: number, variation: number) => {
    const h = hueBase + (Math.random() * variation - variation/2);
    const s = 70 + Math.random() * 30;
    const l = 40 + Math.random() * 20;
    return `hsl(${h}, ${s}%, ${l}%)`;
};

export const generateBoss = (level: number): Partial<Enemy> => {
    // 1. Identity & Traits (Generated First to influence stats)
    const pfx = BOSS_NAMES_PREFIX[Math.floor(Math.random() * BOSS_NAMES_PREFIX.length)];
    const sfx = BOSS_NAMES_SUFFIX[Math.floor(Math.random() * BOSS_NAMES_SUFFIX.length)];
    const name = `${pfx}-${sfx} MK.${level}`;

    const traits: BossTrait[] = [];

    // Bosses only get traits starting at Sector 3
    if (level >= 3) {
        const availableTraits = Object.values(BossTrait);
        const numTraits = Math.min(3, Math.ceil(level / 2));
        for(let i=0; i<numTraits; i++) {
            const t = availableTraits[Math.floor(Math.random() * availableTraits.length)];
            if (!traits.includes(t)) traits.push(t);
        }
    }

    // 2. Base Stats Calculation
    // HP scales with Level (Sector) exponentially
    const baseHp = 6500; 
    let hp = baseHp * Math.pow(1.6, level - 1); 
    let speed = 0.30 + (Math.random() * 0.15); 

    // 3. Random Variance (+/- 15%)
    // Ensures two bosses of the same level aren't identical
    const variance = 0.85 + (Math.random() * 0.30);
    hp *= variance;

    // 4. Trait Modifiers
    if (traits.includes(BossTrait.ARMORED)) {
        hp *= 1.4;    // +40% HP
        speed *= 0.8; // -20% Speed
    }
    if (traits.includes(BossTrait.SPEEDSTER)) {
        hp *= 0.7;    // -30% HP
        speed *= 1.5; // +50% Speed
    }
    if (traits.includes(BossTrait.REGEN)) {
        hp *= 0.85;   // -15% HP (offset by healing)
    }
    if (traits.includes(BossTrait.PHANTOM)) {
        hp *= 0.8;    // -20% HP (offset by dodge mechanics)
    }

    hp = Math.floor(hp);
    const reward = 800 * level;

    // 5. Visual Construction
    const hueBase = Math.random() * 360;
    const coreColor = getRandomColor(hueBase, 20);
    const parts: BossPart[] = [];

    parts.push({
        shape: Math.random() > 0.5 ? 'HEX' : 'SQUARE',
        color: coreColor,
        size: 30 + Math.random() * 10,
        offset: { x: 0, y: 0 },
        rotationSpeed: Math.random() * 0.05 * (Math.random() > 0.5 ? 1 : -1)
    });

    const layers = 3 + Math.floor(Math.random() * 3); // More layers
    for(let i=0; i<layers; i++) {
        const isOrbit = Math.random() > 0.4;
        if (isOrbit) {
            parts.push({
                shape: Math.random() > 0.5 ? 'CIRCLE' : 'TRIANGLE',
                color: getRandomColor(hueBase, 40),
                size: 6 + Math.random() * 10,
                offset: { x: 0, y: 0 },
                rotationSpeed: 0.02 + Math.random() * 0.05,
                orbitRadius: 40 + (i * 18),
                pulseSpeed: Math.random() * 0.2
            });
            if (Math.random() > 0.3) {
                 parts.push({
                    shape: parts[parts.length-1].shape,
                    color: parts[parts.length-1].color,
                    size: parts[parts.length-1].size,
                    offset: { x: 0, y: 0 },
                    rotationSpeed: parts[parts.length-1].rotationSpeed,
                    orbitRadius: parts[parts.length-1].orbitRadius,
                    pulseSpeed: parts[parts.length-1].pulseSpeed,
                });
            }
        } else {
            const offsetRange = 30;
            parts.push({
                shape: Math.random() > 0.5 ? 'SQUARE' : 'SPIKE',
                color: getRandomColor((hueBase + 180) % 360, 20),
                size: 12 + Math.random() * 12,
                offset: { x: (Math.random()-0.5)*offsetRange, y: (Math.random()-0.5)*offsetRange },
                rotationSpeed: 0
            });
        }
    }

    return {
        hp,
        maxHp: hp,
        speed,
        frozenFactor: 1,
        frozenTimer: 0,
        color: coreColor,
        radius: 45,
        isBoss: true,
        reward,
        type: GolemType.DARK_MATTER, 
        shape: EnemyShape.CORE,
        traits: [], // Uses bossData traits
        tier: 6, // Boss Tier (Above 5)
        bossData: {
            name,
            traits,
            parts,
            coreColor
        }
    };
};

export const TOWER_STATS: Record<TowerType, { 
  name: string; 
  cost: number; 
  range: number; 
  damage: number; 
  cooldown: number; 
  color: string;
  desc: string;
  rarity: Rarity;
  lore: string;
  tips: string;
  signature?: string;
  signatureDesc?: string;
}> = {
  [TowerType.PULSE]: { 
    name: 'Pulse Cannon', 
    cost: 50, 
    range: 140, 
    damage: 10, 
    cooldown: 400, 
    color: '#00FF00',
    desc: 'Rapid fire, low damage.',
    rarity: Rarity.COMMON,
    lore: 'In the early days of the Expansion, before the Golem threat materialized from the cosmic dust, the Pulse Cannon was merely a heavy-duty mining tool used to fracture asteroids in the Kuiper Belt. When the first wave of silicon-based entities attacked the outer colonies, desperate miners jury-rigged these excavators with military-grade capacitors and overclocked their cooling systems. The result was a rapid-fire energy weapon that, while lacking the punch of dedicated artillery, could lay down a withering hail of plasma bolts. It became the ubiquitous symbol of human resilience, a testament to the ingenuity of those who refused to be erased from the stars.',
    tips: 'Highly cost-effective. Build these in clusters early on to establish a strong perimeter.'
  },
  [TowerType.BLASTER]: { 
    name: 'Heavy Blaster', 
    cost: 250, 
    range: 180, 
    damage: 120, 
    cooldown: 3800, 
    color: '#FFD700',
    desc: 'Twin-barrel artillery. Fires heavy shells.',
    rarity: Rarity.COMMON,
    lore: 'The Heavy Blaster was born out of necessity during the Siege of Titan. Standard energy weapons were reflecting off the dense, crystalline carapaces of the Titan-class Golems. The United Earth Directorate commissioned a weapon that relied on brute, kinetic force. Firing superheated tungsten-carbide shells encased in a plasma envelope, the Heavy Blaster delivers staggering blunt-force trauma. The recoil is so immense that each emplacement must be anchored deep into the planetary crust, often causing localized seismic tremors with every volley. Crews operating these beasts often suffer from micro-fractures, a small price to pay for shattering the enemy\'s vanguard.',
    tips: 'Slow fire rate but high damage. Place near corners where it can fire down long straightaways.'
  },
  [TowerType.LASER]: { 
    name: 'Photon Beam', 
    cost: 1500, 
    range: 200, 
    damage: 25, 
    cooldown: 50, 
    color: '#FF00FF',
    desc: 'High intensity continuous laser capable of melting armor.',
    rarity: Rarity.EPIC,
    lore: 'A marvel of optical engineering, the Photon Beam was initially a theoretical project aimed at transmitting power across vast interstellar distances. When weaponized, the continuous stream of coherent light proved capable of superheating any known material until it vaporized. The core of the tower houses a miniaturized fusion reactor solely dedicated to powering the emitter array. The beam doesn\'t just cut through armor; it causes the internal structures of the Golems to boil and expand, leading to catastrophic internal ruptures. The eerie silence of its operation is contrasted only by the deafening hiss of melting metal and the screams of boiling atmosphere.',
    tips: 'Excellent against high-HP, armored targets. Its continuous beam melts through defenses.'
  },
  [TowerType.CRYO]: { 
    name: 'Cryo Projector', 
    cost: 150, 
    range: 120, 
    damage: 6, 
    cooldown: 800, 
    color: '#00BFFF',
    desc: 'Slows enemies down.',
    rarity: Rarity.RARE,
    lore: 'Originally a terraforming engine designed to flash-freeze atmospheric moisture and build polar ice caps on barren worlds, the Cryo Projector was weaponized when commanders realized that slowing the Golem advance was just as crucial as destroying them. By overriding the safety protocols, the projector unleashes a torrent of absolute-zero liquid helium and specialized endothermic nanoparticles. The resulting thermal shock makes enemy armor brittle and sluggish, freezing their internal fluid-hydraulics. The area around a Cryo Projector is a desolate, frost-covered wasteland, a chilling reminder of the cold void of space.',
    tips: 'Place at key intersections. Slowing enemies allows your other towers to deal significantly more damage.'
  },
  [TowerType.PLASMA]: { 
    name: 'Plasma Mortar', 
    cost: 300, 
    range: 280, 
    damage: 70, 
    cooldown: 2200, 
    color: '#FF1493',
    desc: 'Huge splash damage.',
    rarity: Rarity.RARE,
    lore: 'The Plasma Mortar is a terrifying weapon that lobs unstable spheres of stellar matter contained within fragile magnetic bubbles. Developed by the eccentric weapons designer Dr. Aris Thorne, the mortar was initially deemed too dangerous for deployment after a prototype vaporized a testing facility. In the field, the magnetic containment field is designed to collapse upon impact, releasing a miniature supernova that incinerates everything within its blast radius. The sheer heat turns sand into glass and metal into slag, making it the ultimate crowd-control weapon against swarming Golem broods.',
    tips: 'Best used against swarms of weaker enemies. The splash damage is devastating when enemies are clumped together.'
  },
  [TowerType.ROCKET]: { 
    name: 'V-5 Battery', 
    cost: 450, 
    range: 320, 
    damage: 140, 
    cooldown: 2500, 
    color: '#facc15', 
    desc: 'Fires a burst of 5 tactical missiles.',
    rarity: Rarity.EPIC,
    lore: 'The V-5 Battery is a marvel of miniaturization, packing the destructive power of a full-scale missile cruiser into a compact, ground-based silo. Each of its five tactical warheads is equipped with an independent, predictive AI targeting matrix, allowing them to track and annihilate fast-moving or heavily armored targets with terrifying precision. The \'V\' stands for Valkyrie, as the screaming descent of its missiles is often the last thing the enemy hears. The exhaust plumes from a V-5 launch paint the sky with trails of fire, a beautiful but deadly omen for the approaching horde.',
    tips: 'High burst damage but a long cooldown. Excellent for taking chunks out of bosses or clearing dense waves.'
  },
  [TowerType.BLACKHOLE]: { 
    name: 'The Orbitant', 
    cost: 15000, 
    range: 220, 
    damage: 20, 
    cooldown: 3500, 
    color: '#3b82f6', 
    desc: 'Fires massive singularities that drag enemies into the void.',
    rarity: Rarity.LEGENDARY,
    lore: 'Weaponized gravity. The Orbitant is perhaps the most controversial weapon in the human arsenal, its use heavily restricted by the Galactic Accord due to the risk of localized space-time tears. It doesn\'t fire projectiles; it generates and projects micro-singularities. These fleeting black holes exert a massive gravitational pull, dragging enemies into a crushing void where they are spaghettified and compressed into ultra-dense matter. The visual distortion around the tower is a constant reminder of the terrifying forces it commands. To deploy an Orbitant is to play god with the fabric of the universe.',
    tips: 'Insta-kills smaller enemies and heavily damages bosses. Place near the core as an ultimate last line of defense.',
    signature: "Blackhole",
    signatureDesc: "Generates a localized singularity that exerts massive gravitational pull, dragging enemies into the void and crushing them into ultra-dense matter."
  },
  [TowerType.OSAPM]: {
    name: 'O.S.A.P.M.',
    cost: 25000,
    range: 800,
    damage: 20000,
    cooldown: 25000,
    color: '#ffffff',
    desc: 'Orbital Strike Artillery Platform. Oxium Warheads cause global fallout.',
    rarity: Rarity.LEGENDARY,
    lore: 'The Orbital Strike Artillery Platform, Mobile (O.S.A.P.M.) is less a tower and more a targeting beacon for a network of kinetic bombardment satellites orbiting high above the battlefield. When activated, it paints the target with a quantum-entangled laser, signaling the satellites to drop Oxium-tipped \'Rods from God\'. The sheer kinetic force of these strikes causes localized tectonic shifts and global fallout, turning the battlefield into a cratered wasteland. The O.S.A.P.M. is the ultimate sanction, a weapon of mass destruction used only when all other lines of defense have failed and the planet itself is deemed expendable.',
    tips: 'Global range means placement doesn\'t matter. Just afford it, place it anywhere, and watch the screen clear.',
    signature: "Oxium",
    signatureDesc: "Calls down Oxium-tipped kinetic rods from orbit, causing localized tectonic shifts and devastating global fallout that obliterates everything in its radius."
  },
  [TowerType.SIGMANATOR]: {
    name: 'Sigmanator',
    cost: 5500,
    range: 300,
    damage: 15000,
    cooldown: 5000,
    color: '#8b5cf6',
    desc: 'Anti-matter artillery. Massive damage. 25% chance for precision targeting.',
    rarity: Rarity.EPIC,
    lore: 'An experimental anti-matter cannon developed by a rogue AI known only as \'Sigma\'. The AI concluded that conventional weapons were statistically inefficient and designed a cannon that fires a beam of pure annihilation. The Sigmanator doesn\'t just destroy matter; it erases it from existence. However, the AI\'s targeting matrix is notoriously unpredictable, often prioritizing targets based on incomprehensible, multi-dimensional calculations. When it fires, reality itself seems to shudder, and the resulting implosion leaves nothing but a perfectly spherical void where the enemy once stood.',
    tips: 'Massive single-target damage. Use it to snipe bosses from afar.'
  },
  [TowerType.EVERYMECH]: {
    name: 'EVERYMECH',
    cost: 35000,
    range: 1000,
    damage: 500,
    cooldown: 1000,
    color: '#475569',
    desc: 'Adaptive combat mech. Switches between Hammer, MG, and Sniper modes based on distance.',
    rarity: Rarity.LEGENDARY,
    lore: 'The pinnacle of adaptive warfare, the EVERYMECH is a fully autonomous, transforming combat chassis housing a digitized veteran consciousness. It was designed to be the only weapon a colony would ever need. The mech dynamically reconfigures its chassis and weapon systems based on the threat profile. At long range, it deploys a devastating sniper railgun; at medium range, it unleashes a hail of armor-piercing machine-gun fire; and in close quarters, it wields a massive, superheated gravity hammer. The EVERYMECH is a one-machine army, a relentless guardian that adapts, overcomes, and destroys.',
    tips: 'Versatile in any situation. It can handle swarms, armored targets, and bosses alike by adapting its attack pattern.',
    signature: "Frozen Rocket, Grenade and Knockback",
    signatureDesc: "Unleashes a devastating combo: a cryo-rocket that freezes targets, a cluster grenade for massive AoE, and a kinetic knockback wave that shatters frozen enemies."
  }
};

export const INITIAL_STATE = {
  money: 200, 
  lives: 20,
  wave: 1,
  level: 1,
  galaxy: 1,
  score: 0,
  servium: 5,
  servos: [],
  inventory: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  towerLevels: {}, // Starts empty, meaning Level 0
  modifiers: {
      damageMult: 1,
      enemyHpMult: 1,
      incomeMult: 1,
      enemySpeedMult: 1
  }
};
