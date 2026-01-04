import { useEffect, useState } from 'react';

// <=== {DebugLogger} :: {Visualizes WebSocket traffic} ===>
const DebugLogger = ({ logs }) => {
    const [displayLogs, setDisplayLogs] = useState([]);

    // <=== {Pruning} :: {Remove logs older than 5 seconds} ===>
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            // Filter locally to avoid flicker, parent handles main state
            setDisplayLogs(logs.filter(l => now - l.timestamp < 5000));
        }, 100);
        return () => clearInterval(interval);
    }, [logs]);

    const clientLogs = displayLogs.filter(l => l.source === 'client');
    const serverLogs = displayLogs.filter(l => l.source === 'server');

    const LogItem = ({ log }) => (
        <div style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            marginBottom: '4px',
            opacity: Math.max(0.2, 1 - (Date.now() - log.timestamp) / 5000),
            color: log.source === 'client' ? '#4ade80' : '#60a5fa'
        }}>
            [{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}] {log.data}
        </div>
    );

    const columnStyle = {
        width: '200px',
        height: '400px',
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column-reverse', // Newest at bottom
        padding: '10px',
        background: 'rgba(0,0,0,0.8)',
        border: '1px solid #333',
        borderRadius: '8px'
    };

    return (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Client Column */}
            <div style={columnStyle}>
                <div style={{ borderBottom: '1px solid #444', marginBottom: '5px', color: '#4ade80' }}>FRONTEND (Sent)</div>
                {clientLogs.map((log, i) => <LogItem key={log.id} log={log} />)}
            </div>

            {/* Space for Canvas */}
            <div id="canvas-placeholder"></div>

            {/* Server Column */}
            <div style={columnStyle}>
                <div style={{ borderBottom: '1px solid #444', marginBottom: '5px', color: '#60a5fa' }}>BACKEND (Recv)</div>
                {serverLogs.map((log, i) => <LogItem key={log.id} log={log} />)}
            </div>
        </div>
    );
};

export default DebugLogger;
