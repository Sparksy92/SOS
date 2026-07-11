const fs = require('fs');
const path = require('path');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OllamaEmbeddings, Ollama } = require("@langchain/ollama");
const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence } = require("@langchain/core/runnables");
const { db } = require('./db');
const { writeDocumentChunksToSqlite, checkDocumentIndexedStatus } = require('./services/documentIndexingService');
const { getMaterialRoot } = require('./services/materialRootService');
const { loadManifest } = require('./services/manifestService');
const ebgService = require('./services/ebgService');

// Configuration
const VECTOR_STORE_PATH = process.env.SOS_VECTOR_STORE_PATH || path.join(__dirname, 'vector_store');
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.SOS_EMBEDDING_MODEL || "nomic-embed-text";
const LLM_MODEL = process.env.SOS_LLM_MODEL || "llama3.1:8b";

let vectorStore = null;

// Initialize embeddings and LLM
const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

const llm = new Ollama({
  model: LLM_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

function getAvailableZims() {
  try {
    let targetFolder = process.env.SOS_ZIM_DIR;
    if (!targetFolder) {
      targetFolder = path.resolve(__dirname, '..', 'import-staging', 'kiwix');
    } else {
      targetFolder = path.resolve(targetFolder);
    }
    if (!fs.existsSync(targetFolder)) return [];
    return fs.readdirSync(targetFolder).filter(f => f.toLowerCase().endsWith('.zim'));
  } catch (err) {
    console.error("[AI ZIM SCANNER] Failed to scan ZIM directory:", err);
    return [];
  }
}

/**
 * Load vector store if it exists
 */
const loadVectorStore = async () => {
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    return await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
  }
  return null;
};

const { Document } = require("@langchain/core/documents");

/**
 * Index a single PDF or TXT file and add it to the vector store
 */
const indexFile = async (filePath) => {
  console.log(`Indexing ${filePath}...`);
  try {
    let docs = [];
    const ext = path.extname(filePath).toLowerCase();
    const materialsRoot = getMaterialRoot();

    // Check if a pre-processed markdown file exists in markdown_materials
    const relPath = path.relative(materialsRoot, filePath);
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(materialsRoot, 'markdown_materials', mdRelPath);

    let pages = [];

    if (ext === '.pdf' && fs.existsSync(mdPath)) {
      console.log(`[VECTOR] Found high-fidelity olmOCR Markdown: ${mdPath}`);
      const text = fs.readFileSync(mdPath, 'utf8');
      docs = [new Document({ pageContent: text, metadata: { source: filePath } })];
      pages = [text];
    } else if (ext === '.pdf') {
      // 1. Load PDF
      const loader = new PDFLoader(filePath);
      docs = await loader.load();
      pages = docs.map(d => d.pageContent);
    } else if (ext === '.txt') {
      // 1. Load TXT
      const text = fs.readFileSync(filePath, 'utf8');
      docs = [new Document({ pageContent: text, metadata: { source: filePath } })];
      pages = [text];
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // SQLite Indexing Block - Primary Source of Truth
    const relativePath = '/materials/' + path.relative(materialsRoot, filePath).replace(/\\/g, '/');
    const status = checkDocumentIndexedStatus(relativePath);

    // Re-index if not fully indexed or if chunk count is zero (Blocker 3 & 4)
    if (!status.indexed || status.chunks === 0) {
      console.log(`[SQLITE] Primary Indexing to SQLite: ${relativePath}`);
      writeDocumentChunksToSqlite(relativePath, pages);
    }

    // Vector-Store Indexing Block - Best-Effort / Optional (Blocker 2)
    let vectorIndexed = false;
    let vectorWarning = null;
    try {
      // 2. Split Text
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await textSplitter.splitDocuments(docs);
      
      console.log(`Generated ${splitDocs.length} chunks. Generating embeddings...`);

      // 3. Create or Update Vector Store
      if (!vectorStore) {
        vectorStore = await loadVectorStore();
      }
      
      if (vectorStore) {
        await vectorStore.addDocuments(splitDocs);
      } else {
        vectorStore = await HNSWLib.fromDocuments(splitDocs, embeddings);
      }
      
      // 4. Save to disk
      await vectorStore.save(VECTOR_STORE_PATH);
      vectorIndexed = true;
      console.log(`Successfully indexed vector store for ${filePath}`);
    } catch (vectorErr) {
      console.warn(`[OLLAMA] Vector store update failed for ${filePath}:`, vectorErr.message);
      vectorWarning = 'Vector store update failed; SQLite retrieval index is available.';
    }
    
    return { 
      success: true, 
      chunks: pages.length,
      sqliteIndexed: true,
      vectorIndexed,
      vectorWarning
    };
  } catch (err) {
    console.error(`Error indexing ${filePath}:`, err);
    return { success: false, error: err.message };
  }
};

const { hasFts5 } = require('./db');

const RISKY_PATTERNS = {
  'medical': /medical|first aid|triage|burn|wound|poison|injury/i,
  'water_treatment': /water treatment|purification|filter|sanitize|chlorine/i,
  'wild_plants': /wild plant|foraging|edible weed|herbal/i,
  'mushrooms': /mushroom|fungi|amanita|mycology/i,
  'food_preservation': /canning|fermentation|preservation|botulism|curing/i,
  'electrical': /electrical|wiring|generator|inverter|solar battery|breaker/i,
  'fuel_generator': /fuel|generator|propane|butane|gasoline|kerosene/i,
  'firearms': /firearms|ammo|ballistics|reloading|shooting|gunsmith/i,
  'mechanical': /mechanical|engine|pump|transmission|weld|turbine/i,
  'chemical': /chemical|bleach|acid|lye|pesticide|herbicide/i
};

function getRiskCategory(text) {
  if (!text) return null;
  for (const [category, pattern] of Object.entries(RISKY_PATTERNS)) {
    if (pattern.test(text)) {
      return category;
    }
  }
  return null;
}

/**
 * Search the manifest metadata for files matching query keywords
 */
function searchManifestMetadata(query) {
  try {
    const manifest = loadManifest();
    if (!manifest || !manifest.categories) return [];
    
    // Split the query into keywords and sanitize
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // only match words with length > 2
      
    if (keywords.length === 0) return [];
    
    const results = [];
    
    // Scan all categorized files in the manifest
    Object.values(manifest.categories).forEach(files => {
      files.forEach(file => {
        const nameLower = file.name.toLowerCase();
        const pathLower = file.path.toLowerCase();
        
        // Count how many keywords match the filename or path
        let matchCount = 0;
        keywords.forEach(kw => {
          if (nameLower.includes(kw) || pathLower.includes(kw)) {
            matchCount++;
          }
        });
        
        if (matchCount > 0) {
          results.push({
            file,
            score: matchCount / keywords.length, // match percentage
            exactMatches: matchCount
          });
        }
      });
    });
    
    // Sort by match score and return top 5
    return results
      .sort((a, b) => b.score - a.score || b.exactMatches - a.exactMatches)
      .slice(0, 5)
      .map(r => r.file);
  } catch (err) {
    console.error("[AI METADATA SEARCH] Failed to search manifest:", err);
    return [];
  }
}
const checkPolicyRejection = async (responseText, sources, isLiveGuide, useGeneralKnowledge, streamCallback, options = {}) => {
  const actionMatched = responseText.match(/\[PROPOSE_DECISION:\s*([^\]\*\r\n]+)/i);
  if (actionMatched) {
    const proposedAction = actionMatched[1].trim();
    const auth = ebgService.authorizeDecision(proposedAction);
    if (!auth.authorized) {
      console.log(`[POLICY GATE] Proposed action "${proposedAction}" DENIED by EBG. Restarting correction loop...`);
      const correctionPrompt = `Your proposed decision [PROPOSE_DECISION: ${proposedAction}] was DENIED by the CDL Policy Gate.
Reason: ${auth.reason}
Please propose an alternative action or explain the constraint.`;
      
      if (streamCallback) {
        streamCallback(`\n\n⚠️ **CDL POLICY GATE: REJECTED**\nProposed action "${proposedAction}" violates constitutional safety guardrails.\nRe-evaluating alternative courses of action...\n\n`, { answerStatus: useGeneralKnowledge ? "uncited_model" : "verified_local", sources });
      }
      
      return await askQuestion(correctionPrompt, isLiveGuide, useGeneralKnowledge, streamCallback, options);
    } else {
      console.log(`[POLICY GATE] Proposed action "${proposedAction}" APPROVED by EBG.`);
      let approvedText = `\n\n🟢 **CDL POLICY GATE: APPROVED**\nDecision "${proposedAction}" passed constitutional guardrails.`;
      if (streamCallback) {
        streamCallback(approvedText, { answerStatus: useGeneralKnowledge ? "uncited_model" : "verified_local", sources });
      }
      return responseText + approvedText;
    }
  }
  return null;
};

/**
 * Query the AI using RAG (SQLite Retrieval)
 */
const askQuestion = async (query, isLiveGuide = false, useGeneralKnowledge = false, streamCallback = null, options = {}) => {
  // Check if database is empty
  if (!useGeneralKnowledge) {
    try {
      const checkStmt = db.prepare("SELECT COUNT(*) as count FROM indexed_docs");
      const countResult = checkStmt.get();
      if (!countResult || countResult.count === 0) {
        return {
          answer: "My memory banks are currently empty! I cannot answer questions yet because no files have been indexed into my database. Please wait for the background crawler to index documents.",
          answerStatus: "insufficient_context",
          sources: []
        };
      }
    } catch (err) {
      console.error("Error checking indexed docs count:", err);
    }
  }

  // Determine if high-risk topic exists in query
  const queryRisk = getRiskCategory(query);
  let resolvedRisk = queryRisk;

  // 1. Clean query (remove punctuation that could break parsing)
  const sanitizedQuery = query.replace(/[^\w\s]/g, ' ').trim();
  if (!sanitizedQuery) {
    return {
      answer: "Please enter a valid search query containing keywords.",
      answerStatus: "insufficient_context",
      sources: []
    };
  }

  // Dynamic Greetings / Small Talk Bypass
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'yo', 'howdy', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what is your name', 'tell me about yourself', 'how is it going', 'how are you'];
  const cleanedQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const isGreeting = greetings.some(g => cleanedQuery === g || cleanedQuery.startsWith(g + ' '));

  if (isGreeting) {
    console.log(`[LLM] Greeting detected: "${query}". Bypassing RAG and routing to J.A.R.V.I.S. greeting template.`);
    let template = `You are J.A.R.V.I.S., the offline tactical AI assistant for this Survival Operating System. 
Respond to the user's greeting or small talk in a helpful, conversational, and slightly sophisticated persona. Keep it brief (maximum 3 sentences).

QUESTION:
{question}

ANSWER:`;

    const prompt = PromptTemplate.fromTemplate(template);
    const chain = RunnableSequence.from([
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    let responseText = "";
    if (streamCallback) {
      const responseStream = await chain.stream({ question: query }, { signal: options.signal });
      for await (const chunk of responseStream) {
        if (options.signal && options.signal.aborted) {
          console.log("[AI Stream] General Knowledge chain aborted.");
          break;
        }
        responseText += chunk;
        streamCallback(chunk, { answerStatus: "uncited_model", sources: [] });
      }
    } else {
      responseText = await chain.invoke({ question: query }, { signal: options.signal });
    }

    return {
      answer: responseText.trim(),
      answerStatus: "uncited_model",
      sources: []
    };
  }

  // Compile active EBG context
  const ebgContext = await ebgService.compileEbgContext(query);

  // Determine available ZIM archives and match recommendations
  const zims = getAvailableZims();
  let zimRecommendation = null;
  if (zims.length > 0) {
    const queryLower = query.toLowerCase();
    let matchedZim = null;
    if (queryLower.includes('medicine') || queryLower.includes('medical') || queryLower.includes('doctor') || queryLower.includes('dentist') || queryLower.includes('triage') || queryLower.includes('first aid') || queryLower.includes('wound') || queryLower.includes('burn')) {
      matchedZim = zims.find(z => z.toLowerCase().includes('medicine') || z.toLowerCase().includes('medical'));
    }
    if (!matchedZim && (queryLower.includes('wiki') || queryLower.includes('encyclopedia'))) {
      matchedZim = zims[0];
    }
    
    if (matchedZim) {
      let title = matchedZim
        .replace(/_/g, ' ')
        .replace(/\.zim$/i, '')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      zimRecommendation = `Advisory: I detected that you have the offline ZIM archive "${title}" (${matchedZim}) configured in your library. For comprehensive clinical guidelines or encyclopedic references, please search this archive directly in your Kiwix desktop application.`;
    }
  }

  // Handle uncited model fallback
  if (useGeneralKnowledge) {
    if (resolvedRisk) {
      return {
        answer: `CRITICAL BLOCK: Unverified fallback requests are blocked for high-risk topic [${resolvedRisk.toUpperCase()}]. Answers must be verified against your offline survival library. Please refine your search keywords or consult physical reference manuals directly.`,
        answerStatus: "insufficient_context",
        sources: []
      };
    }

    console.log(`[LLM] General knowledge query: "${sanitizedQuery}"`);
    let template = `You are the SOS (Survival Operating System) AI Assistant, running as J.A.R.V.I.S.
You are answering the user's question using your general pre-trained knowledge base because no verified local sources were requested.
Clearly advise the user that this answer is general knowledge and has not been verified against their offline survival library.

{cdl_state}

QUESTION:
{question}

ANSWER:`;

    const prompt = PromptTemplate.fromTemplate(template);
    const chain = RunnableSequence.from([
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    let responseText = "";
    if (streamCallback) {
      const responseStream = await chain.stream({
        question: query,
        cdl_state: ebgContext,
      }, { signal: options.signal });
      for await (const chunk of responseStream) {
        if (options.signal && options.signal.aborted) {
          console.log("[AI Stream] Secondary chain aborted.");
          break;
        }
        responseText += chunk;
        streamCallback(chunk, { answerStatus: "uncited_model", sources: [] });
      }
      if (zimRecommendation) {
        const extra = `\n\n* * *\n\n💡 **ZIM ARCHIVE RECOMMENDATION**\n${zimRecommendation}`;
        responseText += extra;
        streamCallback(extra, { answerStatus: "uncited_model", sources: [] });
      }
    } else {
      const response = await chain.invoke({
        question: query,
        cdl_state: ebgContext,
      }, { signal: options.signal });
      responseText = response;
      if (zimRecommendation) {
        responseText = `${responseText}\n\n* * *\n\n💡 **ZIM ARCHIVE RECOMMENDATION**\n${zimRecommendation}`;
      }
    }

    responseText = responseText.trim();
    const policyResult = await checkPolicyRejection(responseText, [], isLiveGuide, true, streamCallback);
    if (policyResult) {
      responseText = policyResult;
    }

    return {
      answer: responseText,
      answerStatus: "uncited_model",
      sources: []
    };
  }

  console.log(`[SQLITE] Searching (FTS5=${hasFts5}) for: "${sanitizedQuery}"`);
  
  let matches = [];
  if (hasFts5) {
    try {
      const searchStmt = db.prepare(`
        SELECT document_path, chunk_index, content, is_ocr 
        FROM document_chunks 
        WHERE content MATCH ? 
        ORDER BY rank 
        LIMIT 5
      `);
      matches = searchStmt.all(sanitizedQuery);
    } catch (err) {
      console.error("FTS5 MATCH failed, falling back to LIKE search:", err);
    }
  }

  // Fallback to LIKE search if FTS5 failed or is unsupported
  if (matches.length === 0) {
    try {
      const fallbackStmt = db.prepare(`
        SELECT document_path, chunk_index, content, is_ocr 
        FROM document_chunks 
        WHERE content LIKE ? 
        LIMIT 5
      `);
      matches = fallbackStmt.all(`%${sanitizedQuery}%`);
    } catch (e) {
      console.error("Fallback LIKE search failed:", e);
    }
  }

  const metadataMatches = searchManifestMetadata(query);

  if (matches.length === 0 && metadataMatches.length === 0) {
    return {
      answer: "I do not have enough verified local information to answer this query.",
      answerStatus: "insufficient_context",
      sources: []
    };
  }

  if (matches.length === 0 && metadataMatches.length > 0) {
    const sources = metadataMatches.map((file, idx) => {
      return {
        source: file.path,
        documentPath: file.path,
        chunkIndex: 0,
        rank: idx + 1,
        excerpt: `File match in library:\nName: ${file.name}\nFormat: ${file.extension.toUpperCase()}\nCategory: ${file.category}`,
        matchLabel: 'Inventory Match',
        riskCategory: file.riskCategory,
        page: null,
        section: null,
        isOcr: false
      };
    });

    const fileListStr = metadataMatches.map(f => `* **${f.name}** [Format: ${f.extension.toUpperCase()} | Category: ${f.category}]`).join('\n');
    let answerText = `I found matching files in your offline library:\n\n${fileListStr}\n\nSince these files are either binary formats (like ZIPs, videos, ZIMs, or software) or haven't been indexed for deep text search yet, I cannot read their page contents directly. However, you can open them directly using the "OPEN DOCUMENT" buttons below.`;
    
    if (zimRecommendation) {
      answerText = `${answerText}\n\n* * *\n\n💡 **ZIM ARCHIVE RECOMMENDATION**\n${zimRecommendation}`;
    }

    if (streamCallback) {
      streamCallback(answerText, { answerStatus: "verified_local", sources });
    }

    return {
      answer: answerText,
      answerStatus: "verified_local",
      sources
    };
  }

  // Check matched document contents for risk categories
  if (!resolvedRisk) {
    for (const m of matches) {
      const pathRisk = getRiskCategory(`${m.document_path} ${m.content}`);
      if (pathRisk) {
        resolvedRisk = pathRisk;
        break;
      }
    }
  }

  const sources = matches.map((m, idx) => {
    const rank = idx + 1;
    const documentPath = m.document_path;
    const chunkIndex = m.chunk_index;
    const ext = path.extname(documentPath).toLowerCase();
    
    // Page/section mapping
    let page = null;
    let section = null;
    // Check if high-fidelity OCR markdown exists
    const materialsRoot = getMaterialRoot();
    const relPath = documentPath.replace('/materials/', '');
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(materialsRoot, 'markdown_materials', mdRelPath);
    const isOcrMarkdown = fs.existsSync(mdPath);

    if (ext === '.pdf' && !isOcrMarkdown) {
      page = chunkIndex + 1;
    } else {
      section = chunkIndex + 1;
    }

    // Match labels
    let matchLabel = 'Weak Match';
    if (rank === 1) matchLabel = 'Strong Match';
    else if (rank === 2) matchLabel = 'Good Match';
    else if (rank === 3) matchLabel = 'Related Match';

    return {
      source: documentPath,
      documentPath,
      chunkIndex,
      rank,
      excerpt: m.content.substring(0, 300), // Excerpt of chunk
      matchLabel,
      riskCategory: getRiskCategory(`${documentPath} ${m.content}`),
      page,
      section,
      isOcr: m.is_ocr === 1 || isOcrMarkdown
    };
  });

  // Append metadata matches as inventory matches
  metadataMatches.forEach((file) => {
    if (!sources.some(s => s.documentPath === file.path)) {
      sources.push({
        source: file.path,
        documentPath: file.path,
        chunkIndex: 0,
        rank: sources.length + 1,
        excerpt: `File match in library: ${file.name}. Category: ${file.category}. Format: ${file.extension.toUpperCase()}`,
        matchLabel: 'Inventory Match',
        riskCategory: file.riskCategory,
        page: null,
        section: null
      });
    }
  });

  const contextText = matches.map(m => m.content).join("\n\n---\n\n");
  
  // 2. Construct Prompt
  let template = `You are the SOS (Survival Operating System) AI Assistant, running as J.A.R.V.I.S.
You must answer the user's question based strictly on the provided Context and the Cognitive Data Layer (CDL) state. 
If the answer is not contained within the context, state that you do not have the information. Do not invent answers.
If the context does not contain enough information to answer the question, respond with exactly: "I do not have enough verified local information to answer this query."

SYSTEM INSTRUCTIONS:
1. Ground your answers strictly in confirmed beliefs.
2. If the user asks about a provisional belief, address it as a hypothesis and seek user confirmation.
3. If you propose actions or decisions, you must state them in this format: [PROPOSE_DECISION: <action>].
4. TOOL MANIPULATION ACTION TAGS:
If the user requests you to track, log, or record an item (e.g., logging water volumes, saving field notes, or updating pantry stock), you MUST append the exact action tag at the end of your response in one of these formats:
- To log a water container: [ACTION: log_water volume=X type=Y location=Z] (where X is a number, e.g., volume=20, type is one of: mineral, drinking, rainwater, greywater, and location is a brief string without quotes, e.g., location=kitchen)
- To record a field note: [ACTION: save_note content="text details" category=general|water|food|medical|comms]
- To update pantry stock: [ACTION: update_pantry item="item name" quantity=X] (where X is a number)
Generating these tags will trigger confirmation panels for the operator. Always explain in text what action you are proposing.

{cdl_state}`;

  if (isLiveGuide) {
    template += `\n\nFORMATTING RULE: Since you are guiding the user live in a critical situation, format your response strictly as a clear, step-by-step numbered list. Keep each step extremely brief, actionable, and direct (maximum 2 sentences per step). Avoid preambles.`;
  }

  if (resolvedRisk) {
    template += `\n\nWARNING: This topic is flagged as high-risk. Emphasize safety precautions, state that the information is extracted from offline local manuals, recommend professional verification where appropriate, and avoid presenting theoretical guidance as absolute fact.`;
  }

  template += `\n\nCONTEXT:
{context}

QUESTION:
{question}

ANSWER:`;

  const prompt = PromptTemplate.fromTemplate(template);
  
  // 3. Generate Answer
  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  console.log("Generating AI response...");
  let responseText = "";
  if (streamCallback) {
    const responseStream = await chain.stream({
      context: contextText,
      cdl_state: ebgContext,
      question: query,
    }, { signal: options.signal });
    for await (const chunk of responseStream) {
      if (options.signal && options.signal.aborted) {
        console.log("[AI Stream] Main RAG generation chain aborted.");
        break;
      }
      responseText += chunk;
      streamCallback(chunk, { answerStatus: "verified_local", sources });
    }
    if (zimRecommendation) {
      const extra = `\n\n* * *\n\n💡 **ZIM ARCHIVE RECOMMENDATION**\n${zimRecommendation}`;
      responseText += extra;
      streamCallback(extra, { answerStatus: "verified_local", sources });
    }
  } else {
    const response = await chain.invoke({
      context: contextText,
      cdl_state: ebgContext,
      question: query,
    }, { signal: options.signal });
    responseText = response;
    if (zimRecommendation) {
      responseText = `${responseText}\n\n* * *\n\n💡 **ZIM ARCHIVE RECOMMENDATION**\n${zimRecommendation}`;
    }
  }

  responseText = responseText.trim();
  const insufficientPhrase = "I do not have enough verified local information to answer this query.";
  const isInsufficient = responseText.includes(insufficientPhrase) || responseText.toLowerCase().includes("not have enough verified local information");

  if (isInsufficient) {
    return {
      answer: "I do not have enough verified local information to answer this query.",
      answerStatus: "insufficient_context",
      sources: []
    };
  }

  // 4. Policy Rejection Loop Check
  const policyResult = await checkPolicyRejection(responseText, sources, isLiveGuide, false, streamCallback);
  if (policyResult) {
    responseText = policyResult;
  }

  return {
    answer: responseText,
    answerStatus: "verified_local",
    sources
  };
};

/**
 * Extract true title and summary from a cryptic PDF
 */
const extractMetadata = async (filePath, pages = null) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    // Check if a pre-processed markdown file exists in markdown_materials
    const materialsRoot = getMaterialRoot();
    const relPath = path.relative(materialsRoot, filePath);
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(materialsRoot, 'markdown_materials', mdRelPath);

    let sampleText = "";
    if (ext === '.pdf' && fs.existsSync(mdPath)) {
      console.log(`[METADATA] Using high-fidelity olmOCR Markdown: ${mdPath}`);
      const text = fs.readFileSync(mdPath, 'utf8');
      sampleText = text.substring(0, 3000);
    } else if (pages && pages.length > 0) {
      // Use pre-parsed pages to avoid parsing the PDF twice
      sampleText = pages[0].substring(0, 1500);
      if (sampleText.length < 200 && pages.length > 1) {
        sampleText += " " + pages[1].substring(0, 1500);
      }
    } else {
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      if (!docs || docs.length === 0) throw new Error("No text found in PDF");
      
      // Take the first 1500 chars which usually contains the title page/intro
      sampleText = docs[0].pageContent.substring(0, 1500);
      // if first page is too short, append second page
      if (sampleText.length < 200 && docs.length > 1) {
          sampleText += " " + docs[1].pageContent.substring(0, 1500);
      }
    }

    
    const template = `Analyze the following text extracted from the beginning of a document. 
Your task is to determine the actual TITLE of the document and write a ONE-SENTENCE SUMMARY of what it is about.
The original filename might be a cryptic abbreviation. Ignore it.
Format your response exactly like this:
TITLE: <extracted title>
SUMMARY: <extracted summary>

TEXT:
{text}
`;

    const prompt = PromptTemplate.fromTemplate(template);
    const chain = RunnableSequence.from([prompt, llm, new StringOutputParser()]);
    
    const response = await chain.invoke({ text: sampleText });
    
    let title = "Unknown Document";
    let summary = "Could not determine summary.";
    
    const titleMatch = response.match(/TITLE:\s*(.*)/i);
    const summaryMatch = response.match(/SUMMARY:\s*(.*)/i);
    
    if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();
    if (summaryMatch && summaryMatch[1]) summary = summaryMatch[1].trim();
    
    return { title, summary };
  } catch (err) {
    console.error("Metadata extraction error:", err);
    const filename = path.basename(filePath);
    const cleanTitle = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    return { 
      title: cleanTitle,
      summary: "Scanned document or image-only PDF. Run OCR to transcribe." 
    };
  }
};

module.exports = {
  indexFile,
  askQuestion,
  extractMetadata
};
