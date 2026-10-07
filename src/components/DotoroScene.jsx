import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import SceneLighting from './SceneLighting';
import DotoroModel from './DotoroModel';

function InteractiveCameraHandler({ isInteracting }) {
  // Center camera position and target so the full model (top monitor bezel to bottom keyboard) is clearly visible
  const defaultCameraPos = new THREE.Vector3(0, 0.45, 4.75);
  const defaultTarget = new THREE.Vector3(0, -0.05, 0);

  useFrame((state, delta) => {
    // If user is not dragging/interacting, rubber band camera and target back to center
    if (!isInteracting.current) {
      // Lerp camera position to base position
      state.camera.position.lerp(defaultCameraPos, 4 * delta);

      // Apply subtle camera shake / noise drift
      const t = state.clock.getElapsedTime();
      const shakeX = Math.sin(t * 0.7) * 0.003 + Math.sin(t * 1.35) * 0.0015 + Math.cos(t * 2.8) * 0.0005;
      const shakeY = Math.sin(t * 0.5) * 0.002 + Math.cos(t * 1.15) * 0.001 + Math.sin(t * 2.3) * 0.0003;

      state.camera.position.x += shakeX;
      state.camera.position.y += shakeY;

      // Look at target center
      state.camera.lookAt(defaultTarget);
    }
  });

  return null;
}

export default function DotoroScene({ gridData, onInput, theme, powered, onPowerToggle }) {
  const isInteracting = useRef(false);
  const controlsRef = useRef();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0.45, 4.75], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Clean studio ambient and directional key lighting */}
        <SceneLighting theme={theme} />

        {/* The Dotoro 3D Model centered comfortably in the viewport */}
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
          target={[0, -0.05, 0]}
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
            isInteracting.current = false;
          }}
        />
      </Canvas>
    </div>
  );
}
