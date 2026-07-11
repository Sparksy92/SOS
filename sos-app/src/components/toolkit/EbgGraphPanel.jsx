import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Network, RefreshCw, Send, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { API_BASE } from '../../config.js';

const EbgGraphPanel = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [models, setModels] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [observations, setObservations] = useState([]);
  
  const [activeTab, setActiveTab] = useState('activation');
  const [loading, setLoading] = useState(false);
  
  // Spreading activation simulator state
  const [queryText, setQueryText] = useState('');
  const [activatedNodes, setActivatedNodes] = useState([]);
  const [activationLoading, setActivationLoading] = useState(false);
  
  // Fake telemetry injection state
  const [sensorId, setSensorId] = useState('moisture_sensor_b');
  const [sensorValue, setSensorValue] = useState('20');
  const [injecting, setInjecting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resNodes, resEdges, resModels, resPreds, resObs] = await Promise.all([
        fetch(`${API_BASE}/api/ebg/nodes`),
        fetch(`${API_BASE}/api/ebg/edges`),
        fetch(`${API_BASE}/api/ebg/models`),
        fetch(`${API_BASE}/api/ebg/predictions`),
        fetch(`${API_BASE}/api/ebg/observations`),
      ]);

      setNodes(await resNodes.json());
      setEdges(await resEdges.json());
      setModels(await resModels.json());
      setPredictions(await resPreds.json());
      setObservations(await resObs.json());
    } catch (err) {
      console.error("Failed fetching EBG data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runSpreadingActivation = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setActivationLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ebg/spreading-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText })
      });
      const data = await res.json();
      setActivatedNodes(data);
    } catch (err) {
      alert("Activation test failed: " + err.message);
    } finally {
      setActivationLoading(false);
    }
  };

  const injectObservation = async (e) => {
    e.preventDefault();
    if (!sensorId || sensorValue === '') return;
    setInjecting(true);
    try {
      const res = await fetch(`${API_BASE}/api/ebg/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensorId, value: Number(sensorValue) })
      });
      if (res.ok) {
        alert(`Successfully injected observation: ${sensorId} = ${sensorValue}`);
        setSensorValue('');
        fetchData();
      } else {
        const data = await res.json();
        alert("Injection failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Injection failed: " + err.message);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
            🧠 EPISTEMIC BELIEF GRAPH (EBG v6)
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            CDL Constitutional State Layer monitoring cognitive beliefs, policies, and neural spreading activation.
          </p>
        </div>
        <button 
          className="btn-tactical" 
          onClick={fetchData} 
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'SYNCING...' : 'REFRESH ONTOLOGY'}
        </button>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
        <button 
          className={`btn-tactical-outline ${activeTab === 'activation' ? 'active' : ''}`}
          onClick={() => setActiveTab('activation')}
          style={{ padding: '8px 16px', fontSize: '0.8rem', borderColor: activeTab === 'activation' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.15)' }}
        >
          Spreading Activation Test
        </button>
        <button 
          className={`btn-tactical-outline ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
          style={{ padding: '8px 16px', fontSize: '0.8rem', borderColor: activeTab === 'graph' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.15)' }}
        >
          Policies & Goals ({nodes.length} Nodes)
        </button>
        <button 
          className={`btn-tactical-outline ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
          style={{ padding: '8px 16px', fontSize: '0.8rem', borderColor: activeTab === 'telemetry' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.15)' }}
        >
          Telemetry & Predictions ({predictions.length} Preds)
        </button>
      </div>

      {/* Loading overlay if fetching */}
      {loading && nodes.length === 0 && (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
          READING EPISTEMIC SQLITE LAYER...
        </div>
      )}

      {/* Tab: Spreading Activation */}
      {activeTab === 'activation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={runSpreadingActivation} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Enter active query (e.g. 'crop hydration', 'low battery warnings')..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: '#fff',
                padding: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            />
            <button 
              className="btn-tactical" 
              type="submit" 
              disabled={activationLoading || !queryText.trim()}
              style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Send size={14} />
              ACTIVATE
            </button>
          </form>

          {activationLoading && (
            <div style={{ color: 'var(--brand-primary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              COMPUTING SEMANTIC COSINE SIMILARITY MATRIX & TRANSMISSION LOOPS...
            </div>
          )}

          {activatedNodes.length > 0 && !activationLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                Recalled Semantic Graph Activations:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activatedNodes.map(node => (
                  <div 
                    key={node.id} 
                    style={{
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      background: 'rgba(0, 242, 254, 0.05)',
                      padding: '10px 14px',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold', marginRight: '8px' }}>
                        [{node.layer.toUpperCase()}]
                      </span>
                      <span style={{ color: '#fff' }}>{node.content}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <span>Sim: <strong style={{ color: '#fff' }}>{(node.activation || 0).toFixed(2)}</strong></span>
                      <span>Importance: <strong style={{ color: '#fff' }}>{(node.importance || 0).toFixed(1)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activatedNodes.length === 0 && !activationLoading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-subtle)', borderRadius: '4px' }}>
              Enter a query to test semantic memory recall and activation transmission across graph edges.
            </div>
          )}
        </div>
      )}

      {/* Tab: Policies & Goals */}
      {activeTab === 'graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Nodes list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              GRAPH NODES ({nodes.length})
            </h4>
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
              {nodes.map(node => (
                <div 
                  key={node.id} 
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: node.layer === 'policy' ? 'rgba(255, 0, 102, 0.03)' : node.layer === 'goal' ? 'rgba(0, 255, 102, 0.03)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: node.layer === 'policy' ? '#ff3b30' : node.layer === 'goal' ? '#34c759' : '#00E5FF' }}>
                      {node.layer.toUpperCase()}
                    </strong>
                    <span style={{ color: 'var(--text-muted)' }}>ID: {node.id}</span>
                  </div>
                  <div style={{ color: '#fff' }}>{node.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Edges list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              RELATIONAL EDGES ({edges.length})
            </h4>
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
              {edges.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  No relational edges found in belief database.
                </div>
              ) : (
                edges.map((edge, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--brand-primary)' }}>Node {edge.source_id}</span>
                      <span style={{ color: '#ffea00', fontWeight: 'bold' }}>{edge.predicate.toUpperCase()}</span>
                      <span style={{ color: 'var(--brand-primary)' }}>Node {edge.target_id}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '4px' }}>
                      <span>Weight: <strong>{edge.weight}</strong></span>
                      <span>Confidence: <strong>{edge.confidence}</strong></span>
                      <span style={{ color: '#00ff66' }}>[{edge.status}]</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Telemetry & Predictions */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            
            {/* Inject Telemetry Reflex */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                INJECT TELEMETRY OBSERVATION
              </h4>
              <form onSubmit={injectObservation} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SENSOR ID</label>
                  <select 
                    value={sensorId} 
                    onChange={(e) => setSensorId(e.target.value)}
                    style={{
                      background: '#0a0d16',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="moisture_sensor_b">moisture_sensor_b (Reflex Trigger)</option>
                    <option value="battery_sensor">battery_sensor (Policy Constraint)</option>
                    <option value="temp_sensor_a">temp_sensor_a</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VALUE (REAL)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={sensorValue}
                    onChange={(e) => setSensorValue(e.target.value)}
                    placeholder="Enter observation value..."
                    style={{
                      background: '#0a0d16',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                <button 
                  className="btn-tactical" 
                  type="submit"
                  disabled={injecting}
                  style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem' }}
                >
                  <Send size={12} />
                  INJECT OBSERVED DATA
                </button>
              </form>
            </div>

            {/* Mental Models Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                MENTAL MODELS TRUST METRICS
              </h4>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px' }}>MODEL NAME</th>
                      <th style={{ padding: '8px' }}>TRUST SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No active models registered in database.
                        </td>
                      </tr>
                    ) : (
                      models.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px', color: '#fff' }}>{m.name}</td>
                          <td style={{ padding: '8px', color: m.trust_score >= 0.7 ? '#00ff66' : m.trust_score < 0.4 ? '#ff3b30' : '#ffea00', fontWeight: 'bold' }}>
                            {(m.trust_score * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Predictions logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              ACTIVE MODEL PREDICTIONS & OUTCOMES
            </h4>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px' }}>METRIC</th>
                    <th style={{ padding: '8px' }}>CONDITION</th>
                    <th style={{ padding: '8px' }}>CONFIDENCE</th>
                    <th style={{ padding: '8px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No predictions recorded in database.
                      </td>
                    </tr>
                  ) : (
                    predictions.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '8px', color: '#fff' }}>{p.target_metric}</td>
                        <td style={{ padding: '8px', color: '#fff' }}>{p.condition_operator} {p.condition_value}</td>
                        <td style={{ padding: '8px', color: 'var(--brand-primary)' }}>{(p.confidence * 100).toFixed(0)}%</td>
                        <td style={{ padding: '8px', color: p.status === 'correct' ? '#00ff66' : p.status === 'incorrect' ? '#ff3b30' : '#ffea00', fontWeight: 'bold' }}>
                          {p.status.toUpperCase()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default EbgGraphPanel;
