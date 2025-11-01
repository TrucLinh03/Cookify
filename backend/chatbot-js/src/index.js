/**
 * Cookify Chatbot Service - Node.js with MongoDB Atlas Vector Search
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { initializeGemini, embedText, embedBatch, generateResponse } = require('./utils/embedding');
const { multiCollectionSearch, getPopularRecipes } = require('./utils/vectorSearch');
const { buildSearchableText } = require('./utils/buildSearchText');
const { responseCache, searchCache, getCacheKey } = require('./utils/cache');
const { metricsCollector, logRequest, logResponse, logError } = require('./utils/metrics');
const { testConversationContext, validateConversationContext, formatContextForDebug } = require('./utils/conversationContext');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
//  CORS configuration - Smart CORS for Development & Production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://cookifychef.netlify.app,https://cookify2025.netlify.app,https://cookify-auiz.onrender.com,https://cookify-1-8c21.onrender.com")
  .split(",")
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

console.log('Allowed CORS Origins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow production origins
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS allowed for: ${origin}`);
      return callback(null, true);
    }
    
    // Allow all localhost origins for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      console.log(` CORS allowed for localhost: ${origin}`);
      return callback(null, true);
    }
    
    // Block other origins
    console.warn(` CORS blocked request from origin: ${origin}`);
    console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    // Don't throw error, just return false to avoid crashing
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());

// Global state
let mongoClient = null;
let db = null;
let isReady = false;

/**
 * Initialize MongoDB connection
 */
async function initializeMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db(process.env.DB_NAME || 'Cookify');
    
    // Test connection
    await db.admin().ping();
    console.log('MongoDB connected successfully');
    console.log(`Database: ${db.databaseName}`);
    
    // List available collections
    const collections = await db.listCollections().toArray();
    console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return false;
  }
}

/**
 * Initialize all services
 */
async function initialize() {
  try {
    console.log('Initializing Cookify Chatbot Service...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', PORT);
    
    // Validate required environment variables
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }
    
    // Initialize Gemini API
    initializeGemini(
      process.env.GOOGLE_API_KEY,
      process.env.MODEL_EMBEDDING || 'text-embedding-004',
      process.env.MODEL_GENERATION || 'gemini-2.0-flash'
    );
    
    // Initialize MongoDB
    const mongoConnected = await initializeMongoDB();
    if (!mongoConnected) {
      throw new Error('Failed to connect to MongoDB');
    }
    
    // FAQ data is now converted to blog posts with vector embeddings
    
    isReady = true;
    
  } catch (error) {
    console.error('Initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    // Don't exit in production, allow health checks to report status
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

/**
 * Build context prompt from search results and conversation history
 * @param {string} query - User's current question
 * @param {Array} searchResults - Vector search results
 * @param {string} conversationContext - Recent conversation context (optional)
 * @returns {string} - Complete prompt for AI model
 */
function buildContextPrompt(query, searchResults, conversationContext = '') {
  const contextParts = [];
  const sourceTypeCounts = { recipe: 0, blog: 0, feedback: 0, favourite: 0 };
  
  searchResults.forEach(doc => {
    sourceTypeCounts[doc.sourceType] = (sourceTypeCounts[doc.sourceType] || 0) + 1;
    
    if (doc.sourceType === 'recipe') {
      const ingredients = Array.isArray(doc.ingredients) ? doc.ingredients.join(', ') : '';
      contextParts.push(`
📖 CÔNG THỨC: ${doc.name || 'Không rõ tên'}
Mô tả: ${doc.description || 'Không có mô tả'}
Nguyên liệu: ${ingredients}
Cách làm: ${doc.instructions || 'Không có hướng dẫn'}
Thời gian: ${doc.cookingTime || 'Không rõ'}
Độ khó: ${doc.difficulty || 'Không rõ'}
      `.trim());
    } else if (doc.sourceType === 'blog') {
      contextParts.push(`
📝 BÀI VIẾT/MẸO: ${doc.title || 'Không có tiêu đề'}
Nội dung: ${doc.excerpt || doc.content?.substring(0, 400) || ''}
Danh mục: ${doc.category || 'Không rõ'}
Tags: ${Array.isArray(doc.tags) ? doc.tags.join(', ') : ''}
      `.trim());
    } else if (doc.sourceType === 'feedback') {
      contextParts.push(`
⭐ ĐÁNH GIÁ: ${doc.rating || 'N/A'}/5 sao
Nhận xét: ${doc.comment || 'Không có nhận xét'}
Cảm xúc: ${doc.sentiment || 'Không rõ'}
      `.trim());
    } else if (doc.sourceType === 'favourite') {
      // Favourites provide popularity signal
      if (doc.recipe_id && typeof doc.recipe_id === 'object') {
        contextParts.push(`
❤️ MÓN YÊU THÍCH: ${doc.recipe_id.name || 'Không rõ'}
      `.trim());
      }
    }
  });
  
  const context = contextParts.join('\n\n---\n\n');
  const totalSources = Object.values(sourceTypeCounts).reduce((a, b) => a + b, 0);
  
  // Build the complete prompt with conversation context
  let prompt = `
Bạn là một chuyên gia nấu ăn AI thông minh của Cookify, chuyên về ẩm thực. 
Bạn có quyền truy cập vào nhiều nguồn thông tin: công thức nấu ăn, bài viết blog (bao gồm mẹo nấu ăn), đánh giá người dùng, và món ăn yêu thích.
`;

  // Add conversation context if available
  if (conversationContext.trim()) {
    prompt += `
${conversationContext}`;
  }

  prompt += `
THÔNG TIN THAM KHẢO (từ ${totalSources} nguồn: ${Object.entries(sourceTypeCounts).filter(([k,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ')}):
${context}

[Current user question]
CÂU HỎI: ${query}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện và dễ hiểu
2. QUAN TRỌNG: Nếu có lịch sử hội thoại trước đó, hãy tham khảo ngữ cảnh để hiểu câu hỏi hiện tại
3. Kết hợp thông tin từ TẤT CẢ các nguồn (công thức, blog/mẹo, đánh giá) để đưa ra câu trả lời toàn diện
4. Nếu có đánh giá/feedback, hãy đề cập đến kinh nghiệm thực tế của người dùng
5. Nếu có bài viết blog/mẹo liên quan, hãy tham khảo tips và tricks từ đó
6. Nếu là công thức nấu ăn, hãy trình bày rõ ràng từng bước
7. Nếu câu hỏi hiện tại liên quan đến cuộc trò chuyện trước (ví dụ: "nếu không có gừng thì sao?"), hãy dựa vào ngữ cảnh để trả lời chính xác
8. Nếu không có thông tin phù hợp, hãy thành thật nói không biết và gợi ý người dùng thử từ khóa khác
9. Đưa ra lời khuyên thực tế, hữu ích và dựa trên nhiều nguồn tin
10. Ưu tiên thông tin từ vector search vì độ chính xác cao hơn

TRẢ LỜI:
`.trim();
  
  return prompt;
}

/**
 * Get recent conversation context for a user or conversation
 * @param {string|null} userId - User ID (can be null for anonymous users)
 * @param {string|null} conversationId - Conversation ID (can be null)
 * @param {number} limit - Number of recent conversation pairs to retrieve (default: 5)
 * @returns {Promise<string>} - Formatted conversation context
 */
async function getRecentConversationContext(userId, conversationId, limit = 5) {
  try {
    if (!db) {
      console.warn('Database not connected, skipping conversation context');
      return '';
    }

    const historyChatsCollection = db.collection('history_chats');
    
    // Build query - prioritize conversationId, fallback to userId
    let query = {};
    if (conversationId) {
      query.conversation_id = conversationId;
    } else if (userId) {
      query.user_id = new ObjectId(userId);
    } else {
      // No user or conversation ID, return empty context
      return '';
    }

    // Get recent chat history, sorted by creation time (newest first)
    const recentChats = await historyChatsCollection
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit * 2) // Get more to ensure we have enough pairs
      .toArray();

    if (recentChats.length === 0) {
      return '';
    }

    // Build conversation context string
    const contextParts = [];
    
    // Reverse to get chronological order (oldest first)
    const chronologicalChats = recentChats.reverse();
    
    // Take only the specified limit of conversation pairs
    const limitedChats = chronologicalChats.slice(-limit);
    
    limitedChats.forEach(chat => {
      if (chat.message && chat.response) {
        contextParts.push(`User: ${chat.message.trim()}`);
        contextParts.push(`Bot: ${chat.response.trim()}`);
      }
    });

    if (contextParts.length === 0) {
      return '';
    }

    const conversationContext = `[Previous conversation]\n${contextParts.join('\n')}\n`;
    
    return conversationContext;
    
  } catch (error) {
    console.error('Error getting conversation context:', error.message);
    return ''; // Return empty context on error, don't break the flow
  }
}

/**
 * Save chat history to database
 */
async function saveChatHistory(userId, conversationId, message, response, sources, confidenceScore, metadata) {
  try {
    const historyChatsCollection = db.collection('history_chats');
    
    const historyDoc = {
      user_id: userId ? new ObjectId(userId) : null,
      conversation_id: conversationId,
      message: message,
      response: response,
      sources: sources.map(s => ({
        type: s.sourceType,
        id: s._id?.toString(),
        name: s.name || s.title || 'N/A',
        score: s.score
      })),
      confidence_score: confidenceScore,
      metadata: metadata,
      feedback: {
        helpful: null,
        rating: null,
        comment: null
      },
      created_at: new Date()
    };
    
    await historyChatsCollection.insertOne(historyDoc);
    return historyDoc;
  } catch (error) {
    console.error('Error saving chat history:', error.message);
    return null;
  }
}

// ==================== API ENDPOINTS ====================

/**
 * POST /ask - Main chatbot endpoint
 */
app.post('/ask', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Record request metrics
    metricsCollector.recordRequest();
    logRequest(req, startTime);
    
    if (!isReady) {
      console.error('Service not ready');
      metricsCollector.recordError();
      return res.status(503).json({ error: 'Service not ready', message: 'Chatbot is still initializing' });
    }
    
    if (!db) {
      console.error('Database not connected');
      metricsCollector.recordError();
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const { message, user_id, conversation_id, include_popular = true } = req.body;
    
    if (!message || !message.trim()) {
      metricsCollector.recordError();
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Check cache first
    const cacheKey = getCacheKey(message, user_id || '');
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      const processingTime = Date.now() - startTime;
      metricsCollector.recordResponse(processingTime, cachedResponse.confidence?.score || 0, true);
      logResponse(processingTime, cachedResponse.confidence?.score || 0, true, cachedResponse.sources?.length || 0);
      
      return res.json({
        ...cachedResponse,
        cached: true,
        processing_time: processingTime
      });
    }
    
    // 1. Create query embedding
    console.log(`Query: "${message}"`);
    const queryVector = await embedText(message);
    console.log(`Embedding created (${queryVector.length}D)`);
    
    // 2. Vector search across collections
    const searchResults = await multiCollectionSearch(db, queryVector, {
      limit: parseInt(process.env.VECTOR_SEARCH_LIMIT) || 10,
      numCandidates: parseInt(process.env.VECTOR_SEARCH_NUM_CANDIDATES) || 200,
      threshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.3
    });
    
    console.log(` Found ${searchResults.length} relevant documents`);
    
    // 3. Get recent conversation context
    const conversationContext = await getRecentConversationContext(
      user_id, 
      conversation_id, // Use original conversation_id for context lookup
      5 // Get last 5 conversation pairs
    );
    
    // 4. Build prompt with conversation context and generate response
    const prompt = buildContextPrompt(message, searchResults, conversationContext);
    const responseText = await generateResponse(prompt);
    
    // 5. Calculate confidence score (robust)
    // - Weighted average by source type (recipes > blogs > feedbacks)
    // - Top-K averaging
    // - Coverage bonus when multiple source types present
    // - Variance-based consensus penalty
    const processingTime = Date.now() - startTime;

    const weights = { recipe: 1.5, blog: 1.2, feedback: 1.0 };
    const topK = Math.max(1, parseInt(process.env.CONFIDENCE_TOP_K) || 5);
    const selected = searchResults.slice(0, topK);

    let confidenceScore = 0;
    if (selected.length > 0) {
      const sumWeights = selected.reduce((s, r) => s + (weights[r.sourceType] || 1), 0);
      const weightedSum = selected.reduce((s, r) => s + (r.score * (weights[r.sourceType] || 1)), 0);
      const weightedAvg = sumWeights > 0 ? (weightedSum / sumWeights) : 0;

      const meanRaw = selected.reduce((s, r) => s + r.score, 0) / selected.length;
      const variance = selected.reduce((s, r) => s + Math.pow(r.score - meanRaw, 2), 0) / selected.length;
      const consensusPenalty = variance > 0.02 ? -0.05 : 0; // penalize if scores disagree

      const sourceTypes = new Set(selected.map(r => r.sourceType));
      const coverageBonus = sourceTypes.size >= 2 ? 0.05 : 0; // small bonus for multi-source grounding

      confidenceScore = Math.max(0, Math.min(1, weightedAvg + coverageBonus + consensusPenalty));
    }
    
    // 6. Save to chat history
    const convId = conversation_id || `chat_${Date.now()}`;
    await saveChatHistory(
      user_id,
      convId,
      message,
      responseText,
      searchResults,
      confidenceScore,
      {
        model_generation: process.env.MODEL_GENERATION,
        model_embedding: process.env.MODEL_EMBEDDING,
        processing_time_ms: processingTime,
        tokens_used: null // Gemini doesn't always expose token count
      }
    );
    
    // 7. Prepare response
    const responseData = {
      response: responseText,
      confidence: {
        score: confidenceScore,
        level: confidenceScore > 0.75 ? 'high' : confidenceScore > 0.55 ? 'medium' : 'low',
        percentage: Math.round(confidenceScore * 100)
      },
      sources: searchResults.slice(0, 5).map(s => ({
        type: s.sourceType,
        id: s._id?.toString(),
        name: s.name || s.title || 'N/A',
        score: s.score,
        ...(s.sourceType === 'recipe' && { 
          category: s.category,
          difficulty: s.difficulty,
          cookingTime: s.cookingTime
        })
      })),
      conversation_id: convId,
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime
    };
    
    // Cache the response (only if confidence is reasonable)
    const cacheThreshold = parseFloat(process.env.CONFIDENCE_CACHE_THRESHOLD) || 0.35;
    if (confidenceScore > cacheThreshold) {
      responseCache.set(cacheKey, responseData);
      console.log('Cached response');
    }
    
    // Record metrics for successful response
    metricsCollector.recordResponse(processingTime, confidenceScore, false);
    logResponse(processingTime, confidenceScore, false, searchResults.length);
    
    res.json(responseData);
    
  } catch (error) {
    metricsCollector.recordError();
    logError(error, 'in /ask endpoint');
    
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', async (req, res) => {
  try {
    const mongoHealthy = db ? await db.admin().ping().then(() => true).catch(() => false) : false;
    
    res.json({
      status: isReady ? 'healthy' : 'initializing',
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: mongoHealthy,
        database: db?.databaseName || 'N/A'
      },
      models: {
        embedding: process.env.MODEL_EMBEDDING,
        generation: process.env.MODEL_GENERATION
      },
      cache: {
        responses: responseCache.getStats(),
        embeddings: require('./utils/cache').embeddingCache.getStats(),
        searches: searchCache.getStats()
      },
      metrics: metricsCollector.getMetrics()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

/**
 * GET /stats - Database statistics
 */
app.get('/stats', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const [recipesCount, blogsCount, feedbacksCount, favouritesCount, historyChatsCount] = await Promise.all([
      db.collection('recipes').countDocuments(),
      db.collection('blogs').countDocuments(),
      db.collection('feedbacks').countDocuments(),
      db.collection('favourites').countDocuments(),
      db.collection('history_chats').countDocuments()
    ]);
    
    // Count documents with embeddings (if embedding field exists)
    const [recipesWithEmbedding, blogsWithEmbedding, feedbacksWithEmbedding, favouritesWithEmbedding] = await Promise.all([
      db.collection('recipes').countDocuments({ embedding: { $exists: true } }),
      db.collection('blogs').countDocuments({ embedding: { $exists: true } }),
      db.collection('feedbacks').countDocuments({ embedding: { $exists: true } }),
      db.collection('favourites').countDocuments({ embedding: { $exists: true } })
    ]);
    
    // Get popular recipes
    const popularRecipes = await getPopularRecipes(
      db.collection('favourites'),
      db.collection('recipes'),
      5
    );
    
    res.json({
      collections: {
        recipes: {
          total: recipesCount,
          with_embedding: recipesWithEmbedding,
          percentage: recipesCount > 0 ? Math.round((recipesWithEmbedding / recipesCount) * 100) : 0
        },
        blogs: {
          total: blogsCount,
          with_embedding: blogsWithEmbedding,
          percentage: blogsCount > 0 ? Math.round((blogsWithEmbedding / blogsCount) * 100) : 0
        },
        feedbacks: {
          total: feedbacksCount,
          with_embedding: feedbacksWithEmbedding,
          percentage: feedbacksCount > 0 ? Math.round((feedbacksWithEmbedding / feedbacksCount) * 100) : 0
        },
        favourites: {
          total: favouritesCount,
          with_embedding: favouritesWithEmbedding,
          percentage: favouritesCount > 0 ? Math.round((favouritesWithEmbedding / favouritesCount) * 100) : 0
        },
        history_chats: {
          total: historyChatsCount
        }
      },
      popular_recipes: popularRecipes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in /stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /metrics - Detailed metrics endpoint
 */
app.get('/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const cacheStats = {
      responses: responseCache.getStats(),
      embeddings: require('./utils/cache').embeddingCache.getStats(),
      searches: searchCache.getStats()
    };

    res.json({
      ...metrics,
      cache: cacheStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /metrics/reset - Reset metrics (admin only)
 */
app.post('/metrics/reset', (req, res) => {
  try {
    metricsCollector.reset();
    responseCache.clear();
    require('./utils/cache').embeddingCache.clear();
    searchCache.clear();
    
    res.json({ 
      message: 'Metrics and caches reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /convert-faq - Convert FAQ dataset to blog posts
 */
app.post('/convert-faq', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    console.log('Starting FAQ to blogs conversion...');
    
    // Load FAQ data
    const fs = require('fs');
    const path = require('path');
    const faqPath = path.join(__dirname, '../faq_dataset.json');
    
    if (!fs.existsSync(faqPath)) {
      return res.status(404).json({ error: 'FAQ dataset file not found' });
    }
    
    const faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
    const blogsCollection = db.collection('blogs');
    
    // Category mapping
    const categoryMapping = {
      'cooking': 'Mẹo Nấu Ăn',
      'storage': 'Bảo Quản Thực Phẩm', 
      'substitution': 'Thay Thế Nguyên Liệu',
      'nutrition': 'Dinh Dưỡng & Sức Khỏe',
      'general': 'Mẹo Bếp Núc',
      'safety': 'An Toàn Thực Phẩm',
      'equipment': 'Dụng Cụ Bếp',
      'technique': 'Kỹ Thuật Nấu Ăn'
    };
    
    // Helper functions
    const generateSlug = (question) => {
      return question
        .toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
    };
    
    const generateBlogContent = (faq) => {
      const categoryVN = categoryMapping[faq.category] || 'Mẹo Chung';
      const tags = faq.tags ? faq.tags.map(tag => `#${tag}`).join(' ') : '';
      
      return `# ${faq.question}

${faq.answer}

## Thông tin thêm

**Danh mục:** ${categoryVN}
**Tags:** ${tags}

---

*Bài viết này được tạo từ câu hỏi thường gặp của cộng đồng Cookify. Nếu bạn có thêm câu hỏi, hãy chat với AI assistant của chúng tôi!*

## Các mẹo liên quan

Hãy khám phá thêm các mẹo nấu ăn khác trong danh mục **${categoryVN}** để nâng cao kỹ năng bếp núc của bạn.

**Cookify** - Nơi chia sẻ đam mê ẩm thực! 👨‍🍳👩‍🍳`;
    };
    
    // Convert FAQ items to blog format
    const blogPosts = faqData.map((faq, index) => {
      const categoryVN = categoryMapping[faq.category] || 'Mẹo Chung';
      const slug = generateSlug(faq.question);
      
      return {
        title: faq.question,
        slug: slug,
        excerpt: faq.answer.substring(0, 150) + (faq.answer.length > 150 ? '...' : ''),
        content: generateBlogContent(faq),
        category: categoryVN,
        tags: faq.tags || [],
        author: {
          name: 'Cookify Admin',
          email: 'admin@cookify.com'
        },
        status: 'published',
        featured: false,
        views: Math.floor(Math.random() * 100) + 10,
        likes: Math.floor(Math.random() * 20) + 1,
        meta: {
          description: faq.answer,
          keywords: faq.tags ? faq.tags.join(', ') : '',
          source: 'faq_conversion',
          faq_id: index + 1
        },
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      };
    });
    
    // Remove existing FAQ blogs
    const existingCount = await blogsCollection.countDocuments({ 
      'meta.source': 'faq_conversion' 
    });
    
    if (existingCount > 0) {
      await blogsCollection.deleteMany({ 'meta.source': 'faq_conversion' });
    }
    
    // Insert new blog posts
    await blogsCollection.insertMany(blogPosts);
    
    // Count by category
    const categoryCounts = {};
    blogPosts.forEach(post => {
      categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
    });
    
    console.log(`Converted ${blogPosts.length} FAQ items to blog posts`);
    
    res.json({
      success: true,
      message: 'FAQ dataset converted to blog posts successfully',
      stats: {
        totalConverted: blogPosts.length,
        existingRemoved: existingCount,
        categoryCounts
      },
      nextSteps: [
        'Run /sync endpoint to generate embeddings',
        'Test vector search with new blog content',
        'Consider removing FAQ search from chatbot logic'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error converting FAQ to blogs:', error);
    res.status(500).json({ 
      error: 'Failed to convert FAQ to blogs',
      message: error.message 
    });
  }
});

/**
 * GET /history/:user_id - Get chat history for a user
 */
app.get('/history/:user_id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const { user_id } = req.params;
    const { limit = 50, conversation_id } = req.query;
    
    const query = { user_id: new ObjectId(user_id) };
    if (conversation_id) {
      query.conversation_id = conversation_id;
    }
    
    const history = await db.collection('history_chats')
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .toArray();
    
    res.json({
      user_id,
      total: history.length,
      history: history
    });
    
  } catch (error) {
    console.error('Error in /history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /feedback/:history_id - Submit feedback for a chat response
 */
app.post('/feedback/:history_id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const { history_id } = req.params;
    const { helpful, rating, comment } = req.body;
    
    const result = await db.collection('history_chats').updateOne(
      { _id: new ObjectId(history_id) },
      {
        $set: {
          'feedback.helpful': helpful,
          'feedback.rating': rating,
          'feedback.comment': comment
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'History not found' });
    }
    
    res.json({ success: true, message: 'Feedback saved' });
    
  } catch (error) {
    console.error('Error in /feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /test-conversation-context - Test conversation context functionality
 */
app.post('/test-conversation-context', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { user_id, conversation_id } = req.body;
    
    // Use test IDs if not provided
    const testUserId = user_id || '507f1f77bcf86cd799439011';
    const testConversationId = conversation_id || `test_conv_${Date.now()}`;
    
    console.log(`Testing conversation context for user: ${testUserId}, conversation: ${testConversationId}`);
    
    const testResult = await testConversationContext(db, testUserId, testConversationId);
    
    res.json({
      success: testResult.success,
      message: testResult.success ? 'Conversation context test completed successfully' : 'Test failed',
      result: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in /test-conversation-context:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      message: error.message 
    });
  }
});

/**
 * GET /conversation-context/:user_id - Get conversation context for debugging
 */
app.get('/conversation-context/:user_id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { user_id } = req.params;
    const { conversation_id, limit = 5 } = req.query;
    
    const context = await getRecentConversationContext(user_id, conversation_id, parseInt(limit));
    const validation = validateConversationContext(context);
    const formattedContext = formatContextForDebug(context);
    
    res.json({
      user_id,
      conversation_id: conversation_id || null,
      context: {
        raw: context,
        formatted: formattedContext,
        validation: validation
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in /conversation-context:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /sync - Sync embeddings for documents without embeddings (incremental)
 * This endpoint creates embeddings for new documents that don't have them yet
 * SAFE: Only reads and updates embedding field, does NOT delete any data
 */
app.post('/sync', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const { collections: targetCollections } = req.body;
    const collectionsToSync = targetCollections || ['recipes', 'blogs', 'feedbacks'];
    
    console.log(`Starting incremental sync for: ${collectionsToSync.join(', ')}`);
    
    const results = {};
    const startTime = Date.now();
    
    for (const collName of collectionsToSync) {
      const sourceType = collName === 'recipes' ? 'recipe' : collName === 'blogs' ? 'blog' : collName === 'feedbacks' ? 'feedback' : 'favourite';
      
      try {
        const collection = db.collection(collName);
        
        // Find documents WITHOUT embeddings
        const docsWithoutEmbedding = await collection.find({ embedding: { $exists: false } }).limit(100).toArray();
        
        if (docsWithoutEmbedding.length === 0) {
          results[collName] = { synced: 0, message: 'All documents already have embeddings' };
          continue;
        }
        
        console.log(`Processing ${docsWithoutEmbedding.length} documents from ${collName}...`);
        
        // Build searchable texts
        const searchableTexts = docsWithoutEmbedding.map(doc => buildSearchableText(doc, sourceType));
        
        // Create embeddings (batch)
        const embeddings = await embedBatch(searchableTexts, docsWithoutEmbedding.length);
        
        // Update documents with embeddings
        const bulkOps = docsWithoutEmbedding.map((doc, idx) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { 
              $set: { 
                embedding: embeddings[idx],
                embedding_updated_at: new Date()
              } 
            }
          }
        }));
        
        const bulkResult = await collection.bulkWrite(bulkOps);
        
        results[collName] = {
          synced: bulkResult.modifiedCount,
          total_without_embedding: docsWithoutEmbedding.length
        };
        
        console.log(`Synced ${bulkResult.modifiedCount} documents in ${collName}`);
        
      } catch (error) {
        console.error(`Error syncing ${collName}:`, error.message);
        results[collName] = { error: error.message };
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Sync completed',
      results: results,
      processing_time_ms: totalTime,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Sync completed in ${totalTime}ms`);
    
  } catch (error) {
    console.error('Error in /sync:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Cookify Chatbot API',
    version: '1.0.0',
    status: isReady ? 'ready' : 'initializing',
    endpoints: {
      'POST /ask': 'Send a question to the chatbot (now with conversation context)',
      'GET /health': 'Health check',
      'GET /stats': 'Database statistics',
      'GET /history/:user_id': 'Get chat history for a user',
      'POST /feedback/:history_id': 'Submit feedback for a chat',
      'POST /test-conversation-context': 'Test conversation context functionality',
      'GET /conversation-context/:user_id': 'Get conversation context for debugging'
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
  if (mongoClient) {
    await mongoClient.close();
    console.log(' MongoDB connection closed');
  }
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nCookify Chatbot Service running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API docs: http://localhost:${PORT}/`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Stats: http://localhost:${PORT}/stats\n`);
  
  // Initialize after server starts
  initialize().catch(err => {
    console.error('Failed to initialize:', err);
  });
});
