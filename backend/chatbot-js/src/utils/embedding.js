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
 * Generate response using Gemini with optimized parameters and retry logic
 * @param {string} prompt - Prompt for generation
 * @param {object} options - Generation options
 * @returns {Promise<string>} - Generated text
 */
async function generateResponse(prompt, options = {}) {
  if (!genAI) {
    throw new Error('Gemini API not initialized');
  }
  
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.baseDelay || 2000; // 2 seconds
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Optimized generation config for cooking chatbot
      const generationConfig = {
        temperature: options.temperature || 0.15,
        topK: options.topK || 20,
        topP: options.topP || 0.75,
        maxOutputTokens: options.maxOutputTokens || 2048,
        candidateCount: 1,
      };
      
      const model = genAI.getGenerativeModel({ 
        model: generationModel,
        generationConfig
      });
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
      
    } catch (error) {
      const isRateLimitError = error.message?.includes('429') || 
                               error.message?.includes('Resource exhausted') ||
                               error.message?.includes('Too Many Requests');
      
      // If it's a rate limit error and we have retries left
      if (isRateLimitError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's the last attempt or non-rate-limit error, throw
      console.error('Error generating response:', error.message);
      throw error;
    }
  }
}

module.exports = {
  initializeGemini,
  embedText,
  embedBatch,
  generateResponse
};
