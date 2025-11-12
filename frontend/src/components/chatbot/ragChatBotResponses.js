// RAG-powered chat bot responses for Cookify
import axios from 'axios';
import { getChatbotUrl } from '../../config/api.js';
import SecureStorage from '../../utils/secureStorage';

// Configuration
const RAG_API_BASE_URL = getChatbotUrl();
const FALLBACK_ENABLED = true;

// Request queue management to prevent overflowedQueue error
let pendingRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2;
const requestQueue = [];

// Create axios instance with default config
const ragApi = axios.create({
  baseURL: RAG_API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds for AI processing
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Disable credentials for CORS
  maxRedirects: 5,
  maxContentLength: 50 * 1024 * 1024, // 50MB
});

// Add request interceptor for debugging and queue management
ragApi.interceptors.request.use(
  (config) => {
    pendingRequests++;
    return config;
  },
  (error) => {
    pendingRequests--;
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
ragApi.interceptors.response.use(
  (response) => {
    pendingRequests--;
    processQueue(); // Process next request in queue
    return response;
  },
  (error) => {
    pendingRequests--;
    processQueue(); // Process next request in queue
    return Promise.reject(error);
  }
);

// Process queued requests
const processQueue = () => {
  if (requestQueue.length > 0 && pendingRequests < MAX_CONCURRENT_REQUESTS) {
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
};

// Fallback responses for when RAG API is unavailable
const fallbackResponses = {
  greeting: [
    'Xin chào! Tôi là phụ bếp AI của Cookify. Tôi có thể giúp bạn tìm công thức nấu ăn và tư vấn món ăn. Hôm nay bạn muốn nấu gì? 😊',
    'Chào bạn! Tôi sẵn sàng hỗ trợ bạn về nấu ăn. Bạn cần tư vấn món gì không? 👨‍🍳',
    'Hello! Tôi là trợ lý ảo chuyên về nấu ăn. Hãy cho tôi biết bạn muốn nấu món gì nhé! 🍳'
  ],
  error: [
    'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau ít phút nhé! 😅',
    'Hệ thống đang bảo trì. Tôi sẽ quay lại hỗ trợ bạn sớm thôi! 🔧',
    'Đang có lỗi xảy ra. Bạn có thể thử hỏi lại không? 🤔'
  ],
  default: [
    'Tôi hiểu bạn muốn tìm hiểu về món ăn này! Hãy cho tôi biết cụ thể hơn: • Nguyên liệu bạn có sẵn. • Loại món bạn muốn nấu. • Thời gian bạn có để nấu. 😊',
    'Bạn có thể mô tả rõ hơn về món ăn bạn muốn không? Tôi có thể tư vấn: • Công thức chi tiết. • Mẹo nấu ăn hay. • Thay thế nguyên liệu. 👩‍🍳',
    'Hãy cho tôi biết thêm chi tiết để tôi có thể gợi ý món ăn ngon cho bạn! Ví dụ: • Món Việt hay món Tây? • Cho bao nhiêu người ăn? • Có nguyên liệu gì sẵn? 🍽️'
  ]
};

// Check if RAG API is available with retry
const checkRagApiHealth = async (retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ragApi.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
  }
  return false;
};

// Get random response from array
const getRandomResponse = (responses) => {
  return responses[Math.floor(Math.random() * responses.length)];
};

// Clean response text by removing markdown formatting and adding line breaks
const cleanResponseText = (text) => {
  if (!text) return text;
  
  return text
    // Remove bold markdown (**text**)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic markdown (*text*)
    .replace(/\*(.*?)\*/g, '$1')
    // Remove other common markdown
    .replace(/`(.*?)`/g, '$1')
    // Add line breaks after sentences ending with punctuation
    .replace(/([.!?])\s+/g, '$1\n\n')
    // Add line breaks after colons (for lists)
    .replace(/:\s+/g, ':\n')
    // Add line breaks before numbered lists
    .replace(/(\d+\.)\s+/g, '\n$1 ')
    // Add line breaks before bullet points
    .replace(/[-•]\s+/g, '\n• ')
    // Clean up multiple line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Clean up extra spaces but preserve line breaks
    .replace(/[ \t]+/g, ' ')
    .trim();
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
      text: cleanResponseText(getRandomResponse(fallbackResponses.greeting)),
      suggestions: ['Món nhanh 30 phút', 'Món cho gia đình', 'Mẹo nấu ăn', 'Tư vấn nguyên liệu'],
      source: 'fallback_greeting'
    };
  }
  
  
  if (lowerMessage.includes('nhanh') || lowerMessage.includes('30 phút')) {
    return {
      text: cleanResponseText('Tôi gợi ý một số món nhanh: 1. Mì xào giòn (20 phút). 2. Cơm chiên dương châu (15 phút). 3. Bún thịt nướng (25 phút). Bạn chọn món nào? ⚡'),
      suggestions: ['Mì xào giòn', 'Cơm chiên dương châu', 'Bún thịt nướng'],
      source: 'fallback_quick'
    };
  }

  
  return {
    text: cleanResponseText(getRandomResponse(fallbackResponses.default)),
    suggestions: ['Món nhanh', 'Món chính', 'Tráng miệng', 'Đồ uống'],
    source: 'fallback_default'
  };
};

// Queue-aware API call wrapper
const queuedApiCall = (apiCall) => {
  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      try {
        const result = await apiCall();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    // If too many pending requests, queue it
    if (pendingRequests >= MAX_CONCURRENT_REQUESTS) {
      requestQueue.push(executeRequest);
    } else {
      executeRequest();
    }
  });
};

// Main function to get RAG-powered chat response
export const getRagChatBotResponse = async (userMessage, conversationId = null) => {
  try {    
    // Check if RAG API is available first
    const isRagAvailable = await checkRagApiHealth();
    
    if (!isRagAvailable) {
      if (FALLBACK_ENABLED) {
        return generateFallbackResponse(userMessage);
      } else {
        throw new Error('RAG API is not available and fallback is disabled');
      }
    }
    
    // Resolve userId from JWT (if available)
    let resolvedUserId = null;
    try {
      const token = SecureStorage.getToken && SecureStorage.getToken();
      if (token && typeof token === 'string' && token.split('.').length === 3) {
        const payloadPart = token.split('.')[1];
        const decoded = JSON.parse(atob(payloadPart));
        resolvedUserId = decoded?.id || decoded?._id || decoded?.userId || null;
      }
    } catch (e) {
      // Silently ignore token parse errors; keep resolvedUserId = null
    }

    // Call Node.js Chatbot API with queue management
    const requestData = {
      message: userMessage.trim(),
      user_id: resolvedUserId, // Pass user id if available
      conversation_id: conversationId
    };
    
    // Use queued API call to prevent overflowedQueue
    const response = await queuedApiCall(() => ragApi.post('/ask', requestData));
    const ragResponse = response.data;
    
      
    // Extract suggestions from sources (recipe names, blog titles, etc.)
    const suggestions = ragResponse.sources?.slice(0, 4).map(s => s.name) || [];
    
    // Format response for frontend
    return {
      text: cleanResponseText(ragResponse.response),
      suggestions: suggestions,
      source: 'node_chatbot',
      score: ragResponse.confidence?.score || 0,
      confidence: ragResponse.confidence, // Full confidence object with level, percentage, description
      sourceBreakdown: ragResponse.sourceBreakdown, // Source breakdown by type
      answerSourceType: ragResponse.answer_source_type || null,
      retrievedDocs: ragResponse.sources || [],
      conversationId: ragResponse.conversation_id,
      ragResponse: true
    };
    
  } catch (error) {
    console.error('RAG API error:', error);
    
    // Handle specific error types for better user experience
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ERR_NETWORK') {
      if (FALLBACK_ENABLED) {
        return generateFallbackResponse(userMessage);
      }
    }
    
    if (error.response?.status === 400) {
      return {
        text: cleanResponseText('Xin lỗi, câu hỏi của bạn không hợp lệ. Vui lòng thử lại với câu hỏi khác! 😅'),
        suggestions: ['Thử câu hỏi khác', 'Món ăn phổ biến', 'Mẹo nấu ăn'],
        source: 'error_validation'
      };
    }
    
    if (error.response?.status === 404) {
      if (FALLBACK_ENABLED) {
        return generateFallbackResponse(userMessage);
      }
    }
    
    if (error.response?.status >= 500) {
      return {
        text: cleanResponseText(getRandomResponse(fallbackResponses.error)),
        suggestions: ['Thử lại', 'Hỏi câu khác', 'Liên hệ hỗ trợ'],
        source: 'error_server'
      };
    }
    
    // Always use fallback when there's an error if enabled
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

// Test text cleaning function
export const testTextCleaning = () => {
  const testText = "**Món phở bò** rất *ngon*! Bạn cần: 1. Xương bò. 2. Bánh phở. 3. Hành tây. Cách làm: • Ninh xương 3 tiếng. • Trần bánh phở. • Thái hành lá.";
  return cleanResponseText(testText);
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
