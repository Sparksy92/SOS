const { db } = require('../db');
const path = require('path');
const fs = require('fs');

function autoSeedBackendPacks() {
  try {
    const countRow = db.prepare("SELECT count(*) as count FROM knowledge_entries").get();
    if (countRow && countRow.count < 10) {
      const pack1Path = path.resolve(__dirname, '..', '..', 'sos-app', 'src', 'modules', 'mycology', 'data', 'knowledge-packs', 'mycology', 'north-america-fungi.pack.json');
      const pack2Path = path.resolve(__dirname, '..', '..', 'sos-app', 'src', 'modules', 'mycology', 'data', 'knowledge-packs', 'mycology', 'greenhouse-and-cultivation-mushrooms.pack.json');

      if (fs.existsSync(pack1Path)) {
        const p1 = JSON.parse(fs.readFileSync(pack1Path, 'utf8'));
        importKnowledgePack(p1);
      }
      if (fs.existsSync(pack2Path)) {
        const p2 = JSON.parse(fs.readFileSync(pack2Path, 'utf8'));
        importKnowledgePack(p2);
      }
    }
  } catch (e) {
    console.warn("[MYCOLOGY BACKEND AUTOSEED] Auto-seed note:", e.message);
  }
}

/**
 * Helper to safely parse JSON or return default
 */
function parseJson(str, defaultValue = null) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Ensure a trait exists in `traits` table and return its ID
 */
function getOrCreateTrait(category, name, label = null) {
  const normCat = category.toLowerCase().trim();
  const normName = name.toLowerCase().trim();
  const displayLabel = label || name;

  const existing = db.prepare("SELECT id FROM traits WHERE category = ? AND name = ?").get(normCat, normName);
  if (existing) return existing.id;

  const res = db.prepare("INSERT INTO traits (category, name, label) VALUES (?, ?, ?)").run(normCat, normName, displayLabel);
  return res.lastInsertRowid;
}

/**
 * Helper to parse a database row into a structured KnowledgeEntry object
 */
function formatEntryRow(row) {
  if (!row) return null;

  // Retrieve traits associated with this entry
  const traitsRows = db.prepare(`
    SELECT t.category, t.name, t.label 
    FROM traits t
    JOIN entry_traits et ON t.id = et.trait_id
    WHERE et.entry_id = ?
  `).all(row.id);

  const traitsMap = {};
  traitsRows.forEach(t => {
    if (!traitsMap[t.category]) traitsMap[t.category] = [];
    traitsMap[t.category].push({ name: t.name, label: t.label });
  });

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    scientificName: row.scientific_name,
    authority: row.authority,
    taxonomy: parseJson(row.taxonomy_json, {}),
    content: parseJson(row.content_json, {}),
    safetyRating: parseJson(row.safety_rating_json, { difficulty: 'intermediate', risk: 'moderate', requirement: 'visual' }),
    sourcesAttribution: parseJson(row.sources_attribution_json, []),
    media: parseJson(row.media_json, []),
    references: parseJson(row.references_json, []),
    relationships: parseJson(row.relationships_json, []),
    packId: row.pack_id,
    version: row.version,
    traits: traitsMap,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Upsert a KnowledgeEntry into SQLite database
 */
function upsertKnowledgeEntry(entry) {
  const {
    id,
    type = 'mycology',
    title,
    scientificName = '',
    authority = '',
    taxonomy = {},
    content = {},
    safetyRating = {},
    sourcesAttribution = [],
    media = [],
    references = [],
    relationships = [],
    packId = 'default_pack',
    version = '1.0.0',
    traits = {}
  } = entry;

  db.prepare(`
    INSERT INTO knowledge_entries (
      id, type, title, scientific_name, authority, taxonomy_json, content_json,
      safety_rating_json, sources_attribution_json, media_json, references_json,
      relationships_json, pack_id, version, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      title = excluded.title,
      scientific_name = excluded.scientific_name,
      authority = excluded.authority,
      taxonomy_json = excluded.taxonomy_json,
      content_json = excluded.content_json,
      safety_rating_json = excluded.safety_rating_json,
      sources_attribution_json = excluded.sources_attribution_json,
      media_json = excluded.media_json,
      references_json = excluded.references_json,
      relationships_json = excluded.relationships_json,
      pack_id = excluded.pack_id,
      version = excluded.version,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    id,
    type,
    title,
    scientificName,
    authority,
    JSON.stringify(taxonomy),
    JSON.stringify(content),
    JSON.stringify(safetyRating),
    JSON.stringify(sourcesAttribution),
    JSON.stringify(media),
    JSON.stringify(references),
    JSON.stringify(relationships),
    packId,
    version
  );

  // Clear existing trait associations for clean re-indexing
  db.prepare("DELETE FROM entry_traits WHERE entry_id = ?").run(id);

  // Link normalized traits
  if (traits && typeof traits === 'object') {
    Object.entries(traits).forEach(([category, traitList]) => {
      const items = Array.isArray(traitList) ? traitList : [traitList];
      items.forEach(item => {
        let name = item;
        let label = item;
        if (typeof item === 'object' && item !== null) {
          name = item.name || item.value || '';
          label = item.label || name;
        }
        if (name) {
          const traitId = getOrCreateTrait(category, String(name), String(label));
          try {
            db.prepare("INSERT OR IGNORE INTO entry_traits (entry_id, trait_id) VALUES (?, ?)").run(id, traitId);
          } catch (e) {}
        }
      });
    });
  }

  return getEntryById(id);
}

/**
 * Get a single entry by ID
 */
function getEntryById(id) {
  const row = db.prepare("SELECT * FROM knowledge_entries WHERE id = ?").get(id);
  return formatEntryRow(row);
}

/**
 * Query entries with filtering and search capabilities
 */
function searchKnowledgeEntries(options = {}) {
  autoSeedBackendPacks();
  const {
    type = 'mycology',
    query = '',
    edibility = '',
    habitat = '',
    season = '',
    traitFilters = [], // Array of { category, name }
    limit = 100,
    offset = 0
  } = options;

  let sql = `SELECT DISTINCT ke.* FROM knowledge_entries ke`;
  const joins = [];
  const params = [];
  const conditions = ["ke.type = ?"];
  params.push(type);

  // Trait filters join
  if (traitFilters.length > 0) {
    traitFilters.forEach((tf, idx) => {
      const aliasEt = `et_${idx}`;
      const aliasT = `t_${idx}`;
      joins.push(`JOIN entry_traits ${aliasEt} ON ke.id = ${aliasEt}.entry_id`);
      joins.push(`JOIN traits ${aliasT} ON ${aliasEt}.trait_id = ${aliasT}.id`);
      conditions.push(`${aliasT}.category = ? AND ${aliasT}.name = ?`);
      params.push(tf.category.toLowerCase(), tf.name.toLowerCase());
    });
  }

  // Edibility filter
  if (edibility) {
    const etAlias = 'et_edible';
    const tAlias = 't_edible';
    joins.push(`JOIN entry_traits ${etAlias} ON ke.id = ${etAlias}.entry_id`);
    joins.push(`JOIN traits ${tAlias} ON ${etAlias}.trait_id = ${tAlias}.id`);
    conditions.push(`${tAlias}.category = 'edibility' AND ${tAlias}.name = ?`);
    params.push(edibility.toLowerCase());
  }

  // Habitat filter
  if (habitat) {
    const etAlias = 'et_habitat';
    const tAlias = 't_habitat';
    joins.push(`JOIN entry_traits ${etAlias} ON ke.id = ${etAlias}.entry_id`);
    joins.push(`JOIN traits ${tAlias} ON ${etAlias}.trait_id = ${tAlias}.id`);
    conditions.push(`${tAlias}.category = 'habitat' AND ${tAlias}.name LIKE ?`);
    params.push(`%${habitat.toLowerCase()}%`);
  }

  // Season filter
  if (season) {
    const etAlias = 'et_season';
    const tAlias = 't_season';
    joins.push(`JOIN entry_traits ${etAlias} ON ke.id = ${etAlias}.entry_id`);
    joins.push(`JOIN traits ${tAlias} ON ${etAlias}.trait_id = ${tAlias}.id`);
    conditions.push(`${tAlias}.category = 'season' AND ${tAlias}.name = ?`);
    params.push(season.toLowerCase());
  }

  // Search query (matches title, scientific_name, or content)
  if (query) {
    const qTerm = `%${query.toLowerCase()}%`;
    conditions.push(`(
      LOWER(ke.title) LIKE ? OR 
      LOWER(ke.scientific_name) LIKE ? OR 
      LOWER(ke.content_json) LIKE ? OR
      LOWER(ke.taxonomy_json) LIKE ?
    )`);
    params.push(qTerm, qTerm, qTerm, qTerm);
  }

  sql += ` ${joins.join(' ')} WHERE ${conditions.join(' AND ')} ORDER BY ke.title ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params);
  return rows.map(formatEntryRow);
}

/**
 * Identification Decision Keys Management
 */
function saveIdentificationKey(keyData) {
  const { id, module = 'mycology', region = 'global', title, description = '', keyTree, version = '1.0.0' } = keyData;
  db.prepare(`
    INSERT INTO identification_keys (id, module, region, title, description, key_tree_json, version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      region = excluded.region,
      title = excluded.title,
      description = excluded.description,
      key_tree_json = excluded.key_tree_json,
      version = excluded.version
  `).run(id, module, region, title, description, JSON.stringify(keyTree), version);

  return getIdentificationKeyById(id);
}

function getIdentificationKeyById(id) {
  const row = db.prepare("SELECT * FROM identification_keys WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    module: row.module,
    region: row.region,
    title: row.title,
    description: row.description,
    keyTree: parseJson(row.key_tree_json, {}),
    version: row.version,
    createdAt: row.created_at
  };
}

function getIdentificationKeys(module = 'mycology', region = null) {
  let sql = "SELECT * FROM identification_keys WHERE module = ?";
  const params = [module];
  if (region) {
    sql += " AND region = ?";
    params.push(region);
  }
  const rows = db.prepare(sql).all(...params);
  return rows.map(r => ({
    id: r.id,
    module: r.module,
    region: r.region,
    title: r.title,
    description: r.description,
    keyTree: parseJson(r.key_tree_json, {}),
    version: r.version,
    createdAt: r.created_at
  }));
}

/**
 * Trait-based Decision Engine Traversal / Candidate Scorer
 */
function evaluateTraitsAgainstCandidates(selectedTraits = {}) {
  // selectedTraits is map of { category: name } or { category: [names] }
  const entries = searchKnowledgeEntries({ limit: 1000 });
  const scored = entries.map(entry => {
    let matchScore = 0;
    let totalCriteria = 0;
    const matchReasons = [];

    Object.entries(selectedTraits).forEach(([category, val]) => {
      if (!val) return;
      totalCriteria++;
      const userValues = (Array.isArray(val) ? val : [val]).map(v => String(v).toLowerCase());

      const entryTraitsForCategory = entry.traits[category] || [];
      const entryTraitNames = entryTraitsForCategory.map(t => t.name.toLowerCase());

      const isMatch = userValues.some(uv => entryTraitNames.includes(uv));
      if (isMatch) {
        matchScore += 1;
        matchReasons.push(`Matches ${category}: ${userValues.join(', ')}`);
      }
    });

    const matchPercentage = totalCriteria > 0 ? Math.round((matchScore / totalCriteria) * 100) : 0;

    return {
      entry,
      matchScore,
      totalCriteria,
      matchPercentage,
      matchReasons
    };
  });

  return scored
    .filter(s => s.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Observations (Field Journal) Management
 */
function saveObservation(obs) {
  const {
    id = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId = 'local_ranger',
    date = new Date().toISOString(),
    latitude = null,
    longitude = null,
    locationName = '',
    photos = [],
    entryId = null,
    confidence = 'unidentified',
    notes = '',
    weather = '',
    habitat = '',
    treesNearby = '',
    isPrivate = 1
  } = obs;

  db.prepare(`
    INSERT INTO mycology_observations (
      id, user_id, date, latitude, longitude, location_name, photos_json,
      entry_id, confidence, notes, weather, habitat, trees_nearby, is_private
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      location_name = excluded.location_name,
      photos_json = excluded.photos_json,
      entry_id = excluded.entry_id,
      confidence = excluded.confidence,
      notes = excluded.notes,
      weather = excluded.weather,
      habitat = excluded.habitat,
      trees_nearby = excluded.trees_nearby,
      is_private = excluded.is_private
  `).run(
    id, userId, date, latitude, longitude, locationName,
    JSON.stringify(photos), entryId, confidence, notes, weather,
    habitat, treesNearby, isPrivate ? 1 : 0
  );

  return getObservationById(id);
}

function getObservationById(id) {
  const row = db.prepare("SELECT * FROM mycology_observations WHERE id = ?").get(id);
  if (!row) return null;
  return formatObservationRow(row);
}

function getObservations(userId = 'local_ranger') {
  const rows = db.prepare("SELECT * FROM mycology_observations WHERE user_id = ? ORDER BY date DESC").all(userId);
  return rows.map(formatObservationRow);
}

function deleteObservation(id) {
  db.prepare("DELETE FROM mycology_observations WHERE id = ?").run(id);
  return { success: true, id };
}

function formatObservationRow(row) {
  let linkedEntry = null;
  if (row.entry_id) {
    linkedEntry = getEntryById(row.entry_id);
  }

  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    latitude: row.latitude,
    longitude: row.longitude,
    locationName: row.location_name,
    photos: parseJson(row.photos_json, []),
    entryId: row.entry_id,
    linkedEntry,
    confidence: row.confidence,
    notes: row.notes,
    weather: row.weather,
    habitat: row.habitat,
    treesNearby: row.trees_nearby,
    isPrivate: Boolean(row.is_private),
    createdAt: row.created_at
  };
}

/**
 * Knowledge Pack Management
 */
function importKnowledgePack(packData) {
  const {
    id,
    module = 'mycology',
    title,
    version = '1.0.0',
    source = '',
    license = '',
    entries = [],
    identificationKeys = []
  } = packData;

  if (!id || !title) {
    throw new Error('Knowledge pack must include valid id and title');
  }

  db.prepare(`
    INSERT INTO knowledge_packs (id, module, title, version, source, license, entry_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      version = excluded.version,
      source = excluded.source,
      license = excluded.license,
      entry_count = excluded.entry_count,
      installed_at = CURRENT_TIMESTAMP
  `).run(id, module, title, version, source, license, entries.length);

  // Batch insert knowledge entries
  const importedEntries = entries.map(e => {
    return upsertKnowledgeEntry({
      ...e,
      packId: id,
      version: version
    });
  });

  // Batch insert decision keys if included in pack
  const importedKeys = identificationKeys.map(k => {
    return saveIdentificationKey({
      ...k,
      module,
      version
    });
  });

  return {
    success: true,
    packId: id,
    title,
    version,
    importedEntriesCount: importedEntries.length,
    importedKeysCount: importedKeys.length
  };
}

function getKnowledgePacks(module = 'mycology') {
  return db.prepare("SELECT * FROM knowledge_packs WHERE module = ? ORDER BY installed_at DESC").all(module);
}

module.exports = {
  getOrCreateTrait,
  upsertKnowledgeEntry,
  getEntryById,
  searchKnowledgeEntries,
  saveIdentificationKey,
  getIdentificationKeyById,
  getIdentificationKeys,
  evaluateTraitsAgainstCandidates,
  saveObservation,
  getObservationById,
  getObservations,
  deleteObservation,
  importKnowledgePack,
  getKnowledgePacks
};
