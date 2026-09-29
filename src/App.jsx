import { useState, useEffect, useRef } from 'react';
import DotoroScene from './components/DotoroScene';
import InputController from './components/InputController';
import './App.css';

function normalizeWsUrl(rawUrl) {
  if (!rawUrl) {
    return window.location.protocol === 'https:'
      ? `wss://${window.location.host}/ws`
      : 'ws://localhost:8000/ws';
  }
  let url = rawUrl.trim();
  if (url.startsWith('http://')) {
    url = 'ws://' + url.slice(7);
  } else if (url.startsWith('https://')) {
    url = 'wss://' + url.slice(8);
  }
  if (window.location.protocol === 'https:' && url.startsWith('ws://') && !url.includes('localhost')) {
    url = 'wss://' + url.slice(5);
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/ws')) {
    url += '/ws';
  }
  return url;
}

function getHttpWakeupUrl(wsUrl) {
  if (!wsUrl) return null;
  let httpUrl = wsUrl;
  if (httpUrl.startsWith('wss://')) {
    httpUrl = 'https://' + httpUrl.slice(6);
  } else if (httpUrl.startsWith('ws://')) {
    httpUrl = 'http://' + httpUrl.slice(5);
  }
  return httpUrl.replace(/\/ws\/?$/, '') + '/health';
}

function App() {
  const [grid, setGrid] = useState([]);
  const [status, setStatus] = useState("Connecting...");
  const [theme, setTheme] = useState(null);
  const [powered, setPowered] = useState(true);
  const ws = useRef(null);
  const connectRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout = null;
    let wakeListenerCleanup = null;

    const rawUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
    const wsUrl = normalizeWsUrl(rawUrl);
    const wakeupUrl = getHttpWakeupUrl(wsUrl);

    const connect = () => {
      if (!isMounted) return;

      // Clean up any pending wake listeners
      if (wakeListenerCleanup) {
        wakeListenerCleanup();
        wakeListenerCleanup = null;
      }

      setStatus("Connecting...");
      console.log(`Attempting WebSocket connection to: ${wsUrl}`);

      // Fire a background HTTP ping to wake up sleeping free tier instances (e.g. Render)
      if (wakeupUrl && !wsUrl.includes('localhost')) {
        fetch(wakeupUrl).catch(() => {});
      }

      try {
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setStatus("Connected");
          console.log('Connected to WebSocket successfully');
        };

        socket.onclose = (event) => {
          if (!isMounted) return;

          // Check if the backend intentionally closed this connection due to inactivity
          if (event.code === 4001 || event.reason === "Session idle timeout") {
            setStatus("Standby (Click to Wake)");
            console.log('Session entered standby due to inactivity. Waiting for user interaction to reconnect...');

            const wakeUp = () => {
              if (wakeListenerCleanup) {
                wakeListenerCleanup();
                wakeListenerCleanup = null;
              }
              if (isMounted) {
                console.log('User interaction detected — waking from standby...');
                connect();
              }
            };

            window.addEventListener('pointerdown', wakeUp);
            window.addEventListener('keydown', wakeUp);

            wakeListenerCleanup = () => {
              window.removeEventListener('pointerdown', wakeUp);
              window.removeEventListener('keydown', wakeUp);
            };
          } else {
            // Unintended drop or server cold-start retry
            setStatus("Connecting...");
            console.log('WebSocket closed, retrying in 3s...');
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        socket.onerror = (err) => {
          console.warn('WebSocket error:', err);
          socket.close();
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
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
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };
      } catch (err) {
        console.error("Failed to construct WebSocket:", err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connectRef.current = connect;
    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wakeListenerCleanup) wakeListenerCleanup();
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
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
    if (status.startsWith("Standby")) {
      console.log(`Input received during standby: ${eventName} — waking up...`);
      if (connectRef.current) connectRef.current();
      return;
    }
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
      if (next) {
        if (status.startsWith("Standby") && connectRef.current) {
          connectRef.current();
        } else if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ event: 'Boot' }));
        }
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
        <div
          className="system-status"
          style={{ borderColor: `${titleColor}33`, cursor: status.startsWith("Standby") ? "pointer" : "default" }}
          onClick={() => { if (status.startsWith("Standby") && connectRef.current) connectRef.current(); }}
        >
          <span className={`status-dot ${status === 'Connected' ? 'online' : status.startsWith('Standby') ? 'standby' : status.startsWith('Connecting') ? 'connecting' : 'offline'}`} />
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
