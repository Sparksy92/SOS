import React, { useState } from 'react';
import { Heart, Activity, Search, AlertCircle } from 'lucide-react';

const TRIAGE_DATABASE = {
  bleeding: {
    title: "SEVERE BLEEDING / HEMORRHAGE",
    steps: [
      "Apply direct pressure to the wound using sterile dressing or clean cloth.",
      "Maintain constant, firm pressure. Do NOT remove the dressing if it bleeds through; pile more dressings on top.",
      "If bleeding is from a limb and does not stop with direct pressure, apply a tourniquet 2-3 inches above the wound (never on a joint). Tighten until bleeding stops. Record application time.",
      "Keep the patient warm and elevate the limb if possible to mitigate shock."
    ],
    searchQuery: "severe bleeding tourniquet hemorrhage control first aid"
  },
  heatstroke: {
    title: "HEATSTROKE / HYPERTHERMIA",
    steps: [
      "Move the victim out of the sun and into a cool, shaded area immediately.",
      "Cool the victim rapidly: spray with cool water, fan vigorously, or apply wet sheets.",
      "Apply ice packs or cold wet wraps to the neck, armpits, and groin area.",
      "Do NOT give fluids if the patient is confused, semi-conscious, or vomiting. Monitor breathing."
    ],
    searchQuery: "heatstroke hyperthermia cooling treatment first aid"
  },
  fractures: {
    title: "FRACTURES & SPLINTING",
    steps: [
      "Do NOT attempt to straighten or force a broken bone back into place.",
      "Control any bleeding first by applying pressure around the wound, not directly on the bone.",
      "Immobilize the injured area. Use cardboard, rolled newspapers, or sticks to splint the bone above and below the joint.",
      "Apply ice wrapped in cloth to reduce swelling. Monitor circulation below the splint (check for warm, pink skin)."
    ],
    searchQuery: "fracture splinting bone immobilization emergency treatment"
  },
  burns: {
    title: "CHEMICAL / THERMAL BURNS",
    steps: [
      "For chemical burns: immediately flush the area with large amounts of cool, clean water for at least 20 minutes.",
      "For thermal burns: cool the burn with cool water (do not use ice or freezing water as it damages tissue).",
      "Do NOT pop blisters or remove clothing that is stuck to the burn site.",
      "Cover the area loosely with sterile, non-stick dressing or clean plastic food wrap."
    ],
    searchQuery: "burn treatment chemical thermal sterile dressing"
  }
};

export default function FirstAidPanel({ onTriggerSearch }) {
  const [selectedTopic, setSelectedTopic] = useState('bleeding');
  const activeTriage = TRIAGE_DATABASE[selectedTopic];

  return (
    <div className="glass-panel" style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Heart size={20} /> MEDICAL FIRST AID & TRIAGE
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Immediate triage checklists for life-threatening situations, with direct search integration for offline medical manuals.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Symptoms Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>SELECT EMERGENCY PROTOCOL</span>
          {Object.keys(TRIAGE_DATABASE).map(key => (
            <button
              key={key}
              className={selectedTopic === key ? "btn-tactical" : "btn-tactical-outline"}
              style={{ 
                padding: '12px 16px', 
                fontSize: '0.85rem', 
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onClick={() => setSelectedTopic(key)}
            >
              <span>{TRIAGE_DATABASE[key].title}</span>
              <Activity size={14} />
            </button>
          ))}

          {/* Safety warning banner */}
          <div style={{ marginTop: '16px', padding: '14px', backgroundColor: 'rgba(255, 69, 0, 0.05)', border: '1px solid rgba(255, 69, 0, 0.2)', borderRadius: '6px', display: 'flex', gap: '10px' }}>
            <AlertCircle size={16} style={{ color: 'var(--brand-danger)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.76rem', color: '#ff5533', lineHeight: '1.4' }}>
              <strong>MEDICAL DISCLAIMER:</strong> This tool provides reference checklists derived from standard survival manuals. In case of severe injury, always consult a professional medical provider if available.
            </div>
          </div>
        </div>

        {/* Action Protocols & Library Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--brand-primary)' }}>IMMEDIATE ACTION DIRECTIVE</span>
            
            {/* Library search bridge button */}
            <button
              className="btn-tactical"
              style={{ padding: '4px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => onTriggerSearch(activeTriage.searchQuery)}
            >
              <Search size={10} /> SEARCH MEDICAL MANUALS
            </button>
          </div>

          <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeTriage.steps.map((step, idx) => (
              <li key={idx} style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#fff' }}>
                {step}
              </li>
            ))}
          </ol>

        </div>

      </div>

    </div>
  );
}
