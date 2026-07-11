import React, { useState, useEffect } from 'react';
import { GAP_ANALYSIS_DATA } from '../../modules/toolkit/gapAnalysisData.js';
import { loadLedger, saveRecord } from '../../modules/toolkit/importApprovalLedgerStore.js';
import { loadQueue, saveQueueItem } from '../../modules/toolkit/acquisitionQueueStore.js';
import { loadAllowlist, saveAllowlistEntry } from '../../modules/toolkit/sourceAllowlistStore.js';
import { ShieldAlert, BookOpen, AlertTriangle, CheckCircle, ExternalLink, Plus, Check, Clipboard, Folder, Library } from 'lucide-react';

const PREPAREDNESS_CATEGORIES = {
  water: {
    label: "Water & Sanitation",
    milestones: [
      { id: "water_purif", label: "Water Purification & Filtration", keywords: ["filter", "purif", "treatment", "clean water"] },
      { id: "water_harvest", label: "Rainwater Harvesting & Storage", keywords: ["rain", "harvest", "cistern", "storage"] }
    ]
  },
  medical_reference: {
    label: "Health & Medicine",
    milestones: [
      { id: "med_firstaid", label: "First Aid & Triage Reference Guides", keywords: ["first aid", "triage", "emergency medical", "responder"] },
      { id: "med_dental", label: "Emergency Dental & Surgical Reference", keywords: ["dental", "dentistry", "surg", "operation", "suture"] }
    ]
  },
  farming: {
    label: "Farming & Gardening",
    milestones: [
      { id: "farm_crop", label: "Crop Cultivation, Soil & Composting", keywords: ["crop", "soil", "compost", "garden", "seed", "cultivat"] },
      { id: "farm_animal", label: "Animal Husbandry & Livestock Management", keywords: ["animal", "livestock", "chicken", "goat", "cattle", "pig", "farm"] }
    ]
  },
  homesteading: {
    label: "Homesteading & Skills",
    milestones: [
      { id: "home_skills", label: "Basic Country Skills & Off-Grid Living", keywords: ["homestead", "skills", "off-grid", "country"] },
      { id: "home_preserv", label: "Food Preservation & Canning", keywords: ["preserv", "can", "dehydrat", "pickle", "dry"] }
    ]
  },
  shelter: {
    label: "Shelter & Construction",
    milestones: [
      { id: "shelter_build", label: "Carpentry, Lumbering & Off-grid Building", keywords: ["carpentry", "timber", "woodwork", "cabin", "building", "construction"] },
      { id: "shelter_solar", label: "Solar Power, Batteries & Off-grid Wiring", keywords: ["solar", "battery", "wiring", "electricity", "inverter", "generator"] }
    ]
  },
  bushcraft: {
    label: "Bushcraft & Wilderness",
    milestones: [
      { id: "bush_forage", label: "Foraging, Edible & Medicinal Plants", keywords: ["forag", "edible", "wild plant", "mushroom"] },
      { id: "bush_hunt", label: "Trapping, Hunting & Wilderness Survival", keywords: ["trap", "hunt", "wilderness", "track", "skinning"] }
    ]
  },
  general_survival: {
    label: "General Survival",
    milestones: [
      { id: "gen_disaster", label: "Disaster Preparedness & Bug Out Logistics", keywords: ["disaster", "preparedness", "bug out", "emergency", "survival"] },
      { id: "gen_radio", label: "Emergency Radio Communications (Ham/GMRS)", keywords: ["radio", "ham", "gmrs", "antenna", "comm"] }
    ]
  }
};

export default function ContentGapAnalyzerPanel({ 
  setToolkitSubTab,
  allFiles = [],
  metadata = {}
}) {
  const { candidateItems, blockedItems } = GAP_ANALYSIS_DATA;
  const [ledger, setLedger] = useState([]);
  const [queue, setQueue] = useState([]);
  const [allowlist, setAllowlist] = useState([]);
  const [activeCategory, setActiveCategory] = useState('water');

  const [manualChecks, setManualChecks] = useState(() => {
    try {
      const saved = localStorage.getItem('sos_material_preparedness');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('sos_material_preparedness', JSON.stringify(manualChecks));
  }, [manualChecks]);

  useEffect(() => {
    setLedger(loadLedger());
    setQueue(loadQueue());
    setAllowlist(loadAllowlist());
  }, []);

  const handleToggleCheck = (milestoneId) => {
    setManualChecks(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const handleQuickApprove = (item) => {
    const itemTitleLower = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedFile = allFiles.find(file => {
      const fileNameLower = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fileNameLower.includes(itemTitleLower) || itemTitleLower.includes(fileNameLower)) {
        return true;
      }
      
      const fileMeta = metadata[file.path];
      if (fileMeta && fileMeta.title && fileMeta.title !== 'Unknown Document') {
        const metaTitleLower = fileMeta.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (metaTitleLower.includes(itemTitleLower) || itemTitleLower.includes(metaTitleLower)) {
          return true;
        }
      }
      return false;
    });

    const filename = matchedFile ? matchedFile.name : `${item.title}.pdf`;

    try {
      const updated = saveRecord({
        filename: filename,
        operatorDecision: 'approved',
        reviewNotes: 'Operator verified local ownership & safety via Content Gap Analyzer.',
        detectedCategory: item.category,
        riskCategory: item.riskCategory || null,
        suggestedLicenseStatus: item.licenseStatus || 'unknown',
        officialSourceUrl: item.officialSourceUrl || '',
        thirdPartyMirrorUrl: item.thirdPartyMirrorUrl || '',
        licenseEvidence: item.licenseEvidence || '',
        operatorVerifiedSource: true
      });
      setLedger(updated);
      alert(`"${item.title}" (${filename}) has been approved in the ledger and is now unlocked!`);
    } catch (e) {
      alert(`Approval failed: ${e.message}`);
    }
  };

  const isItemPresent = (item) => {
    const itemTitleLower = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return allFiles.some(file => {
      const fileNameLower = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fileNameLower.includes(itemTitleLower) || itemTitleLower.includes(fileNameLower)) {
        return true;
      }
      
      const fileMeta = metadata[file.path];
      if (fileMeta && fileMeta.title && fileMeta.title !== 'Unknown Document') {
        const metaTitleLower = fileMeta.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (metaTitleLower.includes(itemTitleLower) || itemTitleLower.includes(metaTitleLower)) {
          return true;
        }
      }
      return false;
    });
  };

  // Find matching files in library for a milestone
  const findMatchingResources = (milestone) => {
    return allFiles.filter(file => {
      const nameLower = file.name.toLowerCase();
      const metaTitle = metadata[file.path]?.title?.toLowerCase() || "";
      return milestone.keywords.some(kw => nameLower.includes(kw) || metaTitle.includes(kw));
    });
  };

  const getLedgerStatus = (item) => {
    const record = ledger.find(r => {
      const matchFile = r.filename.toLowerCase();
      const itemTitle = item.title.toLowerCase();
      if (item.filename && matchFile === item.filename.toLowerCase()) return true;
      if (matchFile.includes(itemTitle) || itemTitle.includes(matchFile)) return true;
      return false;
    });

    if (!record) {
      return { status: 'No local review yet', color: '#888', decision: null, exact: false };
    }

    const isExact = (item.filename && record.filename.toLowerCase() === item.filename.toLowerCase()) || 
                    record.filename.toLowerCase().replace(/[^a-z0-9]/g, '') === item.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    let statusText = '';
    let color = '';
    switch (record.operatorDecision) {
      case 'approved':
        statusText = isExact ? 'Operator-approved' : 'Ledger Match (Approved)';
        color = '#00ff7f';
        break;
      case 'rejected':
        statusText = isExact ? 'Rejected' : 'Ledger Match (Rejected)';
        color = '#ff4500';
        break;
      case 'needs_more_evidence':
        statusText = isExact ? 'Needs evidence' : 'Ledger Match (Needs Evidence)';
        color = '#ffd700';
        break;
      default:
        statusText = isExact ? 'Pending review' : 'Ledger Match (Pending)';
        color = '#a0a0a0';
    }

    return { status: statusText, color, decision: record.operatorDecision, exact: isExact, rawRecord: record };
  };

  const getQueueStatus = (item) => {
    const record = queue.find(q => q.title.toLowerCase() === item.title.toLowerCase() || (item.filename && q.filenameHint && q.filenameHint.toLowerCase() === item.filename.toLowerCase()));
    return record ? record.acquisitionStatus : 'not_queued';
  };

  const getAllowlistStatus = (item) => {
    if (!item.officialSourceUrl) return 'not_listed';
    const entry = allowlist.find(l => l.officialSourceUrl && l.officialSourceUrl.toLowerCase() === item.officialSourceUrl.toLowerCase());
    if (!entry) return 'not_listed';
    return entry.operatorTrusted ? 'trusted' : 'not_trusted';
  };

  const handleAddToQueue = (item, ledgerRecord) => {
    try {
      const updated = saveQueueItem({
        title: item.title,
        filenameHint: item.filename || '',
        category: item.category,
        riskCategory: item.riskCategory || null,
        sourceType: 'official_source',
        officialSourceUrl: item.officialSourceUrl || '',
        sourceEvidence: item.licenseEvidence || '',
        suggestedLicenseStatus: item.licenseStatus || 'unknown',
        ledgerRecordId: ledgerRecord ? ledgerRecord.id : '',
        ledgerDecision: ledgerRecord ? ledgerRecord.operatorDecision : 'none',
        acquisitionStatus: 'planned'
      });
      setQueue(updated);
      alert(`"${item.title}" successfully added to the local acquisition queue.`);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddToAllowlist = (item) => {
    try {
      const updated = saveAllowlistEntry({
        label: `${item.title} Source`,
        officialSourceUrl: item.officialSourceUrl || '',
        sourceType: 'official_source',
        sourceEvidence: item.licenseEvidence || '',
        categories: [item.category],
        riskCategories: item.riskCategory ? [item.riskCategory] : [],
        operatorTrusted: true
      });
      setAllowlist(updated);
      alert("Official source URL allowlisted and marked as Operator Trusted.");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => alert("URL copied to clipboard!"))
      .catch(() => alert("Failed to copy URL."));
  };

  // Compute dynamic stats
  let totalMilestones = 0;
  let satisfiedMilestones = 0;

  const categoryCards = Object.entries(PREPAREDNESS_CATEGORIES).map(([catKey, catData]) => {
    const enrichedMilestones = catData.milestones.map(m => {
      const resources = findMatchingResources(m);
      const isAutoSatisfied = resources.length > 0;
      const isChecked = manualChecks[m.id] || isAutoSatisfied;
      
      totalMilestones++;
      if (isChecked) satisfiedMilestones++;

      return {
        ...m,
        resources,
        isAutoSatisfied,
        isChecked
      };
    });

    const metCount = enrichedMilestones.filter(m => m.isChecked).length;
    const totalCount = enrichedMilestones.length;
    const percent = Math.round((metCount / totalCount) * 100);

    return {
      key: catKey,
      label: catData.label,
      milestones: enrichedMilestones,
      metCount,
      totalCount,
      percent
    };
  });

  const overallPercent = totalMilestones > 0 ? Math.round((satisfiedMilestones / totalMilestones) * 100) : 0;

  const activeCategoryData = categoryCards.find(c => c.key === activeCategory) || categoryCards[0];
  const activeCandidates = candidateItems.filter(item => item.category === activeCategory);

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
          Content Gap Analyzer
        </h3>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#a0a0a0' }}>
          Audit your offline library files against survival preparedness milestones to pinpoint library gaps.
        </p>
      </div>

      {/* Overview stats & Copyright advice banner */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Left: Overall Coverage score */}
        <div className="glass-panel" style={{ flex: '1 1 240px', padding: '16px', display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', letterSpacing: '1px' }}>OVERALL MILESTONE COVERAGE</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>{overallPercent}%</span>
            <span style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginTop: '4px' }}>
              {satisfiedMilestones} of {totalMilestones} Milestones Met
            </span>
          </div>
        </div>

        {/* Right: Copyright banner */}
        <div style={{ flex: '2 2 400px', backgroundColor: 'rgba(255, 69, 0, 0.03)', border: '1px solid rgba(255, 69, 0, 0.15)', borderRadius: '6px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#ff7f50', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <ShieldAlert size={16} /> Copyright & Safety Boundaries
          </h4>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#ccc', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <li><strong>Audit does not clear copyright.</strong> Vetting remains manual.</li>
            <li>Unknown/restricted sources require manual download and cannot be processed automatically.</li>
            <li>Only approved allowlist URLs may serve as sources for future tool enhancements.</li>
          </ul>
        </div>

      </div>

      {/* Category Tab Selector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
        {categoryCards.map(cat => {
          const isSelected = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '12px 8px',
                backgroundColor: isSelected ? 'var(--brand-primary-dim)' : 'rgba(18, 21, 28, 0.4)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isSelected ? '#fff' : '#ccc' }}>
                {cat.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--brand-primary)' : '#888', fontFamily: 'var(--font-mono)' }}>
                  {cat.metCount}/{cat.totalCount} Met
                </span>
                <span style={{ fontSize: '0.7rem', color: cat.percent === 100 ? '#00ff7f' : '#aaa', fontFamily: 'var(--font-mono)' }}>
                  ({cat.percent}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Tab Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Active Category Header */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', letterSpacing: '0.5px' }}>
              {activeCategoryData.label.toUpperCase()} AUDIT
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inspect category milestones and approve matching candidate files.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)' }}>
            CATEGORY COMPLETION: {activeCategoryData.percent}%
          </span>
        </div>

        {/* Milestones Checklist Section */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.5px' }}>
            <Library size={16} style={{ color: 'var(--brand-primary)' }} />
            REQUIRED PREPAREDNESS MILESTONES
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeCategoryData.milestones.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: '1 1 300px' }}>
                  <button
                    onClick={() => handleToggleCheck(m.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: m.isChecked ? '#00ff7f' : '#666',
                      marginTop: '2px'
                    }}
                  >
                    <CheckCircle size={18} fill={m.isChecked ? 'rgba(0,255,127,0.15)' : 'none'} />
                  </button>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: m.isChecked ? '#fff' : '#ccc' }}>
                      {m.label}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Keywords: {m.keywords.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Local matching files list */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {m.resources.length > 0 ? (
                    m.resources.map((file, idx) => (
                      <span key={idx} style={{ fontSize: '0.72rem', color: '#00ff7f', display: 'inline-flex', alignItems: 'center', gap: '4px', textAlign: 'right' }}>
                        ✓ {file.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#ff6600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ⚠ No local files matched
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Candidate Items Section */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.5px' }}>
            <Folder size={16} style={{ color: 'var(--brand-primary)' }} />
            Candidate Sources for Operator Review
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeCandidates.map((item, idx) => {
              const ledgerStatus = getLedgerStatus(item);
              const qStatus = getQueueStatus(item);
              const aStatus = getAllowlistStatus(item);
              const present = isItemPresent(item);
              const isRestricted = item.recommendedAction === 'manual_review';

              return (
                <div 
                  key={idx} 
                  style={{ 
                    backgroundColor: '#12151c', 
                    padding: '14px', 
                    borderRadius: '6px', 
                    borderLeft: '3px solid',
                    borderLeftColor: present ? '#00ff7f' : isRestricted ? '#ff4500' : 'var(--brand-primary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{item.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '3px' }}>
                        Source: <span style={{ color: '#ccc' }}>{item.source}</span> | License: <span style={{ color: isRestricted ? '#ff4500' : '#00ff7f' }}>{item.licenseStatus.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {present ? (
                          <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', fontWeight: 'bold' }}>
                            PRESENT (OFFLINE LOCAL)
                          </span>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: qStatus === 'not_queued' ? '#888' : '#00f2fe', fontWeight: 'bold' }}>
                              QUEUE: {qStatus.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: aStatus === 'trusted' ? '#00ff7f' : '#888', fontWeight: 'bold' }}>
                              ALLOWLIST: {aStatus.toUpperCase()}
                            </span>
                          </>
                        )}
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: ledgerStatus.color, fontWeight: 'bold' }}>
                          LEDGER: {ledgerStatus.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {isRestricted && (
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: (present || ledgerStatus.decision === 'approved') ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 69, 0, 0.1)', color: (present || ledgerStatus.decision === 'approved') ? '#00ff7f' : '#ff4500', fontWeight: 'bold' }}>
                          {(present || ledgerStatus.decision === 'approved') ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#a0a0a0' }}>
                    <strong>License Detail:</strong> {item.licenseEvidence}
                  </p>

                  {isRestricted && !present && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#ff7f50', backgroundColor: 'rgba(255, 69, 0, 0.03)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid rgba(255,69,0,0.1)' }}>
                      🔒 Excluded from automated lists. Must be manually purchased or verified by the operator outside SurvivalOS.
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                    {qStatus === 'not_queued' && !present && (
                      <button 
                        className="btn-tactical" 
                        onClick={() => handleAddToQueue(item, ledgerStatus.rawRecord)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Add to Acquisition Queue
                      </button>
                    )}
                    {item.officialSourceUrl && aStatus === 'not_listed' && !present && (
                      <button 
                        className="btn-tactical" 
                        onClick={() => handleAddToAllowlist(item)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Add Official Source to Allowlist
                      </button>
                    )}
                    {item.officialSourceUrl && !present && (
                      <button 
                        className="btn-tactical-outline" 
                        onClick={() => handleCopyUrl(item.officialSourceUrl)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Clipboard size={12} /> Copy Official Source URL
                      </button>
                    )}
                    {present && ledgerStatus.decision !== 'approved' && (
                      <button 
                        className="btn-tactical" 
                        onClick={() => handleQuickApprove(item)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: 'var(--brand-primary)', color: '#000', fontWeight: 'bold' }}
                      >
                        Quick Approve (Unlock for J.A.R.V.I.S.)
                      </button>
                    )}
                    {setToolkitSubTab && (
                      <button 
                        className="btn-tactical-outline" 
                        onClick={() => setToolkitSubTab('ledger')}
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        Open Approval Ledger
                      </button>
                    )}
                    {setToolkitSubTab && (
                      <button 
                        className="btn-tactical-outline" 
                        onClick={() => setToolkitSubTab('lifecycle')}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--brand-primary)', borderColor: 'rgba(0, 242, 254, 0.4)' }}
                      >
                        Open Lifecycle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {activeCandidates.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#888', border: '1px dashed var(--border-subtle)', borderRadius: '6px' }}>
                No candidate sources logged for this category.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
