import React from 'react';
import { X, Shield, Zap, Crosshair, ChevronUp } from 'lucide-react';
import { ServoData, ServoSkill } from '../types';
import { SERVO_STATS } from '../constants';

interface ArsenalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeServo: ServoData | null;
  setServos: React.Dispatch<React.SetStateAction<ServoData[]>>;
  setActiveServo: React.Dispatch<React.SetStateAction<ServoData | null>>;
  money: number;
  setMoney: React.Dispatch<React.SetStateAction<number>>;
}

const ArsenalModal: React.FC<ArsenalModalProps> = ({ isOpen, onClose, activeServo, setServos, setActiveServo, money, setMoney }) => {
  if (!isOpen) return null;

  if (!activeServo) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <Shield className="mx-auto text-zinc-600 mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">NO SERVO EQUIPPED</h2>
          <p className="text-zinc-400 text-sm mb-6">Equip a Servo in the Forge to access the Arsenal.</p>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg transition-colors">
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  const stats = SERVO_STATS[activeServo.type];
  const damageLevel = activeServo.damageLevel || 0;
  const basicUpgradeCost = 500 * Math.pow(1.5, damageLevel);

  const handleUpgradeBasicAttack = () => {
    if (money >= basicUpgradeCost) {
      setMoney(prev => prev - basicUpgradeCost);
      const updatedServo = {
        ...activeServo,
        damageLevel: damageLevel + 1
      };
      setActiveServo(updatedServo);
      setServos(prev => prev.map(s => s.id === activeServo.id ? updatedServo : s));
    }
  };

  const handleUpgradeSkill = (skillId: string) => {
    const skill = activeServo.skills.find(s => s.id === skillId);
    if (!skill) return;

    const cost = skill.baseUnlockCost * Math.pow(2, skill.currentLevel);
    if (money >= cost) {
      setMoney(prev => prev - cost);
      
      const updatedServo = {
        ...activeServo,
        skills: activeServo.skills.map(sk => {
          if (sk.id === skillId) {
            return { ...sk, currentLevel: sk.currentLevel + 1 };
          }
          return sk;
        })
      };

      setActiveServo(updatedServo);
      setServos(prev => prev.map(s => s.id === activeServo.id ? updatedServo : s));
    }
  };

  const handleForceActivate = (skillId: string) => {
    // This will be handled in GameCanvas, but we can add a button here or just let it be passive.
    // The prompt says "can also be forced with activation by using credits".
    // We will implement force activation in the game UI (the 2 connected slots).
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-purple-900/20">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wider">ARSENAL</h2>
              <p className="text-xs text-zinc-400">Upgrade {stats.name}'s skills.</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-lg border border-white/5">
              <span className="text-yellow-400 font-bold">${money}</span>
              <span className="text-xs text-zinc-500">CREDITS</span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Servo Info */}
          <div className="flex items-center gap-6 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
            <div className="w-24 h-24 bg-zinc-950 rounded-lg border border-white/10 flex items-center justify-center">
              {/* Placeholder for Servo Image */}
              <div className="text-purple-500/50 text-xs text-center">SERVO<br/>VISUAL</div>
            </div>
            <div>
              <h3 className="text-2xl font-bold" style={{ color: stats.color }}>{stats.name}</h3>
              <div className="text-xs text-zinc-500 font-mono mt-1 mb-3">ID: {activeServo.id.toUpperCase()}</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Crosshair size={14} className="text-red-400" />
                  <span className="text-sm text-zinc-300">DMG: {(stats.damage * activeServo.stats.damageMult * (1 + damageLevel * 0.2)).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="text-sm text-zinc-300">SPD: {(stats.cooldown / activeServo.stats.fireRateMult).toFixed(0)}ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Attack Upgrade */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Basic Attack</h3>
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    Weapon Damage
                    {damageLevel > 0 && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">LVL {damageLevel}</span>}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">Increases basic attack damage by 20% per level.</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 mb-1">BONUS</div>
                  <div className="text-sm font-bold text-cyan-400">+{(damageLevel * 20)}%</div>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button 
                  onClick={handleUpgradeBasicAttack}
                  disabled={money < basicUpgradeCost}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                >
                  <ChevronUp size={16} className="text-green-400" />
                  UPGRADE
                  <span className="text-yellow-400 ml-2">${Math.floor(basicUpgradeCost)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Skills & Upgrades</h3>
            
            {activeServo.skills.map(skill => {
              const cost = skill.baseUnlockCost * Math.pow(2, skill.currentLevel);
              const currentChance = skill.baseChance; // Chance no longer increases
              const isUnlocked = skill.currentLevel > 0;

              return (
                <div key={skill.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-2">
                        {skill.name}
                        {isUnlocked && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">LVL {skill.currentLevel}</span>}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">{skill.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 mb-1">CHANCE</div>
                      <div className="text-sm font-bold text-cyan-400">{(currentChance * 100).toFixed(1)}%</div>
                      {isUnlocked && (
                        <>
                          {skill.id === 'better_buddy' ? (
                            <>
                              <div className="text-[10px] text-zinc-500 mt-1 mb-1">DURATION</div>
                              <div className="text-sm font-bold text-amber-400">{20 + Math.max(0, skill.currentLevel - 1) * 10}s</div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] text-zinc-500 mt-1 mb-1">DMG MULT</div>
                              <div className="text-sm font-bold text-red-400">x{(skill.damageMultiplier || 1) * skill.currentLevel}</div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={() => handleUpgradeSkill(skill.id)}
                      disabled={money < cost}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                    >
                      <ChevronUp size={16} className="text-green-400" />
                      {isUnlocked ? 'UPGRADE' : 'UNLOCK'}
                      <span className="text-yellow-400 ml-2">${cost}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ArsenalModal;
