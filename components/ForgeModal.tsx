import React, { useState, useEffect } from 'react';
import { Flame, X, Trash2, Sparkles, Zap, Shield, Crosshair, Bot, Database, Activity } from 'lucide-react';
import { ServoType, ServoData, ServoSkill } from '../types';
import { SERVO_STATS } from '../constants';
import { playSound, playBetterBuddyTheme, stopBetterBuddyTheme } from '../services/audio';
import DemoServoCanvas from './DemoServoCanvas';

interface ForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  servium: number;
  setServium: React.Dispatch<React.SetStateAction<number>>;
  servos: ServoData[];
  setServos: React.Dispatch<React.SetStateAction<ServoData[]>>;
  activeServo: ServoData | null;
  setActiveServo: React.Dispatch<React.SetStateAction<ServoData | null>>;
}

type ForgeState = 'IDLE' | 'EXTRACTION' | 'ANALYSIS' | 'MATERIALIZATION' | 'REVEALED';

const ForgeModal: React.FC<ForgeModalProps> = ({ isOpen, onClose, servium, setServium, servos, setServos, activeServo, setActiveServo }) => {
  const [forgeState, setForgeState] = useState<ForgeState>('IDLE');
  const [pulledServo, setPulledServo] = useState<ServoData | null>(null);
  const [logs, setLogs] = useState<string[]>(['> RECOVERY PROGRAM INITIALIZED.', '> AWAITING SERVIUM INPUT...']);
  const [stability, setStability] = useState(100);
  const [showInventory, setShowInventory] = useState(false);

  const PULL_COST = 5;

  useEffect(() => {
    if (!isOpen) {
      setForgeState('IDLE');
      setPulledServo(null);
      setLogs(['> RECOVERY PROGRAM INITIALIZED.', '> AWAITING SERVIUM INPUT...']);
      setStability(100);
      setShowInventory(false);
      stopBetterBuddyTheme();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initiateRecovery = () => {
    if (servium < PULL_COST) return;
    setServium(prev => prev - PULL_COST);
    setForgeState('EXTRACTION');
    playSound('FORGE_EXTRACTION');
    
    // Generate Servo upfront to know rarity for animations
    const types = Object.keys(SERVO_STATS) as ServoType[];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const stats = SERVO_STATS[randomType];

    const generateMultiplier = () => {
      const r = Math.max(Math.random(), 1e-10);
      const k = 0.5887;
      const m = 1 - Math.log(r) / k;
      return Math.round(Math.min(10, Math.max(1, m)) * 100) / 100;
    };

    const damageMult = generateMultiplier();
    const fireRateMult = 0.8 + Math.random() * 0.4;

    const newServo: ServoData = {
      id: Math.random().toString(36).substr(2, 9),
      type: randomType,
      stats: { damageMult, fireRateMult },
      damageLevel: 0,
      skills: stats.skills.map(s => ({
        ...s,
        currentLevel: 0
      }))
    };
    
    setPulledServo(newServo);

    const generateHex = () => Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16).toUpperCase()).join('');
    
    setLogs(prev => ['> INITIATING EXTRACTION SEQUENCE...', `> [${generateHex()}] ALLOCATING MEMORY...`, ...prev]);
    
    // Fluctuate stability and add hex logs
    const stabInterval = setInterval(() => {
      setStability(Math.floor(Math.random() * 40) + 40);
      if (Math.random() > 0.5) {
        setLogs(prev => [`> 0x${generateHex()} : DATA STREAM ACTIVE`, ...prev].slice(0, 20));
      }
    }, 100);

    setTimeout(() => {
      setForgeState('ANALYSIS');
      playSound('FORGE_ANALYSIS');
      setLogs(prev => ['> EXTRACTION COMPLETE.', '> COMMENCING SIGNATURE ANALYSIS...', `> [${generateHex()}] MATCHING PATTERNS...`, ...prev]);
      
      setTimeout(() => {
        clearInterval(stabInterval);
        setStability(100);
        setForgeState('MATERIALIZATION');
        playSound('FORGE_MATERIALIZATION');
        setLogs(prev => ['> SIGNATURE MATCH FOUND.', '> MATERIALIZING CORE...', `> [${generateHex()}] RECONSTRUCTING...`, ...prev]);
        
        setTimeout(() => {
          setForgeState('REVEALED');
          if (damageMult >= 5) {
            playBetterBuddyTheme();
          }
          setLogs(prev => ['> RECONSTRUCTION SUCCESSFUL.', '> AWAITING USER ACCEPTANCE.', ...prev]);
        }, 2000);

      }, 2000);
    }, 3000);
  };

  const acceptServo = () => {
    if (pulledServo) {
      setServos(prev => [...prev, pulledServo]);
      setPulledServo(null);
      setForgeState('IDLE');
      setLogs(['> CORE ACCEPTED.', '> READY FOR NEXT RECONSTRUCTION.']);
      stopBetterBuddyTheme();
    }
  };

  const equipAndAcceptServo = () => {
    if (pulledServo) {
      setServos(prev => [...prev, pulledServo]);
      setActiveServo(pulledServo);
      setPulledServo(null);
      setForgeState('IDLE');
      setLogs(['> CORE ACCEPTED AND EQUIPPED.', '> READY FOR NEXT RECONSTRUCTION.']);
      stopBetterBuddyTheme();
    }
  };

  const handleDestroy = (id: string) => {
    setServos(prev => prev.filter(s => s.id !== id));
    if (activeServo?.id === id) {
      setActiveServo(null);
    }
    setServium(prev => prev + 1);
  };

  const getRarityColorClass = () => {
    if (!pulledServo) return { scan: 'via-cyan-400/60', border: 'border-cyan-400' };
    if (pulledServo.stats.damageMult >= 5) return { scan: 'via-yellow-400/60', border: 'border-yellow-400' };
    if (pulledServo.stats.damageMult >= 3) return { scan: 'via-purple-400/60', border: 'border-purple-400' };
    return { scan: 'via-cyan-400/60', border: 'border-cyan-400' };
  };

  return (
    <div className="fixed inset-0 bg-[#050505] z-50 flex flex-col font-mono overflow-hidden">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both infinite;
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500px); }
        }
        .animate-scan {
          animation: scan 1.2s linear infinite;
        }
        @keyframes flash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 1.5s ease-out forwards;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-fast {
          animation: spin-fast 1s linear infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes orbital-strike {
          0% { transform: scaleY(0) scaleX(0.1); opacity: 0; filter: brightness(1); }
          5% { transform: scaleY(1) scaleX(1.5); opacity: 1; filter: brightness(2); }
          10% { transform: scaleY(1) scaleX(1.2); opacity: 0.9; filter: brightness(1.5); }
          50% { transform: scaleY(1) scaleX(1.4); opacity: 1; filter: brightness(1.8); }
          90% { transform: scaleY(1) scaleX(1.1); opacity: 0.8; filter: brightness(1.2); }
          95% { transform: scaleY(1) scaleX(0.5); opacity: 0.5; filter: brightness(2); }
          100% { transform: scaleY(1) scaleX(0); opacity: 0; filter: brightness(1); }
        }
        .animate-orbital-strike {
          animation: orbital-strike 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes orbital-strike-core {
          0% { transform: scaleY(0) scaleX(0.1); opacity: 0; }
          10% { transform: scaleY(1) scaleX(1.8); opacity: 1; }
          50% { transform: scaleY(1) scaleX(1.3); opacity: 1; }
          90% { transform: scaleY(1) scaleX(1.5); opacity: 1; }
          100% { transform: scaleY(1) scaleX(0); opacity: 0; }
        }
        .animate-orbital-strike-core {
          animation: orbital-strike-core 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes code-fall {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-code-fall {
          animation: code-fall 2s linear infinite;
        }
        @keyframes extraction-fade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-extraction-fade {
          animation: extraction-fade 3.5s ease-out forwards;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 border-b border-cyan-900/50 bg-black/80 flex justify-between items-center z-20 shadow-[0_4px_30px_rgba(0,255,255,0.05)]">
        <div className="flex items-center gap-4">
          <div className="text-cyan-500 font-bold text-lg md:text-xl tracking-widest flex items-center gap-2">
            <Activity className="animate-pulse" />
            Forge.
          </div>
          <div className="text-xs text-cyan-800 hidden md:block tracking-widest">SYS.VER.9.4.2 // : PROTOTYPE OMEGA</div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={() => setShowInventory(true)}
            className="flex items-center gap-2 text-cyan-600 hover:text-cyan-400 transition-colors text-sm tracking-widest border border-cyan-900/50 px-3 py-1.5 rounded bg-cyan-950/20"
          >
            <Database size={16} />
            <span className="hidden md:inline">INVENTORY</span>
          </button>
          <div className="flex items-center gap-2 bg-cyan-950/30 px-3 md:px-4 py-1.5 md:py-2 rounded border border-cyan-900/50">
            <Sparkles className="text-cyan-400" size={16} />
            <span className="text-cyan-400 font-bold">{servium}</span>
            <span className="text-xs text-cyan-700 hidden md:inline">SERVIUM</span>
          </div>
          <button onClick={onClose} className="text-cyan-700 hover:text-cyan-400 transition-colors">
            <X size={28} />
          </button>
        </div>
      </div>

      {/* Left Panel: Stability Meter */}
      <div className="hidden lg:flex absolute left-8 top-24 bottom-28 w-64 border border-cyan-900/50 bg-black/80 backdrop-blur-md flex-col z-10 shadow-[0_0_30px_rgba(0,255,255,0.05)]">
        <div className="p-4 border-b border-cyan-900/50 bg-cyan-950/20">
          <div className="text-xs text-cyan-500 mb-1 tracking-widest">SYSTEM STABILITY</div>
          <div className="text-[10px] text-cyan-700">CORE TEMPERATURE NOMINAL</div>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-end gap-2">
          {Array.from({ length: 25 }).map((_, i) => {
            const isActive = i < (stability / 4);
            let colorClass = 'bg-cyan-950/30';
            if (isActive) {
              if (i > 20) colorClass = 'bg-red-500 shadow-[0_0_10px_red]';
              else if (i > 15) colorClass = 'bg-yellow-500 shadow-[0_0_10px_yellow]';
              else colorClass = 'bg-cyan-500 shadow-[0_0_10px_cyan]';
            }
            return (
              <div key={i} className={`h-full w-full rounded-sm transition-colors duration-75 ${colorClass}`} />
            );
          })}
        </div>
        <div className="p-4 border-t border-cyan-900/50 text-center bg-cyan-950/10">
          <div className="text-3xl text-cyan-400 font-bold tracking-widest">{stability}%</div>
          <div className="text-[10px] text-cyan-600 mt-1">CONTAINMENT FIELD</div>
        </div>
      </div>

      {/* Right Panel: Detected Signatures & Logs */}
      <div className="hidden lg:flex absolute right-8 top-24 bottom-28 w-72 border border-cyan-900/50 bg-black/80 backdrop-blur-md flex-col z-10 shadow-[0_0_30px_rgba(0,255,255,0.05)]">
        <div className="p-4 border-b border-cyan-900/50 bg-cyan-950/20">
          <div className="text-xs text-cyan-500 mb-1 tracking-widest">DETECTED SIGNATURES</div>
          <div className="text-[10px] text-cyan-700">PROBABILITY MATRIX ACTIVE</div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-3 no-scrollbar">
          {Object.entries(SERVO_STATS).map(([type, stats]) => (
            <div key={type} className="border border-cyan-900/30 bg-cyan-950/10 p-3 rounded">
              <div className="text-sm text-cyan-300 flex justify-between items-center mb-1">
                <span>{stats.name}</span>
                <span className="text-[10px] text-cyan-600">[{type.substring(0, 4)}]</span>
              </div>
              <div className="text-[10px] text-cyan-600 leading-tight">
                {stats.desc}
              </div>
            </div>
          ))}
          <div className="border border-zinc-800/50 bg-zinc-900/10 p-3 rounded opacity-50">
            <div className="text-sm text-zinc-500 flex justify-between items-center mb-1">
              <span>UNKNOWN_ENTITY</span>
              <span className="text-[10px] text-zinc-600">[????]</span>
            </div>
            <div className="text-[10px] text-zinc-600 leading-tight">
              Data corrupted. Signature unreadable.
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-cyan-900/50 h-48 flex flex-col bg-cyan-950/10">
          <div className="text-xs text-cyan-500 mb-2 tracking-widest">PROCESS LOG</div>
          <div className="flex-1 overflow-y-auto text-[10px] text-cyan-600/70 space-y-1 no-scrollbar flex flex-col-reverse">
            {[...logs].reverse().map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Center Chamber */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-8">
        <div className={`relative w-64 h-[400px] md:w-96 md:h-[500px] flex items-center justify-center transition-transform duration-100`}>
          {/* Background structure */}
          <div className="absolute inset-x-4 md:inset-x-8 top-0 bottom-0 bg-[#0a0a0a] border-x-4 border-zinc-800 rounded-t-full rounded-b-lg shadow-[0_0_50px_rgba(0,255,255,0.05)]" />
          
          {/* Glass Cylinder */}
          <div className="absolute inset-x-8 md:inset-x-12 top-8 bottom-8 border-2 border-cyan-500/30 rounded-t-full rounded-b bg-cyan-900/20 backdrop-blur-sm overflow-hidden shadow-[inset_0_0_30px_rgba(0,255,255,0.2)]">
            {/* Coolant / Ether */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 via-cyan-900/10 to-transparent" />
            
            {/* Particles / Fragments */}
            {forgeState === 'IDLE' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-zinc-600/50 rotate-45 animate-spin-slow opacity-50" />
                <div className="absolute w-12 h-12 border-2 border-zinc-500/50 rotate-12 animate-spin-reverse opacity-50" />
                <div className="absolute w-8 h-8 border border-zinc-400/50 -rotate-45 animate-spin-slow opacity-50" />
              </div>
            )}

            {/* Extraction Lasers */}
            {(forgeState === 'EXTRACTION' || forgeState === 'ANALYSIS') && (
              <div className="absolute inset-0 flex justify-center overflow-hidden animate-extraction-fade pointer-events-none">
                {/* Orbital Strike Laser */}
                <div className="w-8 h-full bg-cyan-100 shadow-[0_0_100px_#22d3ee] animate-orbital-strike origin-top z-10" />
                <div className="absolute w-16 h-full bg-cyan-400/60 blur-xl animate-orbital-strike origin-top z-0" />
                <div className="absolute w-32 h-full bg-cyan-600/30 blur-2xl animate-orbital-strike origin-top z-0" />
                <div className="absolute w-2 h-full bg-white shadow-[0_0_50px_#fff] animate-orbital-strike-core origin-top z-20" />
                
                {/* Code Particles */}
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-cyan-300 font-mono text-xl font-bold animate-code-fall opacity-0 z-30"
                    style={{
                      left: `${45 + Math.random() * 10}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${0.5 + Math.random() * 1.5}s`
                    }}
                  >
                    {Math.random() > 0.5 ? '1' : '0'}
                  </div>
                ))}
              </div>
            )}

            {/* Analysis Scan */}
            {forgeState === 'ANALYSIS' && (
              <div className="absolute inset-0 animate-fade-in pointer-events-none">
                <div className={`absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent ${getRarityColorClass().scan} to-transparent animate-scan`} />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className={`w-24 h-24 border-2 border-dashed ${getRarityColorClass().border} rounded-full animate-spin-slow opacity-80`} />
                </div>
              </div>
            )}

            {/* Materialization */}
            {forgeState === 'MATERIALIZATION' && (
              <div className="absolute inset-0 bg-white animate-flash" />
            )}

            {/* Revealed Servo Silhouette/Icon */}
            {(forgeState === 'REVEALED' && pulledServo) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in">
                <Bot size={100} className="text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,1)]" />
                <div className="absolute bottom-10 w-full h-20 bg-gradient-to-t from-cyan-500/50 to-transparent blur-xl" />
              </div>
            )}
          </div>

          {/* Hydraulic Pistons (Left & Right) */}
          <div className="absolute left-0 md:left-2 top-1/4 bottom-1/4 w-6 md:w-8 bg-zinc-900 border border-zinc-700 flex flex-col justify-between p-1 shadow-lg">
            <div className={`w-full bg-zinc-800 border-b-2 border-zinc-600 transition-all duration-100 ${forgeState === 'EXTRACTION' ? 'h-1/2' : 'h-1/3'}`} />
            <div className={`w-full bg-zinc-800 border-t-2 border-zinc-600 transition-all duration-100 ${forgeState === 'EXTRACTION' ? 'h-1/2' : 'h-1/3'}`} />
          </div>
          <div className="absolute right-0 md:right-2 top-1/4 bottom-1/4 w-6 md:w-8 bg-zinc-900 border border-zinc-700 flex flex-col justify-between p-1 shadow-lg">
            <div className={`w-full bg-zinc-800 border-b-2 border-zinc-600 transition-all duration-100 ${forgeState === 'EXTRACTION' ? 'h-1/2' : 'h-1/3'}`} />
            <div className={`w-full bg-zinc-800 border-t-2 border-zinc-600 transition-all duration-100 ${forgeState === 'EXTRACTION' ? 'h-1/2' : 'h-1/3'}`} />
          </div>

          {/* Top Cap */}
          <div className="absolute top-0 left-2 right-2 md:left-4 md:right-4 h-12 bg-zinc-900 border border-zinc-700 rounded-t-full flex items-center justify-center shadow-lg">
            <div className="w-1/2 h-2 bg-cyan-500/50 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
          </div>

          {/* Bottom Base */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-zinc-900 border border-zinc-700 rounded-b-lg flex items-center justify-center px-4 md:px-8 shadow-lg z-10">
            <div className="w-full h-4 bg-black rounded-full overflow-hidden border border-zinc-800">
              <div className={`h-full bg-cyan-500/50 w-full ${forgeState !== 'IDLE' && forgeState !== 'REVEALED' ? 'animate-pulse' : 'opacity-30'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 w-full px-4">
        {forgeState === 'IDLE' && (
          <button 
            onClick={initiateRecovery}
            disabled={servium < PULL_COST}
            className="group relative w-full max-w-md px-4 md:px-8 py-4 bg-cyan-950 border border-cyan-500 text-cyan-400 font-bold text-sm md:text-lg tracking-widest uppercase overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-900 transition-colors shadow-[0_0_20px_rgba(0,255,255,0.2)]"
          >
            <div className="absolute inset-0 bg-cyan-500/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            <span className="relative flex items-center justify-center gap-2">
              <Zap size={20} />
              INITIATE DATA RECONSTRUCTION
              <span className="text-xs md:text-sm text-cyan-600 ml-2 flex items-center gap-1">[{PULL_COST} <Sparkles size={14} />]</span>
            </span>
          </button>
        )}
      </div>

      {/* Fullscreen Servo Showcase (REVEALED) */}
      {forgeState === 'REVEALED' && pulledServo && (
        <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl z-40 flex flex-col md:flex-row items-center justify-center p-8 animate-fade-in overflow-y-auto">
          {/* Left: Large Visual */}
          <div className="w-full md:w-1/2 flex items-center justify-center relative min-h-[500px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 to-transparent rounded-full blur-3xl" />
            <div className="w-[500px] h-[500px] relative z-10 animate-float">
              <DemoServoCanvas selectedServo={pulledServo.type} />
            </div>
            <div className="absolute bottom-10 w-3/4 h-8 bg-cyan-500/30 blur-xl rounded-full" />
          </div>
          
          {/* Right: Details */}
          <div className="w-full md:w-1/2 max-w-2xl flex flex-col gap-6 bg-black/50 p-8 border border-cyan-900/50 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
            <div>
              <div className="text-cyan-500 text-sm tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={16} /> NEW SIGNATURE ACQUIRED
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-wider uppercase" style={{ color: SERVO_STATS[pulledServo.type].color }}>
                {SERVO_STATS[pulledServo.type].name}
              </h2>
              <div className="text-zinc-400 mt-4 text-sm leading-relaxed border-l-2 border-cyan-900/50 pl-4">
                {SERVO_STATS[pulledServo.type].desc}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-lg flex flex-col">
                <span className="text-xs text-zinc-500 mb-2 flex items-center gap-2"><Crosshair size={14}/> DAMAGE MULTIPLIER</span>
                <span className={`text-3xl font-bold ${pulledServo.stats.damageMult >= 5 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : pulledServo.stats.damageMult >= 3 ? 'text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]' : 'text-cyan-400'}`}>
                  {pulledServo.stats.damageMult.toFixed(2)}x
                </span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-lg flex flex-col">
                <span className="text-xs text-zinc-500 mb-2 flex items-center gap-2"><Zap size={14}/> FIRE RATE MULTIPLIER</span>
                <span className="text-3xl font-bold text-cyan-400">
                  {pulledServo.stats.fireRateMult.toFixed(2)}x
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-cyan-600 text-sm tracking-widest border-b border-cyan-900/50 pb-2">COMBAT PROTOCOLS</h3>
              {SERVO_STATS[pulledServo.type].skills.map((skill, idx) => (
                <div key={idx} className="bg-cyan-950/10 border border-cyan-900/30 p-3 rounded flex gap-3 items-start">
                  <div className="p-2 bg-cyan-900/20 rounded text-cyan-400">
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-cyan-300 font-bold text-sm">{skill.name}</div>
                    <div className="text-zinc-500 text-xs mt-1">{skill.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-4">
              <button 
                onClick={equipAndAcceptServo}
                className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest transition-colors rounded shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              >
                EQUIP NOW
              </button>
              <button 
                onClick={acceptServo}
                className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-cyan-500 border border-cyan-900/50 font-bold tracking-widest transition-colors rounded"
              >
                STORE IN INVENTORY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Overlay */}
      {showInventory && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4 md:p-8">
          <div className="flex justify-between items-center mb-8 border-b border-cyan-900/50 pb-4">
            <div className="flex items-center gap-3">
              <Database className="text-cyan-500" size={24} />
              <h2 className="text-xl font-bold text-cyan-400 tracking-widest">SERVO INVENTORY</h2>
            </div>
            <button onClick={() => setShowInventory(false)} className="text-cyan-600 hover:text-cyan-400 transition-colors">
              <X size={32} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {servos.length === 0 ? (
              <div className="text-center py-20 text-cyan-800 text-sm tracking-widest">
                NO SERVOS IN STORAGE. INITIATE RECONSTRUCTION.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servos.map(servo => {
                  const stats = SERVO_STATS[servo.type];
                  const isActive = activeServo?.id === servo.id;
                  
                  return (
                    <div key={servo.id} className={`bg-black border p-4 flex flex-col gap-4 transition-all ${isActive ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-cyan-900/50 hover:border-cyan-700'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg tracking-wider" style={{ color: stats.color }}>{stats.name}</h4>
                          <div className="text-[10px] text-cyan-700 mt-1">ID: {servo.id.toUpperCase()}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveServo(isActive ? null : servo)}
                            className={`px-3 py-1 text-xs font-bold border transition-all ${isActive ? 'bg-cyan-950 text-cyan-400 border-cyan-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-cyan-500 hover:border-cyan-800'}`}
                          >
                            {isActive ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                          <button 
                            onClick={() => handleDestroy(servo.id)}
                            className="p-1.5 bg-red-950/30 text-red-500/50 border border-red-900/30 hover:text-red-400 hover:border-red-500/50 transition-all"
                            title="Deconstruct for 1 Servium"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 bg-zinc-950/50 p-3 border border-zinc-900">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-600 mb-1 flex items-center gap-1"><Crosshair size={10}/> DMG MULT</span>
                          <span className="text-sm font-bold text-zinc-300">{servo.stats.damageMult.toFixed(2)}x</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-600 mb-1 flex items-center gap-1"><Zap size={10}/> SPD MULT</span>
                          <span className="text-sm font-bold text-zinc-300">{servo.stats.fireRateMult.toFixed(2)}x</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeModal;

