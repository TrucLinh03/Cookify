// RAG-powered chat bot responses for Cookify
import axios from 'axios';
import { getChatbotUrl } from '../../config/api.js';

// Configuration
const RAG_API_BASE_URL = getChatbotUrl();
const FALLBACK_ENABLED = true;

// Create axios instance with default config
const ragApi = axios.create({
  baseURL: RAG_API_BASE_URL,
  timeout: 10000, // Reduce timeout to 10 seconds for better UX
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
ragApi.interceptors.request.use(
  (config) => {
    console.log(`🤖 Chatbot API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Chatbot Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
ragApi.interceptors.response.use(
  (response) => {
    console.log(`✅ Chatbot API Response: ${response.status}`);
    return response;
  },
  (error) => {
    console.error('❌ Chatbot API Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// Fallback responses for when RAG API is unavailable
const fallbackResponses = {
  greeting: [
    'Xin chào! Tôi là Chef AI Assistant của Cookify. Tôi có thể giúp bạn tìm công thức nấu ăn và tư vấn món ăn. Hôm nay bạn muốn nấu gì? 😊',
    'Chào bạn! Tôi sẵn sàng hỗ trợ bạn về nấu ăn. Bạn cần tư vấn món gì không? 👨‍🍳',
    'Hello! Tôi là trợ lý ảo chuyên về nấu ăn. Hãy cho tôi biết bạn muốn nấu món gì nhé! 🍳'
  ],
  error: [
    'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút nhé! 😅',
    'Hệ thống đang bảo trì. Tôi sẽ quay lại hỗ trợ bạn sớm thôi! 🔧',
    'Đang có lỗi xảy ra. Bạn có thể thử hỏi lại không? 🤔'
  ],
  default: [
    'Tôi hiểu bạn muốn tìm hiểu về món ăn này! Hãy cho tôi biết cụ thể hơn về nguyên liệu bạn có hoặc loại món bạn muốn nấu nhé. 😊',
    'Bạn có thể mô tả rõ hơn về món ăn bạn muốn không? Tôi sẽ tư vấn công thức phù hợp! 👩‍🍳',
    'Hãy cho tôi biết thêm chi tiết để tôi có thể gợi ý món ăn ngon cho bạn! 🍽️'
  ]
};

// Check if RAG API is available
const checkRagApiHealth = async () => {
  try {
    const response = await ragApi.get('/health', { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    console.warn('RAG API health check failed:', error.message);
    return false;
  }
};

// Get random response from array
const getRandomResponse = (responses) => {
  return responses[Math.floor(Math.random() * responses.length)];
};

// Detect greeting messages
const isGreeting = (message) => {
  const greetingKeywords = ['xin chào', 'hello', 'hi', 'chào', 'hey'];
  const lowerMessage = message.toLowerCase();
  return greetingKeywords.some(keyword => lowerMessage.includes(keyword));
};

// Generate fallback response based on message content
const generateFallbackResponse = (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (isGreeting(lowerMessage)) {
    return {
      text: getRandomResponse(fallbackResponses.greeting),
      suggestions: ['Món nhanh 30 phút', 'Món cho gia đình', 'Mẹo nấu ăn', 'Tư vấn nguyên liệu'],
      source: 'fallback_greeting'
    };
  }
  
  // Check for specific cooking terms
  if (lowerMessage.includes('phở') || lowerMessage.includes('pho')) {
    return {
      text: 'Phở là món ăn truyền thống tuyệt vời! 🍜\n\n**Phở Bò cơ bản:**\n- Xương bò: 1kg\n- Thịt bò: 500g\n- Bánh phở: 400g\n- Hành tây, gừng, thảo quả\n\n**Cách làm:**\n1. Ninh xương 3-4 tiếng\n2. Nướng hành, gừng cho thơm\n3. Gia vị: muối, đường, nước mắm\n4. Trụng bánh phở, xếp thịt, chan nước dùng\n\nBạn cần hướng dẫn chi tiết hơn không? 😊',
      suggestions: ['Phở bò', 'Phở gà', 'Cách nấu nước dùng phở'],
      source: 'fallback_recipe'
    };
  }
  
  if (lowerMessage.includes('nhanh') || lowerMessage.includes('30 phút')) {
    return {
      text: 'Tôi gợi ý một số món nhanh: Mì xào giòn (20 phút), Cơm chiên dương châu (15 phút), hoặc Bún thịt nướng (25 phút). Bạn chọn món nào? ⚡',
      suggestions: ['Mì xào giòn', 'Cơm chiên dương châu', 'Bún thịt nướng'],
      source: 'fallback_quick'
    };
  }

  if (lowerMessage.includes('cơm chiên')) {
    return {
      text: '🍚 **Cơm Chiên Dương Châu:**\n\n**Nguyên liệu:**\n- Cơm nguội: 2 bát\n- Trứng: 2 quả\n- Xúc xích: 100g\n- Tôm khô: 50g\n- Hành tây, tỏi\n\n**Cách làm:**\n1. Đánh trứng, chiên tơi\n2. Phi thơm hành tỏi\n3. Cho cơm vào xào\n4. Thêm xúc xích, tôm khô\n5. Nêm nếm vừa ăn\n\nMón này rất dễ làm và ngon! 😋',
      suggestions: ['Cơm chiên hải sản', 'Cơm chiên thập cẩm', 'Mẹo chiên cơm ngon'],
      source: 'fallback_recipe'
    };
  }

  if (lowerMessage.includes('bánh mì')) {
    return {
      text: '🥖 **Bánh Mì Việt Nam:**\n\n**Nguyên liệu:**\n- Bánh mì: 2 ổ\n- Pate gan: 100g\n- Thịt nguội: 100g\n- Rau thơm, dưa chua\n- Tương ớt, mayonnaise\n\n**Cách làm:**\n1. Nướng bánh mì giòn\n2. Phết pate và mayonnaise\n3. Thêm thịt nguội\n4. Rau thơm, dưa chua\n5. Chấm tương ớt\n\nBánh mì Việt Nam nổi tiếng thế giới! 🌍',
      suggestions: ['Bánh mì thịt nướng', 'Bánh mì chả cá', 'Cách làm dưa chua'],
      source: 'fallback_recipe'
    };
  }

  if (lowerMessage.includes('bún bò') || lowerMessage.includes('bún bò huế')) {
    return {
      text: '🍜 **Bún Bò Huế:**\n\n**Nguyên liệu:**\n- Bún bò: 500g\n- Xương heo: 500g\n- Thịt bò: 300g\n- Chả cua: 200g\n- Mắm ruốc, sa tế\n\n**Cách làm:**\n1. Ninh xương 2-3 tiếng\n2. Thêm mắm ruốc, sa tế\n3. Luộc bún qua nước sôi\n4. Thái thịt bò, chả cua\n5. Trình bày và thưởng thức\n\nMón đặc sản xứ Huế! 👑',
      suggestions: ['Bún bò Huế cay', 'Cách làm sa tế', 'Mắm ruốc tôm'],
      source: 'fallback_recipe'
    };
  }

  if (lowerMessage.includes('gỏi cuốn') || lowerMessage.includes('nem cuốn')) {
    return {
      text: '🥬 **Gỏi Cuốn Tôm Thịt:**\n\n**Nguyên liệu:**\n- Bánh tráng: 20 tờ\n- Tôm luộc: 300g\n- Thịt ba chỉ: 200g\n- Rau sống, bún tươi\n- Nước chấm chua ngọt\n\n**Cách làm:**\n1. Luộc tôm, thịt chín\n2. Chuẩn bị rau sống\n3. Ướt bánh tráng\n4. Cuốn tôm, thịt, rau\n5. Chấm nước mắm chua ngọt\n\nMón ăn nhẹ, healthy! 🥗',
      suggestions: ['Gỏi cuốn chay', 'Nước chấm gỏi cuốn', 'Bánh tráng cuốn'],
      source: 'fallback_recipe'
    };
  }
  
  return {
    text: getRandomResponse(fallbackResponses.default),
    suggestions: ['Món nhanh', 'Món chính', 'Tráng miệng', 'Đồ uống'],
    source: 'fallback_default'
  };
};

// Main function to get RAG-powered chat response
export const getRagChatBotResponse = async (userMessage, conversationId = null) => {
  try {
    console.log('Processing RAG query:', userMessage);
    
    // Temporarily use fallback while fixing CORS issues
    if (FALLBACK_ENABLED) {
      console.log('🔧 Using fallback responses while fixing CORS issues');
      return generateFallbackResponse(userMessage);
    }
    
    // Check if RAG API is available
    const isRagAvailable = await checkRagApiHealth();
    
    if (!isRagAvailable && FALLBACK_ENABLED) {
      console.warn('RAG API unavailable, using fallback responses');
      return generateFallbackResponse(userMessage);
    }
    
    if (!isRagAvailable) {
      throw new Error('RAG API is not available and fallback is disabled');
    }
    
    // Call Node.js Chatbot API (new format)
    const requestData = {
      message: userMessage.trim(),
      user_id: null, // Can be set from user context if available
      conversation_id: conversationId
    };
    
    console.log('Calling Node.js Chatbot API with:', requestData);
    
    const response = await ragApi.post('/ask', requestData);
    const ragResponse = response.data;
    
    console.log('Node.js Chatbot API response:', {
      confidence: ragResponse.confidence,
      sourcesCount: ragResponse.sources?.length || 0,
      processingTime: ragResponse.processing_time_ms
    });
    
    // Extract suggestions from sources (recipe names, blog titles, etc.)
    const suggestions = ragResponse.sources?.slice(0, 4).map(s => s.name) || [];
    
    // Format response for frontend
    return {
      text: ragResponse.response,
      suggestions: suggestions,
      source: 'node_chatbot',
      score: ragResponse.confidence?.score || 0,
      confidence: ragResponse.confidence,
      retrievedDocs: ragResponse.sources || [],
      conversationId: ragResponse.conversation_id,
      ragResponse: true
    };
    
  } catch (error) {
    console.error('RAG API error:', error);
    
    // Always use fallback when there's an error
    if (FALLBACK_ENABLED) {
      console.warn('API error occurred, using fallback response');
      return generateFallbackResponse(userMessage);
    }
    
    // Handle specific error types for better user experience
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn('Connection failed, using fallback');
      if (FALLBACK_ENABLED) {
        return generateFallbackResponse(userMessage);
      }
    }
    
    if (error.response?.status === 400) {
      return {
        text: 'Xin lỗi, câu hỏi của bạn không hợp lệ. Vui lòng thử lại với câu hỏi khác! 😅',
        suggestions: ['Thử câu hỏi khác', 'Món ăn phổ biến', 'Mẹo nấu ăn'],
        source: 'error_validation'
      };
    }
    
    if (error.response?.status >= 500) {
      return {
        text: getRandomResponse(fallbackResponses.error),
        suggestions: ['Thử lại', 'Hỏi câu khác', 'Liên hệ hỗ trợ'],
        source: 'error_server'
      };
    }
    
    // Generic error fallback
    if (FALLBACK_ENABLED) {
      return generateFallbackResponse(userMessage);
    }
    
    throw error;
  }
};

// Legacy function for backward compatibility
export const getChatBotResponse = async (userMessage) => {
  return await getRagChatBotResponse(userMessage);
};

// Get random welcome message
export const getRandomWelcomeMessage = () => {
  const welcomeMessages = [
    'Xin chào! Tôi là Chef AI Assistant với công nghệ RAG mới. Hôm nay bạn muốn nấu món gì nhỉ? 👨‍🍳',
    'Chào bạn! Tôi đã được nâng cấp với AI thông minh hơn. Tôi có thể tư vấn món ăn và mẹo nấu ăn cho bạn! 🍳',
    'Hello! Tôi là Chef AI Assistant phiên bản mới với khả năng hiểu và tư vấn tốt hơn. Bắt đầu nấu ăn thôi! 👩‍🍳',
    'Chào mừng đến với Cookify! Tôi đã được nâng cấp AI để hỗ trợ bạn nấu ăn tốt hơn. Hãy hỏi tôi bất cứ điều gì! 🔥'
  ];
  
  return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
};

// Utility functions for debugging
export const getRagApiStatus = async () => {
  try {
    const healthResponse = await ragApi.get('/health');
    
    return {
      healthy: healthResponse.status === 200 && healthResponse.data.status === 'healthy',
      health: healthResponse.data,
      mongodb_connected: healthResponse.data.mongodb?.connected,
      database: healthResponse.data.mongodb?.database,
      models: healthResponse.data.models
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

// Test RAG API with sample queries
export const testRagApi = async () => {
  const testQueries = [
    'Xin chào',
    'Làm sao để cơm không bị nhão?',
    'Tôi muốn nấu phở bò',
    'Món ăn nhanh 30 phút'
  ];
  
  const results = [];
  
  for (const query of testQueries) {
    try {
      const response = await getRagChatBotResponse(query);
      results.push({
        query,
        success: true,
        response: {
          source: response.source,
          score: response.score,
          hasAnswer: !!response.text,
          suggestionCount: response.suggestions?.length || 0
        }
      });
    } catch (error) {
      results.push({
        query,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};
