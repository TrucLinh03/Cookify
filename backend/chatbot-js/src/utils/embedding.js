/**
 * Gemini Embedding Utilities with Caching
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { embeddingCache, getEmbeddingCacheKey } = require('./cache');

let genAI = null;
let embeddingModel = null;
let generationModel = null;

/**
 * Initialize Gemini API
 */
function initializeGemini(apiKey, embeddingModelName, generationModelName) {
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is required');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  // Remove "models/" prefix if present (API doesn't need it for some endpoints)
  embeddingModel = (embeddingModelName || 'text-embedding-004').replace('models/', '');
  generationModel = (generationModelName || 'gemini-2.0-flash').replace('models/', '');
  
  console.log('Gemini API initialized');
  console.log(`Embedding model: ${embeddingModel}`);
  console.log(`Generation model: ${generationModel}`);
}

/**
 * Create embedding for a single text with caching
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function embedText(text) {
  if (!genAI) {
    throw new Error('Gemini API not initialized. Call initializeGemini() first.');
  }
  
  // Check cache first
  const cacheKey = getEmbeddingCacheKey(text);
  const cachedEmbedding = embeddingCache.get(cacheKey);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: embeddingModel });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    // Cache the result
    embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  } catch (error) {
    console.error('Error creating embedding:', error.message);
    throw error;
  }
}

/**
 * Create embeddings for multiple texts (batch)
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
async function embedBatch(texts, batchSize = 100) {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }
  
  const embeddings = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`);
    
    const batchPromises = batch.map(text => embedText(text));
    const batchEmbeddings = await Promise.all(batchPromises);
    embeddings.push(...batchEmbeddings);
    
    // Small delay to avoid rate limiting
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return embeddings;
}

/**
 * Generate response using Gemini
 * @param {string} prompt - Prompt for generation
 * @returns {Promise<string>} - Generated text
 */
async function generateResponse(prompt) {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: generationModel });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error.message);
    throw error;
  }
}

module.exports = {
  initializeGemini,
  embedText,
  embedBatch,
  generateResponse
};
