import { useRef, useEffect } from 'react';

// <=== {CanvasComponent} :: {Renders the 32x32 grid} ===>
const CanvasDisplay = ({ gridData }) => {
    const canvasRef = useRef(null);
    const pixelSize = 10; // Size of each pixel on screen (10px for 32x32 grid fits perfectly in 320px area)

    // <=== {RenderLoop} :: {Draws the grid whenever data updates} ===>
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear screen
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 32 * pixelSize, 32 * pixelSize);

        if (gridData && gridData.length > 0) {
            // Loop through the grid
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
            width={32 * pixelSize}
            height={32 * pixelSize}
            style={{ border: '4px solid #333', borderRadius: '4px' }}
        />
    );
};


export default CanvasDisplay;
