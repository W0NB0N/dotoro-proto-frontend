import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import usePixelTexture from '../hooks/usePixelTexture';
import useKeySound from '../hooks/useKeySound';

export default function DotoroModel({ gridData, onInput, powered, onPowerToggle }) {
  // Load the GLB model from the public directory
  const { nodes } = useGLTF('/models/dotoro.glb');

  // Instantiate the clack sound hook
  const { playKeyClick } = useKeySound();

  // Generate dynamic pixel grid texture
  const pixelTexture = usePixelTexture(powered ? gridData : []);

  // References for key meshes to animate their positions
  const keyUpRef = useRef();
  const keyDownRef = useRef();
  const keyLeftRef = useRef();
  const keyRightRef = useRef();
  const keyEnterRef = useRef();
  const keyMenuRef = useRef();
  const keyBootRef = useRef();

  // Store initial Y positions of the keys
  const initialY = useRef({
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    enter: 0,
    menu: 0,
    boot: 0
  });

  // Track key press depth offsets (negative is pressed down)
  const keyOffsets = useRef({
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    enter: 0,
    menu: 0,
    boot: 0
  });

  // Capture initial position.y once nodes are loaded
  useEffect(() => {
    if (nodes['key-up']) initialY.current.up = nodes['key-up'].position.y;
    if (nodes['key-down']) initialY.current.down = nodes['key-down'].position.y;
    if (nodes['key-left']) initialY.current.left = nodes['key-left'].position.y;
    if (nodes['key-right']) initialY.current.right = nodes['key-right'].position.y;
    if (nodes['key-enter']) initialY.current.enter = nodes['key-enter'].position.y;
    if (nodes['key-menu']) initialY.current.menu = nodes['key-menu'].position.y;
    if (nodes['key-boot']) initialY.current.boot = nodes['key-boot'].position.y;
  }, [nodes]);

  // Frame loop for spring-like key animations
  useFrame((state, delta) => {
    const decay = 15; // Animation speed returning to original height
    
    // Decelerate offsets back to 0
    Object.keys(keyOffsets.current).forEach((key) => {
      keyOffsets.current[key] += (0 - keyOffsets.current[key]) * decay * delta;
    });

    // Apply animated positions relative to their initial Y
    if (keyUpRef.current) keyUpRef.current.position.y = initialY.current.up + keyOffsets.current.up;
    if (keyDownRef.current) keyDownRef.current.position.y = initialY.current.down + keyOffsets.current.down;
    if (keyLeftRef.current) keyLeftRef.current.position.y = initialY.current.left + keyOffsets.current.left;
    if (keyRightRef.current) keyRightRef.current.position.y = initialY.current.right + keyOffsets.current.right;
    if (keyEnterRef.current) keyEnterRef.current.position.y = initialY.current.enter + keyOffsets.current.enter;
    if (keyMenuRef.current) keyMenuRef.current.position.y = initialY.current.menu + keyOffsets.current.menu;
    if (keyBootRef.current) keyBootRef.current.position.y = initialY.current.boot + keyOffsets.current.boot;
  });

  // Handle key press triggering offset & input events
  const handleKeyPress = (keyKey, eventName) => {
    // Apply visual press depth
    keyOffsets.current[keyKey] = -0.05;

    // Play mechanical click sound
    playKeyClick();

    // Route inputs
    if (eventName === 'Boot') {
      if (onPowerToggle) onPowerToggle();
    } else if (powered) {
      if (onInput) onInput(eventName);
    }
  };

  // Keyboard integration to mirror the 3D key animations on keydown
  useEffect(() => {
    const handleKeyDown = (e) => {
      let keyKey = null;
      switch (e.key) {
        case 'ArrowUp': keyKey = 'up'; break;
        case 'ArrowDown': keyKey = 'down'; break;
        case 'ArrowLeft': keyKey = 'left'; break;
        case 'ArrowRight': keyKey = 'right'; break;
        case 'Enter': keyKey = 'enter'; break;
        case 'm':
        case 'M': keyKey = 'menu'; break;
        case 'b':
        case 'B': keyKey = 'boot'; break;
      }
      if (keyKey) {
        keyOffsets.current[keyKey] = -0.05;
        // Play mechanical click sound
        playKeyClick();

        // If boot button pressed, toggle power
        if (keyKey === 'boot' && onPowerToggle) {
          onPowerToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [powered, onPowerToggle]);

  // Helper component to render standard meshes with exact positions/rotations/scales
  const GLBMesh = ({ node, ...props }) => {
    if (!node) return null;
    return (
      <mesh
        geometry={node.geometry}
        material={node.material}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        {...props}
      />
    );
  };

  // Setup click & hover handlers
  const createKeyHandlers = (keyKey, eventName) => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      handleKeyPress(keyKey, eventName);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
    }
  });

  return (
    <group dispose={null}>
      {/* 1. Body Mesh */}
      <GLBMesh node={nodes.body} castShadow receiveShadow />

      {/* 2. Screen Mesh */}
      {nodes.screen && (
        <mesh
          geometry={nodes.screen.geometry}
          position={nodes.screen.position}
          rotation={nodes.screen.rotation}
          scale={nodes.screen.scale}
        >
          {powered ? (
            <meshStandardMaterial
              map={pixelTexture}
              emissiveMap={pixelTexture}
              emissive="#ffffff"
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          ) : (
            <meshStandardMaterial color="#050505" roughness={0.15} metalness={0.9} />
          )}
        </mesh>
      )}

      {/* 3. Interactive Key Meshes */}
      <GLBMesh
        ref={keyUpRef}
        node={nodes['key-up']}
        {...createKeyHandlers('up', 'Up')}
        castShadow
      />
      <GLBMesh
        ref={keyDownRef}
        node={nodes['key-down']}
        {...createKeyHandlers('down', 'Down')}
        castShadow
      />
      <GLBMesh
        ref={keyLeftRef}
        node={nodes['key-left']}
        {...createKeyHandlers('left', 'Left')}
        castShadow
      />
      <GLBMesh
        ref={keyRightRef}
        node={nodes['key-right']}
        {...createKeyHandlers('right', 'Right')}
        castShadow
      />
      <GLBMesh
        ref={keyEnterRef}
        node={nodes['key-enter']}
        {...createKeyHandlers('enter', 'Enter')}
        castShadow
      />
      <GLBMesh
        ref={keyMenuRef}
        node={nodes['key-menu']}
        {...createKeyHandlers('menu', 'Menu')}
        castShadow
      />
      <GLBMesh
        ref={keyBootRef}
        node={nodes['key-boot']}
        {...createKeyHandlers('boot', 'Boot')}
        castShadow
      />
    </group>
  );
}

// Pre-load the GLTF file to avoid pop-in
useGLTF.preload('/models/dotoro.glb');
