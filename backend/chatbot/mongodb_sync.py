"""
MongoDB Recipe Sync Manager
Đồng bộ dữ liệu công thức từ MongoDB collection Recipes
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class MongoDBRecipeSync:
    def __init__(self, mongo_uri: str, database_name: str = "Cookify"):
        """
        Initialize MongoDB Recipe Sync Manager
        
        Args:
            mongo_uri: MongoDB connection string
            database_name: Database name
        """
        self.mongo_uri = mongo_uri
        self.database_name = database_name
        self.client = None
        self.db = None
        self.last_sync_time = None
        
    def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.database_name]
            
            # Test connection
            self.client.admin.command('ping')
            logger.info(f"Connected to MongoDB: {self.database_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False
    
    def get_all_recipes(self) -> List[Dict]:
        """Lấy tất cả công thức từ MongoDB"""
        if not self.db:
            raise Exception("Not connected to MongoDB")
        
        try:
            recipes_collection = self.db.recipes
            recipes = list(recipes_collection.find({}))
            
            # Convert ObjectId to string
            for recipe in recipes:
                if '_id' in recipe:
                    recipe['_id'] = str(recipe['_id'])
            
            logger.info(f"Retrieved {len(recipes)} recipes from MongoDB")
            return recipes
            
        except Exception as e:
            logger.error(f"Error fetching recipes: {e}")
            return []
    
    def get_recipes_since(self, since_date: datetime) -> List[Dict]:
        """Lấy công thức được tạo/cập nhật sau thời điểm nhất định"""
        if not self.db:
            raise Exception("Not connected to MongoDB")
        
        try:
            recipes_collection = self.db.recipes
            query = {
                "$or": [
                    {"createdAt": {"$gte": since_date}},
                    {"updatedAt": {"$gte": since_date}}
                ]
            }
            
            recipes = list(recipes_collection.find(query))
            
            # Convert ObjectId to string
            for recipe in recipes:
                if '_id' in recipe:
                    recipe['_id'] = str(recipe['_id'])
            
            logger.info(f"Retrieved {len(recipes)} updated recipes since {since_date}")
            return recipes
            
        except Exception as e:
            logger.error(f"Error fetching updated recipes: {e}")
            return []
    
    def create_recipe_embeddings(self, recipes: List[Dict], model: SentenceTransformer) -> np.ndarray:
        """
        Tạo embeddings cho recipes
        
        Args:
            recipes: List of recipe documents
            model: SentenceTransformer model
            
        Returns:
            numpy array of embeddings
        """
        texts = []
        
        for recipe in recipes:
            # Tạo text có thể search được từ recipe
            recipe_text = self._recipe_to_searchable_text(recipe)
            texts.append(recipe_text)
        
        # Tạo embeddings
        embeddings = model.encode(texts, show_progress_bar=True)
        logger.info(f"Created embeddings for {len(recipes)} recipes")
        
        return embeddings
    
    def _recipe_to_searchable_text(self, recipe: Dict) -> str:
        """Convert recipe to searchable text"""
        parts = []
        
        # Tên món ăn
        if recipe.get('name'):
            parts.append(f"Tên món: {recipe['name']}")
        
        # Mô tả
        if recipe.get('description'):
            parts.append(f"Mô tả: {recipe['description']}")
        
        # Danh mục
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
        
        # Nguyên liệu
        if recipe.get('ingredients') and isinstance(recipe['ingredients'], list):
            ingredients_text = ", ".join(recipe['ingredients'])
            parts.append(f"Nguyên liệu: {ingredients_text}")
        
        # Hướng dẫn nấu
        if recipe.get('instructions') and isinstance(recipe['instructions'], list):
            instructions_text = ". ".join(recipe['instructions'])
            parts.append(f"Cách làm: {instructions_text}")
        
        # Thời gian nấu
        if recipe.get('cookingTime'):
            parts.append(f"Thời gian: {recipe['cookingTime']}")
        
        # Độ khó
        if recipe.get('difficulty'):
            parts.append(f"Độ khó: {recipe['difficulty']}")
        
        # Tags
        if recipe.get('tags') and isinstance(recipe['tags'], list):
            tags_text = ", ".join(recipe['tags'])
            parts.append(f"Tags: {tags_text}")
        
        return " | ".join(parts)
    
    def get_recipe_stats(self) -> Dict:
        """Lấy thống kê về recipes"""
        if not self.db:
            return {}
        
        try:
            recipes_collection = self.db.recipes
            
            # Tổng số recipes
            total_count = recipes_collection.count_documents({})
            
            # Thống kê theo category
            category_stats = list(recipes_collection.aggregate([
                {"$group": {"_id": "$category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Thống kê theo difficulty
            difficulty_stats = list(recipes_collection.aggregate([
                {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Recipes mới nhất
            latest_recipes = list(recipes_collection.find({}).sort("createdAt", -1).limit(5))
            
            return {
                'total_recipes': total_count,
                'category_distribution': category_stats,
                'difficulty_distribution': difficulty_stats,
                'latest_recipes': [r.get('name', 'Unknown') for r in latest_recipes]
            }
            
        except Exception as e:
            logger.error(f"Error getting recipe stats: {e}")
            return {}
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

class RecipeSearchOptimizer:
    """
    Tối ưu hóa tìm kiếm recipes với multiple strategies
    """
    
    def __init__(self):
        self.search_strategies = {
            'exact_match': self._exact_match_search,
            'ingredient_based': self._ingredient_based_search,
            'semantic_search': self._semantic_search,
            'category_filter': self._category_filter_search
        }
    
    def _exact_match_search(self, query: str, recipes: List[Dict]) -> List[Dict]:
        """Tìm kiếm chính xác tên món"""
        results = []
        query_lower = query.lower()
        
        for recipe in recipes:
            if recipe.get('name') and query_lower in recipe['name'].lower():
                results.append({**recipe, 'match_type': 'exact_name'})
        
        return results
    
    def _ingredient_based_search(self, query: str, recipes: List[Dict]) -> List[Dict]:
        """Tìm kiếm theo nguyên liệu"""
        results = []
        query_lower = query.lower()
        
        for recipe in recipes:
            if recipe.get('ingredients'):
                ingredients_text = " ".join(recipe['ingredients']).lower()
                if query_lower in ingredients_text:
                    results.append({**recipe, 'match_type': 'ingredient'})
        
        return results
    
    def _semantic_search(self, query: str, recipes: List[Dict], embeddings: np.ndarray, 
                        model: SentenceTransformer, threshold: float = 0.7) -> List[Dict]:
        """Tìm kiếm semantic sử dụng embeddings"""
        if len(recipes) != len(embeddings):
            return []
        
        # Tạo embedding cho query
        query_embedding = model.encode([query])
        
        # Tính similarity
        similarities = np.dot(embeddings, query_embedding.T).flatten()
        
        results = []
        for i, (recipe, similarity) in enumerate(zip(recipes, similarities)):
            if similarity >= threshold:
                results.append({
                    **recipe, 
                    'match_type': 'semantic',
                    'similarity_score': float(similarity)
                })
        
        # Sort by similarity
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results
    
    def _category_filter_search(self, query: str, recipes: List[Dict]) -> List[Dict]:
        """Tìm kiếm theo category"""
        category_keywords = {
            'món chính': 'monchinh',
            'món phụ': 'monphu',
            'tráng miệng': 'trangmieng',
            'đồ uống': 'douong',
            'ăn vặt': 'anvat'
        }
        
        query_lower = query.lower()
        target_category = None
        
        for keyword, category in category_keywords.items():
            if keyword in query_lower:
                target_category = category
                break
        
        if not target_category:
            return []
        
        results = []
        for recipe in recipes:
            if recipe.get('category') == target_category:
                results.append({**recipe, 'match_type': 'category'})
        
        return results
    
    def multi_strategy_search(self, query: str, recipes: List[Dict], 
                            embeddings: Optional[np.ndarray] = None,
                            model: Optional[SentenceTransformer] = None) -> List[Dict]:
        """
        Tìm kiếm sử dụng multiple strategies và kết hợp kết quả
        """
        all_results = []
        
        # Strategy 1: Exact match (highest priority)
        exact_results = self._exact_match_search(query, recipes)
        all_results.extend(exact_results)
        
        # Strategy 2: Ingredient-based search
        ingredient_results = self._ingredient_based_search(query, recipes)
        all_results.extend(ingredient_results)
        
        # Strategy 3: Category filter
        category_results = self._category_filter_search(query, recipes)
        all_results.extend(category_results)
        
        # Strategy 4: Semantic search (if embeddings available)
        if embeddings is not None and model is not None:
            semantic_results = self._semantic_search(query, recipes, embeddings, model)
            all_results.extend(semantic_results)
        
        # Remove duplicates while preserving order and match types
        seen_ids = set()
        unique_results = []
        
        for result in all_results:
            recipe_id = result.get('_id')
            if recipe_id not in seen_ids:
                seen_ids.add(recipe_id)
                unique_results.append(result)
        
        return unique_results[:10]  # Return top 10 results
