"""
MongoDB Multi-Collection Sync Manager
Đồng bộ dữ liệu từ TẤT CẢ các collection: recipes, blogs, favourites, feedbacks, users
"""
import os
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class MongoDBMultiCollectionSync:
    """
    Quản lý đồng bộ dữ liệu từ tất cả collections trong database Cookify
    """
    
    def __init__(self, mongo_uri: str, database_name: str = "Cookify"):
        """
        Initialize Multi-Collection Sync Manager
        
        Args:
            mongo_uri: MongoDB connection string
            database_name: Database name (default: Cookify)
        """
        self.mongo_uri = mongo_uri
        self.database_name = database_name
        self.client = None
        self.db = None
        self.collections = {
            'recipes': None,
            'blogs': None,
            'favourites': None,
            'feedbacks': None,
            'users': None
        }
        
    def connect(self) -> bool:
        """Connect to MongoDB and initialize collections"""
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.database_name]
            
            # Test connection
            self.client.admin.command('ping')
            
            # Initialize collection references
            self.collections['recipes'] = self.db.recipes
            self.collections['blogs'] = self.db.blogs
            self.collections['favourites'] = self.db.favourites
            self.collections['feedbacks'] = self.db.feedbacks
            self.collections['users'] = self.db.users
            
            logger.info(f"✅ Connected to MongoDB: {self.database_name}")
            logger.info(f"📚 Available collections: {list(self.collections.keys())}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            return False
    
    # ==================== RECIPES COLLECTION ====================
    
    def get_all_recipes(self) -> List[Dict]:
        """Lấy tất cả công thức từ collection recipes"""
        try:
            recipes = list(self.collections['recipes'].find({}))
            for recipe in recipes:
                recipe['_id'] = str(recipe['_id'])
                recipe['source_type'] = 'recipe'
            logger.info(f"📖 Retrieved {len(recipes)} recipes")
            return recipes
        except Exception as e:
            logger.error(f"Error fetching recipes: {e}")
            return []
    
    def recipe_to_searchable_text(self, recipe: Dict) -> str:
        """Convert recipe to searchable text"""
        parts = []
        
        if recipe.get('name'):
            parts.append(f"Tên món: {recipe['name']}")
        
        if recipe.get('description'):
            parts.append(f"Mô tả: {recipe['description']}")
        
        if recipe.get('category'):
            category_map = {
                'monchinh': 'món chính',
                'monphu': 'món phụ',
                'trangmieng': 'tráng miệng',
                'douong': 'đồ uống',
                'anvat': 'ăn vặt'
            }
            category_name = category_map.get(recipe['category'], recipe['category'])
            parts.append(f"Danh mục: {category_name}")
        
        if recipe.get('ingredients') and isinstance(recipe['ingredients'], list):
            ingredients_text = ", ".join(recipe['ingredients'])
            parts.append(f"Nguyên liệu: {ingredients_text}")
        
        if recipe.get('instructions') and isinstance(recipe['instructions'], list):
            instructions_text = ". ".join(recipe['instructions'])
            parts.append(f"Cách làm: {instructions_text}")
        
        if recipe.get('cookingTime'):
            parts.append(f"Thời gian: {recipe['cookingTime']}")
        
        if recipe.get('difficulty'):
            parts.append(f"Độ khó: {recipe['difficulty']}")
        
        if recipe.get('tags') and isinstance(recipe['tags'], list):
            tags_text = ", ".join(recipe['tags'])
            parts.append(f"Tags: {tags_text}")
        
        return " | ".join(parts)
    
    # ==================== BLOGS COLLECTION ====================
    
    def get_all_blogs(self) -> List[Dict]:
        """Lấy tất cả bài viết blog"""
        try:
            blogs = list(self.collections['blogs'].find({}))
            for blog in blogs:
                blog['_id'] = str(blog['_id'])
                blog['source_type'] = 'blog'
            logger.info(f"📝 Retrieved {len(blogs)} blogs")
            return blogs
        except Exception as e:
            logger.error(f"Error fetching blogs: {e}")
            return []
    
    def blog_to_searchable_text(self, blog: Dict) -> str:
        """Convert blog to searchable text"""
        parts = []
        
        if blog.get('title'):
            parts.append(f"Tiêu đề: {blog['title']}")
        
        if blog.get('content'):
            # Limit content length to avoid too long text
            content = blog['content'][:1000] if len(blog['content']) > 1000 else blog['content']
            parts.append(f"Nội dung: {content}")
        
        if blog.get('category'):
            parts.append(f"Danh mục: {blog['category']}")
        
        if blog.get('tags') and isinstance(blog['tags'], list):
            tags_text = ", ".join(blog['tags'])
            parts.append(f"Tags: {tags_text}")
        
        if blog.get('author'):
            parts.append(f"Tác giả: {blog['author']}")
        
        return " | ".join(parts)
    
    # ==================== FEEDBACKS COLLECTION ====================
    
    def get_all_feedbacks(self) -> List[Dict]:
        """Lấy tất cả feedback/đánh giá"""
        try:
            feedbacks = list(self.collections['feedbacks'].find({}))
            for feedback in feedbacks:
                feedback['_id'] = str(feedback['_id'])
                feedback['source_type'] = 'feedback'
                # Convert ObjectId references to string
                if 'userId' in feedback:
                    feedback['userId'] = str(feedback['userId'])
                if 'recipeId' in feedback:
                    feedback['recipeId'] = str(feedback['recipeId'])
            logger.info(f"⭐ Retrieved {len(feedbacks)} feedbacks")
            return feedbacks
        except Exception as e:
            logger.error(f"Error fetching feedbacks: {e}")
            return []
    
    def feedback_to_searchable_text(self, feedback: Dict) -> str:
        """Convert feedback to searchable text"""
        parts = []
        
        if feedback.get('comment'):
            parts.append(f"Đánh giá: {feedback['comment']}")
        
        if feedback.get('rating'):
            parts.append(f"Điểm: {feedback['rating']}/5 sao")
        
        if feedback.get('recipeId'):
            # Try to get recipe name
            try:
                recipe = self.collections['recipes'].find_one({'_id': feedback['recipeId']})
                if recipe and recipe.get('name'):
                    parts.append(f"Món ăn: {recipe['name']}")
            except:
                pass
        
        return " | ".join(parts)
    
    # ==================== FAVOURITES COLLECTION ====================
    
    def get_all_favourites(self) -> List[Dict]:
        """Lấy tất cả món ăn yêu thích"""
        try:
            favourites = list(self.collections['favourites'].find({}))
            for fav in favourites:
                fav['_id'] = str(fav['_id'])
                fav['source_type'] = 'favourite'
                if 'userId' in fav:
                    fav['userId'] = str(fav['userId'])
                if 'recipeId' in fav:
                    fav['recipeId'] = str(fav['recipeId'])
            logger.info(f"❤️ Retrieved {len(favourites)} favourites")
            return favourites
        except Exception as e:
            logger.error(f"Error fetching favourites: {e}")
            return []
    
    def get_popular_recipes_from_favourites(self, limit: int = 10) -> List[Dict]:
        """Lấy các món ăn phổ biến nhất dựa trên số lượt yêu thích"""
        try:
            pipeline = [
                {"$group": {
                    "_id": "$recipeId",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}},
                {"$limit": limit}
            ]
            
            popular = list(self.collections['favourites'].aggregate(pipeline))
            
            # Get recipe details
            popular_recipes = []
            for item in popular:
                recipe = self.collections['recipes'].find_one({'_id': item['_id']})
                if recipe:
                    recipe['_id'] = str(recipe['_id'])
                    recipe['favourite_count'] = item['count']
                    popular_recipes.append(recipe)
            
            logger.info(f"🔥 Retrieved {len(popular_recipes)} popular recipes")
            return popular_recipes
            
        except Exception as e:
            logger.error(f"Error getting popular recipes: {e}")
            return []
    
    # ==================== USERS COLLECTION ====================
    
    def get_user_info(self, user_id: str) -> Optional[Dict]:
        """Lấy thông tin user (không dùng cho embedding, chỉ để reference)"""
        try:
            from bson import ObjectId
            user = self.collections['users'].find_one({'_id': ObjectId(user_id)})
            if user:
                user['_id'] = str(user['_id'])
            return user
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None
    
    # ==================== UNIFIED DATA RETRIEVAL ====================
    
    def get_all_searchable_data(self) -> Tuple[List[Dict], List[str]]:
        """
        Lấy TẤT CẢ dữ liệu có thể search từ các collection
        
        Returns:
            Tuple of (documents, searchable_texts)
        """
        all_documents = []
        all_texts = []
        
        # 1. Recipes
        recipes = self.get_all_recipes()
        for recipe in recipes:
            all_documents.append(recipe)
            all_texts.append(self.recipe_to_searchable_text(recipe))
        
        # 2. Blogs
        blogs = self.get_all_blogs()
        for blog in blogs:
            all_documents.append(blog)
            all_texts.append(self.blog_to_searchable_text(blog))
        
        # 3. Feedbacks (có comment hữu ích)
        feedbacks = self.get_all_feedbacks()
        for feedback in feedbacks:
            if feedback.get('comment'):  # Only include feedbacks with comments
                all_documents.append(feedback)
                all_texts.append(self.feedback_to_searchable_text(feedback))
        
        logger.info(f"📊 Total searchable documents: {len(all_documents)}")
        logger.info(f"   - Recipes: {len(recipes)}")
        logger.info(f"   - Blogs: {len(blogs)}")
        logger.info(f"   - Feedbacks: {len([f for f in feedbacks if f.get('comment')])}")
        
        return all_documents, all_texts
    
    def create_embeddings_for_all_data(self, model: SentenceTransformer) -> Tuple[List[Dict], np.ndarray]:
        """
        Tạo embeddings cho TẤT CẢ dữ liệu
        
        Args:
            model: SentenceTransformer model
            
        Returns:
            Tuple of (documents, embeddings)
        """
        documents, texts = self.get_all_searchable_data()
        
        if not texts:
            logger.warning("No data to create embeddings")
            return [], np.array([])
        
        logger.info(f"🔄 Creating embeddings for {len(texts)} documents...")
        embeddings = model.encode(texts, show_progress_bar=True, batch_size=32)
        logger.info(f"✅ Created embeddings with shape: {embeddings.shape}")
        
        return documents, embeddings
    
    # ==================== STATISTICS ====================
    
    def get_database_stats(self) -> Dict:
        """Lấy thống kê tổng quan về database"""
        try:
            stats = {
                'recipes': {
                    'count': self.collections['recipes'].count_documents({}),
                    'categories': list(self.collections['recipes'].aggregate([
                        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
                    ]))
                },
                'blogs': {
                    'count': self.collections['blogs'].count_documents({})
                },
                'feedbacks': {
                    'count': self.collections['feedbacks'].count_documents({}),
                    'avg_rating': list(self.collections['feedbacks'].aggregate([
                        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
                    ]))
                },
                'favourites': {
                    'count': self.collections['favourites'].count_documents({})
                },
                'users': {
                    'count': self.collections['users'].count_documents({})
                }
            }
            
            logger.info("📊 Database Statistics:")
            for collection, data in stats.items():
                logger.info(f"   - {collection}: {data.get('count', 0)} documents")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("🔌 MongoDB connection closed")
