
import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import ArmoryModal from './components/ArmoryModal';
import ForgeModal from './components/ForgeModal';
import ArsenalModal from './components/ArsenalModal';
import { TOWER_STATS, INITIAL_STATE, ROMAN_NUMERALS, MOBILE_WIDTH, MOBILE_HEIGHT, PC_WIDTH, PC_HEIGHT } from './constants';
import { TowerType, Rarity, GameState, ParadoxChoice } from './types';
import { Zap, Hexagon, Move, Snowflake, Crosshair, Activity, Shield, Radio, Cpu, Map, RotateCcw, Box, Rocket, CircleDot, AlertTriangle, Lock, ChevronUp, Globe, ArrowUpRight, FastForward, Flame, Skull, Hammer, Gift, Pause, Container, Star, Sigma, Bot, Terminal, Package, Sparkles, HelpCircle, Atom, X, Monitor, Smartphone, Settings, Volume2, VolumeX } from 'lucide-react';
import { playSound, setVolume, playMusic, stopMusic, setMusicVolume } from './services/audio';

// Icon map helper
const getIcon = (type: TowerType) => {
  switch (type) {
    case TowerType.PULSE: return <Zap size={20} />;
    case TowerType.BLASTER: return <Hexagon size={20} />;
    case TowerType.LASER: return <Crosshair size={20} />;
    case TowerType.CRYO: return <Snowflake size={20} />;
    case TowerType.PLASMA: return <Activity size={20} />;
    case TowerType.ROCKET: return <Rocket size={20} />;
    case TowerType.BLACKHOLE: return <CircleDot size={20} />;
    case TowerType.OSAPM: return <Container size={20} className="stroke-2" />;
    case TowerType.SIGMANATOR: return <Sigma size={20} className="stroke-2" />;
    case TowerType.EVERYMECH: return <Bot size={20} className="stroke-2" />;
    default: return <Zap size={20} />;
  }
};

const getRarityColor = (rarity: Rarity) => {
    switch(rarity) {
        case Rarity.COMMON: return 'text-zinc-400';
        case Rarity.RARE: return 'text-blue-400';
        case Rarity.EPIC: return 'text-purple-400';
        case Rarity.LEGENDARY: return 'text-orange-500';
    }
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<'MENU' | 'PLAYING'>('MENU');
  const [money, setMoney] = useState(INITIAL_STATE.money);
  const [lives, setLives] = useState(INITIAL_STATE.lives);
  const [wave, setWave] = useState(INITIAL_STATE.wave);
  const [level, setLevel] = useState(INITIAL_STATE.level);
  const [galaxy, setGalaxy] = useState(INITIAL_STATE.galaxy);
  const [servium, setServium] = useState(INITIAL_STATE.servium);
  const [servos, setServos] = useState<any[]>(INITIAL_STATE.servos);
  const [activeServo, setActiveServo] = useState<any | null>(null);
  const [isServoPlaced, setIsServoPlaced] = useState(false);
  const [selectedServoForPlacement, setSelectedServoForPlacement] = useState<any | null>(null);
  const [forceActivateSkillId, setForceActivateSkillId] = useState<string | null>(null);
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [tacticalLog, setTacticalLog] = useState<string[]>(["Commander, systems online. Waiting for enemy signatures."]);
  
  // Pause State
  const [isPaused, setIsPaused] = useState(false);

  // Modifiers State
  const [modifiers, setModifiers] = useState<GameState['modifiers']>(INITIAL_STATE.modifiers);
  const [paradoxChoices, setParadoxChoices] = useState<ParadoxChoice[]>([]);

  // Module System State
  const [inventory, setInventory] = useState<Record<number, number>>(INITIAL_STATE.inventory);
  const [towerLevels, setTowerLevels] = useState<Partial<Record<TowerType, number>>>(INITIAL_STATE.towerLevels);

  // Loadout State - Start with Basic Turrets and Empty Slots
  const [activeLoadout, setActiveLoadout] = useState<(TowerType | null)[]>([
      TowerType.PULSE, TowerType.BLASTER, null, null, null
  ]);
  const [quantumSlots, setQuantumSlots] = useState<Record<number, boolean>>({});
  
  // Shop/Menu State
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isAscensionOpen, setIsAscensionOpen] = useState(false);
  const [crateOpening, setCrateOpening] = useState(false);
  const [openedTower, setOpenedTower] = useState<TowerType | null>(null);
  const [refundMsg, setRefundMsg] = useState<string | null>(null);
  const [refundValue, setRefundValue] = useState<number>(0);
  const [mapResetTrigger, setMapResetTrigger] = useState(0);
  const [fullResetTrigger, setFullResetTrigger] = useState(0);

  // Quantum Reveal State
  const [quantumRevealState, setQuantumRevealState] = useState<'NONE' | 'ANIMATING' | 'REVEALED'>('NONE');
  const [pendingChoice, setPendingChoice] = useState<ParadoxChoice | null>(null);

  // Dev Modes
  const [isConMode, setIsConMode] = useState(false);
  const [isCrateMode, setIsCrateMode] = useState(false);

  const [isArmoryOpen, setIsArmoryOpen] = useState(false);
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [isArsenalOpen, setIsArsenalOpen] = useState(false);
  const [isPCVersion, setIsPCVersion] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [musicVol, setMusicVol] = useState(0.3);
  const [sfxVol, setSfxVol] = useState(0.1);

  useEffect(() => {
    setVolume(isMuted ? 0 : sfxVol);
    setMusicVolume(isMuted ? 0 : musicVol);
  }, [isMuted, sfxVol, musicVol]);

  // Refs for Double Click
  const lastClickTimeRef = useRef<number>(0);
  const lastClickedTowerRef = useRef<TowerType | null>(null);

  const [mainDimensions, setMainDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setMainDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startGame = () => {
    setMoney(INITIAL_STATE.money);
    setLives(INITIAL_STATE.lives);
    setWave(INITIAL_STATE.wave);
    setLevel(INITIAL_STATE.level);
    setGalaxy(INITIAL_STATE.galaxy);
    setModifiers(INITIAL_STATE.modifiers);
    setInventory(INITIAL_STATE.inventory);
    setTowerLevels(INITIAL_STATE.towerLevels);
    setActiveLoadout([TowerType.PULSE, TowerType.BLASTER, null, null, null]);
    setQuantumSlots({});
    setTacticalLog(["Commander, systems online. Waiting for enemy signatures."]);
    setIsPaused(false);
    setIsShopOpen(false);
    setIsAscensionOpen(false);
    setIsArmoryOpen(false);
    setIsServoPlaced(false);
    setAppState('PLAYING');
    setFullResetTrigger(prev => prev + 1);
    playMusic();
  };

  const addLog = (text: string) => {
    setTacticalLog(prev => [text, ...prev].slice(0, 4));
  };

  const handleWaveChange = (newWave: number, newLevel: number) => {
    setWave(newWave);
    setLevel(newLevel);
  };

  const togglePause = () => {
      if (!isShopOpen && !isAscensionOpen) {
          setIsPaused(!isPaused);
      }
  };

  const generateParadoxChoices = () => {
      const choices: ParadoxChoice[] = [];
      const adjectives = ['Quantum', 'Cosmic', 'Void', 'Nebula', 'Stellar', 'Plasma', 'Dark', 'Hyper', 'Solar', 'Abyssal'];
      const nouns = ['Protocol', 'Accord', 'Ultimatum', 'Paradox', 'Entropy', 'Singularity', 'Contract', 'Dominion', 'Horizon'];

      // SCALING LOGIC: Aggressively scale buffs based on Galaxy depth to match difficulty curve
      const scale = Math.pow(1.35, galaxy); 

      for (let i = 0; i < 3; i++) {
          let type: ParadoxChoice['type'] = 'BALANCED';
          let name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
          let dmg = 0;
          let income = 0;
          let rewardTower: TowerType | undefined = undefined;
          
          const roll = Math.random();

          // Slot 3: Special Roll (Crate or Quantum)
          if (i === 2 && roll < 0.6) {
             if (roll < 0.3) {
                 // QUANTUM CLONE
                 type = 'QUANTUM';
                 name = "Quantum Anomaly"; // Generic name for the card
                 // Select a random LEGENDARY
                 const legendaries = [TowerType.BLACKHOLE, TowerType.OSAPM, TowerType.EVERYMECH];
                 rewardTower = legendaries[Math.floor(Math.random() * legendaries.length)];
             } else {
                 // SUPPLY CACHE (With Buffs)
                 type = 'CRATE';
                 name = "Paradox Crate";
                 // Paradox Buffs - Scaled
                 dmg = (0.1 + (Math.random() * 0.2)) * scale; 
                 income = (0.1 + (Math.random() * 0.2)) * scale;
             }
          } else {
              const buffRoll = Math.random();
              if (buffRoll < 0.4) {
                  // Pure Damage
                  dmg = (0.3 + (Math.random() * 0.4)) * scale; // Scaled heavily
                  type = 'AGGRESSIVE';
              } else if (buffRoll < 0.8) {
                  // Pure Income
                  income = (0.3 + (Math.random() * 0.4)) * scale; // Scaled heavily
                  type = 'GREEDY';
              } else {
                  // Hybrid
                  dmg = (0.2 + (Math.random() * 0.2)) * scale;
                  income = (0.2 + (Math.random() * 0.2)) * scale;
                  type = 'BALANCED';
              }
          }

          choices.push({
              id: Math.random().toString(36),
              name,
              fluff: `G-${galaxy + 1} Anomaly Detected`,
              stats: { dmg, income, hp: 0, speed: 0 }, 
              type,
              rewardTower
          });
      }
      setParadoxChoices(choices);
  };

  const handleSectorComplete = (completedLevel: number) => {
      if (completedLevel >= 5) {
          generateParadoxChoices();
          setIsAscensionOpen(true);
      } else {
          setIsShopOpen(true);
      }
      setRefundMsg(null);
      setRefundValue(0);
  };
  
  const handleGalaxyComplete = () => {
      generateParadoxChoices();
      setIsAscensionOpen(true);
  };

  const handleNextSector = () => {
      setIsShopOpen(false);
      setOpenedTower(null);
      setCrateOpening(false);
      setRefundMsg(null);
      setRefundValue(0);
      setIsServoPlaced(false);
      // Trigger map reset in canvas
      setMapResetTrigger(prev => prev + 1);
      addLog(`SECTOR ${level + 1} INITIATED. LOADOUT LOCKED.`);
  };

  const openParadoxCrate = () => {
      // Rare to Epic Only Pool
      const pool = [
         { type: TowerType.CRYO, weight: 25 },    // Rare
         { type: TowerType.PLASMA, weight: 25 },  // Rare
         { type: TowerType.LASER, weight: 20 },   // Epic
         { type: TowerType.ROCKET, weight: 15 },  // Epic
         { type: TowerType.SIGMANATOR, weight: 15 }, // Epic
      ];
      
      let totalWeight = pool.reduce((acc, item) => acc + item.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedType = TowerType.CRYO;
      
      for (const item of pool) {
          if (random < item.weight) {
              selectedType = item.type;
              break;
          }
          random -= item.weight;
      }
      return selectedType;
  };

  // Wrapper for clicking a choice
  const onChoiceSelected = (choice: ParadoxChoice) => {
      if (choice.type === 'QUANTUM') {
          setPendingChoice(choice);
          setQuantumRevealState('ANIMATING');
          playSound('START'); // Sound effect
          setTimeout(() => {
              setQuantumRevealState('REVEALED');
              playSound('BUILD');
          }, 2000);
      } else {
          performAscension(choice);
      }
  };

  // Helper to finalize Quantum
  const completeQuantumAscension = () => {
      if (pendingChoice) {
          performAscension(pendingChoice);
          setQuantumRevealState('NONE');
          setPendingChoice(null);
      }
  };
  
  const performAscension = (choice: ParadoxChoice) => {
      // 1. Update Modifiers (Stacking)
      setModifiers(prev => ({
          damageMult: prev.damageMult + choice.stats.dmg,
          incomeMult: prev.incomeMult + choice.stats.income,
          enemyHpMult: prev.enemyHpMult, 
          enemySpeedMult: prev.enemySpeedMult,
      }));

      // 2. Reset Game State 
      const nextGalaxy = galaxy + 1;
      setGalaxy(nextGalaxy);
      setLevel(1);
      setWave(1);
      
      // Apply Starting Money Scale
      const startingMoney = Math.floor(200 * Math.pow(1.5, nextGalaxy - 1));
      setMoney(startingMoney);
      
      setLives(INITIAL_STATE.lives);
      setInventory(INITIAL_STATE.inventory);
      setTowerLevels(INITIAL_STATE.towerLevels);
      setIsServoPlaced(false);
      
      // Award Servium for completing a galaxy
      setServium(prev => prev + 100);
      addLog(`+100 SERVIUM ACQUIRED.`);
      // Reset Loadout but prepare for quantum logic
      const nextLoadout: (TowerType | null)[] = [TowerType.PULSE, TowerType.BLASTER, null, null, null];
      const nextQuantumSlots: Record<number, boolean> = {};
      
      // 3. Handle Choice Specifics
      if (choice.type === 'QUANTUM' && choice.rewardTower) {
          // Find first empty slot, or default to slot 4 (index 4), or overwrite
          let slotIndex = nextLoadout.findIndex(t => t === null);
          if (slotIndex === -1) slotIndex = 4; // Overwrite last slot if full
          
          nextLoadout[slotIndex] = choice.rewardTower;
          nextQuantumSlots[slotIndex] = true;
          
          setActiveLoadout(nextLoadout);
          setQuantumSlots(nextQuantumSlots);
          setIsAscensionOpen(false);
          addLog(`QUANTUM ANOMALY STABILIZED. ${TOWER_STATS[choice.rewardTower].name} ACQUIRED.`);
      } else {
          // Standard handling
          setActiveLoadout(nextLoadout);
          setQuantumSlots({});

          if (choice.type === 'CRATE') {
              setIsAscensionOpen(false);
              setIsShopOpen(true);
              
              // Trigger immediate open logic without cost
              setCrateOpening(true);
              setOpenedTower(null);
              setRefundMsg(null);
              setRefundValue(0);
              
              setTimeout(() => {
                  const rewardTower = openParadoxCrate();
                  setOpenedTower(rewardTower);
                  setCrateOpening(false);
                  addLog(`PARADOX CRATE OPENED: ${TOWER_STATS[rewardTower].name}`);
              }, 1500);
          } else {
              setIsAscensionOpen(false);
              addLog(`HYPERSPACE JUMP SUCCESSFUL. ENTERING GALAXY ${nextGalaxy}.`);
          }
      }
      
      playSound('START');
  };

  // Developer Tools
  const handleDevSkip = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      handleSectorComplete(level);
      setIsPaused(false);
  };
  
  const handleConMode = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsConMode(!isConMode);
      addLog(isConMode ? "CONSTRUCTION MODE DEACTIVATED." : "CONSTRUCTION MODE ACTIVE: COSTS SET TO 1.");
  };

  const handleCrateMode = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsCrateMode(!isCrateMode);
      addLog(isCrateMode ? "FREE CRATE PROTOCOL DISABLED." : "FREE CRATE PROTOCOL ACTIVE.");
  };

  const handleModuleCollect = (tier: number) => {
      setInventory(prev => {
         const hasAny = Object.values(prev).some((qty: any) => qty > 0);
         if (hasAny) return prev; 
         return { ...prev, [tier]: 1 };
      });
  };

  const handleModuleSold = (tier: number) => {
      setInventory({}); 
      addLog(`MODULE [${ROMAN_NUMERALS[tier]}] SOLD.`);
  };

  const handleTowerDockClick = (type: TowerType, slotIndex: number) => {
      const now = Date.now();
      const stats = TOWER_STATS[type];
      // Cost Logic handled in GameCanvas, here we just select
      const cost = isConMode ? 1 : (quantumSlots[slotIndex] ? 50 : stats.cost);
      
      setSelectedServoForPlacement(null); // Deselect servo if a tower is clicked

      // Only check affordability if NOT selecting the already selected tower (toggle off)
      if (selectedTower !== type || selectedSlotIndex !== slotIndex) {
         if (money < cost) return; 
      }

      if (selectedTower === type && selectedSlotIndex === slotIndex) {
          if (!quantumSlots[slotIndex]) {
              attemptUpgrade(type);
          } else {
              addLog("QUANTUM CLONE CANNOT BE UPGRADED.");
          }
          return;
      }

      // Select Logic
      if (selectedTower === type && selectedSlotIndex === slotIndex) {
          // Deselect
          setSelectedTower(null);
          setSelectedSlotIndex(null);
      } else {
          setSelectedTower(type);
          setSelectedSlotIndex(slotIndex);
      }
      
      lastClickTimeRef.current = now;
      lastClickedTowerRef.current = type;
  };
  
  const handleQuantumUsed = () => {
      if (selectedSlotIndex !== null && quantumSlots[selectedSlotIndex]) {
          const newLoadout = [...activeLoadout];
          newLoadout[selectedSlotIndex] = null; // Clear slot
          setActiveLoadout(newLoadout);
          
          const newQuantum = { ...quantumSlots };
          delete newQuantum[selectedSlotIndex];
          setQuantumSlots(newQuantum);
          
          setSelectedTower(null);
          setSelectedSlotIndex(null);
          addLog("QUANTUM CHARGE DEPLETED.");
      }
  };

  const attemptUpgrade = (type: TowerType) => {
      const currentLevel = towerLevels[type] || 0;
      const nextLevel = currentLevel + 1;
      
      if (nextLevel > 5) {
          addLog(`MAX LEVEL REACHED FOR ${TOWER_STATS[type].name}.`);
          return;
      }

      const heldTierStr = Object.keys(inventory).find(k => inventory[parseInt(k)] > 0);
      const heldTier = heldTierStr ? parseInt(heldTierStr) : 0;
      
      if (heldTier >= nextLevel) {
          setInventory({});
          setTowerLevels(prev => ({
              ...prev,
              [type]: nextLevel
          }));
          playSound('BUILD'); 
          addLog(`${TOWER_STATS[type].name} UPGRADED TO MK.${ROMAN_NUMERALS[nextLevel]}`);
      } else {
          if (heldTier === 0) {
              addLog(`UPGRADE FAILED: NO MODULE IN STORAGE.`);
          } else {
              playSound('ALARM');
              addLog(`UPGRADE FAILED: MODULE TIER [${ROMAN_NUMERALS[heldTier]}] TOO LOW. NEED [${ROMAN_NUMERALS[nextLevel]}].`);
          }
      }
  };

  const buyCrate = (type: 'STANDARD' | 'ELITE', forceFree = false) => {
      const cost = type === 'ELITE' ? 15000 : 1000;
      const isFree = isCrateMode || forceFree;
      if (!isFree && money < cost) return;
      if (!isFree) setMoney(prev => Math.floor(prev - cost));
      setCrateOpening(true);
      setOpenedTower(null);
      setRefundMsg(null);
      setRefundValue(0);
      
      setTimeout(() => {
          let pool: { type: TowerType, weight: number }[] = [];

          if (type === 'ELITE') {
             // ELITE POOL: High Epic/Legendary chance
             pool = [
                { type: TowerType.ROCKET, weight: 30 }, // Epic
                { type: TowerType.LASER, weight: 30 }, // Epic
                { type: TowerType.SIGMANATOR, weight: 25 }, // Epic
                { type: TowerType.BLACKHOLE, weight: 20 }, // Legendary
                { type: TowerType.OSAPM, weight: 20 }, // Legendary
                { type: TowerType.EVERYMECH, weight: 15 }, // Legendary (New)
             ];
          } else {
             // STANDARD POOL
             pool = [
                { type: TowerType.LASER, weight: 15 }, // Epic
                { type: TowerType.CRYO, weight: 20 },
                { type: TowerType.PLASMA, weight: 20 },
                { type: TowerType.ROCKET, weight: 15 }, // Epic
                { type: TowerType.SIGMANATOR, weight: 15 }, // Epic
                { type: TowerType.BLACKHOLE, weight: 8 }, // Legendary
                { type: TowerType.OSAPM, weight: 8 }, // Legendary 
                { type: TowerType.EVERYMECH, weight: 5 }, // Legendary (Rare here)
             ];
          }
          
          let totalWeight = pool.reduce((acc, item) => acc + item.weight, 0);
          let random = Math.random() * totalWeight;
          let selectedType = TowerType.LASER;
          
          for (const item of pool) {
              if (random < item.weight) {
                  selectedType = item.type;
                  break;
              }
              random -= item.weight;
          }
          
          setOpenedTower(selectedType);
          
          if (activeLoadout.includes(selectedType)) {
              const refund = Math.floor(cost * 0.5);
              setMoney(prev => Math.floor(prev + refund));
              setRefundValue(refund);
              setRefundMsg(`DUPLICATE`);
              setCrateOpening(false);
          } else {
              setCrateOpening(false);
          }
      }, 1500);
  };

  const equipTower = (slotIndex: number) => {
      if (!openedTower) return;
      const newLoadout = [...activeLoadout];
      newLoadout[slotIndex] = openedTower;
      setActiveLoadout(newLoadout);
      setOpenedTower(null);
      addLog(`Loadout Updated: ${TOWER_STATS[openedTower].name} equipped.`);
  };

  if (appState === 'MENU') {
    return (
      <div className="h-[100dvh] w-full bg-[#030712] text-cyan-50 font-mono flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Ambient Background Glow */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/20 blur-[120px] rounded-full"></div>
            
            {/* Grid background */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0zOSAzOVYxaC0zOHYzOGgzOHoiIGZpbGw9IiMwNjA2MDYiIGZpbGwtb3BhY2l0eT0iMC41IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-20"></div>
        </div>

        <div className="absolute top-4 left-4 z-20">
            <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
                <Settings size={18} />
            </button>
            {isSettingsOpen && (
                <div className="absolute top-12 left-0 bg-zinc-900 border border-white/10 rounded-xl p-4 shadow-xl flex flex-col gap-4 min-w-[200px]">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-cyan-400" />}
                        <span>{isMuted ? 'Unmute All' : 'Mute All'}</span>
                    </button>
                    
                    {!isMuted && (
                        <>
                            <div className="flex flex-col gap-2 px-2">
                                <label className="text-[10px] text-zinc-400 uppercase tracking-wider flex justify-between">
                                    <span>Music</span>
                                    <span>{Math.round(musicVol * 100)}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={musicVol} 
                                    onChange={(e) => setMusicVol(parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500"
                                />
                            </div>
                            <div className="flex flex-col gap-2 px-2">
                                <label className="text-[10px] text-zinc-400 uppercase tracking-wider flex justify-between">
                                    <span>SFX</span>
                                    <span>{Math.round(sfxVol * 100)}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={sfxVol} 
                                    onChange={(e) => setSfxVol(parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500"
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        <div className="absolute top-4 right-4 z-20">
            <button 
                onClick={() => setIsPCVersion(!isPCVersion)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    isPCVersion 
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                    : 'bg-zinc-900/80 border-white/10 text-zinc-400'
                }`}
            >
                {isPCVersion ? <Monitor size={16} /> : <Smartphone size={16} />}
                <span className="text-xs font-bold tracking-wider uppercase">{isPCVersion ? 'PC Mode' : 'Mobile Mode'}</span>
            </button>
        </div>

        <div className="z-10 flex flex-col items-center gap-8 p-8 max-w-md w-full">
            <div className="relative">
                <div className="absolute -inset-4 bg-cyan-500/20 blur-2xl rounded-full"></div>
                <div className="relative flex items-center justify-center w-32 h-32 bg-zinc-900 border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] transform rotate-45">
                    <div className="transform -rotate-45 flex flex-col items-center gap-2">
                        <Shield size={48} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                    </div>
                </div>
            </div>

            <div className="text-center space-y-2">
                <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 drop-shadow-sm">
                    SERVO
                </h1>
                <h2 className="text-2xl font-bold tracking-[0.3em] text-cyan-400/80">
                    FRAME FIELD
                </h2>
                <p className="text-xs text-zinc-500 tracking-widest uppercase mt-4">
                    Tactical Defense Protocol
                </p>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent my-4"></div>

            <button 
                onClick={startGame}
                className="group relative w-full bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 p-4 rounded-xl transition-all duration-300 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="relative flex items-center justify-center gap-3">
                    <Zap className="text-cyan-400 group-hover:animate-pulse" size={20} />
                    <span className="text-lg font-bold tracking-widest text-cyan-50 group-hover:text-white">INITIALIZE</span>
                </div>
            </button>

            <div className="flex gap-4 w-full">
                <button onClick={() => setIsForgeOpen(true)} className="flex-1 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all">
                    <Flame size={18} className="text-orange-500/70" />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Forge</span>
                </button>
                <button onClick={() => setIsArmoryOpen(true)} className="flex-1 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 p-3 rounded-xl flex flex-col items-center gap-2 transition-all">
                    <Package size={18} className="text-purple-500/70" />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Armory</span>
                </button>
            </div>
        </div>

        <div className="absolute bottom-4 text-[10px] text-zinc-600 tracking-widest font-mono">
            v3.0.0 // SYSTEM ONLINE
        </div>

        {/* ARMORY MODAL */}
        <ArmoryModal isOpen={isArmoryOpen} onClose={() => setIsArmoryOpen(false)} />
        {/* FORGE MODAL */}
        <ForgeModal 
          isOpen={isForgeOpen} 
          onClose={() => setIsForgeOpen(false)} 
          servium={servium} 
          setServium={setServium} 
          servos={servos} 
          setServos={setServos} 
          activeServo={activeServo} 
          setActiveServo={setActiveServo} 
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#030712] text-cyan-50 font-mono flex flex-col relative overflow-hidden select-none">
      {/* Ambient Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full"></div>
      </div>

      {/* PAUSE MENU */}
      {isPaused && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-zinc-900 border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] text-center max-w-xs w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-widest flex items-center justify-center gap-3">
                    <Pause size={28} className="fill-white" /> PAUSED
                </h2>
                <div className="w-full h-px bg-zinc-700 mb-6"></div>
                
                <div className="flex flex-col gap-4 mb-6 text-left bg-black/30 p-4 rounded-lg border border-white/5">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Active Systems</h3>
                    <div className="flex justify-between text-sm font-mono items-center">
                        <span className="text-green-400 flex items-center gap-2"><Zap size={12}/> Damage Output</span>
                        <span className="font-bold text-white">{Math.round(modifiers.damageMult * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-sm font-mono items-center">
                        <span className="text-yellow-400 flex items-center gap-2"><ArrowUpRight size={12}/> Resource Yield</span>
                        <span className="font-bold text-white">{Math.round(modifiers.incomeMult * 100)}%</span>
                    </div>
                     <div className="flex justify-between text-sm font-mono mt-2 pt-2 border-t border-zinc-800 items-center">
                        <span className="text-red-400 flex items-center gap-2"><Globe size={12}/> Threat Level</span>
                        <span className="font-bold text-white">GALAXY {galaxy}</span>
                    </div>
                </div>

                <button 
                    onClick={() => setIsPaused(false)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-full w-full transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] uppercase tracking-widest hover:scale-105 mb-3"
                >
                    Resume Defense
                </button>

                <button 
                    onClick={() => setAppState('MENU')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-8 rounded-full w-full transition-all uppercase tracking-widest hover:scale-105 mb-6 border border-zinc-700 hover:border-zinc-500"
                >
                    Return to Menu
                </button>

                {/* SETTINGS SECTION */}
                <div className="pt-6 border-t border-zinc-800 w-full mb-6">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase mb-3 flex items-center justify-center gap-2">
                        <Settings size={12} /> Audio Settings
                    </h3>
                    <div className="flex flex-col gap-4 bg-black/30 p-4 rounded-lg border border-white/5">
                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-white/10"
                        >
                            {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-cyan-400" />}
                            <span>{isMuted ? 'Unmute All' : 'Mute All'}</span>
                        </button>
                        
                        {!isMuted && (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider flex justify-between">
                                        <span>Music</span>
                                        <span>{Math.round(musicVol * 100)}%</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" max="1" step="0.05" 
                                        value={musicVol} 
                                        onChange={(e) => setMusicVol(parseFloat(e.target.value))}
                                        className="w-full accent-cyan-500"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-zinc-400 uppercase tracking-wider flex justify-between">
                                        <span>SFX</span>
                                        <span>{Math.round(sfxVol * 100)}%</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" max="1" step="0.05" 
                                        value={sfxVol} 
                                        onChange={(e) => setSfxVol(parseFloat(e.target.value))}
                                        className="w-full accent-cyan-500"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                {/* DEV TOOLS SECTION */}
                <div className="pt-6 border-t border-zinc-800 w-full">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase mb-3 flex items-center justify-center gap-2">
                        <Terminal size={12} /> Developer Overrides
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={handleDevSkip}
                            className="bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 text-[9px] font-bold px-2 py-3 rounded border border-red-500/20 flex flex-col items-center gap-1 transition-all"
                        >
                            <FastForward size={14} /> 
                            SKIP SECTOR
                        </button>
                        <button 
                            onClick={handleConMode}
                            className={`${isConMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-zinc-800 text-zinc-500 border-zinc-700'} hover:bg-yellow-500/10 text-[9px] font-bold px-2 py-3 rounded border flex flex-col items-center gap-1 transition-all`}
                        >
                            <Hammer size={14} /> 
                            CON MODE
                        </button>
                        <button 
                            onClick={handleCrateMode}
                            className={`${isCrateMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-zinc-800 text-zinc-500 border-zinc-700'} hover:bg-blue-500/10 text-[9px] font-bold px-2 py-3 rounded border flex flex-col items-center gap-1 transition-all`}
                        >
                            <Gift size={14} /> 
                            FREE CRT
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ASCENSION MODAL (Galaxy Jump) */}
      {isAscensionOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
              <div className="max-w-md w-full bg-zinc-900 border-2 border-purple-500/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col items-center text-center max-h-[90vh] overflow-y-auto relative transition-all duration-500">
                   
                   {quantumRevealState !== 'NONE' && pendingChoice && pendingChoice.rewardTower ? (
                        // --- QUANTUM REVEAL UI ---
                        <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-300 pt-6">
                            <h2 className="text-2xl font-bold text-orange-500 mb-4 tracking-widest uppercase animate-pulse">
                                {quantumRevealState === 'ANIMATING' ? 'COLLAPSING WAVEFUNCTION...' : 'ANOMALY STABILIZED'}
                            </h2>
                            
                            <div className="w-40 h-40 bg-zinc-950 rounded-full border-2 border-orange-500/50 flex items-center justify-center mb-8 relative overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                                {quantumRevealState === 'ANIMATING' ? (
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <div className="w-full h-full bg-orange-500/10 animate-ping rounded-full absolute"></div>
                                         <RotateCcw className="animate-spin text-orange-500" size={48} />
                                         <Atom className="absolute opacity-30 animate-pulse" size={100} />
                                     </div>
                                ) : (
                                     <div className="flex flex-col items-center animate-bounce-in" style={{ color: TOWER_STATS[pendingChoice.rewardTower].color }}>
                                         <div className="absolute inset-0 bg-orange-500/5 animate-pulse"></div>
                                         <div className="transform scale-[2.0] mb-2 filter drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                             {getIcon(pendingChoice.rewardTower)}
                                         </div>
                                     </div>
                                )}
                            </div>

                            {quantumRevealState === 'REVEALED' && (
                                <div className="text-center w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                                    <div className="text-2xl font-black text-white mb-2 tracking-wide">{TOWER_STATS[pendingChoice.rewardTower].name}</div>
                                    <div className="text-xs font-bold text-orange-400 mb-6 bg-orange-900/20 px-4 py-1.5 rounded-full border border-orange-500/30 inline-block tracking-widest">QUANTUM CLONE DETECTED</div>

                                    <div className="bg-zinc-950/50 p-5 rounded-xl border border-orange-500/20 text-left text-xs text-zinc-300 mb-8 space-y-3 max-w-sm mx-auto shadow-inner">
                                        <div className="font-bold text-orange-500 uppercase mb-2 pb-2 border-b border-orange-500/20 flex items-center gap-2">
                                            <Atom size={14} /> Quantum Mechanics
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-[6px] h-[6px] rounded-full bg-orange-500 mt-1 shadow-[0_0_5px_orange]"></div>
                                            <span><strong className="text-orange-200 block mb-0.5">One-Time Use</strong>Exists only for this Galaxy. Disappears if removed.</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-[6px] h-[6px] rounded-full bg-orange-500 mt-1 shadow-[0_0_5px_orange]"></div>
                                            <span><strong className="text-orange-200 block mb-0.5">Fixed Cost</strong>Always costs 50 CR to place.</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-[6px] h-[6px] rounded-full bg-orange-500 mt-1 shadow-[0_0_5px_orange]"></div>
                                            <span><strong className="text-orange-200 block mb-0.5">Unstable</strong>Cannot be upgraded.</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={completeQuantumAscension}
                                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all active:scale-95 w-full tracking-[0.15em] border border-orange-400/30"
                                    >
                                        EQUIP & INITIALIZE GALAXY {galaxy + 1}
                                    </button>
                                </div>
                            )}
                        </div>
                   ) : (
                       // --- STANDARD SELECTION UI ---
                       <>
                           <div className="w-20 h-20 rounded-full bg-purple-900/30 border-2 border-purple-500 flex items-center justify-center mb-4 animate-pulse shrink-0">
                               <Globe size={40} className="text-purple-400" />
                           </div>
                           
                           <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                               SECTOR 5 COMPLETE
                           </h2>
                           <p className="text-zinc-400 text-xs mb-6 uppercase tracking-widest">Hyperspace Coordinates Locked: Galaxy {galaxy + 1}</p>
                           
                           <div className="bg-zinc-950 p-4 rounded-lg border border-white/10 mb-6 text-left w-full">
                               <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Trajectory Analysis</h3>
                               <p className="text-sm text-zinc-300 mb-2">Entering deep space. Planetary surfaces detected.</p>
                               <p className="text-sm text-red-400 font-bold">WARNING: Enemy difficulty increasing. Reinforce systems.</p>
                           </div>

                           <h3 className="text-sm font-bold text-white mb-4 uppercase">Select Paradox Upgrade</h3>
                           
                           <div className="grid grid-cols-1 gap-3 w-full mb-4">
                               {paradoxChoices.map((choice) => (
                                   <button 
                                     key={choice.id}
                                     onClick={() => onChoiceSelected(choice)}
                                     className={`
                                       relative overflow-hidden bg-zinc-800 border p-4 rounded-lg flex flex-col transition-all group hover:scale-[1.02]
                                       ${choice.type === 'AGGRESSIVE' ? 'border-purple-500/30 hover:border-purple-500 hover:bg-purple-900/20' : ''}
                                       ${choice.type === 'GREEDY' ? 'border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-900/20' : ''}
                                       ${choice.type === 'BALANCED' ? 'border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-900/20' : ''}
                                       ${choice.type === 'CRATE' ? 'border-purple-600/50 hover:border-purple-400 hover:bg-purple-900/40 shadow-purple-500/20 shadow-md' : ''}
                                       ${choice.type === 'QUANTUM' ? 'border-orange-500/60 hover:border-orange-400 hover:bg-orange-900/40 shadow-orange-500/20 shadow-md animate-pulse' : ''}
                                     `}
                                   >
                                       <div className="flex items-center justify-between w-full mb-2">
                                           <div className={`flex items-center gap-2 font-bold uppercase
                                               ${choice.type === 'AGGRESSIVE' ? 'text-purple-400' : ''}
                                               ${choice.type === 'GREEDY' ? 'text-yellow-400' : ''}
                                               ${choice.type === 'BALANCED' ? 'text-cyan-400' : ''}
                                               ${choice.type === 'CRATE' ? 'text-purple-300' : ''}
                                               ${choice.type === 'QUANTUM' ? 'text-orange-400 tracking-widest' : ''}
                                           `}>
                                               {choice.type === 'AGGRESSIVE' && <Zap size={16} />}
                                               {choice.type === 'GREEDY' && <ArrowUpRight size={16} />}
                                               {choice.type === 'BALANCED' && <Crosshair size={16} />}
                                               {choice.type === 'CRATE' && <Package size={16} />}
                                               {choice.type === 'QUANTUM' && <Sparkles size={16} />}
                                               {choice.name}
                                           </div>
                                       </div>
                                       
                                       <div className="flex gap-4 w-full text-xs">
                                           {choice.stats.dmg > 0 && (
                                               <div className="text-green-400 flex items-center gap-1">
                                                   <Zap size={10} /> +{Math.floor(choice.stats.dmg * 100)}% Damage
                                               </div>
                                           )}
                                           {choice.stats.income > 0 && (
                                               <div className="text-green-400 flex items-center gap-1">
                                                   <ArrowUpRight size={10} /> +{Math.floor(choice.stats.income * 100)}% Income
                                               </div>
                                           )}
                                           {choice.type === 'CRATE' && (
                                               <div className="text-purple-300 flex items-center gap-1">
                                                   <Package size={10} /> Contains Rare/Epic Tower
                                               </div>
                                           )}
                                           {choice.type === 'QUANTUM' && (
                                               <div className="text-orange-300 flex flex-col items-start gap-1 w-full text-left">
                                                    <div className="flex items-center gap-1 text-white font-bold">
                                                        <HelpCircle size={10} /> Acquire: Unknown Signal
                                                    </div>
                                                    <div className="text-[10px] opacity-80">Collapse wavefunction to reveal result.</div>
                                               </div>
                                           )}
                                       </div>
                                   </button>
                               ))}
                           </div>
                           
                           <div className="text-[10px] text-zinc-600 font-mono mt-2">
                               * SYSTEM REBOOT REQUIRED. LOADOUT WILL RESET. *
                           </div>
                       </>
                   )}
              </div>
          </div>
      )}

      {/* SHOP MODAL (Full Screen Vertical Overlay) */}
      {isShopOpen && !isAscensionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
              <div className="w-full h-full max-w-md flex flex-col gap-4 overflow-y-auto">
                  
                  {/* Header Row */}
                  <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4 shrink-0">
                    <h2 className="text-2xl font-bold text-white tracking-widest flex items-center justify-between">
                        <span className="text-green-500">
                            {galaxy > 1 && wave === 1 && level === 1 ? `GALAXY ${galaxy} START` : `SECTOR ${level} CLEAR`}
                        </span>
                        <div className="text-right bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Credits</div>
                            <div className="text-xl text-yellow-400 font-bold font-mono">${Math.floor(money)}</div>
                        </div>
                    </h2>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Armory Access Granted</p>
                  </div>

                  {/* Main Shop Content */}
                  <div className="flex-grow flex flex-col gap-6">
                      
                      {/* Crate Panel */}
                      <div className="bg-zinc-900/50 rounded-xl p-6 flex flex-col items-center justify-center border border-zinc-800 relative min-h-[250px]">
                           <div className="absolute top-2 left-2 text-[9px] text-zinc-600 font-bold tracking-widest">SUPPLY DROP</div>
                           
                           {crateOpening ? (
                               <div className="flex flex-col items-center animate-pulse">
                                   <RotateCcw size={40} className="text-cyan-500 animate-spin mb-2" />
                                   <span className="text-xs text-cyan-400 font-mono">DECRYPTING...</span>
                               </div>
                           ) : refundMsg && openedTower ? (
                               <div className="text-center w-full animate-bounce-in">
                                   <div className="text-xs font-bold mb-2 tracking-widest text-yellow-500">DUPLICATE DETECTED</div>
                                   <div className="w-16 h-16 bg-zinc-800/80 rounded-xl flex items-center justify-center mx-auto mb-3 border border-yellow-500/30 shadow-lg relative overflow-hidden">
                                        <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>
                                        <div className="transform scale-125 opacity-60 grayscale" style={{ color: TOWER_STATS[openedTower].color }}>
                                            {getIcon(openedTower)}
                                        </div>
                                        <AlertTriangle className="absolute inset-0 m-auto text-yellow-500 drop-shadow-md" size={24} />
                                   </div>
                                   <div className="text-lg font-bold text-zinc-200 mb-1 leading-none">{TOWER_STATS[openedTower].name}</div>
                                   <div className="text-xl text-green-400 font-bold font-mono mb-4 border border-green-500/20 bg-green-500/10 rounded py-2">
                                     +{refundValue} CR <span className="text-[10px] text-green-300/50 align-middle ml-1">(REFUND)</span>
                                   </div>
                                   <button 
                                    onClick={() => {
                                        setRefundMsg(null);
                                        setRefundValue(0);
                                        setOpenedTower(null);
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded text-xs font-bold border border-white/10 uppercase tracking-wider"
                                   >
                                       CONFIRM
                                   </button>
                               </div>
                           ) : openedTower ? (
                               <div className="text-center w-full animate-bounce-in">
                                   <div className={`text-xs font-bold mb-2 tracking-widest ${getRarityColor(TOWER_STATS[openedTower].rarity)}`}>
                                       {TOWER_STATS[openedTower].rarity} ACQUIRED
                                   </div>
                                   <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/10 shadow-lg" style={{ color: TOWER_STATS[openedTower].color }}>
                                       <div className="transform scale-150">{getIcon(openedTower)}</div>
                                   </div>
                                   <div className="text-lg font-bold text-white mb-1 leading-none">{TOWER_STATS[openedTower].name}</div>
                                   <div className="text-[10px] text-zinc-500 mb-4 line-clamp-2 px-2">{TOWER_STATS[openedTower].desc}</div>
                                   
                                   <div className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 p-2 rounded mb-2 animate-pulse">
                                       &darr; TAP LOADOUT SLOT TO EQUIP &darr;
                                   </div>
                                   <button 
                                      onClick={() => {
                                          const refund = 500; // Manual discard is always basic refund
                                          setMoney(m => Math.floor(m + refund));
                                          setOpenedTower(null);
                                      }}
                                      className="text-[10px] text-zinc-500 hover:text-white underline"
                                   >
                                       Discard & Refund (500cr)
                                   </button>
                               </div>
                           ) : (
                               <div className="text-center w-full flex flex-col gap-3">
                                   <div className="flex items-center justify-center mb-1 gap-2 text-zinc-400">
                                      <Box size={20} /> <span className="text-xs font-bold uppercase">Select Crate</span>
                                   </div>

                                   {/* Standard Crate */}
                                   <button 
                                    onClick={() => buyCrate('STANDARD', false)}
                                    disabled={money < 1000 && !isCrateMode}
                                    className={`w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-white p-3 rounded-lg font-bold text-xs transition-all flex items-center justify-between group`}
                                   >
                                       <div className="flex flex-col items-start">
                                           <span className="text-cyan-400 group-hover:text-cyan-300">STANDARD CRATE</span>
                                           <span className="text-[9px] text-zinc-500">Common / Rare / Epic</span>
                                       </div>
                                       <div className="font-mono text-yellow-500 bg-black/30 px-2 py-1 rounded">
                                           {isCrateMode ? 'FREE' : '1000 CR'}
                                       </div>
                                   </button>

                                   {/* Elite Crate */}
                                   <button 
                                    onClick={() => buyCrate('ELITE', false)}
                                    disabled={money < 15000 && !isCrateMode}
                                    className={`w-full bg-purple-900/20 hover:bg-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/40 text-white p-3 rounded-lg font-bold text-xs transition-all flex items-center justify-between group shadow-[0_0_10px_rgba(168,85,247,0.1)]`}
                                   >
                                       <div className="flex flex-col items-start">
                                           <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1">ELITE CRATE <Star size={10} className="fill-purple-400"/></span>
                                           <span className="text-[9px] text-zinc-400">High Epic & Legendary Chance</span>
                                       </div>
                                       <div className="font-mono text-yellow-500 bg-black/30 px-2 py-1 rounded border border-yellow-500/20">
                                           {isCrateMode ? 'FREE' : '15000 CR'}
                                       </div>
                                   </button>
                               </div>
                           )}
                      </div>

                      {/* Loadout Panel */}
                      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex flex-col">
                          <div className="flex justify-between items-center mb-2 shrink-0">
                              <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                  <Cpu size={14} className="text-zinc-500"/> Active Loadout
                              </h3>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-2 h-20">
                              {activeLoadout.map((tower, idx) => (
                                  <button 
                                    key={idx}
                                    onClick={() => openedTower && !refundMsg && equipTower(idx)}
                                    className={`
                                      relative rounded-lg border flex flex-col items-center justify-center gap-1 p-1 transition-all duration-200 h-full
                                      ${openedTower && !refundMsg
                                          ? 'hover:scale-105 hover:shadow-xl cursor-pointer border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10' 
                                          : 'border-zinc-800 bg-zinc-900/30 cursor-default'
                                      }
                                      ${openedTower && !refundMsg && 'animate-pulse ring-1 ring-yellow-500/20'}
                                      ${quantumSlots[idx] ? 'border-orange-500/50 bg-orange-900/10' : ''}
                                    `}
                                  >
                                      <div className="absolute top-1 left-1 text-[8px] font-mono text-zinc-700">0{idx + 1}</div>
                                      
                                      {tower ? (
                                        <>
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-black border border-white/5 shadow-inner ${quantumSlots[idx] ? 'ring-1 ring-orange-500' : ''}`} style={{ color: quantumSlots[idx] ? '#f97316' : TOWER_STATS[tower].color }}>
                                              <div className="transform scale-75">{getIcon(tower)}</div>
                                          </div>
                                          {quantumSlots[idx] ? (
                                              <div className="text-[7px] font-bold uppercase bg-orange-500 text-black px-1 rounded-sm mt-1 animate-pulse">
                                                  CLONE
                                              </div>
                                          ) : (
                                              <div className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-black/50 border border-white/5 ${getRarityColor(TOWER_STATS[tower].rarity)}`}>
                                                  {TOWER_STATS[tower].rarity.slice(0,3)}
                                              </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="flex flex-col items-center opacity-30">
                                          <Lock size={16} className="text-zinc-600"/>
                                        </div>
                                      )}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-2">
                      <button 
                        onClick={() => setIsArsenalOpen(true)}
                        className="w-1/3 bg-purple-900/50 text-purple-400 hover:bg-purple-900/70 border border-purple-500/30 font-bold py-4 px-4 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.1)] text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                      >
                          <Shield size={16} /> Arsenal
                      </button>
                      <button 
                        onClick={handleNextSector}
                        className="w-2/3 bg-white text-black hover:bg-zinc-200 font-bold py-4 px-6 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.3)] text-sm tracking-[0.2em] uppercase transition-all transform active:scale-95"
                      >
                          Deploy Next Sector
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- TOP HUD (Stats) --- */}
      <header className={`shrink-0 z-20 bg-zinc-950/80 backdrop-blur border-b border-white/10 p-2 shadow-lg flex flex-col gap-2 absolute top-0 left-0 right-0`}>
         <div className={`flex justify-between items-center ${isPCVersion ? 'max-w-6xl' : 'max-w-lg'} mx-auto w-full`}>
             <div className="flex items-center gap-2">
                 <div className="flex flex-col leading-none">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">GALAXY {galaxy}</div>
                    <div className="text-xs text-white font-bold uppercase tracking-widest">SECTOR {level}</div>
                 </div>
                 <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                 <div className="text-yellow-400 font-bold flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">CR</span>
                    {Math.floor(money)}
                 </div>
             </div>

             <div 
                onClick={togglePause}
                className="cursor-pointer font-black italic text-lg tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105 transition-transform active:scale-95"
             >
                 SERVO<span className="text-white">:FF</span>
             </div>

             <div className="flex items-center gap-2">
                 <div className="text-cyan-400 font-bold flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">WV</span>
                    {wave} / 5
                 </div>
                 <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                 <div className="text-red-400 font-bold flex items-center gap-1">
                    <Shield size={14} />
                    {lives}
                 </div>
             </div>
         </div>

         {/* Tactical Ticker */}
         <div className={`flex items-center gap-2 overflow-hidden whitespace-nowrap text-[10px] text-zinc-500 border-t border-white/5 pt-1 ${isPCVersion ? 'max-w-6xl' : 'max-w-lg'} mx-auto w-full`}>
            <Radio size={10} className="text-cyan-500 animate-pulse shrink-0"/>
            <span className="text-cyan-500/80">{tacticalLog[0]}</span>
         </div>
      </header>

      {/* --- GAME CANVAS (Middle) --- */}
      <main className={`absolute inset-0 z-0 flex items-center justify-center bg-black overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-transparent pointer-events-none z-10"></div>
          <div className={`w-full h-full max-w-none p-0 flex items-center justify-center`}>
              <GameCanvas 
                gameWidth={mainDimensions.width}
                gameHeight={mainDimensions.height}
                isPCVersion={isPCVersion}
                isPaused={isPaused}
                selectedTower={selectedTower}
                onPlaceTower={() => {
                  setSelectedTower(null);
                  setSelectedSlotIndex(null);
                }}
                selectedServoForPlacement={selectedServoForPlacement}
                onPlaceServo={() => {
                  setSelectedServoForPlacement(null);
                  setIsServoPlaced(true);
                }}
                activeServo={activeServo}
                forceActivateSkillId={forceActivateSkillId}
                onSkillActivated={() => setForceActivateSkillId(null)}
                onMoneyChange={setMoney}
                onLivesChange={setLives}
                onWaveChange={handleWaveChange}
                onAnalysisUpdate={addLog}
                onSectorComplete={handleSectorComplete}
                onGalaxyComplete={handleGalaxyComplete}
                onModuleCollect={handleModuleCollect}
                onModuleSold={handleModuleSold}
                towerLevels={towerLevels}
                inventory={inventory}
                resetTrigger={mapResetTrigger}
                fullResetTrigger={fullResetTrigger}
                galaxy={galaxy}
                modifiers={modifiers}
                isConMode={isConMode}
                className="max-w-full max-h-full"
                isQuantumSelection={selectedSlotIndex !== null && !!quantumSlots[selectedSlotIndex]}
                onQuantumUsed={handleQuantumUsed}
                onReturnToMenu={() => setAppState('MENU')}
              />
          </div>
      </main>

      {/* --- BOTTOM DOCK (Controls) --- */}
      <footer className={`shrink-0 z-20 bg-zinc-950/90 backdrop-blur border-t border-white/10 pb-safe absolute bottom-0 left-0 right-0`}>
          <div className={`${isPCVersion ? 'max-w-6xl' : 'max-w-md'} mx-auto p-2 overflow-x-auto no-scrollbar`}>
              <div className="flex gap-3 justify-center min-w-max px-4">
                
                {/* Servo Slot */}
                {activeServo && (
                  <div className="flex gap-1 mr-2 border-r border-white/10 pr-3">
                    {!isServoPlaced ? (
                      <button
                        onClick={() => {
                          setSelectedServoForPlacement(selectedServoForPlacement ? null : activeServo);
                          setSelectedTower(null);
                          setSelectedSlotIndex(null);
                        }}
                        className={`w-32 h-20 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all duration-200 relative group flex-shrink-0
                          ${selectedServoForPlacement 
                            ? 'bg-purple-900/40 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] -translate-y-2' 
                            : 'bg-zinc-800/40 border-purple-500/30 active:scale-95' 
                          }
                        `}
                      >
                        <div className="absolute top-0 left-0 w-full text-center text-[8px] font-bold text-white/50 bg-purple-500/20 rounded-t-xl py-0.5">
                          SERVO
                        </div>
                        <Shield size={24} className="text-purple-400 mt-2" />
                        <div className="text-[9px] font-bold text-purple-400 uppercase mt-1">
                          DEPLOY
                        </div>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        {activeServo.skills.map((skill: any, idx: number) => {
                          const isUnlocked = skill.currentLevel > 0;
                          return (
                            <button
                              key={skill.id}
                              disabled={!isUnlocked}
                              onClick={() => {
                                const cost = 500;
                                if (money >= cost) {
                                  setMoney(prev => prev - cost);
                                  setForceActivateSkillId(skill.id);
                                } else {
                                  addLog(`Not enough credits to force activate ${skill.name}. Needs ${cost}.`);
                                }
                              }}
                              className={`w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all duration-200 relative group flex-shrink-0
                                ${isUnlocked 
                                  ? (money >= 500 ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/40 active:scale-95 cursor-pointer' : 'bg-red-900/20 border-red-500/30 opacity-50 cursor-not-allowed')
                                  : 'bg-zinc-900/20 border-transparent opacity-40 grayscale cursor-not-allowed'
                                }
                              `}
                            >
                              <div className={`absolute top-0 left-0 w-full text-center text-[8px] font-bold text-white/50 rounded-t-xl py-0.5 ${isUnlocked && money < 500 ? 'bg-red-500/20' : 'bg-purple-500/20'}`}>
                                SKILL {idx + 1}
                              </div>
                              <Zap size={16} className={isUnlocked ? (money >= 500 ? 'text-purple-400' : 'text-red-400') : 'text-zinc-500'} />
                              <div className={`text-[8px] font-bold uppercase mt-1 text-center leading-tight px-1 ${isUnlocked ? (money >= 500 ? 'text-purple-400' : 'text-red-400') : 'text-zinc-500'}`}>
                                {skill.name}
                              </div>
                              {isUnlocked && (
                                <div className="absolute -top-2 -right-2 bg-zinc-900 border border-purple-500/30 rounded-full px-1.5 py-0.5 text-[8px] text-purple-300 font-mono">
                                  $500
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeLoadout.map((type, idx) => {
                    if (!type) {
                        return (
                            <div key={`empty-${idx}`} className="w-16 h-20 rounded-xl bg-zinc-900/50 border border-white/5 flex flex-col items-center justify-center gap-1 opacity-50">
                                <Lock size={16} className="text-zinc-700"/>
                                <div className="text-[8px] text-zinc-700 font-bold uppercase">Empty</div>
                            </div>
                        );
                    }

                    const stats = TOWER_STATS[type];
                    const isQuantum = quantumSlots[idx];
                    const cost = isConMode ? 1 : (isQuantum ? 50 : stats.cost);
                    const isAffordable = money >= cost;
                    const isSelected = selectedTower === type && selectedSlotIndex === idx;
                    
                    const currentLvl = towerLevels[type] || 0;
                    const nextLvl = currentLvl + 1;
                    const heldTierStr = Object.keys(inventory).find(k => inventory[parseInt(k)] > 0);
                    const heldTier = heldTierStr ? parseInt(heldTierStr) : 0;
                    const canUpgrade = !isQuantum && heldTier >= nextLvl;

                    return (
                        <button
                            key={`${type}-${idx}`}
                            onClick={() => handleTowerDockClick(type, idx)}
                            disabled={!isAffordable && !isSelected}
                            className={`w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all duration-200 relative group flex-shrink-0
                              ${isSelected 
                                ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] -translate-y-2' 
                                : isAffordable 
                                  ? 'bg-zinc-800/40 border-white/10 active:scale-95' 
                                  : 'bg-zinc-900/20 border-transparent opacity-40 grayscale'
                              }
                              ${isQuantum ? 'border-orange-500/50 bg-orange-900/20' : ''}
                            `}
                        >
                            {/* Level Indicator */}
                            {!isQuantum && (
                                <div className="absolute top-0 left-0 w-full text-center text-[8px] font-bold text-white/50 bg-black/20 rounded-t-xl py-0.5">
                                    LVL {ROMAN_NUMERALS[currentLvl]}
                                </div>
                            )}
                            {isQuantum && (
                                <div className="absolute top-0 left-0 w-full text-center text-[8px] font-bold text-black bg-orange-500 rounded-t-xl py-0.5 animate-pulse">
                                    QUANTUM
                                </div>
                            )}

                            {/* Upgrade Indicator */}
                            {isSelected && canUpgrade && !isQuantum && (
                                <div className="absolute -top-5 left-0 w-full flex justify-center animate-bounce z-10">
                                    <div className="bg-yellow-500 text-black text-[7px] font-bold px-1.5 py-0.5 rounded flex items-center shadow-lg gap-0.5 border border-white/20">
                                        <ChevronUp size={8} /> TAP
                                    </div>
                                </div>
                            )}

                            <div className={`p-2 mt-2 rounded-lg ${isSelected ? 'bg-cyan-500/20' : 'bg-black/20'}`} style={{color: isQuantum ? '#f97316' : stats.color}}>
                                {getIcon(type)}
                            </div>
                            <div className={`text-[9px] font-bold ${isAffordable ? (isQuantum ? 'text-orange-400' : 'text-yellow-400') : 'text-red-400'}`}>
                                ${cost}
                            </div>
                            
                            {isSelected && (
                                <div className="absolute -top-2 right-[-4px] w-4 h-4 bg-cyan-400 rounded-full border-2 border-black flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                            )}
                        </button>
                    )
                })}
              </div>
          </div>
      </footer>
      <ArsenalModal 
        isOpen={isArsenalOpen} 
        onClose={() => setIsArsenalOpen(false)} 
        activeServo={activeServo} 
        setServos={setServos} 
        setActiveServo={setActiveServo}
        money={money} 
        setMoney={setMoney} 
      />
    </div>
  );
};

export default App;
