import { loadLedger } from './importApprovalLedgerStore.js';
import { loadQueue } from './acquisitionQueueStore.js';
import { loadAllowlist } from './sourceAllowlistStore.js';
import { GAP_ANALYSIS_DATA } from './gapAnalysisData.js';

export const computeLifecycleRecords = (gapData, ledger, queue, allowlist, stagedFiles = [], manifestCategories = {}, manifestChecked = true) => {
  const mergedMap = new Map();

  const normalize = (str) => (str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const manifestFiles = [];
  Object.entries(manifestCategories || {}).forEach(([cat, list]) => {
    if (Array.isArray(list)) {
      list.forEach(f => {
        manifestFiles.push({ ...f, category: cat });
      });
    }
  });

  // 1. Process Queue Items
  queue.forEach(qItem => {
    const key = qItem.id;
    let ledgerRec = ledger.find(l => l.id === qItem.ledgerRecordId || (qItem.filenameHint && normalize(l.filename) === normalize(qItem.filenameHint)));
    let gapItem = gapData.candidateItems?.find(g => normalize(g.title) === normalize(qItem.title) || (qItem.filenameHint && normalize(g.filename) === normalize(qItem.filenameHint)));
    let allowEntry = allowlist.find(a => a.officialSourceUrl && qItem.officialSourceUrl && a.officialSourceUrl.toLowerCase().trim() === qItem.officialSourceUrl.toLowerCase().trim());
    let staged = stagedFiles.find(s => (qItem.filenameHint && normalize(s.filename) === normalize(qItem.filenameHint)) || normalize(s.filename) === normalize(qItem.title));
    let manifestFile = manifestFiles.find(m => qItem.filenameHint && normalize(m.name) === normalize(qItem.filenameHint));

    const rec = buildRecord(qItem.title, qItem.filenameHint || ledgerRec?.filename || gapItem?.filename || '', qItem.category, qItem, ledgerRec, gapItem, allowEntry, staged, manifestFile, manifestChecked);
    mergedMap.set(key, rec);
  });

  // 2. Process Ledger Records not already matched
  ledger.forEach(lItem => {
    let isMatched = false;
    for (const rec of mergedMap.values()) {
      if (rec.ledgerRecordId === lItem.id || normalize(rec.filenameHint) === normalize(lItem.filename)) {
        isMatched = true;
        break;
      }
    }
    if (!isMatched) {
      const key = lItem.id;
      let gapItem = gapData.candidateItems?.find(g => normalize(g.title) === normalize(lItem.filename) || normalize(g.filename) === normalize(lItem.filename));
      let allowEntry = allowlist.find(a => a.officialSourceUrl && lItem.officialSourceUrl && a.officialSourceUrl.toLowerCase().trim() === lItem.officialSourceUrl.toLowerCase().trim());
      let staged = stagedFiles.find(s => normalize(s.filename) === normalize(lItem.filename));
      let manifestFile = manifestFiles.find(m => normalize(m.name) === normalize(lItem.filename));

      const rec = buildRecord(lItem.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " "), lItem.filename, lItem.detectedCategory, null, lItem, gapItem, allowEntry, staged, manifestFile, manifestChecked);
      mergedMap.set(key, rec);
    }
  });

  // 3. Process Gap Candidates not matched
  gapData.candidateItems?.forEach(gItem => {
    let isMatched = false;
    for (const rec of mergedMap.values()) {
      if (normalize(rec.title) === normalize(gItem.title) || normalize(rec.filenameHint) === normalize(gItem.filename)) {
        isMatched = true;
        break;
      }
    }
    if (!isMatched) {
      const key = `gap_${normalize(gItem.title)}`;
      let allowEntry = allowlist.find(a => a.officialSourceUrl && gItem.officialSourceUrl && a.officialSourceUrl.toLowerCase().trim() === gItem.officialSourceUrl.toLowerCase().trim());
      let staged = stagedFiles.find(s => normalize(s.filename) === normalize(gItem.filename));
      let manifestFile = manifestFiles.find(m => normalize(m.name) === normalize(gItem.filename));

      const rec = buildRecord(gItem.title, gItem.filename || '', gItem.category, null, null, gItem, allowEntry, staged, manifestFile, manifestChecked);
      mergedMap.set(key, rec);
    }
  });

  // 4. Process Staged Files not matched
  stagedFiles.forEach(sItem => {
    let isMatched = false;
    for (const rec of mergedMap.values()) {
      if (normalize(rec.filenameHint) === normalize(sItem.filename)) {
        isMatched = true;
        break;
      }
    }
    if (!isMatched) {
      const key = `staged_${normalize(sItem.filename)}`;
      let manifestFile = manifestFiles.find(m => normalize(m.name) === normalize(sItem.filename));
      const rec = buildRecord(sItem.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " "), sItem.filename, sItem.detectedCategory || 'general_survival', null, null, null, null, sItem, manifestFile, manifestChecked);
      mergedMap.set(key, rec);
    }
  });

  return Array.from(mergedMap.values());
};

function buildRecord(title, filenameHint, category, qItem, lItem, gItem, allowEntry, staged, manifestFile, manifestChecked = true) {
  const gapStatus = gItem ? (gItem.recommendedAction === 'manual_review' ? 'restricted_candidate' : 'candidate') : 'not_in_gap_audit';
  const ledgerStatus = lItem ? lItem.operatorDecision : 'none';
  const queueStatus = qItem ? qItem.acquisitionStatus : 'none';
  const allowlistStatus = allowEntry ? (allowEntry.operatorTrusted ? 'operator_trusted' : 'listed') : 'none';
  const stagingStatus = staged ? 'staged_metadata_only' : 'not_staged';
  const manifestStatus = manifestFile 
    ? 'present_in_manifest' 
    : (manifestChecked ? 'not_found_in_manifest' : 'unknown');
  const indexStatus = manifestFile 
    ? (manifestFile.indexed ? 'indexed' : 'not_indexed') 
    : 'unknown';

  let matchConfidence = 'exact_filename';
  if (qItem && lItem && qItem.ledgerRecordId !== lItem.id) matchConfidence = 'possible_match';

  const url = qItem?.officialSourceUrl || lItem?.officialSourceUrl || gItem?.officialSourceUrl || '';
  const evidence = qItem?.sourceEvidence || lItem?.licenseEvidence || gItem?.licenseEvidence || '';
  const verified = lItem?.operatorVerifiedSource || false;
  const trusted = allowEntry?.operatorTrusted || false;

  let evidenceStatus = 'missing';
  if (ledgerStatus === 'approved' && url && evidence) {
    evidenceStatus = 'present';
  } else if (url || evidence || verified || trusted) {
    evidenceStatus = 'partial';
  }

  let lifecycleStage = 'candidate_review';
  if (ledgerStatus === 'rejected') {
    lifecycleStage = 'rejected';
  } else if (queueStatus === 'blocked') {
    lifecycleStage = 'blocked';
  } else if (ledgerStatus === 'pending' || ledgerStatus === 'needs_more_evidence') {
    lifecycleStage = 'approval_review';
  } else if (indexStatus === 'indexed') {
    lifecycleStage = 'indexed';
  } else if (manifestStatus === 'present_in_manifest') {
    lifecycleStage = 'in_materials';
  } else if (stagingStatus === 'staged_metadata_only') {
    lifecycleStage = 'staged';
  } else if (queueStatus === 'manually_acquired') {
    lifecycleStage = 'manually_acquired';
  } else if (queueStatus === 'manually_staged') {
    lifecycleStage = 'staged';
  } else if (queueStatus === 'planned') {
    lifecycleStage = 'acquisition_planned';
  }

  const warnings = [];
  const risk = qItem?.riskCategory || lItem?.riskCategory || gItem?.riskCategory || null;
  if (risk) {
    warnings.push(`High-risk reference: Relates to ${risk.replace(/_/g, ' ')}.`);
  }
  if (ledgerStatus === 'rejected') {
    warnings.push("Rejected by operator review.");
  }
  if (evidenceStatus === 'missing') {
    warnings.push("Missing official source URL and licensing evidence.");
  }
  if (matchConfidence === 'possible_match') {
    warnings.push("Match is possible but unconfirmed.");
  }

  let recommendedNextStep = 'Review in Approval Ledger.';
  if (lifecycleStage === 'rejected') {
    recommendedNextStep = 'Do not acquire unless decision changes.';
  } else if (lifecycleStage === 'blocked') {
    recommendedNextStep = 'Resolve blocker manually.';
  } else if (lifecycleStage === 'indexed') {
    recommendedNextStep = 'Ready for local search and mission attachment.';
  } else if (lifecycleStage === 'in_materials') {
    recommendedNextStep = 'Open Index Integrity and run manual indexing.';
  } else if (lifecycleStage === 'staged') {
    recommendedNextStep = 'Verify metadata, create/confirm review record, then manually copy to materials if appropriate.';
  } else if (lifecycleStage === 'manually_acquired') {
    recommendedNextStep = 'Place file manually into import-staging/offline-library/.';
  } else if (lifecycleStage === 'acquisition_planned') {
    recommendedNextStep = 'Manually acquire from official source outside SOS.';
  } else if (lifecycleStage === 'approval_review') {
    recommendedNextStep = ledgerStatus === 'needs_more_evidence' ? 'Add source URL and evidence notes.' : 'Complete operator review.';
  } else if (ledgerStatus === 'approved' && queueStatus === 'none') {
    recommendedNextStep = 'Add to Acquisition Queue.';
  }

  if (!manifestChecked && (lifecycleStage === 'in_materials' || manifestStatus === 'unknown')) {
    recommendedNextStep = 'Open Index Integrity or refresh materials manifest.';
  }

  return {
    id: qItem?.id || lItem?.id || `life_${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    title,
    filenameHint,
    category,
    riskCategory: risk,
    gapStatus,
    ledgerStatus,
    queueStatus,
    allowlistStatus,
    stagingStatus,
    manifestStatus,
    indexStatus,
    evidenceStatus,
    lifecycleStage,
    warnings,
    recommendedNextStep,
    matchConfidence,
    officialSourceUrl: url
  };
}
