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
const { loadFAQData, searchFAQ, buildFAQContext } = require('./utils/faqSearch');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
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
    console.log('🔌 Connecting to MongoDB...');
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db(process.env.DB_NAME || 'Cookify');
    
    // Test connection
    await db.admin().ping();
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${db.databaseName}`);
    
    // List available collections
    const collections = await db.listCollections().toArray();
    console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

/**
 * Initialize all services
 */
async function initialize() {
  try {
    console.log('🚀 Initializing Cookify Chatbot Service...');
    
    // Initialize Gemini API
    initializeGemini(
      process.env.GOOGLE_API_KEY,
      process.env.MODEL_EMBEDDING,
      process.env.MODEL_GENERATION
    );
    
    // Initialize MongoDB
    const mongoConnected = await initializeMongoDB();
    if (!mongoConnected) {
      throw new Error('Failed to connect to MongoDB');
    }
    
    // Load FAQ data (optional - fallback if file exists)
    const faqPath = process.env.FAQ_DATA_PATH || './faq_dataset.json';
    loadFAQData(faqPath);
    
    isReady = true;
    console.log('🎉 Chatbot service initialized successfully!');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

/**
 * Build context prompt from search results + FAQ
 */
function buildContextPrompt(query, searchResults, includeFAQ = true) {
  const contextParts = [];
  const sourceTypeCounts = { recipe: 0, blog: 0, feedback: 0, favourite: 0, faq: 0 };
  
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
📝 BÀI VIẾT: ${doc.title || 'Không có tiêu đề'}
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
  
  // Add FAQ context if enabled and available
  let faqContext = '';
  if (includeFAQ) {
    faqContext = buildFAQContext(query, 3);
    if (faqContext) {
      sourceTypeCounts.faq = 3; // Approximate
      contextParts.push(`\n📚 CÂU HỎI THƯỜNG GẶP:\n${faqContext}`);
    }
  }
  
  const context = contextParts.join('\n\n---\n\n');
  const totalSources = Object.values(sourceTypeCounts).reduce((a, b) => a + b, 0);
  
  const prompt = `
Bạn là một chuyên gia nấu ăn AI thông minh của Cookify, chuyên về ẩm thực. 
Bạn có quyền truy cập vào nhiều nguồn thông tin: công thức nấu ăn, bài viết blog, đánh giá người dùng, món ăn yêu thích, và câu hỏi thường gặp (FAQ).

THÔNG TIN THAM KHẢO (từ ${totalSources} nguồn: ${Object.entries(sourceTypeCounts).filter(([k,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ')}):
${context}

CÂU HỎI: ${query}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện và dễ hiểu
2. Kết hợp thông tin từ TẤT CẢ các nguồn (công thức, blog, đánh giá) để đưa ra câu trả lời toàn diện
3. Nếu có đánh giá/feedback, hãy đề cập đến kinh nghiệm thực tế của người dùng
4. Nếu có bài viết blog liên quan, hãy tham khảo tips và tricks từ đó
5. Nếu là công thức nấu ăn, hãy trình bày rõ ràng từng bước
6. Nếu không có thông tin phù hợp, hãy thành thật nói không biết
7. Đưa ra lời khuyên thực tế, hữu ích và dựa trên nhiều nguồn tin

TRẢ LỜI:
  `.trim();
  
  return prompt;
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
  try {
    if (!isReady) {
      return res.status(503).json({ error: 'Service not ready' });
    }
    
    const { message, user_id, conversation_id, include_popular = true } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const startTime = Date.now();
    
    // 1. Create query embedding
    console.log(`📥 Query: "${message}"`);
    const queryVector = await embedText(message);
    console.log(`   Embedding created (${queryVector.length}D)`);
    
    // 2. Vector search across collections
    const searchResults = await multiCollectionSearch(db, queryVector, {
      limit: parseInt(process.env.VECTOR_SEARCH_LIMIT) || 10,
      numCandidates: parseInt(process.env.VECTOR_SEARCH_NUM_CANDIDATES) || 200,
      threshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.3
    });
    
    console.log(`   Found ${searchResults.length} relevant documents`);
    
    // 3. Build prompt and generate response
    const prompt = buildContextPrompt(message, searchResults);
    const responseText = await generateResponse(prompt);
    
    // 4. Calculate confidence score (simple average of top results)
    const avgScore = searchResults.length > 0
      ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
      : 0;
    
    const processingTime = Date.now() - startTime;
    
    // 5. Save to chat history
    const convId = conversation_id || `chat_${Date.now()}`;
    await saveChatHistory(
      user_id,
      convId,
      message,
      responseText,
      searchResults,
      avgScore,
      {
        model_generation: process.env.MODEL_GENERATION,
        model_embedding: process.env.MODEL_EMBEDDING,
        processing_time_ms: processingTime,
        tokens_used: null // Gemini doesn't always expose token count
      }
    );
    
    // 6. Return response
    res.json({
      response: responseText,
      confidence: {
        score: avgScore,
        level: avgScore > 0.7 ? 'high' : avgScore > 0.5 ? 'medium' : 'low',
        percentage: Math.round(avgScore * 100)
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
    });
    
    console.log(`✅ Response sent (${processingTime}ms, confidence: ${Math.round(avgScore * 100)}%)`);
    
  } catch (error) {
    console.error('Error in /ask:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
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
      }
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
    
    console.log(`🔄 Starting incremental sync for: ${collectionsToSync.join(', ')}`);
    
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
        
        console.log(`   Processing ${docsWithoutEmbedding.length} documents from ${collName}...`);
        
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
        
        console.log(`   ✅ Synced ${bulkResult.modifiedCount} documents in ${collName}`);
        
      } catch (error) {
        console.error(`   ❌ Error syncing ${collName}:`, error.message);
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
    
    console.log(`🎉 Sync completed in ${totalTime}ms`);
    
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
      'POST /ask': 'Send a question to the chatbot',
      'GET /health': 'Health check',
      'GET /stats': 'Database statistics',
      'GET /history/:user_id': 'Get chat history for a user',
      'POST /feedback/:history_id': 'Submit feedback for a chat'
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (mongoClient) {
    await mongoClient.close();
    console.log('✅ MongoDB connection closed');
  }
  process.exit(0);
});

// Start server
initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Cookify Chatbot Service running on http://localhost:${PORT}`);
    console.log(`   API docs: http://localhost:${PORT}/`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Stats: http://localhost:${PORT}/stats\n`);
  });
});
