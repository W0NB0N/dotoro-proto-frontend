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
  const [powered, setPowered] = useState(false);
  const ws = useRef(null);
  const connectRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const audioRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
      console.log("Timer alarm sound stopped");
    }
  };

  const playAlarmBeeps = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const beepTimes = [0, 0.12, 0.24, 0.48, 0.60, 0.72];
      beepTimes.forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.5, now + t);
        gain.gain.setValueAtTime(0.22, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.09);
      });
    } catch (e) {
      console.warn("Failed to play timer alarm sound:", e);
    }
  };

  const startRepeatingAlarm = () => {
    stopAlarm();
    playAlarmBeeps();
    alarmIntervalRef.current = setInterval(playAlarmBeeps, 1400);
  };

  // Pre-warm audio on user gesture so boot sound is never blocked by autoplay policy
  const unlockAudio = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/boot.mp3');
        audioRef.current.volume = 0.55;
      }
      audioRef.current.load();
    } catch (e) {
      console.warn("Audio unlock failed:", e);
    }
  };

  // Track user activity to detect idle state accurately on client
  useEffect(() => {
    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointerdown', recordActivity, { passive: true });
    window.addEventListener('keydown', recordActivity, { passive: true });
    window.addEventListener('touchstart', recordActivity, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout = null;
    let wakeListenerCleanup = null;
    let isServerIdle = false;

    const rawUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
    const wsUrl = normalizeWsUrl(rawUrl);
    const wakeupUrl = getHttpWakeupUrl(wsUrl);

    const enterStandby = () => {
      if (!isMounted) return;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }

      setStatus("Standby (Click to Wake)");
      console.log('Session entered standby. Waiting for user interaction to wake up...');

      const wakeUp = () => {
        if (wakeListenerCleanup) {
          wakeListenerCleanup();
          wakeListenerCleanup = null;
        }
        if (isMounted) {
          console.log('User interaction detected — waking from standby...');
          lastActivityRef.current = Date.now();
          unlockAudio();
          connect();
        }
      };

      window.addEventListener('pointerdown', wakeUp);
      window.addEventListener('keydown', wakeUp);
      window.addEventListener('touchstart', wakeUp);
      window.addEventListener('focus', wakeUp);

      wakeListenerCleanup = () => {
        window.removeEventListener('pointerdown', wakeUp);
        window.removeEventListener('keydown', wakeUp);
        window.removeEventListener('touchstart', wakeUp);
        window.removeEventListener('focus', wakeUp);
      };
    };

    const connect = () => {
      if (!isMounted) return;

      if (wakeListenerCleanup) {
        wakeListenerCleanup();
        wakeListenerCleanup = null;
      }
      isServerIdle = false;

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

          const idleDuration = Date.now() - lastActivityRef.current;
          const isClientIdle = idleDuration >= 4.5 * 60 * 1000; // Inactive for >= 4.5m

          // Check if closure was due to idle timeout (explicit message, code 4001, reason, or client inactivity)
          if (isServerIdle || event.code === 4001 || event.reason === "Session idle timeout" || isClientIdle) {
            enterStandby();
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

            if (data.type === "IDLE_TIMEOUT") {
              console.log("Received IDLE_TIMEOUT from server");
              isServerIdle = true;
              enterStandby();
              return;
            }

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

              if (typeof data.powered === 'boolean') {
                setPowered(data.powered);
              }
            } else if (data.type === "BOOT_COMPLETE") {
              console.log("BIOS boot complete - playing sound");
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.warn("Failed to play boot sound:", e));
              } else {
                const audio = new Audio('/sounds/boot.mp3');
                audio.volume = 0.55;
                audio.play().catch(e => console.warn("Failed to play boot sound:", e));
              }
            } else if (data.type === "TIMER_ALARM") {
              console.log("Timer alarm reached 00:00 - starting repeating alarm sound");
              startRepeatingAlarm();
            } else if (data.type === "STOP_ALARM") {
              stopAlarm();
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
      stopAlarm();
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
    lastActivityRef.current = Date.now();
    stopAlarm(); // Stop alarm sound on any user key press or interaction
    if (!powered && eventName !== 'Boot' && eventName !== 'Power') return;
    if (status.startsWith("Standby")) {
      console.log(`Input received during standby: ${eventName} — waking up...`);
      unlockAudio();
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
    stopAlarm();
    unlockAudio();
    lastActivityRef.current = Date.now();
    console.log(`Power button pressed. Current state: ${powered ? 'ON' : 'OFF'}`);

    if (status.startsWith("Standby") && connectRef.current) {
      connectRef.current();
    }

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const eventName = powered ? "Power" : "Boot";
      ws.current.send(JSON.stringify({ event: eventName }));
      console.log(`Sent event: ${eventName}`);
    }
  };

  const titleColor = theme?.foreground || '#00ff66';

  return (
    <div className="app-container">
      <header className="header-bar">
        <h1 className="title-glow" style={{ color: titleColor, textShadow: `0 0 12px ${titleColor}66` }}>
          Dotoro
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
          <div className="power-overlay" onClick={handlePowerToggle}>
            <span className="power-text">PRESS POWER TO START</span>
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
            <li><strong>B / Boot key:</strong> Power On / Off</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
