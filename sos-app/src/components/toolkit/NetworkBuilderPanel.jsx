import React, { useState, useEffect } from 'react';
import { Network, Server, Play, ShieldAlert, Cpu, Check, Copy } from 'lucide-react';
import { API_BASE } from '../../config.js';

export default function NetworkBuilderPanel() {
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIp, setSelectedIp] = useState('');
  const [nginxConfigText, setNginxConfigText] = useState('');
  const [nginxFilePath, setNginxFilePath] = useState('');
  const [deployMode, setDeployMode] = useState('wifi'); // 'wifi', 'wired', 'mesh'

  const scanInterfaces = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/network/interfaces`)
      .then(res => res.json())
      .then(data => {
        setInterfaces(data);
        if (data.length > 0) {
          // Default select the first non-internal interface IP
          setSelectedIp(data[0].ip);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Network scan failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    scanInterfaces();
  }, []);

  const handleGenerateConfig = () => {
    if (!selectedIp) return alert("Please select an active interface IP address to host on.");
    
    fetch(`${API_BASE}/api/network/generate-nginx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localIp: selectedIp })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNginxConfigText(data.configText);
          setNginxFilePath(data.filePath);
          alert(`Nginx configuration written to server: ${data.filePath}`);
        } else {
          alert(`Failed to generate config: ${data.error}`);
        }
      })
      .catch(err => alert(`Generation error: ${err.message}`));
  };

  const copyConfigToClipboard = () => {
    if (!nginxConfigText) return;
    navigator.clipboard.writeText(nginxConfigText);
    alert("Configuration text copied to clipboard!");
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={20} /> OFFLINE NETWORK BUILDER & LAN SERVER
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Scan local hardware connection interfaces, calculate offline network topologies, and configure Nginx to sync mobile client devices.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Side: Hardware Scanning & Interface Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>HARDWARE ADAPTER SCAN</span>
            <button className="btn-tactical" onClick={scanInterfaces} disabled={loading} style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
              {loading ? 'SCANNING...' : 'RE-SCAN ADAPTERS'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '140px' }}>
            {interfaces.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#666', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem' }}>
                No active wired or wireless network interfaces found. Confirm Ethernet or Wi-Fi is active.
              </div>
            ) : (
              interfaces.map((iface, idx) => (
                <label 
                  key={idx}
                  style={{
                    backgroundColor: selectedIp === iface.ip ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${selectedIp === iface.ip ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)'}`,
                    padding: '12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="radio" 
                    name="networkIp" 
                    checked={selectedIp === iface.ip}
                    onChange={() => setSelectedIp(iface.ip)}
                    style={{ accentColor: 'var(--brand-primary)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{iface.name.toUpperCase()}</span>
                      <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#a0a0a0' }}>{iface.type}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      IP: {iface.ip} | Subnet: {iface.netmask}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Launcher endpoints card */}
          {selectedIp && (
            <div style={{ border: '1px solid rgba(0,255,102,0.3)', backgroundColor: 'rgba(0,255,102,0.01)', padding: '16px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: '4px' }}>OFF-GRID LAN ACCESS POINT</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', lineHeight: '1.4' }}>
                Instruct your mobile phone browser to navigate to:
              </div>
              <a 
                href={`http://${selectedIp}:3001`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'block', fontSize: '1.05rem', fontFamily: 'var(--font-mono)', color: '#00ff66', fontWeight: 'bold', textDecoration: 'underline', marginTop: '6px' }}
              >
                http://{selectedIp}:3001
              </a>
            </div>
          )}

        </div>

        {/* Right Side: Network Architectures & Config Generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>NETWORK TOPOLOGY BUILDER</span>
          
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '4px', paddingBottom: '4px' }}>
            <button className={deployMode === 'wifi' ? "btn-tactical" : "btn-tactical-outline"} style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setDeployMode('wifi')}>
              OFF-GRID WI-FI LAN
            </button>
            <button className={deployMode === 'wired' ? "btn-tactical" : "btn-tactical-outline"} style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setDeployMode('wired')}>
              WIRED SWITCH LAN
            </button>
            <button className={deployMode === 'mesh' ? "btn-tactical" : "btn-tactical-outline"} style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setDeployMode('mesh')}>
              HYBRID MESH LAN
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#d0d0d0', lineHeight: '1.4', minHeight: '130px' }}>
            {deployMode === 'wifi' && (
              <>
                <strong>Off-Grid Wi-Fi Setup Checklist:</strong>
                <ul style={{ paddingLeft: '18px', margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Deploy a local Wi-Fi router (no internet WAN connection needed).</li>
                  <li>Connect your main PC host running the SurvivalOS server to the router.</li>
                  <li>Enable Wi-Fi on client phones/tablets and join the router network.</li>
                  <li>Enter the PC server's local IP address in client browsers.</li>
                </ul>
              </>
            )}
            {deployMode === 'wired' && (
              <>
                <strong>Hardwired Command Switch Setup Checklist:</strong>
                <ul style={{ paddingLeft: '18px', margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Procure an unmanaged 5-port or 8-port Gigabit Ethernet Switch.</li>
                  <li>Connect the primary server PC and all terminal nodes using Cat6 RJ45 cables.</li>
                  <li>Configure a static IP subnet manually (e.g. `192.168.10.X`) on each terminal.</li>
                  <li>Guards against wireless interception/jammers completely.</li>
                </ul>
              </>
            )}
            {deployMode === 'mesh' && (
              <>
                <strong>Hybrid Radio Mesh Setup Checklist:</strong>
                <ul style={{ paddingLeft: '18px', margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Establish your offline local Wi-Fi router for home sync.</li>
                  <li>Connect a Meshtastic LoRa node to the local network router over Wi-Fi.</li>
                  <li>SurvivalOS polls node positions and renders patrol maps in real-time.</li>
                  <li>Extends communication mesh up to 5-10 miles outdoors without grids.</li>
                </ul>
              </>
            )}
          </div>

          {/* Launch / Config generator controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-tactical" onClick={handleGenerateConfig} style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Server size={14} /> GENERATE NGINX LAN CONFIG
            </button>
          </div>

        </div>

      </div>

      {/* Generated Config Block */}
      {nginxConfigText && (
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 'bold' }}>
              GENERATED CONFIGURATION (Path: {nginxFilePath})
            </span>
            <button className="btn-tactical" onClick={copyConfigToClipboard} style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Copy size={10} /> COPY TEXT
            </button>
          </div>
          <pre style={{
            margin: 0,
            padding: '16px',
            backgroundColor: '#070a10',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '6px',
            overflowX: 'auto',
            maxHeight: '200px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: '#00ff66',
            lineHeight: '1.4'
          }}>
            {nginxConfigText}
          </pre>
        </div>
      )}

      {/* Safety warning card */}
      <div style={{ padding: '14px', backgroundColor: 'rgba(255, 183, 0, 0.04)', border: '1px solid rgba(255, 183, 0, 0.15)', borderRadius: '6px', display: 'flex', gap: '10px' }}>
        <ShieldAlert size={16} style={{ color: '#ffb700', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.78rem', color: '#ffb300', lineHeight: '1.4' }}>
          <strong>SECURITY ADVISORY:</strong> When hosting your database over Wi-Fi LAN, make sure your router is isolated (no internet uplink port) and password protected with WPA3. Avoid public or unsecured local networks.
        </div>
      </div>

    </div>
  );
}
