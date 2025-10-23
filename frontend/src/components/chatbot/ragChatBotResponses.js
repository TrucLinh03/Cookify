// RAG-powered chat bot responses for Cookify
import axios from 'axios';

// Configuration
const RAG_API_BASE_URL = 'http://localhost:8000';
const FALLBACK_ENABLED = true;

// Create axios instance with default config
const ragApi = axios.create({
  baseURL: RAG_API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const response = await ragApi.get('/health', { timeout: 5000 });
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
      text: 'Phở là món ăn truyền thống tuyệt vời! Tôi có thể hướng dẫn bạn nấu phở bò hoặc phở gà. Bạn muốn làm loại nào? 🍜',
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
    
    // Check if RAG API is available
    const isRagAvailable = await checkRagApiHealth();
    
    if (!isRagAvailable && FALLBACK_ENABLED) {
      console.warn('RAG API unavailable, using fallback responses');
      return generateFallbackResponse(userMessage);
    }
    
    if (!isRagAvailable) {
      throw new Error('RAG API is not available and fallback is disabled');
    }
    
    // Call RAG API
    const requestData = {
      question: userMessage.trim()
    };
    
    console.log('Calling RAG API with:', requestData);
    
    const response = await ragApi.post('/ask', requestData);
    const ragResponse = response.data;
    
    console.log('RAG API response:', {
      source: ragResponse.source,
      score: ragResponse.score,
      suggestionsCount: ragResponse.suggestions?.length || 0
    });
    
    // Format response for frontend
    return {
      text: ragResponse.llm_answers,
      suggestions: ragResponse.suggestions || [],
      source: ragResponse.source,
      score: ragResponse.score,
      retrievedDocs: ragResponse.similar_questions || [],
      ragResponse: true
    };
    
  } catch (error) {
    console.error('RAG API error:', error);
    
    // Handle specific error types
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
      healthy: healthResponse.status === 200,
      health: healthResponse.data,
      model_loaded: healthResponse.data.model_loaded,
      data_loaded: healthResponse.data.data_loaded,
      total_questions: healthResponse.data.total_questions
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
