# 🎯 HƯỚNG DẪN SỬ DỤNG MULTI-COLLECTION CHATBOT

## 📋 Tổng quan

Chatbot đã được nâng cấp để lấy dữ liệu từ **TẤT CẢ** các collection trong database Cookify:
- ✅ **recipes**: Công thức nấu ăn
- ✅ **blogs**: Bài viết, tips, tricks
- ✅ **feedbacks**: Đánh giá và nhận xét người dùng
- ✅ **favourites**: Thống kê món ăn phổ biến
- ✅ **users**: Thông tin người dùng (reference)

## 🆕 Thay đổi chính

### 1. File mới: `mongodb_multi_collection_sync.py`

File này thay thế `mongodb_sync.py` với khả năng:
- Kết nối đến tất cả 5 collections
- Tạo embeddings cho recipes, blogs, và feedbacks
- Thống kê database toàn diện
- Smart text extraction cho từng loại document

### 2. Cập nhật: `enhanced_main.py`

- Import `MongoDBMultiCollectionSync` thay vì `MongoDBRecipeSync`
- Cache `all_documents_cache` chứa tất cả loại documents
- Generate response từ nhiều nguồn (recipes + blogs + feedbacks)
- Stats endpoint hiển thị breakdown theo collection

### 3. Prompt nâng cao

Gemini AI giờ nhận context từ:
- 📖 Công thức nấu ăn (recipes)
- 📝 Bài viết blog (tips & tricks)
- ⭐ Đánh giá người dùng (feedbacks)
- ❓ FAQ dataset

## 🚀 Cách sử dụng

### Bước 1: Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### Bước 2: Cấu hình .env

```bash
MONGODB_URI=your_mongodb_connection_string
GOOGLE_API_KEY=your_gemini_api_key
```

### Bước 3: Test Multi-Collection Sync

```bash
python test_multi_collection.py
```

Test này sẽ:
- ✅ Kết nối MongoDB
- ✅ Lấy dữ liệu từ tất cả collections
- ✅ Hiển thị statistics
- ✅ Tạo embeddings
- ✅ Test API endpoints (optional)

### Bước 4: Khởi động Chatbot

```bash
python enhanced_main.py
```

hoặc

```bash
python start_server.py
```

## 📊 API Endpoints

### 1. POST /ask
Hỏi chatbot với context từ tất cả collections

```json
{
  "message": "Cách làm phở bò?",
  "include_recipes": true,
  "confidence_threshold": 0.3
}
```

**Response sẽ bao gồm:**
- Thông tin từ recipes
- Tips từ blogs
- Đánh giá từ feedbacks
- Confidence score

### 2. GET /stats
Xem thống kê chi tiết

```json
{
  "total_documents_cached": 500,
  "recipes_cached": 200,
  "blogs_cached": 150,
  "feedbacks_cached": 150,
  "mongodb": {
    "recipes": {"count": 200},
    "blogs": {"count": 150},
    "feedbacks": {"count": 300},
    "favourites": {"count": 500},
    "users": {"count": 100}
  }
}
```

### 3. POST /sync
Đồng bộ lại tất cả dữ liệu

```bash
curl -X POST http://localhost:8000/sync
```

## 🎯 Ví dụ câu hỏi

### Câu hỏi về công thức
```
"Cách làm phở bò?"
→ Trả lời từ: recipes + blogs (tips) + feedbacks (đánh giá)
```

### Câu hỏi về tips
```
"Mẹo nấu ăn ngon?"
→ Trả lời từ: blogs + FAQ + feedbacks
```

### Câu hỏi về món phổ biến
```
"Món nào được yêu thích nhất?"
→ Trả lời từ: favourites + recipes + feedbacks
```

### Câu hỏi về đánh giá
```
"Món gà rán có ngon không?"
→ Trả lời từ: feedbacks + recipes
```

## 🔍 Cách hoạt động

### 1. Data Collection
```
MongoDB Collections → MongoDBMultiCollectionSync
├── recipes → recipe_to_searchable_text()
├── blogs → blog_to_searchable_text()
└── feedbacks → feedback_to_searchable_text()
```

### 2. Embedding Creation
```
All Documents → SentenceTransformer
→ 384-dimensional vectors
→ FAISS Vector Database
```

### 3. Query Processing
```
User Query → Embedding
→ Vector Search (top 8 documents)
→ Context Assembly (recipes + blogs + feedbacks)
→ Gemini AI Generation
→ Confidence Scoring
→ Response
```

## 📈 Lợi ích

### 1. Độ chính xác cao hơn
- Kết hợp nhiều nguồn thông tin
- Context phong phú hơn
- Đánh giá thực tế từ users

### 2. Câu trả lời toàn diện
- Không chỉ công thức
- Có tips & tricks từ blogs
- Có feedback từ người dùng thực

### 3. Thông minh hơn
- Biết món nào phổ biến (favourites)
- Hiểu đánh giá người dùng (feedbacks)
- Cập nhật từ bài viết mới (blogs)

## 🐛 Troubleshooting

### Lỗi: "Failed to connect to MongoDB"
```bash
# Kiểm tra MONGODB_URI trong .env
# Đảm bảo IP được whitelist trong MongoDB Atlas
```

### Lỗi: "No data to create embeddings"
```bash
# Kiểm tra collections có dữ liệu không
python test_multi_collection.py
```

### Response chậm
```bash
# Giảm số documents trong context
# Trong enhanced_main.py, line 285:
for doc in context_docs[:5]:  # Giảm từ 8 xuống 5
```

## 📚 Tài liệu tham khảo

- **Full Documentation**: `CHATBOT_DOCUMENTATION.md`
- **API Testing**: `test_multi_collection.py`
- **Original Test**: `test_enhanced_chatbot.py`

## 🎉 Kết luận

Chatbot giờ đây có khả năng:
- ✅ Truy cập 5 collections
- ✅ Kết hợp nhiều nguồn dữ liệu
- ✅ Đưa ra câu trả lời toàn diện
- ✅ Độ chính xác cao hơn
- ✅ Context phong phú hơn

**Happy Cooking! 🍳👨‍🍳**
