# 🔄 Hướng dẫn đồng bộ Embeddings

## Tổng quan

Khi admin thêm/sửa công thức (recipes), blog, hoặc feedback mới, cần tạo embedding để chatbot có thể tìm kiếm được.

## ⚠️ Quan trọng: An toàn dữ liệu

- ✅ **CHỈ CẬP NHẬT** trường `embedding` và `embedding_updated_at`
- ✅ **KHÔNG XÓA** bất kỳ dữ liệu nào
- ✅ **KHÔNG SỬA** các trường khác (name, description, ingredients, etc.)
- ✅ Chỉ **INSERT** vào collection `history_chats` (lưu lịch sử chat)

## Cách 1: Endpoint `/sync` (Ngắn hạn - Dễ nhất)

### Khi nào dùng?
- Sau khi admin thêm/sửa recipes, blogs, feedbacks
- Chạy định kỳ (vd: mỗi 10 phút) để đồng bộ tự động
- Khi phát hiện có documents chưa có embedding

### Cách gọi

**Sync tất cả collections:**
```bash
curl -X POST http://localhost:8000/sync \
  -H "Content-Type: application/json"
```

**Sync chỉ recipes:**
```bash
curl -X POST http://localhost:8000/sync \
  -H "Content-Type: application/json" \
  -d '{"collections": ["recipes"]}'
```

**Sync nhiều collections:**
```bash
curl -X POST http://localhost:8000/sync \
  -H "Content-Type: application/json" \
  -d '{"collections": ["recipes", "blogs", "feedbacks"]}'
```

### Response mẫu
```json
{
  "success": true,
  "message": "Sync completed",
  "results": {
    "recipes": {
      "synced": 5,
      "total_without_embedding": 5
    },
    "blogs": {
      "synced": 0,
      "message": "All documents already have embeddings"
    },
    "feedbacks": {
      "synced": 2,
      "total_without_embedding": 2
    }
  },
  "processing_time_ms": 3421,
  "timestamp": "2025-10-25T12:00:00.000Z"
}
```

### Tích hợp vào Admin Panel

**Option A: Nút "Sync Embeddings" trong Admin UI**
```javascript
// In your admin panel
async function syncEmbeddings() {
  try {
    const response = await fetch('http://localhost:8000/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log('Sync result:', result);
    alert(`Synced: ${JSON.stringify(result.results)}`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
```

**Option B: Auto-sync sau khi tạo recipe**
```javascript
// After creating a recipe in admin
async function createRecipe(recipeData) {
  // 1. Create recipe
  const recipe = await fetch('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(recipeData)
  });
  
  // 2. Trigger sync for this recipe
  await fetch('http://localhost:8000/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collections: ['recipes'] })
  });
  
  return recipe;
}
```

**Option C: Cron job (Node.js backend)**
```javascript
// In your main backend (backend/src/...)
const cron = require('node-cron');

// Sync every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const response = await fetch('http://localhost:8000/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log('Auto-sync completed:', result);
  } catch (error) {
    console.error('Auto-sync failed:', error);
  }
});
```

## Cách 2: Embed trực tiếp khi tạo (Dài hạn - Tốt nhất)

### Khi nào dùng?
- Khi bạn muốn realtime sync (không delay)
- Khi bạn có nhiều recipes mới mỗi ngày
- Production environment

### Cách làm

**Bước 1: Cài đặt dependencies trong backend chính**
```bash
cd backend
npm install dotenv @google/generative-ai
```

**Bước 2: Tạo file `backend/src/utils/embeddings.js`**
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = 'models/text-embedding-004';

async function createEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: embeddingModel });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding creation failed:', error.message);
    return null;
  }
}

function buildRecipeSearchText(recipe) {
  const parts = [];
  
  if (recipe.name) parts.push(`Tên món: ${recipe.name}`);
  if (recipe.description) parts.push(`Mô tả: ${recipe.description}`);
  if (recipe.category) parts.push(`Danh mục: ${recipe.category}`);
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    parts.push(`Nguyên liệu: ${recipe.ingredients.join(', ')}`);
  }
  if (recipe.instructions) parts.push(`Cách làm: ${recipe.instructions}`);
  if (recipe.difficulty) parts.push(`Độ khó: ${recipe.difficulty}`);
  if (recipe.cookingTime) parts.push(`Thời gian: ${recipe.cookingTime}`);
  
  return parts.join(' | ');
}

module.exports = { createEmbedding, buildRecipeSearchText };
```

**Bước 3: Cập nhật Recipe Controller**
```javascript
// In backend/src/controllers/recipeController.js
const Recipe = require('../model/recipeModel');
const { createEmbedding, buildRecipeSearchText } = require('../utils/embeddings');

// Create new recipe
exports.createRecipe = async (req, res) => {
  try {
    // 1. Create recipe document
    const recipe = new Recipe(req.body);
    await recipe.save();
    
    // 2. Create embedding asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const searchText = buildRecipeSearchText(recipe.toObject());
        const embedding = await createEmbedding(searchText);
        
        if (embedding) {
          await Recipe.updateOne(
            { _id: recipe._id },
            { 
              $set: { 
                embedding: embedding,
                embedding_updated_at: new Date()
              }
            }
          );
          console.log(`✅ Embedding created for recipe: ${recipe.name}`);
        }
      } catch (error) {
        console.error('Failed to create embedding:', error);
        // Don't fail the request, just log the error
      }
    });
    
    // 3. Return response immediately
    res.status(201).json({
      success: true,
      data: recipe
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update recipe
exports.updateRecipe = async (req, res) => {
  try {
    // 1. Update recipe
    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found'
      });
    }
    
    // 2. Re-create embedding asynchronously
    setImmediate(async () => {
      try {
        const searchText = buildRecipeSearchText(recipe.toObject());
        const embedding = await createEmbedding(searchText);
        
        if (embedding) {
          await Recipe.updateOne(
            { _id: recipe._id },
            { 
              $set: { 
                embedding: embedding,
                embedding_updated_at: new Date()
              }
            }
          );
          console.log(`✅ Embedding updated for recipe: ${recipe.name}`);
        }
      } catch (error) {
        console.error('Failed to update embedding:', error);
      }
    });
    
    // 3. Return response
    res.status(200).json({
      success: true,
      data: recipe
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
```

**Bước 4: Thêm GOOGLE_API_KEY vào backend/.env**
```env
GOOGLE_API_KEY=AIzaSyA8NIuQflbwBCTEmVaTOH_Q6KH6QUoeAlI
```

## So sánh 2 cách

| Tiêu chí | Cách 1: /sync | Cách 2: Embed trực tiếp |
|----------|---------------|-------------------------|
| **Độ khó** | Dễ (chỉ gọi API) | Trung bình (sửa controller) |
| **Delay** | 1-10 phút | Realtime (vài giây) |
| **Setup** | Không cần sửa code backend | Cần sửa controller |
| **Phù hợp** | Ngắn hạn, ít recipe mới | Dài hạn, nhiều recipe |
| **Overhead** | Thấp | Thấp (async) |

## Khuyến nghị

### Giai đoạn 1 (Ngay bây giờ): Dùng `/sync`
- Thêm nút "Sync Embeddings" trong admin panel
- Hoặc setup cron job 10 phút/lần
- Đơn giản, không cần sửa code nhiều

### Giai đoạn 2 (Sau 1-2 tuần): Chuyển sang embed trực tiếp
- Khi đã quen với flow
- Khi có nhiều admin thêm recipe thường xuyên
- Để đảm bảo realtime search

## Kiểm tra đồng bộ

### Check documents có embedding
```bash
# Via API
curl http://localhost:8000/stats

# Via MongoDB shell
mongosh "mongodb+srv://..."
use Cookify
db.recipes.countDocuments({ embedding: { $exists: true } })
db.recipes.countDocuments({ embedding: { $exists: false } })
```

### Test search với recipe mới
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"Tên món mới vừa thêm"}'
```

Nếu thấy recipe mới trong `sources` → đồng bộ thành công!

## Troubleshooting

### Sync không tạo embedding
- Kiểm tra `GOOGLE_API_KEY` trong `.env`
- Kiểm tra quota Gemini API: https://makersuite.google.com
- Xem logs trong terminal chatbot-js

### Embedding bị sai
- Kiểm tra `buildSearchableText` có đúng schema không
- Xem sample embedding: `db.recipes.findOne({}, {embedding: {$slice: 5}})`

### Performance chậm
- Giảm số documents sync mỗi lần (hiện tại: 100)
- Tăng delay giữa các batch
- Nâng cấp Gemini quota

---

**Tóm tắt**: Dùng `/sync` ngắn hạn (dễ), chuyển sang embed trực tiếp dài hạn (tốt hơn). Cả 2 đều an toàn, không xóa data.
