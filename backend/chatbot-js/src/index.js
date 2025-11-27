/**
 * Cookify Chatbot Service - Node.js with MongoDB Atlas Vector Search
 */
require('dotenv').config();

/**
 * Clean response text to remove markdown formatting and make it more readable
 * @param {string} text - Raw response text from AI
 * @returns {string} - Cleaned text
 */
function cleanResponseText(text) {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // Remove code blocks (```text```) first
    .replace(/```[\s\S]*?```/g, (match) => {
      // Remove ``` and language indicator if present
      return match.replace(/```(\w+)?\n?/, '').replace(/```$/, '').trim();
    })
    // Remove bold markdown (**text**)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic markdown (*text*)
    .replace(/\*(.*?)\*/g, '$1')
    // Remove headers (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove inline code (`text`)
    .replace(/`(.*?)`/g, '$1')
    // Remove extra asterisks that might remain
    .replace(/\*/g, '')
    // Chuẩn hóa khoảng trắng TRONG TỪNG DÒNG nhưng giữ nguyên xuống dòng
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n');
}
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { initializeGemini, embedText, embedBatch, generateResponse } = require('./utils/embedding');
const { multiCollectionSearch, hybridSearch, getPopularRecipes } = require('./utils/vectorSearch');
const { buildSearchableText } = require('./utils/buildSearchText');
const { responseCache, searchCache, getCacheKey } = require('./utils/cache');
const { metricsCollector, logRequest, logResponse, logError } = require('./utils/metrics');
const AutoSyncManager = require('./utils/autoSync');
const { testConversationContext, validateConversationContext, formatContextForDebug } = require('./utils/conversationContext');

// Load FAQ dataset with error handling
let faqDataset = [];
try {
  faqDataset = require('../faq_dataset.json');
  console.log(`Loaded ${faqDataset.length} FAQ items`);
} catch (error) {
  console.error('Failed to load FAQ dataset:', error.message);
  faqDataset = [];
}

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
      return callback(null, true);
    }
    
    // Allow all localhost origins for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
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
let autoSyncManager = null;

/**
 * Search FAQ dataset for relevant questions
 */
function searchFAQ(query, limit = 3) {
  try {
    // Return empty if FAQ dataset not loaded
    if (!faqDataset || faqDataset.length === 0) {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(' ').filter(w => w.length > 2);
    
    // Score each FAQ based on keyword matches
    const scoredFAQs = faqDataset.map(faq => {
      let score = 0;
      const lowerQuestion = (faq.question || '').toLowerCase();
      const lowerAnswer = (faq.answer || '').toLowerCase();
      const lowerTags = Array.isArray(faq.tags) ? faq.tags.join(' ').toLowerCase() : '';
      
      // Check exact question match
      if (lowerQuestion.includes(lowerQuery)) {
        score += 10;
      }
      
      // Check word matches in question
      words.forEach(word => {
        if (lowerQuestion.includes(word)) score += 3;
        if (lowerAnswer.includes(word)) score += 1;
        if (lowerTags.includes(word)) score += 2;
      });
      
      return { ...faq, score };
    });
    
    // Return top matches with score > 0
    return scoredFAQs
      .filter(faq => faq.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in searchFAQ:', error);
    return []; // Return empty array on error
  }
}

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
    
    // Initialize auto-sync manager
    autoSyncManager = new AutoSyncManager(db, {
      interval: 5 * 60 * 1000, // 5 minutes
      batchSize: 20, // Process 20 docs at a time
      collections: ['recipes', 'blogs', 'feedbacks']
    });
    
    // Start auto-sync after a short delay
    setTimeout(() => {
      if (autoSyncManager) {
        autoSyncManager.start();
      }
    }, 10000); // Wait 10 seconds after startup
    
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
      const ingredients = Array.isArray(doc.ingredients) ? doc.ingredients.join('\n  • ') : '';
      const instructions = doc.instructions || 'Không có hướng dẫn';
      contextParts.push(`
📖 CÔNG THỨC: ${doc.name || 'Không rõ tên'}
   Mô tả: ${doc.description || 'Không có mô tả'}
   Danh mục: ${doc.category || 'Không rõ'}
   
   Nguyên liệu:
   • ${ingredients}
   
   Cách làm:
   ${instructions}
   
   Thời gian nấu: ${doc.cookingTime || 'Không rõ'}
   Độ khó: ${doc.difficulty || 'Không rõ'}
   Điểm tương đồng: ${(doc.score * 100).toFixed(0)}%
      `.trim());
    } else if (doc.sourceType === 'blog') {
      const content = doc.excerpt || doc.content?.substring(0, 500) || '';
      contextParts.push(`
📝 BÀI VIẾT/MẸO: ${doc.title || 'Không có tiêu đề'}
   Danh mục: ${doc.category || 'Không rõ'}
   Tags: ${Array.isArray(doc.tags) ? doc.tags.join(', ') : 'Không có'}
   
   Nội dung:
   ${content}
   
   Điểm tương đồng: ${(doc.score * 100).toFixed(0)}%
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
let prompt = `Bạn là Chef AI Assistant của Cookify – chuyên gia ẩm thực AI có trách nhiệm và chính xác.

NHIỆM VỤ:
• Trả lời mọi câu hỏi liên quan đến nấu ăn, nguyên liệu, kỹ thuật chế biến.
• Sử dụng thông tin từ database (RAG) và không được bịa đặt.
• Trình bày câu trả lời rõ ràng, thân thiện, có emoji phù hợp.
• Hỗ trợ theo ngân sách và thời gian khi người dùng đề cập.

GIỚI HẠN:
• Nếu câu hỏi không liên quan đến ẩm thực → từ chối lịch sự:
  "Xin lỗi, mình chỉ hỗ trợ về nấu ăn và ẩm thực thôi ạ. Bạn muốn hỏi món nào không?"

HỖ TRỢ THEO NGÂN SÁCH:
• Nhận diện số tiền: "50k", "100.000 VND", "70 nghìn"...
• Phân loại:
  - 20k–50k: món đơn giản (trứng, cơm chiên, mì)
  - 50k–100k: món trung bình (cá kho, canh chua)
  - 100k–200k: món phong phú (gà nướng, bò xào)
  - >200k: món cao cấp (hải sản, beefsteak)
• Cách trả lời:
  - Gợi ý 2–3 món phù hợp
  - Ước tính giá từng nguyên liệu
  - Giải thích vì sao phù hợp ngân sách
  - Gợi ý nơi mua tiết kiệm

HỖ TRỢ THEO THỜI GIAN:
• Nhận diện thời gian: “10 phút”, “30p”, “gấp”, “nhanh”.
• Phân loại:
  - <15 phút: món siêu nhanh
  - 15–30 phút: món nhanh
  - 30–60 phút: món trung bình
  - >60 phút: món lâu
• Cách trả lời:
  - Gợi ý món phù hợp thời gian
  - Nêu thời gian từng bước
  - Gợi ý mẹo rút ngắn thời gian

SỬ DỤNG LỊCH SỬ HỘI THOẠI:
• Hiểu mạch trò chuyện.
• Đại từ như “nó”, “món đó”, “cái này” → liên hệ câu trước.
• Câu như “còn cách khác?”, “nếu không có X thì sao?” → dựa trên câu trả lời trước.

SỬ DỤNG NGUỒN THAM KHẢO (RAG):
• Bắt buộc dùng thông tin từ nguồn database phía dưới.
• Không bịa công thức, nguyên liệu, thời gian hay mẹo không có trong nguồn.
• Nếu không tìm thấy:
  "Mình không tìm thấy thông tin chính xác. Bạn có thể thử tìm món gần giống như..."

QUY ĐỊNH TRÌNH BÀY:
• Không dùng markdown (*, **, #).
• Plain text + emoji.
• Nguyên liệu: mỗi dòng 1 mục, format:
  • Tên nguyên liệu số lượng (nếu có giá → để cùng dòng)
• Các bước nấu được đánh số 1, 2, 3.
• Văn phong thân thiện, ấm áp như bạn bè.
• Công thức phải gồm: nguyên liệu, định lượng, cách nấu, thời gian, độ khó, mẹo.

━━━━━━━━━━━━━━━━━━━━━━━
THÔNG TIN THAM KHẢO:
${context}

LỊCH SỬ HỘI THOẠI:
${conversationContext}

CÂU HỎI HIỆN TẠI:
${query}
━━━━━━━━━━━━━━━━━━━━━━━

Hãy trả lời ngay.`.trim();
  
  return prompt;
}

/**
 * Get recent conversation context for a user or conversation
 * @param {string|null} userId - User ID (can be null for anonymous users)
 * @param {string|null} conversationId - Conversation ID (can be null)
 * @param {number} limit - Number of recent conversation pairs to retrieve (default: 7)
 * @returns {Promise<string>} - Formatted conversation context
 */
async function getRecentConversationContext(userId, conversationId, limit = 7) {
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

async function resolveConversationId(userId, conversationId) {
  try {
    if (conversationId && typeof conversationId === 'string' && conversationId.trim().length > 0) {
      return conversationId.trim();
    }

    if (!userId) {
      return `chat_${Date.now()}`;
    }

    if (!db) {
      return `chat_${Date.now()}`;
    }

    const historyChatsCollection = db.collection('history_chats');

    const lastChat = await historyChatsCollection
      .find({ user_id: new ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();

    if (lastChat.length > 0 && lastChat[0].conversation_id) {
      return lastChat[0].conversation_id;
    }

    return `chat_${Date.now()}`;
  } catch (error) {
    console.error('Error resolving conversation ID:', error.message);
    return `chat_${Date.now()}`;
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

    const resolvedConversationId = await resolveConversationId(user_id, conversation_id);
    
    // Check cache first (scoped by user + conversation)
    const cacheKey = getCacheKey(
      message,
      `${user_id || ''}_${resolvedConversationId || ''}`
    );
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
    
    // 1. Create query embedding and fetch conversation context in parallel
    const [queryVector, conversationContext] = await Promise.all([
      embedText(message),
      getRecentConversationContext(
        user_id, 
        resolvedConversationId,
        7 // Get last 7 conversation pairs for better context understanding
      )
    ]);
    
    // 2. Check if query is relevant to cooking (stricter intent detection)
    const cookingKeywords = [
      'món', 'nấu', 'ăn', 'làm', 'công thức', 'nguyên liệu', 'cách làm', 'mẹo', 
      'thực phẩm', 'đồ ăn', 'bếp', 'nướng', 'chiên', 'xào', 'luộc', 'hấp', 'kho',
      'canh', 'súp', 'lẩu', 'gỏi', 'salad', 'bánh', 'cơm', 'phở', 'bún', 'mì',
      'thịt', 'cá', 'tôm', 'rau', 'củ', 'quả', 'gia vị', 'nước chấm', 'nước mắm', 'thực đơn',
      // Phân loại món: món chính, món phụ, ăn vặt
      'món chính', 'món phụ', 'ăn vặt', 'đồ ăn vặt', 'snack', 'khai vị', 'món nhậu', 'đồ chay', 'món chay', 'đồ mặn',
      // Đồ chiên/rán/đồ nhanh (thường thuộc ăn vặt)
      'khoai tây chiên', 'gà rán', 'xúc xích', 'phô mai que', 'bánh mì', 'bánh tráng trộn',
      // Tráng miệng / Dessert
      'tráng miệng', 'kem', 'kem que', 'kem ly', 'kem tươi', 'kem dừa', 'matcha', 'sorbet', 'pudding', 'thạch', 'rau câu', 'caramen', 'bánh flan', 'yaourt', 'sữa chua', 'mochi', 'chè',
      // Đồ uống
      'nước', 'uống', 'đồ uống', 'thức uống', 'trà', 'trà sữa', 'cà phê', 'cafe', 'capuchino', 'latte', 'matcha latte', 'sinh tố', 'smoothie', 'nước ép', 'ép', 'cocktail', 'mocktail',
      'sữa', 'soda', 'mía', 'chanh', 'cam', 'dừa', 'đá', 'pha chế', 'đá xay',
      // Common food names
      'vịt', 'gà', 'bò', 'heo', 'tôm', 'mực', 'nghêu', 'sò', 'ốc',
      // Budget & Time related (NEW)
      'tiền', 'đồng', 'vnd', 'nghìn', 'triệu', 'ngân sách', 'giá', 'rẻ', 'tiết kiệm',
      'phút', 'giờ', 'nhanh', 'gấp', 'thời gian', 'lâu', 'mau', 'tốc độ',
      'recipe', 'cook', 'food', 'dish', 'ingredient', 'kitchen', 'meal', 'drink', 'beverage'
    ];
    
    const lowerQuery = message.toLowerCase();
    const hasCookingKeyword = cookingKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Check for budget/money patterns (numbers + currency)
    const hasBudgetPattern = /\d+[\.,]?\d*\s*(k|nghìn|triệu|đồng|vnd|vnđ)/i.test(message) ||
                            /\d+[\.,]?\d*\s*000/i.test(message); // e.g., "50.000", "50000"
    
    // Check for time patterns (numbers + time units)
    const hasTimePattern = /\d+\s*(phút|giờ|tiếng)/i.test(message) ||
                          /(nhanh|gấp|mau|tốc độ)/i.test(lowerQuery);
    
    // Budget or time queries are cooking-related
    const isBudgetOrTimeQuery = hasBudgetPattern || hasTimePattern;
    
    // Check for follow-up question patterns (questions that depend on context)
    const followUpPatterns = [
      'không có', 'thay thế', 'thay bằng', 'thay đổi', 'thay', 'thế',
      'nếu không', 'nếu thiếu', 'không được', 'được không', 'có thể không',
      'còn', 'khác', 'nữa', 'tiếp', 'thêm', 'ngoài ra'
    ];
    const isFollowUpQuestion = followUpPatterns.some(pattern => lowerQuery.includes(pattern));
    const hasConversationContext = conversationContext && conversationContext.trim().length > 0;

    // Small-talk patterns (thanks/ack/bye) -> polite short response, no retrieval
// Small-talk patterns (Updated: Dùng Regex để tránh bắt nhầm từ con)
    const smallTalkPatterns = [
      'ok', 'okay', 'oke', 'được rồi', 'ổn rồi',
      'xin chào', 'chào', 'chào bạn', 'hello', 'hi', 'helo', 'hê lô',
      'bye', 'tạm biệt'
    ];
    
    // SỬA LỖI: Dùng Regex \b để bắt nguyên từ (VD: "hi" không khớp với "chiên")
    const isSmallTalk = smallTalkPatterns.some(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      return regex.test(lowerQuery);
    });

    const thanksPatterns = [
      'cảm ơn', 'cám ơn', 'cảm ơn nhé', 'cảm ơn nhiều',
      'thanks', 'thank you'
    ];
    const isThanksMessage = thanksPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(lowerQuery);
    });   
    // Off-topic patterns (geography/general knowledge/others)
    const offTopicPatterns = [
      'thủ đô', 'capital', 'quốc gia', 'tỉnh', 'thành phố', 'địa lý', 'lịch sử',
      'năm sinh', 'ai là', 'là ai', 'là gì', 'who is', 'what is', 'tiểu sử', 'tiểu sử của',
      'bóng đá', 'trận đấu', 'điểm số', 'phim', 'nhạc', 'bài hát', 'diễn viên', 'ca sĩ',
      'chứng khoán', 'cổ phiếu', 'tiền ảo', 'crypto', 'bitcoin', 'ethereum',
      'công nghệ', 'lập trình', 'python', 'javascript', 'toán học', 'vật lý', 'hóa học'
    ];
    const hasOffTopicPattern = offTopicPatterns.some(pattern => lowerQuery.includes(pattern));
    
    // Intent subclassification to pick primary source type
    const recipeIntentPatterns = [
      'cách làm', 'cách nấu', 'công thức', 'nguyên liệu', 'bước làm', 'recipe', 'nấu', 'làm',
      'xào', 'nướng', 'kho', 'luộc', 'hấp', 'rim', 'rang', 'trộn', 'gỏi',
      // Suggestion-style queries
      'món nào', 'gợi ý món', 'món gì', 'ăn gì', 'có món', 'món phù hợp'
    ];
    const tipIntentPatterns = [
      'mẹo', 'mẹo vặt', 'bảo quản', 'thay thế', 'có thể thay', 'làm sao để', 'tip', 'trick'
    ];
    const feedbackIntentPatterns = [
      'đánh giá', 'bao nhiêu sao', 'mấy sao', 'review', 'ngon không', 'có tốt không', 'so sánh'
    ];
    const isRecipeIntent = recipeIntentPatterns.some(p => lowerQuery.includes(p));
    const isTipIntent = tipIntentPatterns.some(p => lowerQuery.includes(p));
    const isFeedbackIntent = feedbackIntentPatterns.some(p => lowerQuery.includes(p));

    let primarySourceType = null;
    if (isRecipeIntent) primarySourceType = 'recipe';
    else if (isTipIntent) primarySourceType = 'blog';
    else if (isFeedbackIntent) primarySourceType = 'feedback';

    // CATEGORY INTENT DETECTION - Nhận diện Intent Danh mục
    const categoryKeywords = {
      'Món phụ': ['món phụ', 'gỏi', 'rau luộc', 'khoai tây nghiền', 'đồ ngâm', 'kim chi', 'dưa chua', 'salad', 'rau trộn', 'nộm', 'đồ chua', 'rau muối'],
      'Tráng miệng': ['tráng miệng', 'chè', 'bánh ngọt', 'kem', 'flan', 'rau câu', 'pudding', 'ngọt', 'dessert'],
      'Đồ uống': ['uống', 'nước', 'trà', 'cà phê', 'sinh tố', 'đá xay', 'giải khát', 'latte', 'drink', 'sữa'],
      'Món chính': ['món chính', 'cơm', 'mặn', 'thịt kho', 'cá kho', 'canh', 'ăn cơm', 'bún', 'phở', 'mì'],
      'Ăn vặt': ['ăn vặt', 'snack', 'khai vị', 'chiên', 'rán', 'nhâm nhi', 'khoai tây']
    };

    let targetCategory = null;
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        targetCategory = category;
        break;
      }
    }

    // 3. Hybrid search across collections (skip for small-talk)
    let searchResults = isSmallTalk ? [] : await hybridSearch(db, message, queryVector, {
      limit: parseInt(process.env.VECTOR_SEARCH_LIMIT) || 8, // Reduced to 8 for higher quality
      numCandidates: parseInt(process.env.VECTOR_SEARCH_NUM_CANDIDATES) || 500, // Increased for better recall
      threshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.5, // Increased to 0.5 to filter low-quality results
      intent: primarySourceType, // Pass detected intent for dynamic weighting
      targetCategory: targetCategory // Pass target category for re-ranking
    });
    
    // Check relevance: stricter rules (remove vector topScore as a relevance signal)
    // Relevant ONLY if it shows cooking intent
    const isCookingIntent = hasCookingKeyword || isBudgetOrTimeQuery || (isFollowUpQuestion && hasConversationContext);
    let isIrrelevantQuery = (!isCookingIntent || hasOffTopicPattern) && !isSmallTalk;

    // Fallback: If vector search returned no results but the query is cooking-related,
    // try a lightweight text search on recipe/blog titles to recover exact-name matches (e.g., "Gỏi Bưởi").
    if (!isSmallTalk && !isIrrelevantQuery && Array.isArray(searchResults) && searchResults.length === 0) {
      try {
        const removeVietnameseDiacritics = (str) => str
          .normalize('NFD')
          .replace(/\p{Diacritic}+/gu, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D');

        const stopwords = [
          'công', 'thức', 'cách', 'làm', 'món', 'món ăn', 'món ăn', 'nấu', 'nấu ăn',
          'recipe', 'công thức món', 'công thức nấu', 'công thức nấu ăn',
          'món', 'món', 'mẹo', 'về', 'cho', 'xin', 'hãy', 'giúp', 'tôi'
        ];

        // Build token list by removing common intent words
        const rawTokens = lowerQuery
          .replace(/[!?.,:;()\[\]{}\-_/\\]+/g, ' ')
          .split(/\s+/)
          .filter(t => t && t.length > 1);

        const tokens = rawTokens.filter(t => !stopwords.includes(t));

        if (tokens.length > 0) {
          const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
          const nameRegex = new RegExp(pattern, 'i');

          // Recipes by name
          const recipesCol = db.collection('recipes');
          const recipeDocs = await recipesCol
            .find({ name: { $regex: nameRegex } })
            .collation({ locale: 'vi', strength: 1 })
            .limit(5)
            .toArray();

          // Blogs by title (only if tip intent or when recipe miss)
          const blogDocs = (isTipIntent ? await db.collection('blogs')
            .find({ title: { $regex: nameRegex } })
            .collation({ locale: 'vi', strength: 1 })
            .limit(5)
            .toArray() : []);

          const mapped = [
            ...recipeDocs.map(doc => ({
              ...doc,
              sourceType: 'recipe',
              score: 0.36, // conservative score above threshold to include
              weightedScore: 0.36 * 1.5
            })),
            ...blogDocs.map(doc => ({
              ...doc,
              sourceType: 'blog',
              score: 0.34,
              weightedScore: 0.34 * 1.2
            }))
          ];

          if (mapped.length > 0) {
            searchResults = mapped;
          }
        }
      } catch (fallbackErr) {
        console.warn('Text-search fallback failed:', fallbackErr.message);
      }
    }

    // Secondary fallback: if we do have some results but NONE are recipes, try to recover recipes by
    // name or ingredients from the query (handles cases like "có quả bưởi thì nấu món nào" -> Gỏi Bưởi).
    if (!isSmallTalk && !isIrrelevantQuery && Array.isArray(searchResults) && searchResults.length > 0) {
      const hasRecipeInResults = searchResults.some(r => r.sourceType === 'recipe');
      if (!hasRecipeInResults) {
        try {
          const tokens = lowerQuery
            .replace(/[!?.,:;()\[\]{}\-_/\\]+/g, ' ')
            .split(/\s+/)
            .map(t => t.trim())
            .filter(t => t.length > 1 && !['và','hoặc','thì','là','có','một','những','cái','món','món ăn','ăn','nấu','làm','công','thức','cách','gợi','ý'].includes(t));

          if (tokens.length > 0) {
            const namePattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
            const nameRegex = new RegExp(namePattern, 'i');

            const recipesCol = db.collection('recipes');

            const [nameHits, ingredientHits] = await Promise.all([
              recipesCol
                .find({ name: { $regex: nameRegex } })
                .collation({ locale: 'vi', strength: 1 })
                .limit(5)
                .toArray(),
              recipesCol
                .find({ ingredients: { $elemMatch: { $regex: nameRegex } } })
                .collation({ locale: 'vi', strength: 1 })
                .limit(5)
                .toArray()
            ]);

            const mergedDocs = [...nameHits, ...ingredientHits];
            if (mergedDocs.length > 0) {
              const mapped = mergedDocs.map(doc => ({
                ...doc,
                sourceType: 'recipe',
                score: 0.35, // conservative but above threshold
                weightedScore: 0.35 * 1.5
              }));

              // De-duplicate by _id and prepend to ensure visibility
              const seen = new Set();
              const dedup = [...mapped, ...searchResults].filter(doc => {
                const id = doc._id?.toString() + ':' + (doc.sourceType || '');
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
              });

              searchResults = dedup;
            }
          }
        } catch (secErr) {
          console.warn('Secondary recipe recovery failed:', secErr.message);
        }
      }
    }
    
    // If retrieval found clear recipe evidence, treat as cooking intent to avoid false off-topic
    if (!isSmallTalk && isIrrelevantQuery && Array.isArray(searchResults) && searchResults.some(r => r.sourceType === 'recipe')) {
      isIrrelevantQuery = false;
    }

    // 4. If irrelevant query or small-talk handling / else compute primary and re-rank
    let responseText;
    if (isSmallTalk) {
      // Polite short response for small-talk
      if (isThanksMessage) {
        responseText = `Không có gì đâu, mình rất vui vì có thể giúp bạn. Nếu sau này bạn cần gợi ý món mới, cách biến tấu món cũ hoặc mẹo nấu ăn nhanh hơn thì cứ gọi mình nhé! 👨‍🍳`;
      } else {
        responseText = `Chào bạn yêu dấu! Mình luôn sẵn sàng hỗ trợ bạn về nấu ăn. Bạn có câu hỏi nào về:
• Công thức nấu ăn
• Mẹo vặt nhà bếp
• Nguyên liệu và cách chế biến
• Dinh dưỡng trong ẩm thực
Hãy hỏi mình nhé! 👨‍🍳`;
      }
    } else if (isIrrelevantQuery) {
      // Try to find relevant FAQ
      const faqMatches = searchFAQ(message, 3);
      
      if (faqMatches.length > 0) {
        // Found FAQ matches - return them
        responseText = `Xin lỗi, câu hỏi của bạn không liên quan đến nấu ăn. Nhưng mình có thể giúp bạn với những câu hỏi về ẩm thực sau:\n\n`;
        
        faqMatches.forEach((faq, index) => {
          responseText += `${index + 1}. ${faq.question}\n${faq.answer}\n\n`;
        });
        
        responseText += `Xin chào! Bạn có câu hỏi nào về nấu ăn không? 👨‍🍳`;
      } else {
        // No FAQ matches - generic fallback
        responseText = `Xin lỗi, mình chỉ có thể tư vấn về nấu ăn và ẩm thực thôi ạ. 😊

Bạn có câu hỏi nào về:
• Công thức nấu ăn
• Mẹo vặt nhà bếp
• Nguyên liệu và cách chế biến
• Dinh dưỡng trong ẩm thực

Hãy hỏi mình nhé! 👨‍🍳`;
      }

      // Đảm bảo text off-topic không còn markdown dư thừa
      responseText = cleanResponseText(responseText);
    } else {
      // Determine majority primarySourceType if not from intent
      if (!primarySourceType && Array.isArray(searchResults) && searchResults.length > 0) {
        const counts = searchResults.reduce((acc, s) => {
          const t = s.sourceType || 'unknown';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});
        const order = ['recipe', 'blog', 'feedback', 'favourite', 'unknown'];
        primarySourceType = order.reduce((best, cur) => {
          return (counts[cur] || 0) > (counts[best] || 0) ? cur : best;
        }, 'recipe');
      }

      // Re-rank results to prioritize the primary source type
      // Stronger boost for blogs when user asks for tips (mẹo), moderate for feedback
      const primaryBoost = primarySourceType === 'blog' ? 0.20
                        : primarySourceType === 'feedback' ? 0.12
                        : 0.06; // recipe default
      const reRankedResults = (searchResults || []).slice().sort((a, b) => {
        const aBoost = (a.sourceType === primarySourceType) ? primaryBoost : 0;
        const bBoost = (b.sourceType === primarySourceType) ? primaryBoost : 0;
        return (b.score + bBoost) - (a.score + aBoost);
      });

      // Build prompt with re-ranked results and generate response
      const prompt = buildContextPrompt(message, reRankedResults, conversationContext);
      responseText = await generateResponse(prompt, {
        temperature: 0.12,  // Balanced: faithful but natural responses
        topK: 20,          // Slightly more diversity
        topP: 0.75,        // Good balance of choices
        maxOutputTokens: 800 // Sufficient for complete recipes
      });
      
      // Clean response text to remove markdown formatting
      responseText = cleanResponseText(responseText);
      // Replace searchResults reference downstream with re-ranked list
      var effectiveResults = reRankedResults;
    }
    
    // 5. Calculate confidence score (NEW formula - simple and robust)
    const processingTime = Date.now() - startTime;

    // Use re-ranked results if available
    const usedResults = typeof effectiveResults !== 'undefined' ? effectiveResults : searchResults;

    // Count sources by type (for response payload only)
    const sourceBreakdown = {
      recipe: usedResults.filter(r => r.sourceType === 'recipe').length,
      blog: usedResults.filter(r => r.sourceType === 'blog').length,
      feedback: usedResults.filter(r => r.sourceType === 'feedback').length,
      favourite: usedResults.filter(r => r.sourceType === 'favourite').length
    };

    // Debug log: list source names by type (only when meaningful)
    if (!isSmallTalk && usedResults.length > 0) {
      const byType = usedResults.reduce((acc, s) => {
        const key = s.sourceType || 'unknown';
        acc[key] = acc[key] || [];
        acc[key].push({
          name: s.name || s.title || 'N/A',
          score: s.score
        });
        return acc;
      }, {});
      const typeOrder = ['recipe', 'blog', 'feedback', 'favourite', 'unknown'];
      console.log('Sources used for response:');
      typeOrder.forEach(type => {
        if (byType[type] && byType[type].length > 0) {
          const topNames = byType[type]
            .slice(0, 5)
            .map(x => `${x.name} (${Math.round((x.score || 0) * 100)}%)`)
            .join(', ');
          console.log(`  - ${type}: ${byType[type].length} items. Top: ${topNames}`);
        }
      });
    }

    // --- IMPROVED CONFIDENCE CALCULATION (Fix NaN & Better Calibration) ---
    // 1. Take top 8 results from usedResults
    const topResults = usedResults ? usedResults.slice(0, 8) : [];
    let confidenceScore = 0;

    if (topResults.length > 0 && !isSmallTalk && !isIrrelevantQuery) {
      let totalWeightedScore = 0;
      let validScoreCount = 0;

      topResults.forEach(result => {
        // Priority: weightedScore -> score -> 0. Ensure number type.
        let score = parseFloat(result.weightedScore || result.score);
        if (!Number.isFinite(score)) {
          score = 0;
        }

        // Normalize: Clamp max to 1.0 (in case of boost > 1)
        score = Math.min(score, 1.0);
        
        // Penalize low scores strongly
        if (score < 0.4) score *= 0.5;

        totalWeightedScore += score;
        validScoreCount++;
      });

      // Prevent division by zero (Main cause of NaN)
      const avgScore = validScoreCount > 0 ? (totalWeightedScore / validScoreCount) : 0;

      // Diversity Factor: Max 1.0 if >= 3 source types
      const uniqueSources = new Set(topResults.map(r => r.sourceType)).size;
      const diversityFactor = Math.min(uniqueSources / 3, 1.0);

      // Count Factor: Max 1.0 if >= 5 results
      const countFactor = Math.min(topResults.length / 5, 1.0);

      // Final Formula: 80% Score + 10% Diversity + 10% Count
      let rawConfidence = (avgScore * 0.8) + (diversityFactor * 0.1) + (countFactor * 0.1);

      // Safety Margin: Reduce by 10% to match Faithfulness reality
      rawConfidence = rawConfidence * 0.9;

      // Final rounding
      confidenceScore = parseFloat(rawConfidence.toFixed(2));
    } else if (isSmallTalk) {
      // Medium confidence for small-talk; no sources
      confidenceScore = 0.7;
    } else if (isIrrelevantQuery) {
      // Irrelevant query -> very low confidence
      confidenceScore = 0.15;
    } else {
      // No usable results
      confidenceScore = 0;
    }

    // Ensure it's never NaN at the end
    if (isNaN(confidenceScore)) confidenceScore = 0;
    
    // 6. Save to chat history
    const convId = resolvedConversationId;
    await saveChatHistory(
      user_id,
      convId,
      message,
      responseText,
      usedResults,
      confidenceScore,
      {
        model_generation: process.env.MODEL_GENERATION,
        model_embedding: process.env.MODEL_EMBEDDING,
        processing_time_ms: processingTime,
        tokens_used: null, // Gemini doesn't always expose token count
        answer_source_type: primarySourceType || null
      }
    );
    
    // 7. Prepare response with detailed source information
    // IMPORTANT: Don't show sources for irrelevant queries (low confidence)
    const shouldShowSources = confidenceScore > 0.3 && !isIrrelevantQuery && !isSmallTalk;
    
    const responseData = {
      response: responseText,
      confidence: {
        score: confidenceScore,
        level: confidenceScore > 0.7 ? 'high' : confidenceScore > 0.5 ? 'medium' : 'low',
        percentage: Math.round(confidenceScore * 100),
        description: confidenceScore > 0.7 
          ? 'Độ tin cậy cao - Dữ liệu chính xác từ database' 
          : confidenceScore > 0.5 
          ? 'Độ tin cậy trung bình - Có thể tham khảo'
          : 'Độ tin cậy thấp - Câu hỏi không liên quan đến nấu ăn'
      },
      answer_source_type: primarySourceType || null,
      show_suggestions: shouldShowSources, // Add flag to control suggestion display
      sourceBreakdown: shouldShowSources ? {
        total: searchResults.length,
        byType: sourceBreakdown,
        summary: `${sourceBreakdown.recipe} công thức, ${sourceBreakdown.blog} bài viết, ${sourceBreakdown.feedback} đánh giá`
      } : null,
      // Only expose recipe suggestions with a valid name/title to frontend
      sources: shouldShowSources && Array.isArray(usedResults)
        ? usedResults
            .slice(0, 8)
            .filter(s => s && s.sourceType === 'recipe' && (s.name || s.title))
            .map(s => ({
              type: s.sourceType,
              typeName: 'Công thức',
              id: s._id?.toString(),
              name: s.name || s.title, // never "N/A"
              score: s.score,
              relevance: Math.round((s.score || 0) * 100),
              category: s.category,
              difficulty: s.difficulty,
              cookingTime: s.cookingTime
            }))
        : [],
      conversation_id: convId,
      timestamp: new Date().toISOString(),
      processing_time_ms: processingTime
    };
    
    // Cache the response (only if confidence is reasonable)
    const cacheThreshold = parseFloat(process.env.CONFIDENCE_CACHE_THRESHOLD) || 0.35;
    if (confidenceScore > cacheThreshold) {
      responseCache.set(cacheKey, responseData);
    }
    
    // Record metrics for successful response
    metricsCollector.recordResponse(processingTime, confidenceScore, false);
    logResponse(processingTime, confidenceScore, false, searchResults.length);
    
    res.json(responseData);
    
  } catch (error) {
    metricsCollector.recordError();
    logError(error, 'in /ask endpoint');
    
    console.error('Error in /ask endpoint:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
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
      autoSync: autoSyncManager ? autoSyncManager.getStats() : { enabled: false },
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
 * GET /auto-sync/status - Get auto-sync status
 */
app.get('/auto-sync/status', (req, res) => {
  try {
    if (!autoSyncManager) {
      return res.json({ enabled: false, message: 'Auto-sync not initialized' });
    }
    
    res.json({
      enabled: true,
      stats: autoSyncManager.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auto-sync/trigger - Manually trigger auto-sync
 */
app.post('/auto-sync/trigger', async (req, res) => {
  try {
    if (!autoSyncManager) {
      return res.status(503).json({ error: 'Auto-sync not initialized' });
    }
    
    console.log('Manual auto-sync triggered');
    await autoSyncManager.syncNewDocuments();
    
    res.json({
      success: true,
      message: 'Auto-sync triggered successfully',
      stats: autoSyncManager.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auto-sync/start - Start auto-sync scheduler
 */
app.post('/auto-sync/start', (req, res) => {
  try {
    if (!autoSyncManager) {
      return res.status(503).json({ error: 'Auto-sync not initialized' });
    }
    
    autoSyncManager.start();
    
    res.json({
      success: true,
      message: 'Auto-sync started',
      stats: autoSyncManager.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auto-sync/stop - Stop auto-sync scheduler
 */
app.post('/auto-sync/stop', (req, res) => {
  try {
    if (!autoSyncManager) {
      return res.status(503).json({ error: 'Auto-sync not initialized' });
    }
    
    autoSyncManager.stop();
    
    res.json({
      success: true,
      message: 'Auto-sync stopped',
      stats: autoSyncManager.getStats()
    });
  } catch (error) {
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
      'POST /sync': 'Manual sync embeddings for documents',
      'GET /auto-sync/status': 'Get auto-sync status',
      'POST /auto-sync/trigger': 'Manually trigger auto-sync',
      'POST /auto-sync/start': 'Start auto-sync scheduler',
      'POST /auto-sync/stop': 'Stop auto-sync scheduler',
      'POST /test-conversation-context': 'Test conversation context functionality',
      'GET /conversation-context/:user_id': 'Get conversation context for debugging'
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
    
  // Stop auto-sync
  if (autoSyncManager) {
    autoSyncManager.stop();
    console.log(' Auto-sync stopped');
  }
  
  // Close MongoDB connection
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
