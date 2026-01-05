import { useState, useEffect, useRef } from 'react'
import CanvasDisplay from './components/CanvasDisplay'
import InputController from './components/InputController'
import './App.css'

function App() {
  const [grid, setGrid] = useState([]);
  const [status, setStatus] = useState("Disconnected");
  const [logs, setLogs] = useState([]); // {id, source, data, timestamp}
  const ws = useRef(null);

  const addLog = (source, data) => {
    setLogs(prev => [
      ...prev,
      { id: Math.random(), source, data, timestamp: Date.now() }
    ]);
  };

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws");

    ws.current.onopen = () => {
      setStatus("Connected");
      addLog('server', 'Connected to WebSocket');
    };

    ws.current.onclose = () => setStatus("Disconnected");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      let logMsg = data.type;
      if (data.type === "GRID_UPDATE") logMsg = "GRID_UPDATE (16x16)"; // Shortened for cleaner log
      addLog('server', logMsg);

      if (data.type === "GRID_UPDATE") {
        setGrid(data.grid);
      }
    };

    return () => ws.current.close();
  }, []);

  const handleInput = (eventName) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ event: eventName });
      ws.current.send(msg);
      addLog('client', `Event: ${eventName}`);
    }
  };

  return (
    <div className="app-container">
      <h1>Dotoro Proto (Debug Mode)</h1>
      <div className="status">Status: {status}</div>

      {/* <=== {MainLayout} :: {Three column layout for debug} ===> */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>

        {/* Left: Client Logs */}
        <DebugLogColumn logs={logs} source="client" title="FRONTEND (Sent)" />

        {/* Center: Canvas */}
        <CanvasDisplay gridData={grid} />

        {/* Right: Server Logs */}
        <DebugLogColumn logs={logs} source="server" title="BACKEND (Recv)" />
      </div>

      <InputController onInput={handleInput} />
      <div className="instructions">
        <p>Controls: Arrows, Enter, M (Menu)</p>
      </div>
    </div>
  )
}

// <=== {HelperSubComponent} :: {Renders a single log column} ===>
const DebugLogColumn = ({ logs, source, title }) => {
  const [displayLogs, setDisplayLogs] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDisplayLogs(logs.filter(l => l.source === source && now - l.timestamp < 5000));
    }, 100);
    return () => clearInterval(interval);
  }, [logs, source]);

  return (
    <div style={{
      width: '200px', height: '360px', overflowY: 'hidden',
      display: 'flex', flexDirection: 'column-reverse', padding: '10px',
      background: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px'
    }}>
      <div style={{ borderBottom: '1px solid #444', marginBottom: '5px', color: source === 'client' ? '#4ade80' : '#60a5fa', textAlign: 'center', fontSize: '12px' }}>
        {title}
      </div>
      {displayLogs.map(log => (
        <div key={log.id} style={{
          fontSize: '10px', fontFamily: 'monospace', marginBottom: '4px',
          opacity: Math.max(0.2, 1 - (Date.now() - log.timestamp) / 5000),
          color: source === 'client' ? '#4ade80' : '#60a5fa'
        }}>
          [{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}] {log.data}
        </div>
      ))}
    </div>
  );
};

export default App
