import { useState, useEffect } from 'react';
import { mycologyService } from '../services/mycologyService.js';
import { Package, Download, Upload, CheckCircle, RefreshCw } from 'lucide-react';
import seedPack from '../data/knowledge-packs/mycology/north-america-fungi.pack.json';
import greenhousePack from '../data/knowledge-packs/mycology/greenhouse-and-cultivation-mushrooms.pack.json';

export default function KnowledgePackManager({ onPackImported }) {
  const [installedPacks, setInstalledPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadPacks = async () => {
    setLoading(true);
    const packs = await mycologyService.fetchPacks();
    setInstalledPacks(packs);
    setLoading(false);
  };

  useEffect(() => {
    loadPacks();
  }, []);

  const handleInstallSeedPack = async () => {
    setLoading(true);
    setStatusMsg('Installing North American Wild Mushrooms Pack...');
    try {
      const res = await mycologyService.importPack(seedPack);
      setStatusMsg(`Successfully imported ${res.importedEntriesCount} North American species!`);
      await loadPacks();
      if (onPackImported) onPackImported();
    } catch (e) {
      setStatusMsg(`Failed to install pack: ${e.message}`);
    }
    setLoading(false);
  };

  const handleInstallGreenhousePack = async () => {
    setLoading(true);
    setStatusMsg('Installing Greenhouse Cultivation & Global Species Master Pack...');
    try {
      const res = await mycologyService.importPack(greenhousePack);
      setStatusMsg(`Successfully imported ${res.importedEntriesCount} Greenhouse Cultivation species!`);
      await loadPacks();
      if (onPackImported) onPackImported();
    } catch (e) {
      setStatusMsg(`Failed to install pack: ${e.message}`);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMsg(`Reading ${file.name}...`);
    try {
      const text = await file.text();
      const packJson = JSON.parse(text);
      const res = await mycologyService.importPack(packJson);
      setStatusMsg(`Successfully imported custom pack '${packJson.title}' (${res.importedEntriesCount || 0} entries)!`);
      await loadPacks();
      if (onPackImported) onPackImported();
    } catch (e) {
      setStatusMsg(`Invalid pack format: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="mycology-pack-manager">
      <div className="mycology-pack-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={24} color="var(--color-moss, #4A6B4B)" />
          <h3>Knowledge Pack Manager</h3>
        </div>
        <button className="mycology-btn-secondary" onClick={loadPacks} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <p className="mycology-pack-intro">
        Knowledge Packs bundle modular species records, diagnostic keys, and traditional knowledge. 
        Packs work 100% offline once loaded.
      </p>

      {statusMsg && (
        <div className="mycology-status-alert">
          <CheckCircle size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="mycology-pack-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
        <button className="mycology-btn-primary" onClick={handleInstallSeedPack} disabled={loading}>
          <Download size={16} /> Load North American Wild Pack
        </button>

        <button className="mycology-btn-primary" style={{ backgroundColor: '#8B5E34', borderColor: '#D97706' }} onClick={handleInstallGreenhousePack} disabled={loading}>
          <Download size={16} /> Load Greenhouse Cultivation Pack
        </button>

        <label className="mycology-btn-secondary mycology-file-upload-label">
          <Upload size={16} /> Import Custom Pack (.pack / .json)
          <input type="file" accept=".json,.pack" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="mycology-pack-list">
        <h4>Installed Knowledge Packs</h4>
        {installedPacks.length === 0 ? (
          <p className="mycology-muted">No custom knowledge packs registered. Click above to load the default seed pack.</p>
        ) : (
          <div className="mycology-pack-grid">
            {installedPacks.map(pack => (
              <div key={pack.id} className="mycology-pack-card">
                <div className="mycology-pack-card-top">
                  <h5>{pack.title}</h5>
                  <span className="mycology-version-badge">v{pack.version}</span>
                </div>
                <p className="mycology-pack-meta">Module: {pack.module} | Entries: {pack.entry_count || pack.entryCount || 0}</p>
                <p className="mycology-pack-source">Source: {pack.source || 'Community Pack'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
