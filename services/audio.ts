
// Procedural Audio Synthesizer for Sci-Fi FX
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentVolume = 0.1; // Lower default volume

let musicAudio: HTMLAudioElement | null = null;
let currentMusicVolume = 0.3;

export const setVolume = (vol: number) => {
  currentVolume = vol;
  if (masterGain) {
    masterGain.gain.value = currentVolume;
  }
};

export const setMusicVolume = (vol: number) => {
  currentMusicVolume = vol;
  if (musicAudio) {
    musicAudio.volume = currentMusicVolume;
  }
};

export const playMusic = () => {
  if (!musicAudio) {
    musicAudio = new Audio('/servoframefield.mp3');
    musicAudio.loop = true;
    musicAudio.volume = currentMusicVolume;
  }
  musicAudio.play().catch(e => console.error("Audio play failed:", e));
};

export const stopMusic = () => {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.currentTime = 0;
  }
};

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = currentVolume; // Master volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

type SoundType = 'LASER' | 'PLASMA' | 'HIT' | 'EXPLOSION' | 'BUILD' | 'START' | 'ALARM' | 'ROCKET';

export const playSound = (type: SoundType) => {
  initAudio();
  if (!audioCtx || !masterGain) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGain);

  const now = audioCtx.currentTime;

  switch (type) {
    case 'LASER':
      // Pew pew - fast descending sine
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'PLASMA':
      // Thumpy shot
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'ROCKET':
      // Missile launch - rising scratchy tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.4);
      
      // Modulate for roughness (thruster sound)
      const thrusterLfo = audioCtx.createOscillator();
      thrusterLfo.type = 'square';
      thrusterLfo.frequency.value = 60;
      const thrusterLfoGain = audioCtx.createGain();
      thrusterLfoGain.gain.value = 100;
      thrusterLfo.connect(thrusterLfoGain);
      thrusterLfoGain.connect(osc.frequency);
      thrusterLfo.start(now);
      thrusterLfo.stop(now + 0.4);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'HIT':
      // Short metallic click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'EXPLOSION':
      // Noise-ish (simulated with low freq modulation)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.4);
      
      // Modulate for roughness
      const lfo = audioCtx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 50;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 500;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + 0.4);

      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.4);
      break;
      
    case 'BUILD':
      // High tech confirmation
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'START':
      // Power up
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(660, now + 1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.5);
      gain.gain.linearRampToValueAtTime(0, now + 1);
      osc.start(now);
      osc.stop(now + 1);
      break;
      
    case 'ALARM':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.5);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
  }
};
