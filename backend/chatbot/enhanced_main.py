"""
Enhanced Chatbot Main Application
Tích hợp Vector DB, MongoDB Sync, và Advanced Confidence Scoring
"""
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional
import logging
from datetime import datetime
import json

# Import custom modules
from vector_db_manager import HybridVectorDB
from mongodb_multi_collection_sync import MongoDBMultiCollectionSync
from mongodb_sync import RecipeSearchOptimizer
from confidence_scorer import AdvancedConfidenceScorer, get_confidence_display
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    include_recipes: bool = True
    confidence_threshold: float = 0.3

class ChatResponse(BaseModel):
    response: str
    confidence: Dict
    sources: List[Dict]
    conversation_id: str
    timestamp: str

class EnhancedCookingChatbot:
    def __init__(self):
        self.app = FastAPI(title="Enhanced Cooking Chatbot API", version="2.0.0")
        self.setup_cors()
        
        # Core components
        self.sentence_model = None
        self.vector_db = None
        self.mongo_sync = None
        self.confidence_scorer = None
        self.search_optimizer = None
        
        # Configuration
        self.mongo_uri = os.getenv("MONGODB_URI", "mongodb+srv://admin:3dk5BqyUu0FlzQ4t@liliflowerstore.byu1dsr.mongodb.net/Cookify?retryWrites=true&w=majority&appName=LiliFlowerStore")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        
        # Data cache
        self.all_documents_cache = []  # Cache for all searchable documents
        self.recipes_cache = []
        self.last_sync_time = None
        
        # Setup routes
        self.setup_routes()
    
    def setup_cors(self):
        """Setup CORS middleware"""
        allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
        
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    async def startup(self):
        """Initialize all components"""
        logger.info("🚀 Starting Enhanced Cooking Chatbot...")
        
        try:
            # 1. Initialize Sentence Transformer
            logger.info("📚 Loading SentenceTransformer model...")
            model_name = os.getenv("SENTENCE_TRANSFORMER_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
            self.sentence_model = SentenceTransformer(model_name)
            logger.info(f"✅ Loaded model: {model_name}")
            
            # 2. Initialize Vector Database
            logger.info("🗄️ Initializing Vector Database...")
            self.vector_db = HybridVectorDB(dimension=384)
            
            # Try to load existing vector DB
            if not self.vector_db.load("./vector_index.faiss", "./vector_metadata.pkl"):
                logger.info("📥 Creating new Vector Database...")
                await self.rebuild_vector_database()
            else:
                logger.info("✅ Loaded existing Vector Database")
            
            # 3. Initialize MongoDB Multi-Collection Sync
            logger.info("🍃 Connecting to MongoDB (All Collections)...")
            self.mongo_sync = MongoDBMultiCollectionSync(self.mongo_uri)
            if self.mongo_sync.connect():
                logger.info("✅ Connected to MongoDB")
                
                # Show database stats
                stats = self.mongo_sync.get_database_stats()
                
                # Sync all data if needed
                await self.sync_all_data_if_needed()
            else:
                logger.warning("⚠️ Failed to connect to MongoDB")
            
            # 4. Initialize other components
            self.confidence_scorer = AdvancedConfidenceScorer()
            self.search_optimizer = RecipeSearchOptimizer()
            
            # 5. Initialize Google Gemini
            if self.google_api_key:
                genai.configure(api_key=self.google_api_key)
                logger.info("✅ Google Gemini API configured")
            else:
                logger.warning("⚠️ Google API key not found")
            
            logger.info("🎉 Enhanced Cooking Chatbot started successfully!")
            
        except Exception as e:
            logger.error(f"❌ Startup failed: {e}")
            raise
    
    async def rebuild_vector_database(self):
        """Rebuild vector database from scratch with ALL collections"""
        logger.info("🔄 Rebuilding Vector Database with ALL collections...")
        
        # 1. Load FAQ data
        faq_data = self.load_faq_data()
        if faq_data:
            faq_embeddings = self.sentence_model.encode([
                f"{item['question']} {item['answer']}" for item in faq_data
            ])
            self.vector_db.add_faq_data(faq_data, faq_embeddings)
        
        # 2. Load and embed ALL data from MongoDB (recipes, blogs, feedbacks)
        if self.mongo_sync:
            documents, embeddings = self.mongo_sync.create_embeddings_for_all_data(self.sentence_model)
            if len(documents) > 0:
                # Separate recipes for cache
                self.recipes_cache = [doc for doc in documents if doc.get('source_type') == 'recipe']
                self.all_documents_cache = documents
                
                # Add to vector database
                for doc, embedding in zip(documents, embeddings):
                    if doc.get('source_type') == 'recipe':
                        self.vector_db.add_recipe_data([doc], [embedding])
                    else:
                        # Add as FAQ-like data for blogs and feedbacks
                        self.vector_db.add_faq_data([doc], [embedding])
                
                logger.info(f"✅ Added {len(documents)} documents to vector DB")
        
        # 3. Save vector database
        self.vector_db.save("./vector_index.faiss", "./vector_metadata.pkl")
        logger.info("💾 Vector Database saved")
    
    async def sync_all_data_if_needed(self):
        """Sync ALL data from all collections if data is outdated"""
        try:
            # Check if we need to sync (daily sync)
            should_sync = False
            
            if not self.last_sync_time:
                should_sync = True
            else:
                time_diff = datetime.now() - self.last_sync_time
                if time_diff.total_seconds() > 24 * 3600:  # 24 hours
                    should_sync = True
            
            if should_sync:
                logger.info("🔄 Syncing ALL data from MongoDB collections...")
                
                # Get all searchable data
                documents, embeddings = self.mongo_sync.create_embeddings_for_all_data(self.sentence_model)
                
                if len(documents) > 0:
                    # Update caches
                    self.all_documents_cache = documents
                    self.recipes_cache = [doc for doc in documents if doc.get('source_type') == 'recipe']
                    
                    # Rebuild vector database with new data
                    await self.rebuild_vector_database()
                    
                    logger.info(f"✅ Synced {len(documents)} documents from all collections")
                    logger.info(f"   - Recipes: {len(self.recipes_cache)}")
                    logger.info(f"   - Blogs: {len([d for d in documents if d.get('source_type') == 'blog'])}")
                    logger.info(f"   - Feedbacks: {len([d for d in documents if d.get('source_type') == 'feedback'])}")
                
                self.last_sync_time = datetime.now()
        
        except Exception as e:
            logger.error(f"❌ Data sync failed: {e}")
    
    def load_faq_data(self) -> List[Dict]:
        """Load FAQ data from JSON file"""
        try:
            with open('./faq_dataset.json', 'r', encoding='utf-8') as f:
                faq_data = json.load(f)
            logger.info(f"📋 Loaded {len(faq_data)} FAQ items")
            return faq_data
        except Exception as e:
            logger.error(f"❌ Failed to load FAQ data: {e}")
            return []
    
    async def process_chat_request(self, request: ChatRequest) -> ChatResponse:
        """Process chat request with enhanced pipeline"""
        try:
            # 1. Create query embedding
            query_embedding = self.sentence_model.encode([request.message])
            
            # 2. Search vector database
            search_results = self.vector_db.search(
                query_embedding, 
                k=10, 
                threshold=request.confidence_threshold
            )
            
            # 3. Enhanced recipe search if requested
            if request.include_recipes and self.recipes_cache:
                recipe_results = self.search_optimizer.multi_strategy_search(
                    request.message, 
                    self.recipes_cache,
                    embeddings=None,  # Will use vector DB results
                    model=self.sentence_model
                )
                
                # Merge results (prioritize vector DB results)
                for recipe in recipe_results[:3]:  # Top 3 recipe matches
                    if not any(r['metadata'].get('recipe_id') == recipe.get('_id') for r in search_results):
                        search_results.append({
                            'metadata': {
                                'type': 'recipe',
                                'recipe_id': recipe.get('_id'),
                                'name': recipe.get('name'),
                                'description': recipe.get('description'),
                                'ingredients': recipe.get('ingredients', []),
                                'instructions': recipe.get('instructions', [])
                            },
                            'similarity_score': recipe.get('similarity_score', 0.6)
                        })
            
            # 4. Calculate confidence scores
            similarity_scores = [r['similarity_score'] for r in search_results]
            retrieved_docs = [r['metadata'] for r in search_results]
            
            # 5. Generate response using Gemini
            response_text = await self.generate_response(request.message, retrieved_docs)
            
            # 6. Calculate advanced confidence
            confidence = self.confidence_scorer.calculate_confidence(
                request.message,
                retrieved_docs,
                similarity_scores,
                response_text
            )
            
            # 7. Prepare response
            return ChatResponse(
                response=response_text,
                confidence=get_confidence_display(confidence),
                sources=search_results[:5],  # Top 5 sources
                conversation_id=request.conversation_id or f"chat_{int(datetime.now().timestamp())}",
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"❌ Chat processing failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def generate_response(self, query: str, context_docs: List[Dict]) -> str:
        """Generate response using Google Gemini with context from ALL sources"""
        try:
            # Prepare context from multiple sources
            context_parts = []
            source_types = {'recipe': 0, 'blog': 0, 'feedback': 0, 'faq': 0}
            
            for doc in context_docs[:8]:  # Use top 8 documents for richer context
                doc_type = doc.get('type') or doc.get('source_type')
                
                if doc_type == 'recipe':
                    recipe_text = f"""
📖 CÔNG THỨC: {doc.get('name', 'Không rõ tên')}
Mô tả: {doc.get('description', 'Không có mô tả')}
Nguyên liệu: {', '.join(doc.get('ingredients', []))}
Cách làm: {'. '.join(doc.get('instructions', []))}
Thời gian: {doc.get('cookingTime', 'Không rõ')}
Độ khó: {doc.get('difficulty', 'Không rõ')}
                    """
                    context_parts.append(recipe_text.strip())
                    source_types['recipe'] += 1
                
                elif doc_type == 'blog':
                    blog_text = f"""
📝 BÀI VIẾT: {doc.get('title', 'Không có tiêu đề')}
Nội dung: {doc.get('content', '')[:500]}...
Danh mục: {doc.get('category', 'Không rõ')}
                    """
                    context_parts.append(blog_text.strip())
                    source_types['blog'] += 1
                
                elif doc_type == 'feedback':
                    feedback_text = f"""
⭐ ĐÁNH GIÁ: {doc.get('rating', 'N/A')}/5 sao
Nhận xét: {doc.get('comment', 'Không có nhận xét')}
                    """
                    context_parts.append(feedback_text.strip())
                    source_types['feedback'] += 1
                
                elif doc_type == 'faq':
                    faq_text = f"❓ Q: {doc.get('question', '')}\n💡 A: {doc.get('answer', '')}"
                    context_parts.append(faq_text)
                    source_types['faq'] += 1
            
            context = "\n\n---\n\n".join(context_parts)
            
            # Create enhanced prompt
            prompt = f"""
Bạn là một chuyên gia nấu ăn AI thông minh của Cookify, chuyên về ẩm thực Việt Nam. 
Bạn có quyền truy cập vào nhiều nguồn thông tin: công thức nấu ăn, bài viết blog, đánh giá người dùng, và FAQ.

THÔNG TIN THAM KHẢO (từ {sum(source_types.values())} nguồn):
{context}

CÂU HỎI: {query}

HƯỚNG DẪN TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện và dễ hiểu
2. Kết hợp thông tin từ TẤT CẢ các nguồn (công thức, blog, đánh giá) để đưa ra câu trả lời toàn diện
3. Nếu có đánh giá/feedback, hãy đề cập đến kinh nghiệm thực tế của người dùng
4. Nếu có bài viết blog liên quan, hãy tham khảo tips và tricks từ đó
5. Nếu là công thức nấu ăn, hãy trình bày rõ ràng từng bước
6. Nếu không có thông tin phù hợp, hãy thành thật nói không biết
7. Đưa ra lời khuyên thực tế, hữu ích và dựa trên nhiều nguồn tin

TRẢ LỜI:
            """
            
            # Generate response
            if self.google_api_key:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                return response.text
            else:
                # Fallback response
                return "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau."
                
        except Exception as e:
            logger.error(f"❌ Response generation failed: {e}")
            return "Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại."
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.on_event("startup")
        async def startup_event():
            await self.startup()
        
        @self.app.post("/ask", response_model=ChatResponse)
        async def ask_question(request: ChatRequest):
            return await self.process_chat_request(request)
        
        @self.app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "vector_db_stats": self.vector_db.get_stats() if self.vector_db else {},
                "mongodb_connected": self.mongo_sync is not None and self.mongo_sync.db is not None
            }
        
        @self.app.get("/stats")
        async def get_stats():
            stats = {
                "vector_db": self.vector_db.get_stats() if self.vector_db else {},
                "total_documents_cached": len(self.all_documents_cache),
                "recipes_cached": len(self.recipes_cache),
                "blogs_cached": len([d for d in self.all_documents_cache if d.get('source_type') == 'blog']),
                "feedbacks_cached": len([d for d in self.all_documents_cache if d.get('source_type') == 'feedback']),
                "last_sync": self.last_sync_time.isoformat() if self.last_sync_time else None
            }
            
            if self.mongo_sync:
                stats["mongodb"] = self.mongo_sync.get_database_stats()
            
            return stats
        
        @self.app.post("/sync")
        async def manual_sync():
            """Manual trigger for all data sync"""
            try:
                await self.sync_all_data_if_needed()
                return {
                    "status": "success", 
                    "message": "All data synced successfully",
                    "total_documents": len(self.all_documents_cache),
                    "recipes": len(self.recipes_cache),
                    "blogs": len([d for d in self.all_documents_cache if d.get('source_type') == 'blog']),
                    "feedbacks": len([d for d in self.all_documents_cache if d.get('source_type') == 'feedback'])
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

# Create app instance
chatbot = EnhancedCookingChatbot()
app = chatbot.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
