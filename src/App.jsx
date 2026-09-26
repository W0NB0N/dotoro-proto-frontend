import { useState, useEffect, useRef } from 'react';
import DotoroScene from './components/DotoroScene';
import InputController from './components/InputController';
import './App.css';

function App() {
  const [grid, setGrid] = useState([]);
  const [status, setStatus] = useState("Disconnected");
  const [theme, setTheme] = useState(null);
  const [powered, setPowered] = useState(true);
  const ws = useRef(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
    console.log(`Connecting to WebSocket at ${wsUrl}...`);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setStatus("Connected");
      console.log('Connected to WebSocket');
    };

    ws.current.onclose = () => {
      setStatus("Disconnected");
      console.log('Disconnected from WebSocket');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "GRID_UPDATE") {
        const size = 32;
        const reconstructed = [];
        for (let i = 0; i < data.grid.length; i += size) {
          reconstructed.push(data.grid.slice(i, i + size));
        }
        setGrid(reconstructed);

        if (data.theme) {
          setTheme(data.theme);
        }
      } else if (data.type === "BOOT_COMPLETE") {
        console.log("BIOS boot complete - playing sound");
        const audio = new Audio('/sounds/boot.mp3');
        audio.volume = 0.55;
        audio.play().catch(e => console.warn("Failed to play boot sound:", e));
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  // Update page background dynamically based on active theme
  useEffect(() => {
    if (theme && theme.ambientBg) {
      document.body.style.backgroundColor = theme.ambientBg;
      document.body.style.transition = 'background-color 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
    }
  }, [theme]);

  const handleInput = (eventName) => {
    if (!powered) return; // Drop inputs when powered off
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ event: eventName });
      ws.current.send(msg);
      console.log(`Sent event: ${eventName}`);
    }
  };

  const handlePowerToggle = () => {
    setPowered(prev => {
      const next = !prev;
      console.log(`Power toggled: ${next ? 'ON' : 'OFF'}`);

      // If we are turning it ON, trigger the BIOS boot sequence on the backend
      if (next && ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ event: 'Boot' }));
      }

      return next;
    });
  };

  const titleColor = theme?.foreground || '#00ff66';

  return (
    <div className="app-container">
      {/* Dynamic scanlines for CRT monitor feel */}
      <div className="crt-overlay" />
      <div className="scan-bar" />
      <div className="crt-vignette" />

      <header className="header-bar">
        <h1 className="title-glow" style={{ color: titleColor, textShadow: `0 0 12px ${titleColor}66` }}>
          Dotoro OS
        </h1>
        <div className="system-status" style={{ borderColor: `${titleColor}33` }}>
          <span className={`status-dot ${status === 'Connected' ? 'online' : 'offline'}`} />
          {status}
        </div>
      </header>

      {/* Main viewport for the 3D model */}
      <div className="canvas-wrapper">
        <DotoroScene
          gridData={grid}
          onInput={handleInput}
          theme={theme}
          powered={powered}
          onPowerToggle={handlePowerToggle}
        />
        {!powered && (
          <div className="power-overlay">
            <span className="power-text">STANDBY</span>
          </div>
        )}
      </div>

      {/* Keyboard Input Controller */}
      <InputController onInput={handleInput} />

      {/* Floating Info / Control Guide in bottom right */}
      <div className="info-button-container">
        <button className="info-btn" style={{ borderColor: `${titleColor}55`, color: titleColor }}>
          i
        </button>
        <div className="info-tooltip" style={{ borderColor: `${titleColor}44` }}>
          <h4 style={{ color: titleColor, margin: '0 0 8px 0', borderBottom: `1px solid ${titleColor}33`, paddingBottom: '4px' }}>
            System Controls
          </h4>
          <ul className="info-list">
            <li><strong>Mouse drag:</strong> Orbit camera</li>
            <li><strong>Mouse release:</strong> Reset camera view</li>
            <li><strong>3D keys:</strong> Click directly to interact</li>
            <li><strong>Arrow keys:</strong> D-Pad navigation</li>
            <li><strong>Enter key:</strong> Select/Confirm</li>
            <li><strong>M key:</strong> Back to Menu</li>
            <li><strong>B key:</strong> Toggle power standby</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
