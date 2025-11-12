/**
 * History Chat Model - Lưu lịch sử hội thoại của người dùng với chatbot
 */

const historyChatSchema = {
  user_id: {
    // ObjectId reference to User collection
    type: 'ObjectId',
    ref: 'User',
    required: false,
    description: 'ID người dùng (có thể null nếu khách ẩn danh)'
  },
  conversation_id: {
    type: 'string',
    required: true,
    description: 'ID hội thoại (dùng để nhóm các tin nhắn trong 1 phiên chat)'
  },
  message: {
    type: 'string',
    required: true,
    trim: true,
    description: 'Nội dung tin nhắn của user'
  },
  response: {
    type: 'string',
    required: true,
    description: 'Câu trả lời của chatbot'
  },
  sources: {
    type: 'array',
    items: {
      type: {
        type: 'string',
        enum: ['recipe', 'blog', 'feedback', 'favourite', 'faq']
      },
      id: 'string',
      name: 'string',
      score: 'number'
    },
    default: [],
    description: 'Nguồn tham khảo được sử dụng để trả lời'
  },
  confidence_score: {
    type: 'number',
    min: 0,
    max: 1,
    description: 'Độ tin cậy của câu trả lời (0-1)'
  },
  confidence_level: {
    type: 'string',
    enum: ['high', 'medium', 'low'],
    description: 'Phân loại mức độ tin cậy của câu trả lời'
  },
  metadata: {
    model_generation: 'string',
    model_embedding: 'string',
    processing_time_ms: 'number',
    tokens_used: 'number'
  },
  feedback: {
    helpful: {
      type: 'boolean',
      default: null,
      description: 'Người dùng đánh giá câu trả lời có hữu ích không'
    },
    rating: {
      type: 'number',
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: 'string',
      trim: true,
      maxlength: 500
    }
  },
  created_at: {
    type: 'Date',
    default: 'Date.now'
  }
};

// Indexes for performance
const indexes = [
  { key: { user_id: 1, created_at: -1 }, name: 'user_history_idx' },
  { key: { conversation_id: 1, created_at: 1 }, name: 'conversation_idx' },
  { key: { created_at: -1 }, name: 'timestamp_idx' }
];

module.exports = {
  collectionName: 'history_chats',
  schema: historyChatSchema,
  indexes: indexes
};
