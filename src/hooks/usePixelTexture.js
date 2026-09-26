import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function usePixelTexture(gridData) {
  const canvasRef = useRef(null);
  const textureRef = useRef(null);

  if (!canvasRef.current) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    canvasRef.current = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Flip Y to fix upside-down screen mapping without mirroring horizontally
    texture.flipY = false;
    
    textureRef.current = texture;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const texture = textureRef.current;
    if (!canvas || !texture) return;

    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 32, 32);

    if (gridData && gridData.length > 0) {
      gridData.forEach((row, y) => {
        row.forEach((color, x) => {
          ctx.fillStyle = color || '#111111';
          ctx.fillRect(x, y, 1, 1);
        });
      });
    }

    texture.needsUpdate = true;
  }, [gridData]);

  return textureRef.current;
}
