# 🤖 COOKIFY CHATBOT - TECHNICAL DOCUMENTATION

## 📋 TỔNG QUAN HỆ THỐNG

### Phiên bản hiện tại
- **Version**: 2.0 (Enhanced)
- **Architecture**: RAG (Retrieval-Augmented Generation)
- **Language**: Python + FastAPI
- **Database**: MongoDB + Vector Database (FAISS)

---

## 🧠 MODELS VÀ THUẬT TOÁN

### 1. Language Models

#### **SentenceTransformer Model**
- **Model Name**: `paraphrase-multilingual-MiniLM-L12-v2`
- **Purpose**: Tạo embeddings cho câu hỏi và documents
- **Dimension**: 384
- **Language Support**: Multilingual (Vietnamese optimized)
- **Performance**: ~500MB RAM, 1-3s response time

#### **Google Gemini Pro**
- **Model**: `gemini-pro`
- **Purpose**: Text generation và response synthesis
- **API**: Google Generative AI
- **Fallback**: Basic responses khi API unavailable

### 2. Vector Database

#### **FAISS (Facebook AI Similarity Search)**
- **Index Types**:
  - `IndexFlatIP`: Exact search (small datasets)
  - `IndexIVFFlat`: Inverted File (balanced speed/accuracy)
  - `IndexHNSWFlat`: Hierarchical NSW (large datasets)
- **Similarity Metric**: Inner Product (Cosine similarity)
- **Storage**: Persistent disk storage

### 3. Confidence Scoring Algorithm

#### **Multi-Factor Scoring System**
```python
Confidence Score = Σ(Factor_i × Weight_i)

Factors:
- Semantic Similarity (25%): Improved cosine similarity
- Keyword Match (20%): Exact keyword matching  
- Context Relevance (15%): Domain-specific relevance
- Data Freshness (10%): Recency of data
- Source Reliability (10%): Source quality score
- Query Clarity (10%): Query quality assessment
- Answer Completeness (10%): Response quality
```

#### **Confidence Levels**
- **Very High**: 0.9-1.0 (90-100%)
- **High**: 0.7-0.9 (70-90%)
- **Medium**: 0.5-0.7 (50-70%)
- **Low**: 0.3-0.5 (30-50%)
- **Very Low**: 0.0-0.3 (0-30%)

---

## 🔄 LUỒNG HOẠT ĐỘNG (WORKFLOW)

### 1. Initialization Flow
```
1. Load SentenceTransformer model
2. Connect to MongoDB
3. Initialize Vector Database (FAISS)
4. Load/Create embeddings from:
   - FAQ dataset (faq_dataset.json)
   - Recipe collection (MongoDB)
5. Configure Google Gemini API
6. Start FastAPI server
```

### 2. Query Processing Flow
```
User Query → Embedding Creation → Vector Search → Context Retrieval → 
Response Generation → Confidence Scoring → Return Response
```

#### **Chi tiết từng bước:**

**Step 1: Query Preprocessing**
- Normalize text
- Language detection
- Query classification (FAQ vs Recipe)

**Step 2: Embedding Generation**
```python
query_embedding = sentence_model.encode([user_query])
# Shape: (1, 384)
```

**Step 3: Vector Search**
```python
# FAISS similarity search
scores, indices = index.search(query_embedding, k=10)
# Return top 10 similar documents
```

**Step 4: Multi-Strategy Search**
- **Exact Match**: Tìm tên món chính xác
- **Ingredient-based**: Tìm theo nguyên liệu
- **Category Filter**: Lọc theo danh mục
- **Semantic Search**: Tìm kiếm ngữ nghĩa

**Step 5: Context Assembly**
```python
context = {
    'faq_results': top_faq_matches,
    'recipe_results': top_recipe_matches,
    'similarity_scores': confidence_scores
}
```

**Step 6: Response Generation**
```python
prompt = f"""
Context: {assembled_context}
Question: {user_query}
Generate Vietnamese cooking advice...
"""
response = gemini_model.generate_content(prompt)
```

**Step 7: Confidence Assessment**
```python
confidence = AdvancedConfidenceScorer.calculate_confidence(
    query=user_query,
    retrieved_docs=context_docs,
    similarity_scores=scores,
    answer=generated_response
)
```

---

## 📊 DATA ARCHITECTURE

### 1. Data Sources

#### **FAQ Dataset** (`faq_dataset.json`)
```json
{
  "question": "Làm sao để cơm không bị nhão?",
  "answer": "Vo gạo sạch, canh tỉ lệ 1 gạo : 1.2 nước...",
  "category": "cooking",
  "tags": ["cơm", "nhão", "vo gạo", "tỉ lệ nước"]
}
```
- **Total Records**: 686 câu hỏi
- **Categories**: cooking, tips, techniques, ingredients
- **Language**: Vietnamese

#### **Recipe Collection** (MongoDB)
```javascript
{
  _id: ObjectId,
  name: "Phở Bò",
  description: "Món phở truyền thống...",
  ingredients: ["thịt bò", "bánh phở", "hành tây"],
  instructions: ["Bước 1: Ninh xương", "Bước 2: Chuẩn bị bánh phở"],
  category: "monchinh",
  cookingTime: "2 giờ",
  difficulty: "medium",
  createdAt: ISODate,
  updatedAt: ISODate
}
```
- **Total Records**: ~200 công thức
- **Categories**: monchinh, monphu, trangmieng, douong, anvat
- **Auto-sync**: Daily synchronization

### 2. Vector Storage

#### **FAISS Index Structure**
```
vector_index.faiss          # Binary index file
vector_metadata.pkl         # Metadata pickle file
├── FAQ embeddings (686 × 384)
├── Recipe embeddings (200 × 384)  
└── Metadata mappings
```

#### **Embedding Process**
```python
# FAQ Embedding
faq_text = f"{question} {answer}"
faq_embedding = model.encode(faq_text)

# Recipe Embedding  
recipe_text = f"{name} {description} {ingredients} {instructions}"
recipe_embedding = model.encode(recipe_text)
```

### 3. Database Schema

#### **MongoDB Collections**
- **recipes**: Main recipe collection
- **users**: User management
- **feedback**: Recipe ratings and reviews
- **blog**: Cooking tips and articles

#### **Vector Database Metadata**
```python
metadata = {
    'type': 'recipe|faq',
    'source_id': 'mongodb_id|faq_index',
    'content': 'searchable_text',
    'category': 'category_name',
    'tags': ['tag1', 'tag2'],
    'created_at': 'timestamp'
}
```

---

## 🔧 TECHNICAL SPECIFICATIONS

### 1. API Endpoints

#### **POST /ask**
```json
Request: {
    "message": "Cách làm phở bò?",
    "conversation_id": "optional",
    "include_recipes": true,
    "confidence_threshold": 0.3
}

Response: {
    "response": "Để làm phở bò ngon...",
    "confidence": {
        "score": 0.85,
        "level": "high", 
        "percentage": 85.0,
        "factors": {...}
    },
    "sources": [...],
    "conversation_id": "chat_123",
    "timestamp": "2025-01-01T00:00:00"
}
```

#### **GET /health**
```json
Response: {
    "status": "healthy",
    "vector_db_stats": {
        "total_documents": 886,
        "index_type": "IVF",
        "dimension": 384
    },
    "mongodb_connected": true
}
```

#### **GET /stats**
```json
Response: {
    "vector_db": {...},
    "recipes_cached": 200,
    "mongodb": {
        "total_recipes": 200,
        "category_distribution": [...],
        "latest_recipes": [...]
    }
}
```

### 2. Configuration

#### **Environment Variables**
```bash
# Core Configuration
GOOGLE_API_KEY=your_api_key
MONGODB_URI=mongodb://connection_string
HOST=0.0.0.0
PORT=8000

# Model Configuration  
SENTENCE_TRANSFORMER_MODEL=paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_DIMENSION=384

# Vector DB Configuration
VECTOR_INDEX_PATH=./vector_index.faiss
VECTOR_METADATA_PATH=./vector_metadata.pkl

# Scoring Configuration
DEFAULT_CONFIDENCE_THRESHOLD=0.3
```

#### **Model Parameters**
```python
# SentenceTransformer
model_config = {
    'model_name': 'paraphrase-multilingual-MiniLM-L12-v2',
    'device': 'cpu',
    'normalize_embeddings': True
}

# FAISS Index
faiss_config = {
    'index_type': 'IVF',
    'nlist': 100,  # Number of clusters
    'nprobe': 10,  # Search clusters
    'metric': 'INNER_PRODUCT'
}

# Confidence Scoring Weights
confidence_weights = {
    'semantic_similarity': 0.25,
    'keyword_match': 0.20,
    'context_relevance': 0.15,
    'data_freshness': 0.10,
    'source_reliability': 0.10,
    'query_clarity': 0.10,
    'answer_completeness': 0.10
}
```

---

## 🚀 DEPLOYMENT & SCALING

### 1. System Requirements

#### **Minimum Requirements**
- **RAM**: 2GB (model loading)
- **Storage**: 1GB (embeddings + models)
- **CPU**: 2 cores
- **Python**: 3.8+

#### **Recommended Requirements**
- **RAM**: 4GB+
- **Storage**: 5GB+
- **CPU**: 4+ cores
- **GPU**: Optional (CUDA support)

### 2. Performance Metrics

#### **Response Times**
- **Cold Start**: 30-60 seconds (model loading)
- **Warm Response**: 1-3 seconds
- **Vector Search**: <100ms
- **Embedding Generation**: 200-500ms

#### **Throughput**
- **Concurrent Users**: 10-50 (single instance)
- **Requests/Second**: 5-10 RPS
- **Memory Usage**: 500MB-1GB

### 3. Monitoring

#### **Health Checks**
- Model loading status
- Vector DB connectivity
- MongoDB connection
- API response times

#### **Metrics Tracking**
- Query processing time
- Confidence score distribution
- Error rates
- Resource usage

---

## 🔍 ADVANCED FEATURES

### 1. Multi-Strategy Search

#### **Search Strategies**
```python
strategies = {
    'exact_match': exact_name_matching,
    'ingredient_based': ingredient_search,
    'semantic_search': vector_similarity,
    'category_filter': category_matching
}
```

#### **Result Fusion**
```python
# Combine results from multiple strategies
final_results = merge_and_rank([
    exact_results,
    ingredient_results, 
    semantic_results,
    category_results
])
```

### 2. Intelligent Caching

#### **Cache Strategy**
- **Vector embeddings**: Persistent disk cache
- **Query results**: In-memory LRU cache
- **Model weights**: Lazy loading

### 3. Auto-Sync Mechanism

#### **MongoDB Sync**
```python
# Daily sync schedule
sync_schedule = {
    'frequency': 'daily',
    'time': '02:00 AM',
    'incremental': True,
    'batch_size': 100
}
```

---

## 🛠️ TROUBLESHOOTING

### 1. Common Issues

#### **Model Loading Errors**
```bash
# Solution: Check internet connection
pip install sentence-transformers --upgrade
```

#### **Vector DB Corruption**
```bash
# Solution: Rebuild index
rm vector_index.faiss vector_metadata.pkl
python enhanced_main.py  # Auto-rebuild
```

#### **MongoDB Connection Issues**
```bash
# Solution: Check connection string
export MONGODB_URI="mongodb://correct_uri"
```

### 2. Performance Optimization

#### **Memory Optimization**
- Use quantized models
- Implement batch processing
- Clear unused embeddings

#### **Speed Optimization**
- Use GPU acceleration
- Implement result caching
- Optimize vector index parameters

---

## 📈 FUTURE ENHANCEMENTS

### 1. Planned Features
- [ ] Conversation history tracking
- [ ] Multi-turn dialogue support
- [ ] Real-time learning from feedback
- [ ] Advanced NLP preprocessing
- [ ] Multi-language support

### 2. Scalability Improvements
- [ ] Distributed vector search
- [ ] Microservices architecture
- [ ] Container orchestration
- [ ] Load balancing
- [ ] Auto-scaling policies

---

## 📁 FILE STRUCTURE & COMPONENTS

### 1. Core Application Files

#### **enhanced_main.py** (Main Application)
- **Purpose**: File chính của chatbot application
- **Features**:
  - FastAPI server setup với CORS middleware
  - Tích hợp Vector DB, MongoDB Sync, và Confidence Scoring
  - RESTful API endpoints (`/ask`, `/health`, `/stats`)
  - Async/await support cho performance tối ưu
  - Conversation management với conversation_id
- **Class**: `EnhancedCookingChatbot`
- **Dependencies**: FastAPI, SentenceTransformers, Google Gemini API
- **Port**: 8000 (default)

#### **confidence_scorer.py** (Confidence Scoring System)
- **Purpose**: Hệ thống đánh giá độ tin cậy của câu trả lời
- **Features**:
  - Multi-factor confidence scoring (7 factors)
  - Confidence levels: Very High, High, Medium, Low, Very Low
  - Cooking-specific keyword matching
  - Query clarity assessment
  - Answer completeness evaluation
- **Class**: `AdvancedConfidenceScorer`
- **Weights**:
  - Semantic Similarity: 25%
  - Keyword Match: 20%
  - Context Relevance: 15%
  - Data Freshness: 10%
  - Source Reliability: 10%
  - Query Clarity: 10%
  - Answer Completeness: 10%

#### **vector_db_manager.py** (Vector Database Manager)
- **Purpose**: Quản lý FAISS vector database cho similarity search
- **Features**:
  - Support multiple FAISS index types (Flat, IVF, HNSW)
  - Persistent storage (save/load index)
  - Batch embedding operations
  - Hybrid search (FAQ + Recipe)
  - Metadata management
- **Class**: `VectorDBManager`, `HybridVectorDB`
- **Index Types**:
  - **Flat**: Exact search, small datasets
  - **IVF**: Inverted File, balanced speed/accuracy
  - **HNSW**: Hierarchical NSW, large datasets

#### **mongodb_sync.py** (MongoDB Synchronization - Legacy)
- **Purpose**: Đồng bộ dữ liệu công thức từ MongoDB (Legacy version)
- **Features**:
  - Auto-sync recipes từ MongoDB collection
  - Recipe search optimization
  - Category-based filtering
  - Ingredient-based search
- **Class**: `MongoDBRecipeSync`, `RecipeSearchOptimizer`
- **Status**: Still used for RecipeSearchOptimizer

#### **mongodb_multi_collection_sync.py** (Multi-Collection Sync - NEW)
- **Purpose**: Đồng bộ dữ liệu từ TẤT CẢ collections trong database
- **Features**:
  - **Recipes Collection**: Công thức nấu ăn với đầy đủ thông tin
  - **Blogs Collection**: Bài viết, tips, tricks về nấu ăn
  - **Feedbacks Collection**: Đánh giá và nhận xét của người dùng
  - **Favourites Collection**: Thống kê món ăn phổ biến
  - **Users Collection**: Thông tin người dùng (reference only)
  - Unified embedding creation cho tất cả data
  - Database statistics và analytics
  - Smart text extraction cho từng loại document
- **Class**: `MongoDBMultiCollectionSync`
- **Collections**: recipes, blogs, favourites, feedbacks, users

### 2. Setup & Utility Files

#### **create_embeddings_st.py** (Embedding Generator)
- **Purpose**: Tạo embeddings từ FAQ dataset
- **Features**:
  - Load FAQ data từ JSON
  - Generate embeddings với SentenceTransformers
  - Save embeddings to Parquet format
  - Support multiple model options
  - Progress tracking với tqdm
- **Output**: `cooking_qa_embeddings.parquet`
- **Model**: paraphrase-multilingual-MiniLM-L12-v2

#### **setup_enhanced_chatbot.py** (Setup Script)
- **Purpose**: Tự động cài đặt và cấu hình hệ thống
- **Features**:
  - Install Python dependencies
  - Setup environment files (.env)
  - Create necessary directories
  - Download models
  - Initialize vector database
  - Verify installation
- **Usage**: `python setup_enhanced_chatbot.py`

#### **start_server.py** (Server Launcher)
- **Purpose**: Script khởi động server với auto-configuration
- **Features**:
  - Check dependencies
  - Verify embeddings file
  - Auto-create embeddings if missing
  - Start uvicorn server
  - Error handling và logging
- **Usage**: `python start_server.py`
- **Default**: http://localhost:8000

#### **test_enhanced_chatbot.py** (Testing Script)
- **Purpose**: Test chatbot functionality
- **Features**:
  - Health check endpoint testing
  - Multiple test questions
  - Confidence score validation
  - Response quality assessment
  - Async testing với aiohttp
- **Test Cases**: 5 predefined cooking questions
- **Usage**: `python test_enhanced_chatbot.py`

### 3. Configuration Files

#### **requirements.txt** (Dependencies)
- **Purpose**: Python package dependencies
- **Core Packages**:
  - `fastapi==0.104.1`: Web framework
  - `sentence-transformers==2.2.2`: Embedding model
  - `faiss-cpu==1.7.4`: Vector search
  - `pymongo==4.4.0`: MongoDB driver
  - `google-generativeai==0.3.2`: Gemini API
  - `torch==2.1.0`: Deep learning framework
  - `pandas==2.1.3`: Data manipulation
  - `numpy==1.24.3`: Numerical computing
- **Dev Packages**: jupyter, pytest, pytest-asyncio

#### **.env / .env.example** (Environment Variables)
- **Purpose**: Configuration settings
- **Variables**:
  - `GOOGLE_API_KEY`: Gemini API key
  - `HOST`: Server host (default: 0.0.0.0)
  - `PORT`: Server port (default: 8000)
  - `ALLOWED_ORIGINS`: CORS origins
  - `SENTENCE_TRANSFORMER_MODEL`: Model name
  - `EMBEDDING_DIMENSION`: Vector dimension (384)
  - `FAQ_DATA_PATH`: FAQ dataset path
  - `EMBEDDINGS_PATH`: Embeddings file path
  - `SIMILARITY_THRESHOLD`: Minimum similarity (0.3)
  - `TOP_K_RESULTS`: Number of results (5)
  - `LOG_LEVEL`: Logging level (INFO)

### 4. Data Files

#### **faq_dataset.json** (FAQ Database)
- **Purpose**: Knowledge base của chatbot
- **Format**: JSON array
- **Size**: ~165KB (686 questions)
- **Structure**:
  ```json
  {
    "question": "Câu hỏi",
    "answer": "Câu trả lời chi tiết",
    "category": "cooking|tips|techniques|ingredients",
    "tags": ["tag1", "tag2", "tag3"]
  }
  ```
- **Categories**: cooking, tips, techniques, ingredients

#### **cooking_qa_embeddings.parquet** (Vector Embeddings)
- **Purpose**: Pre-computed embeddings cho FAQ
- **Format**: Apache Parquet
- **Size**: ~2MB
- **Columns**:
  - `question`: Original question text
  - `answer`: Answer text
  - `embedding`: 384-dimensional vector
  - `category`: Question category
  - `tags`: Associated tags
- **Generation**: Created by `create_embeddings_st.py`

#### **vector_index.faiss** (FAISS Index)
- **Purpose**: FAISS vector index file
- **Format**: Binary
- **Type**: IVF (Inverted File)
- **Dimension**: 384
- **Auto-generated**: On first run

#### **vector_metadata.pkl** (Index Metadata)
- **Purpose**: Metadata cho vector index
- **Format**: Python pickle
- **Content**: Document IDs, types, sources
- **Paired with**: vector_index.faiss

### 5. Legacy Files (Deprecated)

#### **improved_main.py**
- **Status**: Deprecated, replaced by enhanced_main.py
- **Purpose**: Previous version of chatbot
- **Note**: Kept for reference only

---

## 📚 REFERENCES & RESOURCES

### 1. Technical Papers
- **FAISS**: "Billion-scale similarity search with GPUs"
- **SentenceTransformers**: "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks"
- **RAG**: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"

### 2. Documentation Links
- [SentenceTransformers Docs](https://www.sbert.net/)
- [FAISS Documentation](https://faiss.ai/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Gemini API](https://ai.google.dev/)

### 3. Model Cards
- **paraphrase-multilingual-MiniLM-L12-v2**: Multilingual sentence embeddings
- **Gemini Pro**: Large language model for text generation

---

**Last Updated**: October 2025  
**Version**: 2.0 Enhanced  
**Maintainer**: Cookify Development Team
