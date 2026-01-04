import { useState, useEffect, useRef } from 'react'
import CanvasDisplay from './components/CanvasDisplay'
import InputController from './components/InputController'
import DebugLogger from './components/DebugLogger'
import './App.css'

function App() {
  const [grid, setGrid] = useState([]);
  const [status, setStatus] = useState("Disconnected");
  const [logs, setLogs] = useState([]); // {id, source, data, timestamp}
  const ws = useRef(null);

  // <=== {LogHelper} :: {Add log entry} ===>
  const addLog = (source, data) => {
    setLogs(prev => [
      ...prev,
      { id: Math.random(), source, data, timestamp: Date.now() }
    ]);
  };

  // <=== {ConnectionSetup} :: {Connect to websocket on mount} ===>
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws");

    ws.current.onopen = () => {
      setStatus("Connected");
      addLog('server', 'Connected to WebSocket');
    };

    ws.current.onclose = () => setStatus("Disconnected");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Log received data (truncate grid for readability)
      let logMsg = data.type;
      if (data.type === "GRID_UPDATE") logMsg += " (16x16 Pixel Data)";
      addLog('server', logMsg);

      if (data.type === "GRID_UPDATE") {
        setGrid(data.grid);
      }
    };

    return () => ws.current.close();
  }, []);

  // <=== {SendInput} :: {Send key event to backend} ===>
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

      {/* Layout: Logs - Canvas - Logs */}
      <div className="main-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DebugLogger logs={logs} />

        {/* We absolutely position the Logger around the canvas via the placeholder logic, 
            but actually here passing the canvas as a sibling is cleaner for React tree */}
        <div style={{ position: 'absolute' }}> {/* Hacky centering for layout, in real Flex it's cleaner */} </div>

        {/* Move Canvas inside DebugLogger? No, keep separate. 
            The DebugLogger renders spaces for logs. Canvas sits in middle.
            Wait, DebugLogger renders BOTH columns. We need to inject Canvas IN BETWEEN.
            Let's adjust App structure to pass Canvas as child or handle layout here.
        */}
      </div>

      {/* Revised Layout Strategy: Explicit Flex Container */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '20px' }}>
        {/* We pass specific logs to separate components or reuse DebugLogger logic? 
              Simpler: Pass CanvasDisplay AS A CHILD to DebugLogger or similar?
              Let's just use the DebugLogger component I wrote which had a #canvas-placeholder 
              and actually render the canvas there using a Portal or just layout here.
          */}

        {/* Let's be simple: 3 Columns Here manually */}
        <DebugLogColumn logs={logs} source="client" title="FRONTEND (Sent)" />

        <CanvasDisplay gridData={grid} />

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
      width: '200px', height: '400px', overflowY: 'hidden',
      display: 'flex', flexDirection: 'column-reverse', padding: '10px',
      background: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px'
    }}>
      <div style={{ borderBottom: '1px solid #444', marginBottom: '5px', color: source === 'client' ? '#4ade80' : '#60a5fa' }}>
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
