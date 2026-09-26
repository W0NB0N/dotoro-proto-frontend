import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import SceneLighting from './SceneLighting';
import DotoroModel from './DotoroModel';

function InteractiveCameraHandler({ isInteracting }) {
  const defaultCameraPos = new THREE.Vector3(0, 0.85, 3.8);
  const defaultTarget = new THREE.Vector3(0, 0, 0);

  useFrame((state, delta) => {
    // If user is not dragging/interacting, rubber band camera and target back to center
    if (!isInteracting.current) {
      // Lerp camera position to base position
      state.camera.position.lerp(defaultCameraPos, 4 * delta);

      // Apply subtle, high-fidelity camera shake / noise drift (simulating a physical handheld camera/CRT monitor vibration)
      const t = state.clock.getElapsedTime();
      const shakeX = Math.sin(t * 0.7) * 0.0035 + Math.sin(t * 1.35) * 0.0018 + Math.cos(t * 2.8) * 0.0006;
      const shakeY = Math.sin(t * 0.5) * 0.0025 + Math.cos(t * 1.15) * 0.0012 + Math.sin(t * 2.3) * 0.0004;

      state.camera.position.x += shakeX;
      state.camera.position.y += shakeY;

      // Look at target center
      state.camera.lookAt(defaultTarget);
    }
  });

  return null;
}

// Helper to extract the average RGB color from the 32x32 pixel grid data
function getAverageColor(gridData) {
  if (!gridData || gridData.length === 0) return '#000000';

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  gridData.forEach(row => {
    row.forEach(colorStr => {
      if (colorStr) {
        let hex = colorStr.replace('#', '');
        if (hex.length === 3) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }
      }
    });
  });

  if (count === 0) return '#000000';

  const avgR = Math.round(totalR / count);
  const avgG = Math.round(totalG / count);
  const avgB = Math.round(totalB / count);

  return `rgb(${avgR}, ${avgG}, ${avgB})`;
}

import { useMemo } from 'react';

export default function DotoroScene({ gridData, onInput, theme, powered, onPowerToggle }) {
  const isInteracting = useRef(false);
  const controlsRef = useRef();

  // Dynamically calculate average screen color, or return solid black if powered off
  const glowColor = useMemo(() => {
    if (!powered) return '#000000';
    return getAverageColor(gridData);
  }, [gridData, powered]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0.15, 3.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Ambient lighting rig with screen glow */}
        <SceneLighting theme={theme} glowColor={glowColor} />

        {/* The Dotoro 3D Model sitting at y = -0.75 */}
        <group position={[0, -0.75, 0]}>
          <DotoroModel
            gridData={gridData}
            onInput={onInput}
            powered={powered}
            onPowerToggle={onPowerToggle}
          />
        </group>

        {/* Soft contact shadows underneath the device */}
        <ContactShadows
          position={[0, -0.74, 0]}
          opacity={0.6}
          scale={5}
          blur={2.0}
          far={1.5}
        />

        {/* Camera interaction handler (rubber banding logic) */}
        <InteractiveCameraHandler isInteracting={isInteracting} />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.05} // Don't orbit below the desk
          minPolarAngle={Math.PI / 8}        // Don't orbit directly overhead
          maxAzimuthAngle={Math.PI / 2}      // Limit left rotation
          minAzimuthAngle={-Math.PI / 2}     // Limit right rotation
          dampingFactor={0.05}
          enableDamping
          onStart={() => {
            isInteracting.current = true;
          }}
          onEnd={() => {
            // Set interacting to false so rubber-banding starts
            isInteracting.current = false;
          }}
        />
      </Canvas>
    </div>
  );
}
