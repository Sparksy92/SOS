import { API_BASE } from '../../../config.js';

export const MycologyAIService = {
  analyze: async ({ question = '', traits = {}, targetSpeciesId = null }) => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/ai-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, traits, targetSpeciesId })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("[MYCOLOGY AI SERVICE] Server AI endpoint unreachable:", e.message);
    }

    // Offline fallback advisory analysis
    return {
      success: true,
      analysis: `### R.A.N.G.E.R. Offline Advisory\n\n- **Field Protocol**: Compare cap shape, hymenophore structure (gills/pores/teeth), stem features, and spore print color.\n- **Lookalike Caution**: Never rely solely on visual estimation. Check flesh color change upon bruising.\n\n> ⚠️ **SOS SAFETY DIRECTIVE**: Visual AI/text analysis is for advisory reference only. Never ingest wild fungi without physical verification of spore print, gill structure, cap morphology, and expert consultation.`,
      disclaimer: `\n\n> ⚠️ **SOS SAFETY DIRECTIVE**: Visual AI/text analysis is for advisory reference only. Never ingest wild fungi without physical verification of spore print, gill structure, cap morphology, and expert consultation.`
    };
  }
};
