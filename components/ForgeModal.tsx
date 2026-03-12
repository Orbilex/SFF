import React from 'react';
import { Flame, X, Trash2, Sparkles, Zap, Shield, Crosshair } from 'lucide-react';
import { ServoType, ServoData, ServoSkill } from '../types';
import { SERVO_STATS } from '../constants';

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

const ForgeModal: React.FC<ForgeModalProps> = ({ isOpen, onClose, servium, setServium, servos, setServos, activeServo, setActiveServo }) => {
  if (!isOpen) return null;

  const handleCraft = (type: ServoType) => {
    const stats = SERVO_STATS[type];
    if (servium >= stats.cost) {
      setServium(prev => prev - stats.cost);
      
      // Generate random IVs
      const damageMult = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const fireRateMult = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

      const newServo: ServoData = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        stats: { damageMult, fireRateMult },
        damageLevel: 0,
        skills: stats.skills.map(s => ({
          ...s,
          currentLevel: 0
        }))
      };
      
      setServos(prev => [...prev, newServo]);
    }
  };

  const handleDestroy = (id: string) => {
    setServos(prev => prev.filter(s => s.id !== id));
    if (activeServo?.id === id) {
      setActiveServo(null);
    }
    setServium(prev => prev + 1); // Give back 1 servium
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-orange-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-orange-900/20">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Flame className="text-orange-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wider">THE FORGE</h2>
              <p className="text-xs text-zinc-400">Craft and manage your Servos.</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-lg border border-white/5">
              <Sparkles className="text-orange-400" size={16} />
              <span className="text-orange-400 font-bold">{servium}</span>
              <span className="text-xs text-zinc-500">SERVIUM</span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Crafting Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Crafting Schematics</h3>
            
            {Object.entries(SERVO_STATS).map(([type, stats]) => (
              <div key={type} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-white" style={{ color: stats.color }}>{stats.name}</h4>
                    <p className="text-xs text-zinc-400 mt-1">{stats.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500 mb-1">COST</div>
                    <div className="flex items-center gap-1 text-orange-400 font-bold">
                      <Sparkles size={14} /> {stats.cost}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleCraft(type as ServoType)}
                  disabled={servium < stats.cost}
                  className="w-full py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: servium >= stats.cost ? `${stats.color}20` : '#18181b',
                    color: servium >= stats.cost ? stats.color : '#52525b',
                    border: `1px solid ${servium >= stats.cost ? `${stats.color}50` : '#27272a'}`
                  }}
                >
                  <Flame size={18} />
                  CRAFT SERVO
                </button>
              </div>
            ))}
          </div>

          {/* Inventory Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Servo Inventory</h3>
            
            {servos.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm">
                No Servos in inventory.
              </div>
            ) : (
              <div className="space-y-3">
                {servos.map(servo => {
                  const stats = SERVO_STATS[servo.type];
                  const isActive = activeServo?.id === servo.id;
                  
                  return (
                    <div key={servo.id} className={`bg-zinc-900/50 border rounded-xl p-4 flex flex-col gap-3 transition-all ${isActive ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold" style={{ color: stats.color }}>{stats.name}</h4>
                          <div className="text-[10px] text-zinc-500 font-mono mt-1">ID: {servo.id.toUpperCase()}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActiveServo(isActive ? null : servo)}
                            className={`px-3 py-1 rounded text-xs font-bold border transition-all ${isActive ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}
                          >
                            {isActive ? 'EQUIPPED' : 'EQUIP'}
                          </button>
                          <button 
                            onClick={() => handleDestroy(servo.id)}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                            title="Destroy for 1 Servium"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-black/30 p-2 rounded flex items-center gap-2">
                          <Crosshair size={14} className="text-red-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500">DMG MULT</span>
                            <span className="text-xs font-bold text-zinc-300">{servo.stats.damageMult.toFixed(2)}x</span>
                          </div>
                        </div>
                        <div className="bg-black/30 p-2 rounded flex items-center gap-2">
                          <Zap size={14} className="text-yellow-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500">FIRE RATE MULT</span>
                            <span className="text-xs font-bold text-zinc-300">{servo.stats.fireRateMult.toFixed(2)}x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgeModal;
