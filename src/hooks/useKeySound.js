import { useRef } from 'react';

export default function useKeySound() {
  const audioCtxRef = useRef(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser security policy)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playKeyClick = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      // --- 1. Procedural "Clack" (Snap contact / Plastic switch sound) ---
      // Generate a short buffer of white noise
      const bufferSize = ctx.sampleRate * 0.04; // 40ms duration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter to isolate the keyboard "clack" frequencies (mid-high plastic sound)
      const clackFilter = ctx.createBiquadFilter();
      clackFilter.type = 'bandpass';
      // Center frequency around 1800Hz, randomized slightly (±150Hz) for organic variance
      const randomizedClackFreq = 1800 + (Math.random() * 300 - 150);
      clackFilter.frequency.value = randomizedClackFreq;
      clackFilter.Q.value = 5.0; // Moderate resonance for hollow clack

      // Clack envelope (very fast attack, fast decay)
      const clackGain = ctx.createGain();
      clackGain.gain.setValueAtTime(0.0, now);
      clackGain.gain.linearRampToValueAtTime(0.35, now + 0.002); // Instant snap
      clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035); // 35ms decay

      // Connection: Noise -> Filter -> Gain -> Destination
      noiseNode.connect(clackFilter);
      clackFilter.connect(clackGain);
      clackGain.connect(ctx.destination);

      // --- 2. Procedural "Thump" (Key bottoming out / low end chassis resonance) ---
      const thumpOsc = ctx.createOscillator();
      thumpOsc.type = 'triangle';
      
      // Bottom out thump starts around 120Hz and drops to 50Hz, randomized slightly
      const randomizedThumpFreq = 120 + (Math.random() * 20 - 10);
      thumpOsc.frequency.setValueAtTime(randomizedThumpFreq, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(40, now + 0.025);

      // Thump envelope (decays very quickly)
      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.0, now);
      thumpGain.gain.linearRampToValueAtTime(0.6, now + 0.001);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025); // 25ms decay

      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);

      // Start & Stop nodes
      noiseNode.start(now);
      noiseNode.stop(now + 0.04);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.03);
    } catch (e) {
      console.warn("Failed to play mechanical key sound:", e);
    }
  };

  return { playKeyClick };
}
