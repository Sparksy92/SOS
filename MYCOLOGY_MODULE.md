# SOS Knowledge Engine Platform & Mycology Knowledge Module

The **SOS Knowledge Engine** transforms SurvivalOS into a modular, offline-first knowledge platform. The **Mycology Module** (`MycologyModule`) is the flagship implementation built on this generic architecture.

---

## 1. Core Platform Architecture

The architecture enforces 6 fundamental engineering principles:

1. **Single Source of Truth (`knowledge_entries`)**: Master records for all domain knowledge (Mycology, Botany, Wildlife, Survival, First Aid) share a normalized schema in SQLite.
2. **Normalized Relational Trait Index**: Traits are indexed into `traits` and `entry_traits` tables to enable instant SQL join queries without parsing monolithic JSON blobs.
3. **R.A.N.G.E.R. Local AI Integration**: Knowledge entries are indexed into Ollama, LangChain, FTS5, and the HNSWLib vector store. Natural language queries leverage R.A.N.G.E.R. while enforcing field safety directives.
4. **Graph-Based Decision Key Engine**: Trait-based identification uses branching `IdentificationKey` decision trees.
5. **Modular Knowledge Packs (`knowledge-packs/`)**: Datasets are packaged into `.pack.json` bundles with explicit schema versioning, source attribution, and license provenance.
6. **Multi-Axis Safety & Traditional Knowledge Layer**: Includes multi-axis safety ratings (Difficulty, Risk, Confidence Requirement), traditional/indigenous knowledge layers, and image angle tags (`top`, `side`, `underside`, `spore_print`, `habitat`).

---

## 2. Database Schemas (SQLite Backend)

```sql
-- Master Knowledge Entries
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'mycology',
  title TEXT NOT NULL,
  scientific_name TEXT,
  authority TEXT,
  taxonomy_json TEXT,
  content_json TEXT,
  safety_rating_json TEXT,
  sources_attribution_json TEXT,
  media_json TEXT,
  references_json TEXT,
  relationships_json TEXT,
  pack_id TEXT,
  version TEXT DEFAULT '1.0.0',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Relational Trait Dictionary
CREATE TABLE traits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  UNIQUE(category, name)
);

-- Entry-Trait Junction
CREATE TABLE entry_traits (
  entry_id TEXT NOT NULL,
  trait_id INTEGER NOT NULL,
  PRIMARY KEY (entry_id, trait_id),
  FOREIGN KEY (entry_id) REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (trait_id) REFERENCES traits(id) ON DELETE CASCADE
);

-- Identification Decision Keys
CREATE TABLE identification_keys (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL DEFAULT 'mycology',
  region TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  key_tree_json TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Field Journal Observations
CREATE TABLE mycology_observations (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'local_ranger',
  date TEXT DEFAULT CURRENT_TIMESTAMP,
  latitude REAL,
  longitude REAL,
  location_name TEXT,
  photos_json TEXT,
  entry_id TEXT,
  confidence TEXT CHECK(confidence IN ('confirmed', 'probable', 'possible', 'unidentified')),
  notes TEXT,
  weather TEXT,
  habitat TEXT,
  trees_nearby TEXT,
  is_private INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES knowledge_entries(id) ON DELETE SET NULL
);

-- Knowledge Packs Ledger
CREATE TABLE knowledge_packs (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  source TEXT,
  license TEXT,
  entry_count INTEGER DEFAULT 0,
  installed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Creating & Importing Knowledge Packs

Knowledge Packs are standalone JSON files located in `sos-app/src/modules/mycology/data/knowledge-packs/mycology/` or uploaded via the Knowledge Pack Manager.

### Pack Schema Format
```json
{
  "id": "ontario-fungi-v1",
  "module": "mycology",
  "title": "Ontario Wild Mushrooms Pack",
  "version": "1.0.0",
  "source": "Ontario Mycological Society",
  "license": "CC-BY-4.0",
  "entries": [
    {
      "id": "cantharellus_cibarius",
      "type": "mycology",
      "title": "Golden Chanterelle",
      "scientificName": "Cantharellus cibarius",
      "authority": "Fr.",
      "taxonomy": {
        "kingdom": "Fungi",
        "phylum": "Basidiomycota",
        "class": "Agaricomycetes",
        "order": "Cantharellales",
        "family": "Cantharellaceae",
        "genus": "Cantharellus",
        "species": "Cantharellus cibarius"
      },
      "content": {
        "summary": "Prized golden-yellow vase mushroom with decurrent false gills.",
        "description": "Golden-yellow trumpet shape with blunt cross-veined false gills.",
        "identificationGuide": "Look for blunt ridges that cross-branch, solid white interior flesh, and apricot aroma.",
        "habitatDesc": "Mossy hardwood and conifer forests.",
        "seasonalityDesc": "Summer through autumn.",
        "edibility": "choice",
        "toxicityDesc": "Edible when cooked.",
        "medicinalDesc": "Rich in Vitamin D2 and antioxidants."
      },
      "safetyRating": {
        "difficulty": "intermediate",
        "risk": "moderate",
        "requirement": "visual"
      },
      "sourcesAttribution": [
        { "type": "scientific", "contributor": "NAMA Field Guides", "notes": "Verified entry" }
      ],
      "media": [
        { "url": "/materials/mycology/chanterelle.jpg", "caption": "False gills underside", "angle": "underside", "quality": "good", "verified": true }
      ],
      "references": [],
      "relationships": [
        { "target_id": "omphalotus_olearius", "relation_type": "lookalike", "notes": "Jack-o'-Lantern has true gills and orange interior flesh. POISONOUS." }
      ],
      "traits": {
        "hymenophore": [{ "name": "folds", "label": "False Gills / Blunt Folds" }],
        "cap_color": [{ "name": "yellow", "label": "Golden Yellow" }],
        "habitat": [{ "name": "hardwood", "label": "Hardwood Forest" }],
        "season": [{ "name": "summer", "label": "Summer" }, { "name": "fall", "label": "Autumn" }],
        "edibility": [{ "name": "choice", "label": "Choice Edible" }]
      }
    }
  ],
  "identificationKeys": []
}
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mycology/entries` | Search knowledge entries with query, edibility, habitat, season filters |
| `GET` | `/api/mycology/entries/:id` | Fetch entry by ID with relational traits |
| `POST` | `/api/mycology/entries` | Create or update a KnowledgeEntry |
| `POST` | `/api/mycology/identify` | Evaluate observed traits against decision matrix candidate scorer |
| `GET` | `/api/mycology/keys` | Fetch identification decision keys |
| `POST` | `/api/mycology/keys` | Save an identification decision key |
| `GET` | `/api/mycology/observations` | Fetch field journal observations for user |
| `POST` | `/api/mycology/observations` | Record/update a field observation |
| `DELETE` | `/api/mycology/observations/:id` | Delete a field observation |
| `GET` | `/api/mycology/packs` | List installed Knowledge Packs |
| `POST` | `/api/mycology/packs/import` | Import Knowledge Pack JSON |
| `POST` | `/api/mycology/ai-analyze` | R.A.N.G.E.R. Local AI Knowledge Router for Mycology |

---

## 5. Adding Future Knowledge Modules (e.g. Botany, Wildlife, Survival)

To implement a new knowledge domain (e.g. `BotanyModule`):
1. Use the existing `knowledge_entries` master table with `type = 'botany'`.
2. Add domain traits to `traits` (e.g., `leaf_shape: lobed`, `bark_texture: furrowed`).
3. Create a Knowledge Pack under `knowledge-packs/botany/*.pack.json`.
4. Create the domain screens inside `sos-app/src/modules/botany/`.
