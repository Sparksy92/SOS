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

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const VECTOR_STORE_PATH = path.join(__dirname, 'vector_store');
const OLLAMA_BASE_URL = "http://localhost:11434"; // Default Ollama port
const EMBEDDING_MODEL = "nomic-embed-text";
const LLM_MODEL = "llama3.1:8b"; // Target the installed Llama 3.1 8B model

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

    // Check if a pre-processed markdown file exists in markdown_materials
    const relPath = path.relative(ROOT_DIR, filePath);
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(ROOT_DIR, 'markdown_materials', mdRelPath);

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
    const relativePath = '/materials/' + path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
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
 * Query the AI using RAG (SQLite Retrieval)
 */
const askQuestion = async (query, isLiveGuide = false, useGeneralKnowledge = false) => {
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
    let template = `You are the SOS (Survival Operating System) AI Assistant. 
You are answering the user's question using your general pre-trained knowledge base because no verified local sources were requested.
Clearly advise the user that this answer is general knowledge and has not been verified against their offline survival library.

QUESTION:
{question}

ANSWER:`;

    const prompt = PromptTemplate.fromTemplate(template);
    const chain = RunnableSequence.from([
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      question: query,
    });

    return {
      answer: response,
      answerStatus: "uncited_model",
      sources: []
    };
  }

  console.log(`[SQLITE] Searching (FTS5=${hasFts5}) for: "${sanitizedQuery}"`);
  
  let matches = [];
  if (hasFts5) {
    try {
      const searchStmt = db.prepare(`
        SELECT document_path, chunk_index, content 
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
        SELECT document_path, chunk_index, content 
        FROM document_chunks 
        WHERE content LIKE ? 
        LIMIT 5
      `);
      matches = fallbackStmt.all(`%${sanitizedQuery}%`);
    } catch (e) {
      console.error("Fallback LIKE search failed:", e);
    }
  }

  if (matches.length === 0) {
    return {
      answer: "I do not have enough verified local information to answer this query.",
      answerStatus: "insufficient_context",
      sources: []
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
    const relPath = path.relative(ROOT_DIR, path.join(ROOT_DIR, documentPath.replace('/materials/', '')));
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(ROOT_DIR, 'markdown_materials', mdRelPath);
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
      section
    };
  });

  const contextText = matches.map(m => m.content).join("\n\n---\n\n");
  
  // 2. Construct Prompt
  let template = `You are the SOS (Survival Operating System) AI Assistant. 
You must answer the user's question based strictly on the provided context from the survival database. 
If the answer is not contained within the context, state that you do not have the information. Do not invent answers.
If the context does not contain enough information to answer the question, respond with exactly: "I do not have enough verified local information to answer this query."`;

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
  const response = await chain.invoke({
    context: contextText,
    question: query,
  });

  const responseText = response.trim();
  const insufficientPhrase = "I do not have enough verified local information to answer this query.";
  const isInsufficient = responseText.includes(insufficientPhrase) || responseText.toLowerCase().includes("not have enough verified local information");

  if (isInsufficient) {
    return {
      answer: "I do not have enough verified local information to answer this query.",
      answerStatus: "insufficient_context",
      sources: []
    };
  }

  return {
    answer: response,
    answerStatus: "verified_local",
    sources
  };
};

/**
 * Extract true title and summary from a cryptic PDF
 */
const extractMetadata = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    // Check if a pre-processed markdown file exists in markdown_materials
    const relPath = path.relative(ROOT_DIR, filePath);
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(ROOT_DIR, 'markdown_materials', mdRelPath);

    let sampleText = "";
    if (ext === '.pdf' && fs.existsSync(mdPath)) {
      console.log(`[METADATA] Using high-fidelity olmOCR Markdown: ${mdPath}`);
      const text = fs.readFileSync(mdPath, 'utf8');
      sampleText = text.substring(0, 3000);
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
    return { title: "Error decoding", summary: err.message };
  }
};

module.exports = {
  indexFile,
  askQuestion,
  extractMetadata
};
