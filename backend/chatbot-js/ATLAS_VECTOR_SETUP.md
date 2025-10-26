# 🔍 Hướng dẫn tạo MongoDB Atlas Vector Search Indexes

## Bước 1: Truy cập MongoDB Atlas Console

1. Đăng nhập vào: https://cloud.mongodb.com
2. Chọn Project của bạn
3. Chọn Cluster đang dùng (ví dụ: LiliFlowerStore)

## Bước 2: Vào phần Atlas Search

1. Trong menu bên trái, chọn **"Atlas Search"** (icon kính lúp)
2. Hoặc: Database → Browse Collections → chọn tab **"Search Indexes"**

## Bước 3: Tạo Index cho từng Collection

### Index 1: Recipes Collection

**Tên index**: `vector_recipes`  
**Collection**: `Cookify.recipes`

Click **"Create Search Index"** → Chọn **"JSON Editor"** → Dán config:

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

---

### Index 2: Blogs Collection

**Tên index**: `vector_blogs`  
**Collection**: `Cookify.blogs`

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

---

### Index 3: Feedbacks Collection

**Tên index**: `vector_feedbacks`  
**Collection**: `Cookify.feedbacks`

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

---

### Index 4: Favourites Collection

**Tên index**: `vector_favourites`  
**Collection**: `Cookify.favourites`

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

---

## Bước 4: Đợi Index Build

- Mỗi index mất **5-10 phút** để build
- Status sẽ chuyển từ "Building" → "Active"
- Bạn có thể theo dõi tiến trình trong Atlas Console

**Lưu ý**: Chỉ chạy service khi TẤT CẢ index đã **Active**

## Bước 5: Xác minh Indexes

Sau khi tạo xong, bạn có thể kiểm tra:

### Cách 1: Atlas Console
- Vào "Atlas Search" → xem danh sách indexes
- Đảm bảo có 4 indexes: `vector_recipes`, `vector_blogs`, `vector_feedbacks`, `vector_favourites`
- Tất cả đều có status = "Active"

### Cách 2: MongoDB Shell
```javascript
// Connect to your database
use Cookify

// List all search indexes for a collection
db.recipes.getSearchIndexes()
```

### Cách 3: Sau khi backfill embeddings
```bash
# Start the service
npm run dev

# Call stats endpoint
curl http://localhost:8000/stats
```

Response sẽ hiển thị số documents có embedding:
```json
{
  "collections": {
    "recipes": {
      "total": 200,
      "with_embedding": 200,  // ← Should be 100% after backfill
      "percentage": 100
    }
  }
}
```

## ⚠️ Common Issues

### Issue 1: "Index not found" error
**Nguyên nhân**: Index chưa Active hoặc tên sai  
**Giải pháp**: 
- Đợi index status = Active
- Kiểm tra tên index khớp chính xác (case-sensitive)

### Issue 2: Vector search không trả về kết quả
**Nguyên nhân**: Documents chưa có trường `embedding`  
**Giải pháp**: Chạy backfill script:
```bash
npm run backfill
```

### Issue 3: "numDimensions mismatch"
**Nguyên nhân**: Embeddings có dimension khác 768  
**Giải pháp**: 
- Xác nhận đang dùng `models/text-embedding-004` (768D)
- Xóa embeddings cũ và chạy lại backfill

## 📊 Monitoring

Sau khi indexes Active, bạn có thể monitor trong Atlas:

1. **Atlas Search** → chọn index → tab **"Query"**
   - Test query trực tiếp trong UI
   - Xem performance metrics

2. **Metrics** tab:
   - Query count
   - Query latency
   - Error rate

## 🎯 Best Practices

1. **Dimension**: Luôn dùng 768 cho `text-embedding-004`
2. **Similarity**: Dùng `cosine` cho text embeddings
3. **Filters**: Thêm filter fields cho các trường thường query (category, status, etc.)
4. **Naming**: Đặt tên index theo pattern `vector_{collection_name}`
5. **Testing**: Test search với sample queries sau khi Active

## 🚀 Next Steps

Sau khi tạo xong indexes:

1. ✅ Copy `.env.example` → `.env` và điền keys
2. ✅ Chạy `npm run backfill` để tạo embeddings
3. ✅ Chạy `npm run dev` để start service
4. ✅ Test với `curl http://localhost:8000/ask -X POST -H "Content-Type: application/json" -d '{"message":"Cách làm phở?"}'`

---

**Tham khảo**: [MongoDB Atlas Vector Search Docs](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
