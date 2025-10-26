# 🚀 Quick Start Guide - Cookify Chatbot JS

Hướng dẫn nhanh để chạy chatbot service trong **15 phút**.

## ✅ Prerequisites

- [x] Node.js 16+ đã cài đặt
- [x] MongoDB Atlas account (đã có cluster)
- [x] Google API Key cho Gemini (lấy tại https://makersuite.google.com/app/apikey)

---

## 📝 Các bước thực hiện

### 1️⃣ Cài đặt dependencies (2 phút)

```bash
cd backend/chatbot-js
npm install
```

### 2️⃣ Cấu hình environment (1 phút)

```bash
# Copy file mẫu
cp .env.example .env

# Mở .env và điền 2 giá trị QUAN TRỌNG:
# - GOOGLE_API_KEY=your_actual_key_here
# - MONGODB_URI=your_actual_connection_string
```

**Lưu ý**: Các giá trị khác có thể để mặc định.

### 3️⃣ Tạo Vector Search Indexes trong Atlas (5-10 phút)

**Quan trọng**: Bước này BẮT BUỘC trước khi chạy service.

Chi tiết xem file: [`ATLAS_VECTOR_SETUP.md`](./ATLAS_VECTOR_SETUP.md)

**Tóm tắt nhanh**:
1. Vào https://cloud.mongodb.com
2. Database → Search Indexes → Create Search Index
3. Tạo 4 indexes:
   - `vector_recipes` cho collection `recipes`
   - `vector_blogs` cho collection `blogs`
   - `vector_feedbacks` cho collection `feedbacks`
   - `vector_favourites` cho collection `favourites`

**Config mẫu** (cho mỗi index):
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

**Đợi indexes status = "Active"** (5-10 phút)

### 4️⃣ Backfill Embeddings (5-20 phút tùy số lượng data)

```bash
# Tạo embeddings cho TẤT CẢ collections
npm run backfill

# Hoặc từng collection riêng lẻ nếu muốn theo dõi từng phần:
node scripts/backfillEmbeddings.js recipes
node scripts/backfillEmbeddings.js blogs
node scripts/backfillEmbeddings.js feedbacks
node scripts/backfillEmbeddings.js favourites
```

**Lưu ý**: 
- Script này gọi Gemini API để tạo embeddings
- Có thể mất thời gian tùy số lượng documents
- Sẽ hiển thị progress bar trong terminal

### 5️⃣ Khởi chạy Service (1 phút)

```bash
# Development mode (auto-reload khi code thay đổi)
npm run dev

# Hoặc production mode
npm start
```

Service sẽ chạy tại: **http://localhost:8000**

### 6️⃣ Kiểm tra Service (1 phút)

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Stats (xem số documents có embedding)
curl http://localhost:8000/stats

# 3. Test chat
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"Cách làm cơm rang?"}'
```

**Kết quả mong đợi**:
```json
{
  "response": "Để làm cơm rang ngon...",
  "confidence": { "score": 0.85, "level": "high" },
  "sources": [...],
  "conversation_id": "chat_1234567890"
}
```

---

## 🎉 Done!

Service đang chạy và sẵn sàng nhận requests từ frontend.

## 🔄 Tích hợp với Frontend

Thay đổi endpoint từ Python sang Node.js:

```javascript
// Trước (Python)
const API_URL = 'http://localhost:8000/ask';

// Sau (Node.js) - GIỐNG URL nhưng khác logic backend
const API_URL = 'http://localhost:8000/ask';
```

Request body format GIỐNG HỆT:
```javascript
{
  message: "Cách làm phở?",
  user_id: userId,
  conversation_id: conversationId
}
```

## 📊 Monitoring

### Xem logs trong terminal
Service sẽ hiển thị:
- Incoming requests
- Query embeddings
- Search results
- Response generation
- Processing time

### Kiểm tra database
```bash
# Xem có bao nhiêu documents đã có embedding
curl http://localhost:8000/stats
```

### Xem chat history
```bash
# Replace USER_ID với ObjectId thật
curl http://localhost:8000/history/507f1f77bcf86cd799439011
```

---

## ❓ Troubleshooting

### Service không start được

**Lỗi**: "GOOGLE_API_KEY is required"
```bash
# Giải pháp: Kiểm tra .env có GOOGLE_API_KEY chưa
cat .env | grep GOOGLE_API_KEY
```

**Lỗi**: "MongoDB connection failed"
```bash
# Giải pháp: Kiểm tra MONGODB_URI và network access trong Atlas
# 1. Atlas Console → Network Access → Add IP (0.0.0.0/0 cho development)
# 2. Test connection: mongosh "mongodb+srv://..."
```

### Vector search không trả về kết quả

```bash
# 1. Kiểm tra indexes đã Active chưa
# Vào Atlas Console → Search Indexes → xem status

# 2. Kiểm tra documents có embedding chưa
curl http://localhost:8000/stats
# Xem "with_embedding" phải > 0

# 3. Nếu chưa có, chạy lại backfill
npm run backfill
```

### Rate limit từ Gemini API

```bash
# Giảm batch size trong scripts/backfillEmbeddings.js
# Line 11: BATCH_SIZE = 50 → thay thành 20
# Line 12: DELAY_BETWEEN_BATCHES = 2000 → thay thành 5000
```

---

## 📚 Tài liệu chi tiết

- [README.md](./README.md) - Full documentation
- [ATLAS_VECTOR_SETUP.md](./ATLAS_VECTOR_SETUP.md) - Chi tiết về Vector Search indexes
- [API Documentation](./README.md#-api-endpoints) - Chi tiết API endpoints

## 🆘 Cần trợ giúp?

1. Kiểm tra logs trong terminal
2. Call `/health` endpoint
3. Call `/stats` endpoint
4. Xem lại các bước trong ATLAS_VECTOR_SETUP.md

---

**Chúc bạn deploy thành công! 🎉**
