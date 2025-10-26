# 📚 FAQ Integration Guide

## Tổng quan

Chatbot Node.js giờ đã tích hợp **FAQ dataset** (4118 câu hỏi thường gặp) để bổ sung cho Vector Search từ MongoDB.

## Cách hoạt động

### Luồng trả lời
1. **Vector Search** (recipes, blogs, feedbacks) → tìm thông tin từ database
2. **FAQ Search** (faq_dataset.json) → tìm câu hỏi tương tự trong FAQ
3. **Gemini LLM** → kết hợp cả 2 nguồn để tạo câu trả lời

### Ưu điểm
- ✅ Trả lời nhanh các câu hỏi phổ biến (mẹo nấu ăn, bảo quản, thay thế nguyên liệu)
- ✅ Không cần tạo embedding cho FAQ (dùng text matching đơn giản)
- ✅ Bổ sung cho vector search khi không có kết quả từ DB

## Setup

### Bước 1: Copy file FAQ
```bash
# Từ thư mục gốc cookify
cp backend/chatbot/faq_dataset.json backend/chatbot-js/faq_dataset.json
```

Hoặc để file ở `backend/chatbot/faq_dataset.json` và cấu hình path trong `.env`.

### Bước 2: Cấu hình .env
Thêm vào `backend/chatbot-js/.env`:
```env
# FAQ Configuration (optional)
FAQ_DATA_PATH=../chatbot/faq_dataset.json
```

Hoặc nếu copy file vào `chatbot-js/`:
```env
FAQ_DATA_PATH=./faq_dataset.json
```

### Bước 3: Restart service
```bash
cd backend/chatbot-js
npm run dev
```

Log sẽ hiển thị:
```
✅ Loaded 4118 FAQ entries
```

## Test FAQ

### Câu hỏi FAQ thuần túy
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"Làm sao để cơm không bị nhão?"}'
```

Response sẽ kết hợp:
- Vector search từ recipes/blogs/feedbacks
- FAQ matching từ faq_dataset.json

### Câu hỏi về recipe
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"Món phở bò nào ngon?"}'
```

Response ưu tiên recipes từ DB, FAQ làm bổ sung.

## FAQ Dataset Structure

File `faq_dataset.json` chứa 4118 entries:
```json
[
  {
    "question": "Làm sao để cơm không bị nhão?",
    "answer": "Vo gạo sạch, canh tỉ lệ 1 gạo : 1.2 nước và để cơm nghỉ 10 phút sau khi nấu.",
    "category": "cooking",
    "tags": ["cơm", "nhão", "vo gạo", "tỉ lệ nước"]
  },
  ...
]
```

### Categories
- `cooking` - Mẹo nấu ăn
- `storage` - Bảo quản thực phẩm
- `substitution` - Thay thế nguyên liệu
- `nutrition` - Dinh dưỡng
- `general` - Chung chung

## Cách FAQ Search hoạt động

### 1. Text Similarity
Dùng **Jaccard similarity** trên words:
```javascript
// Ví dụ:
query = "cơm bị nhão"
faq.question = "Làm sao để cơm không bị nhão?"

// Tính similarity:
words_query = ["cơm", "bị", "nhão"]
words_faq = ["làm", "sao", "để", "cơm", "không", "bị", "nhão"]

intersection = ["cơm", "bị", "nhão"] → 3 words
union = 7 words
similarity = 3/7 = 0.43 (43%)
```

### 2. Threshold
- Mặc định: `threshold = 0.2` (20% match)
- Top 3 FAQ được thêm vào context cho LLM

### 3. Integration với Vector Search
```
User query: "Làm sao để cơm không nhão?"
    ↓
[Vector Search]          [FAQ Search]
recipes: 5 results       faq: 3 matches
blogs: 3 results         (similarity > 20%)
feedbacks: 2 results
    ↓                         ↓
    └─────── Combine ─────────┘
              ↓
        [Gemini LLM]
              ↓
        Final Answer
```

## API Response Format

Response từ `/ask` giờ có thể chứa FAQ info:

```json
{
  "response": "Để cơm không bị nhão, bạn cần...",
  "confidence": {
    "score": 0.75,
    "level": "high"
  },
  "sources": [
    {
      "type": "recipe",
      "name": "Cơm Chiên Dương Châu",
      "score": 0.82
    },
    {
      "type": "blog",
      "name": "Mẹo Nấu Cơm Ngon",
      "score": 0.71
    }
  ],
  "faq_used": true,  // Indicates FAQ was included in context
  "processing_time_ms": 2341
}
```

## Tuning FAQ Search

### Tăng/giảm số FAQ trong context
Sửa trong `src/index.js`:
```javascript
// Từ:
faqContext = buildFAQContext(query, 3);

// Thành (ví dụ 5 FAQ):
faqContext = buildFAQContext(query, 5);
```

### Thay đổi threshold
Sửa trong `src/utils/faqSearch.js`:
```javascript
// Trong buildFAQContext()
const results = searchFAQ(query, topK, 0.2);  // 0.2 = 20% match

// Tăng lên 0.3 để chặt chẽ hơn:
const results = searchFAQ(query, topK, 0.3);
```

### Tắt FAQ (chỉ dùng Vector Search)
Sửa trong `src/index.js`, hàm `/ask`:
```javascript
// Từ:
const prompt = buildContextPrompt(message, searchResults);

// Thành:
const prompt = buildContextPrompt(message, searchResults, false);
```

## Troubleshooting

### FAQ không load
- Kiểm tra path trong `.env`: `FAQ_DATA_PATH`
- Kiểm tra file tồn tại: `ls backend/chatbot/faq_dataset.json`
- Xem log khi start: `⚠️ FAQ file not found` hoặc `✅ Loaded X FAQ entries`

### FAQ không xuất hiện trong response
- FAQ chỉ xuất hiện khi similarity > threshold (20%)
- Thử câu hỏi gần giống FAQ: "Làm sao để cơm không nhão?"
- Kiểm tra log: `buildFAQContext` có trả về context không

### Performance chậm
- FAQ search rất nhanh (~1ms) vì chỉ text matching
- Nếu chậm, giảm số FAQ: `buildFAQContext(query, 1)` thay vì 3

## So sánh FAQ vs Vector Search

| Tiêu chí | FAQ Search | Vector Search |
|----------|------------|---------------|
| **Dữ liệu** | 4118 Q&A cố định | Recipes/blogs/feedbacks từ DB |
| **Độ chính xác** | Trung bình (text match) | Cao (semantic similarity) |
| **Tốc độ** | Rất nhanh (~1ms) | Nhanh (~50-100ms) |
| **Setup** | Dễ (chỉ copy file) | Phức tạp (indexes, embeddings) |
| **Cập nhật** | Thủ công (sửa JSON) | Tự động (sync từ DB) |
| **Use case** | Câu hỏi chung, mẹo nấu ăn | Recipes cụ thể, blogs mới |

## Best Practices

### 1. Kết hợp cả 2
- Dùng Vector Search cho recipes/blogs cụ thể
- Dùng FAQ cho câu hỏi chung (mẹo, bảo quản, thay thế)

### 2. Ưu tiên Vector Search
- Vector Search có độ chính xác cao hơn
- FAQ chỉ làm bổ sung khi Vector Search ít kết quả

### 3. Cập nhật FAQ định kỳ
- Thêm câu hỏi mới từ user feedback
- Xóa câu hỏi lỗi thời
- Cải thiện câu trả lời dựa trên analytics

## Roadmap

### Ngắn hạn
- [x] Tích hợp FAQ search
- [x] Kết hợp với Vector Search
- [ ] Analytics: câu hỏi nào dùng FAQ nhiều nhất

### Dài hạn
- [ ] Tạo embeddings cho FAQ (thay text matching)
- [ ] Auto-update FAQ từ chat history
- [ ] A/B test FAQ vs no-FAQ

## Tóm tắt

- ✅ FAQ dataset (4118 entries) đã tích hợp
- ✅ Tự động load khi start service
- ✅ Kết hợp với Vector Search trong prompt
- ✅ Không cần embedding, dùng text matching
- ✅ Cải thiện câu trả lời cho câu hỏi chung

**Next**: Copy file FAQ, thêm `FAQ_DATA_PATH` vào `.env`, restart service!
