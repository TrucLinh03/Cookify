/**
 * Conversation Context Utilities
 * Utility functions for testing and managing conversation context
 */

/**
 * Test conversation context functionality
 * @param {Object} db - MongoDB database instance
 * @param {string} userId - User ID to test with
 * @param {string} conversationId - Conversation ID to test with
 */
async function testConversationContext(db, userId, conversationId) {  
  try {
    // Sample conversation data for testing
    const testConversations = [
      {
        user_id: userId,
        conversation_id: conversationId,
        message: "Tôi muốn nấu món phở bò",
        response: "Đây là công thức phở bò truyền thống nhé! Bạn sẽ cần: thịt bò, xương bò, hành tây, gừng, quế, hồi, đinh hương, nước mắm, đường phèn, bánh phở...",
        sources: [],
        confidence_score: 0.85,
        metadata: { test: true },
        feedback: { helpful: null, rating: null, comment: null },
        created_at: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        user_id: userId,
        conversation_id: conversationId,
        message: "Nếu mình không có gừng thì sao?",
        response: "Không có gừng vẫn nấu được phở nhé! Bạn có thể thay thế bằng: 1) Hành tây nướng thêm để tăng vị ngọt tự nhiên, 2) Thêm chút đường rock để cân bằng vị, 3) Dùng lá nguyệt quế thay thế một phần...",
        sources: [],
        confidence_score: 0.78,
        metadata: { test: true },
        feedback: { helpful: null, rating: null, comment: null },
        created_at: new Date(Date.now() - 3 * 60 * 1000) // 3 minutes ago
      },
      {
        user_id: userId,
        conversation_id: conversationId,
        message: "Thời gian nấu nước dùng bao lâu?",
        response: "Để có nước dùng phở ngon, bạn cần ninh khoảng 6-8 tiếng với lửa nhỏ. Quy trình: 1) Blanch xương bò 10 phút, 2) Rửa sạch, cho vào nồi mới với nước lạnh, 3) Ninh 6-8 tiếng, vớt bọt thường xuyên...",
        sources: [],
        confidence_score: 0.82,
        metadata: { test: true },
        feedback: { helpful: null, rating: null, comment: null },
        created_at: new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
      }
    ];

    // Insert test conversations
    const historyChatsCollection = db.collection('history_chats');
    await historyChatsCollection.insertMany(testConversations);
    
    
    // Test context retrieval
    const { ObjectId } = require('mongodb');
    
    // Simulate getRecentConversationContext function
    const getTestContext = async (userId, conversationId, limit = 5) => {
      let query = {};
      if (conversationId) {
        query.conversation_id = conversationId;
      } else if (userId) {
        query.user_id = new ObjectId(userId);
      }

      const recentChats = await historyChatsCollection
        .find(query)
        .sort({ created_at: -1 })
        .limit(limit * 2)
        .toArray();

      const contextParts = [];
      const chronologicalChats = recentChats.reverse();
      const limitedChats = chronologicalChats.slice(-limit);
      
      limitedChats.forEach(chat => {
        if (chat.message && chat.response) {
          contextParts.push(`User: ${chat.message.trim()}`);
          contextParts.push(`Bot: ${chat.response.trim()}`);
        }
      });

      return contextParts.length > 0 
        ? `[Previous conversation]\n${contextParts.join('\n')}\n`
        : '';
    };

    const context = await getTestContext(userId, conversationId, 5);
    
    
    
    // Test with a follow-up question
    const followUpQuestion = "Có thể thêm gì để nước dùng thơm hơn không?";
    
    
    
    // Clean up test data
    await historyChatsCollection.deleteMany({ 
      conversation_id: conversationId,
      'metadata.test': true 
    });
    
    
    return {
      success: true,
      contextLength: context.length,
      conversationPairs: testConversations.length,
      followUpQuestion
    };
    
  } catch (error) {
    console.error('Conversation context test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate conversation context format
 * @param {string} context - Conversation context string
 * @returns {Object} - Validation result
 */
function validateConversationContext(context) {
  if (!context || typeof context !== 'string') {
    return { valid: false, reason: 'Context must be a non-empty string' };
  }

  if (!context.includes('[Previous conversation]')) {
    return { valid: false, reason: 'Context must include [Previous conversation] header' };
  }

  const userMessages = (context.match(/User:/g) || []).length;
  const botMessages = (context.match(/Bot:/g) || []).length;

  if (userMessages !== botMessages) {
    return { 
      valid: false, 
      reason: `Unbalanced conversation pairs: ${userMessages} user messages, ${botMessages} bot messages` 
    };
  }

  return {
    valid: true,
    conversationPairs: userMessages,
    contextLength: context.length
  };
}

/**
 * Format conversation context for debugging
 * @param {string} context - Raw conversation context
 * @returns {string} - Formatted context for display
 */
function formatContextForDebug(context) {
  if (!context) return 'No conversation context';
  
  const lines = context.split('\n');
  const formatted = lines.map((line, index) => {
    if (line.startsWith('User:')) {
      return ` ${line}`;
    } else if (line.startsWith('Bot:')) {
      return ` ${line}`;
    } else if (line.includes('[Previous conversation]')) {
      return ` ${line}`;
    }
    return line;
  });

  return formatted.join('\n');
}

module.exports = {
  testConversationContext,
  validateConversationContext,
  formatContextForDebug
};
