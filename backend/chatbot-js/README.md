# 🤖 Cookify Chatbot Service (Node.js)

Chatbot RAG (Retrieval-Augmented Generation) service sử dụng MongoDB Atlas Vector Search và Google Gemini.

## 📋 Tổng quan

- **Framework**: Express.js
- **Database**: MongoDB Atlas với Vector Search
- **Embeddings**: Google Gemini `text-embedding-004` (768 dimensions)
- **LLM**: Google Gemini `gemini-1.5-flash` hoặc `gemini-1.5-pro`
- **Collections**: recipes, blogs, feedbacks, favourites, history_chats

## 🏗️ Kiến trúc

```
User Query
    ↓
[1] Create Embedding (Gemini text-embedding-004)
    ↓
[2] Vector Search (MongoDB Atlas $vectorSearch)
    ↓ (Top-k results from recipes, blogs, feedbacks, favourites)
[3] Build Context Prompt
    ↓
[4] Generate Response (Gemini 1.5-flash/pro)
    ↓
[5] Save to History Chats
    ↓
Response to User
```

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
cd backend/chatbot-js
npm install
```

### 2. Cấu hình Environment Variables

Copy `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:

```env
# MongoDB (Atlas)
MONGODB_URI=mongodb+srv://admin:password@cluster.mongodb.net/Cookify?retryWrites=true&w=majority
DB_NAME=Cookify

# Google Gemini API Key (lấy tại https://makersuite.google.com/app/apikey)
GOOGLE_API_KEY=your_google_api_key_here

# Models
MODEL_EMBEDDING=models/text-embedding-004
MODEL_GENERATION=models/gemini-1.5-flash

# Server
PORT=8000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Tạo MongoDB Atlas Vector Search Indexes

**QUAN TRỌNG**: Bạn phải tạo Vector Search indexes trong MongoDB Atlas trước khi chạy service.

#### Bước 1: Vào MongoDB Atlas Console
- Truy cập: https://cloud.mongodb.com
- Chọn Cluster → Database → Browse Collections
- Chọn database `Cookify`

#### Bước 2: Tạo Search Indexes

Tạo **4 search indexes** cho các collection sau:

##### Index 1: `vector_recipes` (cho collection `recipes`)

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    },
    {
      "type": "filter",
      "path": "difficulty"
    }
  ]
}
```

##### Index 2: `vector_blogs` (cho collection `blogs`)

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    },
    {
      "type": "filter",
      "path": "status"
    }
  ]
}
```

##### Index 3: `vector_feedbacks` (cho collection `feedbacks`)

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "rating"
    },
    {
      "type": "filter",
      "path": "sentiment"
    }
  ]
}
```

##### Index 4: `vector_favourites` (cho collection `favourites`)

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

**Lưu ý**: Mỗi index mất khoảng 5-10 phút để build. Đợi status = "Active" trước khi tiếp tục.

### 4. Backfill Embeddings

Chạy script để tạo embeddings cho tất cả documents hiện có:

```bash
# Backfill tất cả collections
npm run backfill

# Hoặc backfill từng collection riêng lẻ
node scripts/backfillEmbeddings.js recipes
node scripts/backfillEmbeddings.js blogs
node scripts/backfillEmbeddings.js feedbacks
node scripts/backfillEmbeddings.js favourites
```

**Lưu ý về chi phí**: 
- Script này gọi Gemini Embeddings API cho mỗi document.
- Nếu bạn có 200 recipes + 50 blogs + 100 feedbacks = 350 documents → ~350 API calls.
- Gemini có free tier, nhưng hãy kiểm tra quota tại: https://makersuite.google.com

**Thời gian**: Tùy số lượng document, có thể mất 5-30 phút.

### 5. Khởi chạy Service

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Service sẽ chạy tại: **http://localhost:8000**

## 📡 API Endpoints

### POST /ask
Gửi câu hỏi cho chatbot

**Request:**
```json
{
  "message": "Cách làm phở bò?",
  "user_id": "507f1f77bcf86cd799439011",
  "conversation_id": "chat_123",
  "include_popular": true
}
```

**Response:**
```json
{
  "response": "Để làm phở bò ngon, bạn cần...",
  "confidence": {
    "score": 0.85,
    "level": "high",
    "percentage": 85
  },
  "sources": [
    {
      "type": "recipe",
      "id": "...",
      "name": "Phở Bò Truyền Thống",
      "score": 0.92
    }
  ],
  "conversation_id": "chat_123",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "processing_time_ms": 2341
}
```

### GET /health
Kiểm tra trạng thái service

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "mongodb": {
    "connected": true,
    "database": "Cookify"
  },
  "models": {
    "embedding": "models/text-embedding-004",
    "generation": "models/gemini-1.5-flash"
  }
}
```

### GET /stats
Thống kê database và embeddings

**Response:**
```json
{
  "collections": {
    "recipes": {
      "total": 200,
      "with_embedding": 200,
      "percentage": 100
    },
    "blogs": { ... },
    "feedbacks": { ... },
    "favourites": { ... }
  },
  "popular_recipes": [ ... ]
}
```

### GET /history/:user_id
Lấy lịch sử chat của người dùng

**Query params:**
- `limit`: Số lượng tin nhắn (default: 50)
- `conversation_id`: Lọc theo ID hội thoại (optional)

**Response:**
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "total": 25,
  "history": [
    {
      "_id": "...",
      "message": "Làm gà nướng như thế nào?",
      "response": "Để nướng gà ngon...",
      "sources": [ ... ],
      "confidence_score": 0.82,
      "created_at": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

### POST /feedback/:history_id
Gửi phản hồi về câu trả lời

**Request:**
```json
{
  "helpful": true,
  "rating": 5,
  "comment": "Rất hữu ích!"
}
```

## 🗄️ Collection Schemas

### history_chats (Mới)
Lưu lịch sử hội thoại:

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,              // Reference to User
  conversation_id: String,        // Group messages in same session
  message: String,                // User's question
  response: String,               // Bot's answer
  sources: [                      // Sources used
    {
      type: String,               // 'recipe', 'blog', 'feedback', 'favourite'
      id: String,
      name: String,
      score: Number
    }
  ],
  confidence_score: Number,       // 0-1
  metadata: {
    model_generation: String,
    model_embedding: String,
    processing_time_ms: Number,
    tokens_used: Number
  },
  feedback: {
    helpful: Boolean,
    rating: Number,               // 1-5
    comment: String
  },
  created_at: Date
}
```

### Các collection khác
- `recipes`: Schema từ `backend/src/model/recipeModel.js` + trường `embedding: [Number]`
- `blogs`: Schema từ `backend/src/model/blogModel.js` + trường `embedding: [Number]`
- `feedbacks`: Schema từ `backend/src/model/feedbackModel.js` + trường `embedding: [Number]`
- `favourites`: Schema từ `backend/src/model/favouriteModel.js` + trường `embedding: [Number]`

## 🔧 Troubleshooting

### Vector Search không trả về kết quả
1. Kiểm tra index đã "Active" trong Atlas chưa
2. Xác nhận collection có trường `embedding` với đúng dimension (768)
3. Chạy `/stats` để xem số documents có embedding

### Lỗi "Index not found"
- Đảm bảo index name khớp chính xác: `vector_recipes`, `vector_blogs`, etc.
- Đợi index build xong (status = Active)

### Rate limit từ Gemini API
- Thêm delay trong `embedBatch()` (hiện tại: 500ms)
- Giảm `BATCH_SIZE` trong `backfillEmbeddings.js`
- Nâng cấp Google AI quota

### MongoDB connection timeout
- Kiểm tra IP whitelist trong Atlas
- Xác nhận MongoDB URI đúng
- Test connection: `mongosh "mongodb+srv://..."`

## 📊 Performance Tips

1. **Caching**: Embeddings đã được lưu trong DB, không tạo lại khi query
2. **Batch processing**: Backfill script xử lý 50 docs/lần
3. **Index optimization**: Đã tạo filter indexes cho category, difficulty, etc.
4. **Model selection**: 
   - `gemini-1.5-flash`: Nhanh hơn, giá rẻ hơn (recommended)
   - `gemini-1.5-pro`: Chất lượng tốt hơn, chậm hơn

## 🔄 Migration từ Python Chatbot

1. Deploy JS service song song với Python service
2. Test kỹ với `/ask` endpoint
3. Chuyển frontend endpoint từ Python sang JS
4. Monitor logs và feedback
5. Tắt Python service khi ổn định

## 📝 Development Workflow

```bash
# 1. Cài đặt
npm install

# 2. Setup .env
cp .env.example .env
# Edit .env với keys thật

# 3. Tạo Atlas Vector Search indexes (xem mục 3 ở trên)

# 4. Backfill embeddings
npm run backfill

# 5. Start dev server
npm run dev

# 6. Test endpoints
curl http://localhost:8000/health
curl -X POST http://localhost:8000/ask -H "Content-Type: application/json" -d '{"message":"Cách làm cơm rang?"}'
```

## 🌟 Features

✅ RAG với MongoDB Atlas Vector Search  
✅ Gemini embeddings (768D) và generation  
✅ Multi-collection search (recipes, blogs, feedbacks, favourites)  
✅ Chat history tracking  
✅ User feedback collection  
✅ Popular recipes aggregation  
✅ Confidence scoring  
✅ Source attribution  
✅ CORS support  
✅ **Chỉ READ data, không XÓA hoặc SỬA dữ liệu gốc**  

## 🚧 Roadmap

- [ ] Streaming responses
- [ ] Multi-turn conversations với context window
- [ ] A/B testing giữa gemini-1.5-flash và gemini-1.5-pro
- [ ] Analytics dashboard cho chat metrics
- [ ] Auto re-embedding khi document thay đổi
- [ ] Caching layer với Redis

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs trong terminal
2. `/health` endpoint
3. `/stats` endpoint để xem số documents có embedding

---

**Version**: 1.0.0  
**Last Updated**: October 2025
