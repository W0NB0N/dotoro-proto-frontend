import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function SceneLighting({ theme, glowColor }) {
  const screenLightRef = useRef();

  const ambientColor = '#0b1611'; // Brighter greenish-slate for room ambiance
  const keyLightColor = '#f1f5f9'; // Bright slate white key light
  const rimLightColor = theme?.ambientAccent || '#00ff66';

  // Add a nice organic flicker/pulse to the screen light to simulate a retro CRT screen
  useFrame(({ clock }) => {
    if (screenLightRef.current) {
      if (glowColor === '#000000') {
        screenLightRef.current.intensity = 0;
      } else {
        const t = clock.getElapsedTime();
        // Soft CRT noise: combination of sine waves at different frequencies
        const flicker = Math.sin(t * 8) * 0.05 + Math.sin(t * 26) * 0.02 + Math.sin(t * 1.5) * 0.01;
        screenLightRef.current.intensity = 2.5 + flicker;
      }
    }
  });

  return (
    <>
      {/* 1. Ambient Light - boosted room ambiance */}
      <ambientLight color={ambientColor} intensity={0.8} />

      {/* 2. Key Light - bright key light from the front-right to shape the model */}
      <directionalLight
        position={[4, 5, 3]}
        color={keyLightColor}
        intensity={0.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />



      {/* Additional side accent light to fill the shape */}
      <directionalLight
        position={[5, -2, -2]}
        color="#022c22"
        intensity={0.4}
      />

      {/* Soft warm fill light from below-front to reveal details on the keyboard face */}
      <directionalLight
        position={[0, -2, 3]}
        color="#ffd1a9"
        intensity={0.25}
      />

      {/* 4. Screen Glow Point Light - shifted right to cast keyboard shadows */}
      <pointLight
        ref={screenLightRef}
        position={[0.6, 0.2, 1.0]}
        color={glowColor}
        intensity={2.5}
        distance={5.0}
        decay={1.8}
        castShadow
        shadow-bias={-0.0005}
      />
    </>
  );
}
