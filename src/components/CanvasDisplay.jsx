import { useRef, useEffect } from 'react';

// <=== {CanvasComponent} :: {Renders the 16x16 grid} ===>
const CanvasDisplay = ({ gridData }) => {
    const canvasRef = useRef(null);
    const pixelSize = 20; // Size of each pixel on screen

    // <=== {RenderLoop} :: {Draws the grid whenever data updates} ===>
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear screen
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 16 * pixelSize, 16 * pixelSize);

        if (gridData && gridData.length > 0) {
            // Loop through the 16x16 grid
            gridData.forEach((row, y) => {
                row.forEach((color, x) => {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize - 1, pixelSize - 1);
                });
            });
        }
    }, [gridData]);

    return (
        <canvas
            ref={canvasRef}
            width={16 * pixelSize}
            height={16 * pixelSize}
            style={{ border: '4px solid #333', borderRadius: '4px' }}
        />
    );
};

export default CanvasDisplay;
