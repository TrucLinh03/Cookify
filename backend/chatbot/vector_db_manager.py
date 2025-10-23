"""
Vector Database Manager sử dụng FAISS cho high-performance similarity search
"""
import faiss
import numpy as np
import pickle
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class VectorDBManager:
    def __init__(self, dimension: int = 384, index_type: str = "IVF"):
        """
        Initialize Vector Database Manager
        
        Args:
            dimension: Embedding dimension (384 for MiniLM-L12-v2)
            index_type: FAISS index type ("Flat", "IVF", "HNSW")
        """
        self.dimension = dimension
        self.index_type = index_type
        self.index = None
        self.metadata = []  # Store document metadata
        self.is_trained = False
        
        # Initialize FAISS index
        self._create_index()
        
    def _create_index(self):
        """Create FAISS index based on type"""
        if self.index_type == "Flat":
            # Exact search, good for small datasets
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner Product (cosine similarity)
            
        elif self.index_type == "IVF":
            # Inverted File Index, good balance of speed/accuracy
            nlist = 100  # Number of clusters
            quantizer = faiss.IndexFlatIP(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
            
        elif self.index_type == "HNSW":
            # Hierarchical NSW, best for large datasets
            M = 16  # Number of connections
            self.index = faiss.IndexHNSWFlat(self.dimension, M)
            self.index.hnsw.efConstruction = 200
            self.index.hnsw.efSearch = 50
            
        logger.info(f"Created FAISS index: {self.index_type} with dimension {self.dimension}")
    
    def add_documents(self, embeddings: np.ndarray, metadata: List[Dict]):
        """
        Add documents to vector database
        
        Args:
            embeddings: Document embeddings (n_docs, dimension)
            metadata: List of document metadata
        """
        if embeddings.shape[1] != self.dimension:
            raise ValueError(f"Embedding dimension {embeddings.shape[1]} != expected {self.dimension}")
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Train index if needed (for IVF)
        if self.index_type == "IVF" and not self.is_trained:
            if len(embeddings) >= 100:  # Need enough data to train
                self.index.train(embeddings)
                self.is_trained = True
                logger.info("FAISS IVF index trained successfully")
            else:
                logger.warning("Not enough data to train IVF index, using Flat index")
                self.index = faiss.IndexFlatIP(self.dimension)
        
        # Add to index
        start_id = len(self.metadata)
        self.index.add(embeddings)
        self.metadata.extend(metadata)
        
        logger.info(f"Added {len(embeddings)} documents to vector DB. Total: {len(self.metadata)}")
    
    def search(self, query_embedding: np.ndarray, k: int = 5, threshold: float = 0.5) -> List[Dict]:
        """
        Search similar documents
        
        Args:
            query_embedding: Query embedding (1, dimension)
            k: Number of results to return
            threshold: Minimum similarity threshold
            
        Returns:
            List of search results with metadata and scores
        """
        if self.index.ntotal == 0:
            return []
        
        # Normalize query embedding
        query_embedding = query_embedding.reshape(1, -1).astype('float32')
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.index.search(query_embedding, k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1 and score >= threshold:  # Valid result above threshold
                result = {
                    'metadata': self.metadata[idx],
                    'similarity_score': float(score),
                    'index': int(idx)
                }
                results.append(result)
        
        return results
    
    def save(self, index_path: str, metadata_path: str):
        """Save index and metadata to disk"""
        faiss.write_index(self.index, index_path)
        
        with open(metadata_path, 'wb') as f:
            pickle.dump({
                'metadata': self.metadata,
                'dimension': self.dimension,
                'index_type': self.index_type,
                'is_trained': self.is_trained
            }, f)
        
        logger.info(f"Saved vector DB: {index_path}, {metadata_path}")
    
    def load(self, index_path: str, metadata_path: str):
        """Load index and metadata from disk"""
        if not Path(index_path).exists() or not Path(metadata_path).exists():
            logger.warning("Vector DB files not found, creating new index")
            return False
        
        self.index = faiss.read_index(index_path)
        
        with open(metadata_path, 'rb') as f:
            data = pickle.load(f)
            self.metadata = data['metadata']
            self.dimension = data['dimension']
            self.index_type = data['index_type']
            self.is_trained = data.get('is_trained', False)
        
        logger.info(f"Loaded vector DB with {len(self.metadata)} documents")
        return True
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        return {
            'total_documents': len(self.metadata),
            'index_type': self.index_type,
            'dimension': self.dimension,
            'is_trained': self.is_trained,
            'index_size_mb': self.index.ntotal * self.dimension * 4 / (1024 * 1024) if self.index else 0
        }

class HybridVectorDB(VectorDBManager):
    """
    Hybrid Vector DB that combines multiple data sources:
    1. FAQ data
    2. Recipe data from MongoDB
    3. Cooking tips and techniques
    """
    
    def __init__(self, dimension: int = 384):
        super().__init__(dimension, "IVF")  # Use IVF for better performance
        self.data_sources = {
            'faq': [],
            'recipes': [],
            'tips': []
        }
    
    def add_faq_data(self, faq_data: List[Dict], embeddings: np.ndarray):
        """Add FAQ data to vector DB"""
        metadata = []
        for item in faq_data:
            metadata.append({
                'type': 'faq',
                'question': item['question'],
                'answer': item['answer'],
                'category': item.get('category', 'general'),
                'tags': item.get('tags', [])
            })
        
        self.add_documents(embeddings, metadata)
        self.data_sources['faq'] = metadata
        logger.info(f"Added {len(metadata)} FAQ items to vector DB")
    
    def add_recipe_data(self, recipes: List[Dict], embeddings: np.ndarray):
        """Add recipe data from MongoDB to vector DB"""
        metadata = []
        for recipe in recipes:
            # Create searchable text from recipe
            searchable_text = f"{recipe.get('name', '')} {recipe.get('description', '')} {' '.join(recipe.get('ingredients', []))}"
            
            metadata.append({
                'type': 'recipe',
                'recipe_id': str(recipe.get('_id', '')),
                'name': recipe.get('name', ''),
                'description': recipe.get('description', ''),
                'ingredients': recipe.get('ingredients', []),
                'instructions': recipe.get('instructions', []),
                'category': recipe.get('category', ''),
                'cookingTime': recipe.get('cookingTime', ''),
                'difficulty': recipe.get('difficulty', ''),
                'searchable_text': searchable_text
            })
        
        self.add_documents(embeddings, metadata)
        self.data_sources['recipes'] = metadata
        logger.info(f"Added {len(metadata)} recipes to vector DB")
    
    def search_by_type(self, query_embedding: np.ndarray, data_type: str, k: int = 5) -> List[Dict]:
        """Search within specific data type"""
        all_results = self.search(query_embedding, k * 3)  # Get more results to filter
        
        # Filter by type
        filtered_results = [r for r in all_results if r['metadata']['type'] == data_type]
        
        return filtered_results[:k]
    
    def get_recipe_by_id(self, recipe_id: str) -> Optional[Dict]:
        """Get specific recipe by ID"""
        for item in self.metadata:
            if item.get('type') == 'recipe' and item.get('recipe_id') == recipe_id:
                return item
        return None
