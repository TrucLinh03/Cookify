import os
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from typing import List, Optional
import logging
from dotenv import load_dotenv

# Load environment variables từ .env file
load_dotenv()

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    logger.warning('GOOGLE_API_KEY not set in environment; Gemini calls may fail')
else:
    os.environ['GOOGLE_API_KEY'] = GOOGLE_API_KEY
    genai.configure(api_key=GOOGLE_API_KEY)

# Models
gemini_model = genai.GenerativeModel('models/gemini-2.0-flash-exp')
sentence_model = None  # Sẽ được load sau

# Load dữ liệu embeddings
parquet_path = './cooking_qa_embeddings.parquet'
recipes_parquet = './cooking_recipes_embeddings.parquet'
df = None

# Mongo config for optional admin indexing (optional)
try:
    from pymongo import MongoClient
    from bson import ObjectId
    MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    MONGO_DB = os.getenv('MONGODB_DB', 'cookify')
    MONGO_COLL = os.getenv('MONGODB_COLLECTION', 'recipes')
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    recipes_coll = mongo_client[MONGO_DB][MONGO_COLL]
    logger.info("MongoDB connected (optional feature)")
except Exception as mongo_error:
    logger.warning(f"MongoDB không khả dụng (optional): {mongo_error}")
    mongo_client = None
    recipes_coll = None
    MongoClient = None
    ObjectId = None

def load_data():
    global df, sentence_model
    try:
        # Load FAQ embeddings
        if os.path.exists(parquet_path):
            df_faq = pd.read_parquet(parquet_path)
            df_faq['source_type'] = 'faq'
            logger.info(f"Đã load {len(df_faq)} câu hỏi từ {parquet_path}")
        else:
            logger.warning(f"Không tìm thấy file {parquet_path}. Vui lòng chạy create_embeddings_st.py trước.")
            df_faq = pd.DataFrame()

        # Load recipe embeddings if exist
        if os.path.exists(recipes_parquet):
            df_recipes = pd.read_parquet(recipes_parquet)
            df_recipes['source_type'] = 'recipes'
            logger.info(f"Đã load {len(df_recipes)} recipe embeddings từ {recipes_parquet}")
        else:
            df_recipes = pd.DataFrame()

        # Normalize/concat
        if not df_faq.empty and not df_recipes.empty:
            # Ensure both have common columns
            df = pd.concat([df_faq, df_recipes], ignore_index=True)
        elif not df_faq.empty:
            df = df_faq.copy()
        elif not df_recipes.empty:
            df = df_recipes.copy()
        else:
            df = pd.DataFrame()

        # Load SentenceTransformer model
        logger.info("Đang load SentenceTransformer model...")
        sentence_model = SentenceTransformer(os.getenv('SENTENCE_MODEL_NAME', 'paraphrase-multilingual-MiniLM-L12-v2'))
        logger.info("Đã load SentenceTransformer model")

    except Exception as e:
        logger.error(f"Lỗi khi load dữ liệu: {e}")
        df = pd.DataFrame()
        sentence_model = None


# Admin router for indexing
admin_router = APIRouter(prefix='/admin')


def build_text_for_embedding(recipe):
    title = recipe.get('title') or recipe.get('name') or ''
    ingredients = recipe.get('ingredients', [])
    if isinstance(ingredients, list):
        ingredients_text = ', '.join([str(i) for i in ingredients])
    else:
        ingredients_text = str(ingredients)
    instructions = recipe.get('instructions', '') or recipe.get('steps', '') or recipe.get('content', '')
    instructions_snip = instructions[:2000]
    text = f"Title: {title}\nIngredients: {ingredients_text}\nInstructions: {instructions_snip}"
    return text


@admin_router.post('/index_recipe')
async def index_recipe(payload: dict):
    """Index a single recipe from MongoDB into the recipe parquet and update in-memory df.
    payload expects: { 'recipe_id': '<id string>' }
    """
    if recipes_coll is None:
        raise HTTPException(status_code=503, detail='MongoDB not available')
    
    recipe_id = payload.get('recipe_id')
    if not recipe_id:
        raise HTTPException(status_code=400, detail='recipe_id required')

    # try to convert to ObjectId
    try:
        oid = ObjectId(recipe_id)
    except Exception:
        # use as string id
        oid = recipe_id

    doc = recipes_coll.find_one({'_id': oid}) if isinstance(oid, ObjectId) else recipes_coll.find_one({'_id': recipe_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Recipe not found in MongoDB')

    # Build text and create embedding
    if sentence_model is None:
        raise HTTPException(status_code=500, detail='Sentence model not loaded')

    text = build_text_for_embedding(doc)
    embedding = sentence_model.encode([text])[0].astype(np.float32)

    new_row = {
        'question': text,
        'answer': (doc.get('instructions') or doc.get('steps') or doc.get('content') or '')[:2000],
        'category': doc.get('category', 'recipes'),
        'embedding': embedding.tolist(),
        'meta': {'recipe_id': str(doc.get('_id')), 'title': doc.get('title'), 'source': 'recipes'},
        'source_type': 'recipes'
    }

    # Append to recipes_parquet
    try:
        if os.path.exists(recipes_parquet):
            df_existing = pd.read_parquet(recipes_parquet)
            df_new = pd.concat([df_existing, pd.DataFrame([new_row])], ignore_index=True)
        else:
            df_new = pd.DataFrame([new_row])
        df_new.to_parquet(recipes_parquet, index=False)
    except Exception as e:
        logger.error(f'Failed to append recipe parquet: {e}')
        raise HTTPException(status_code=500, detail='Failed to save recipe embedding')

    # Update in-memory df
    global df
    try:
        if df is None or df.empty:
            df = pd.DataFrame([new_row])
        else:
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    except Exception as e:
        logger.warning(f'Failed to update in-memory df: {e}')

    return {'ok': True, 'recipe_id': str(doc.get('_id'))}


app = FastAPI(
    title="Cookify RAG Chatbot API",
    description="API cho chatbot tư vấn nấu ăn sử dụng RAG với SentenceTransformers",
    version="2.0.0"
)

# Cấu hình CORS cho React frontend
allowed = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register admin router
app.include_router(admin_router)

# Load dữ liệu khi khởi động
load_data()

class Question(BaseModel):
    question: str

class ChatResponse(BaseModel):
    llm_answers: str
    suggestions: Optional[List[str]] = []
    source: str = "rag"
    score: Optional[float] = None
    similar_questions: Optional[List[dict]] = []

def search_similar_embeddings(query_embedding: np.ndarray, df: pd.DataFrame, top_k: int = 5, threshold: float = 0.3) -> pd.DataFrame:
    """Tìm kiếm câu hỏi tương đồng sử dụng cosine similarity"""
    if df.empty:
        return pd.DataFrame()
    
    try:
        query_vector = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
        embedding_matrix = np.array(df['embedding'].tolist(), dtype=np.float32)
        
        similarities = cosine_similarity(query_vector, embedding_matrix)[0]
        
        # Gán similarity vào DataFrame
        df_with_similarity = df.copy()
        df_with_similarity['similarity'] = similarities
        
        # Lọc theo ngưỡng và sắp xếp
        result = (
            df_with_similarity[df_with_similarity['similarity'] >= threshold]
            .sort_values(by='similarity', ascending=False)
            .head(top_k)
        )
        
        return result[['question', 'answer', 'category', 'similarity']]
    
    except Exception as e:
        logger.error(f"Lỗi trong search_similar_embeddings: {e}")
        return pd.DataFrame()

@app.post("/ask", response_model=ChatResponse)
async def receive_question(data: Question):
    """API endpoint để xử lý câu hỏi từ chatbot"""
    try:
        question = data.question.strip()
        
        if not question:
            raise HTTPException(status_code=400, detail="Câu hỏi không được để trống")
        
        logger.info(f"Nhận câu hỏi: {question}")
        
        # Kiểm tra model và dữ liệu
        if sentence_model is None or df.empty:
            return ChatResponse(
                llm_answers="Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau! 😅",
                source="error",
                suggestions=["Thử lại", "Hỏi câu khác"]
            )
        
        # Tạo embedding cho câu hỏi
        question_embedding = sentence_model.encode([question])[0]
        
        # Tìm kiếm câu hỏi tương đồng
        retrieval_docs = search_similar_embeddings(
            query_embedding=question_embedding, 
            df=df, 
            top_k=5, 
            threshold=0.3
        )
        
        # Tạo context từ các câu hỏi tương đồng
        if not retrieval_docs.empty:
            document = "\n\n".join(
                f"Câu hỏi: {row['question']}\nTrả lời: {row['answer']}\nDanh mục: {row['category']}"
                for _, row in retrieval_docs.iterrows()
            )
            
            # Tạo suggestions từ các câu hỏi tương đồng
            suggestions = [
                row['question'][:50] + "..." if len(row['question']) > 50 else row['question']
                for _, row in retrieval_docs.head(3).iterrows()
            ]
            
            similar_questions = [
                {
                    "question": row['question'],
                    "answer": row['answer'][:100] + "..." if len(row['answer']) > 100 else row['answer'],
                    "similarity": float(row['similarity']),
                    "category": row['category']
                }
                for _, row in retrieval_docs.head(3).iterrows()
            ]
            
            max_similarity = float(retrieval_docs['similarity'].max())
            
        else:
            document = "Không tìm thấy thông tin liên quan trong cơ sở dữ liệu."
            suggestions = ["Món nhanh 30 phút", "Món cho gia đình", "Món Việt truyền thống"]
            similar_questions = []
            max_similarity = 0.0
        
        # Tạo prompt cho Gemini
        prompt = f"""
Bạn là Chef AI Assistant - một trợ lý ảo chuyên về nấu ăn và ẩm thực. 
Hãy trả lời câu hỏi của người dùng một cách thân thiện, hữu ích và chính xác.

Nếu có thông tin từ cơ sở dữ liệu, hãy sử dụng và tham khảo. 
Nếu không có thông tin cụ thể, hãy đưa ra lời khuyên chung về nấu ăn dựa trên kiến thức của bạn.
Luôn trả lời bằng tiếng Việt và giữ giọng điệu thân thiện.

Câu hỏi: {question}

Thông tin tham khảo:
{document}

Hãy trả lời một cách ngắn gọn, dễ hiểu và hữu ích.
"""
        
        # Gọi Gemini API
        try:
            response = gemini_model.generate_content(prompt)
            answer = response.text
            source = "rag" if not retrieval_docs.empty else "general"
            
        except Exception as gemini_error:
            logger.error(f"Lỗi Gemini API: {gemini_error}")
            # Fallback response
            if not retrieval_docs.empty:
                answer = f"Dựa trên thông tin tôi có:\n\n{retrieval_docs.iloc[0]['answer']}"
                source = "fallback"
            else:
                answer = "Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại sau! 😅"
                source = "error"
        
        logger.info(f"Trả lời thành công với similarity: {max_similarity:.3f}")
        
        return ChatResponse(
            llm_answers=answer,
            suggestions=suggestions,
            source=source,
            score=max_similarity,
            similar_questions=similar_questions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi không mong muốn: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại!"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": sentence_model is not None,
        "data_loaded": not df.empty if df is not None else False,
        "total_questions": len(df) if df is not None and not df.empty else 0
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Cookify RAG Chatbot API",
        "version": "2.0.0",
        "endpoints": {
            "/ask": "POST - Gửi câu hỏi",
            "/health": "GET - Kiểm tra trạng thái",
            "/docs": "GET - API documentation"
        }
    }