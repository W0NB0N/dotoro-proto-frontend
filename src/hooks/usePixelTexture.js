import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// <=== {PixelTextureWithCRT} :: {512x512 canvas texture with authentic lofi.cafe CRT scanlines & vignette on screen only} ===>
export default function usePixelTexture(gridData, powered = true) {
  const canvasRef = useRef(null);
  const textureRef = useRef(null);
  const linesImgRef = useRef(null);
  const vignetteImgRef = useRef(null);
  const imagesLoadedRef = useRef(false);
  const animOffsetRef = useRef(0);

  // Initialize canvas, texture, and load CRT image assets once
  if (!canvasRef.current) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    canvasRef.current = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.flipY = false;
    textureRef.current = texture;

    // Load lofi.cafe CRT assets
    const linesImg = new Image();
    linesImg.src = '/images/lines.jpg';
    linesImgRef.current = linesImg;

    const vignetteImg = new Image();
    vignetteImg.src = '/images/vignette.png';
    vignetteImgRef.current = vignetteImg;

    let loaded = 0;
    const checkLoaded = () => {
      loaded++;
      if (loaded >= 2) {
        imagesLoadedRef.current = true;
      }
    };
    linesImg.onload = checkLoaded;
    vignetteImg.onload = checkLoaded;
  }

  const renderScreen = () => {
    const canvas = canvasRef.current;
    const texture = textureRef.current;
    if (!canvas || !texture) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw base screen background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    if (powered && gridData && gridData.length > 0) {
      // 2. Draw 32x32 pixel grid scaled to 512x512
      const cellSize = width / 32;
      for (let y = 0; y < gridData.length; y++) {
        const row = gridData[y];
        for (let x = 0; x < row.length; x++) {
          ctx.fillStyle = row[x] || '#050505';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }

      // 3. Composite lofi.cafe CRT Scanlines (lines.jpg)
      if (imagesLoadedRef.current && linesImgRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.45;

        const pattern = ctx.createPattern(linesImgRef.current, 'repeat');
        if (pattern) {
          // Fine scanline scaling matching lofi.cafe background-size: 7px auto
          const scale = 0.45;
          const matrix = new DOMMatrix();
          matrix.translateSelf(0, animOffsetRef.current);
          matrix.scaleSelf(scale, scale);
          pattern.setTransform(matrix);

          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
      }

      // 4. Composite lofi.cafe CRT Vignette (vignette.png)
      if (imagesLoadedRef.current && vignetteImgRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.65;
        ctx.drawImage(vignetteImgRef.current, 0, 0, width, height);
        ctx.restore();
      }
    }

    texture.needsUpdate = true;
  };

  // Re-render whenever pixel grid data or power status changes
  useEffect(() => {
    renderScreen();
  }, [gridData, powered]);

  // Frame loop for slow rolling CRT scanline animation on the model's screen
  useFrame((state, delta) => {
    if (powered) {
      // Slow roll downwards matching lofi.cafe's 150s animation feel
      animOffsetRef.current = (animOffsetRef.current + delta * 5) % 512;
      renderScreen();
    }
  });

  return textureRef.current;
}
