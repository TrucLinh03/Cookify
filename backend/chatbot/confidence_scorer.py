"""
Advanced Confidence Scoring System
Thay thế cosine similarity bằng multi-factor confidence scoring
"""
import numpy as np
from typing import List, Dict, Tuple, Optional
import re
from datetime import datetime
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ConfidenceLevel(Enum):
    VERY_HIGH = "very_high"  # 0.9-1.0
    HIGH = "high"           # 0.7-0.9
    MEDIUM = "medium"       # 0.5-0.7
    LOW = "low"            # 0.3-0.5
    VERY_LOW = "very_low"  # 0.0-0.3

@dataclass
class ConfidenceScore:
    overall_score: float
    level: ConfidenceLevel
    factors: Dict[str, float]
    explanation: str
    recommendations: List[str]

class AdvancedConfidenceScorer:
    """
    Multi-factor confidence scoring system cho chatbot
    Kết hợp nhiều yếu tố thay vì chỉ dùng cosine similarity
    """
    
    def __init__(self):
        self.weights = {
            'semantic_similarity': 0.25,      # Cosine similarity
            'keyword_match': 0.20,           # Exact keyword matching
            'context_relevance': 0.15,       # Context understanding
            'data_freshness': 0.10,          # How recent is the data
            'source_reliability': 0.10,      # Source quality
            'query_clarity': 0.10,           # Query quality
            'answer_completeness': 0.10      # Answer quality
        }
        
        # Cooking-specific keywords for better matching
        self.cooking_keywords = {
            'ingredients': ['nguyên liệu', 'thành phần', 'gia vị', 'rau củ', 'thịt', 'cá'],
            'cooking_methods': ['nấu', 'chiên', 'luộc', 'nướng', 'xào', 'hấp', 'om', 'kho'],
            'time_related': ['thời gian', 'phút', 'giờ', 'nhanh', 'chậm', 'lâu'],
            'difficulty': ['dễ', 'khó', 'đơn giản', 'phức tạp', 'cơ bản', 'nâng cao'],
            'taste': ['ngon', 'ngọt', 'mặn', 'chua', 'cay', 'đắng', 'béo'],
            'nutrition': ['dinh dưỡng', 'vitamin', 'protein', 'carb', 'chất béo', 'calo']
        }
    
    def calculate_confidence(self, 
                           query: str,
                           retrieved_docs: List[Dict],
                           similarity_scores: List[float],
                           answer: str) -> ConfidenceScore:
        """
        Tính toán confidence score tổng hợp
        
        Args:
            query: User query
            retrieved_docs: Retrieved documents from vector DB
            similarity_scores: Cosine similarity scores
            answer: Generated answer
            
        Returns:
            ConfidenceScore object
        """
        factors = {}
        
        # 1. Semantic Similarity (improved cosine similarity)
        factors['semantic_similarity'] = self._calculate_semantic_similarity(similarity_scores)
        
        # 2. Keyword Match Score
        factors['keyword_match'] = self._calculate_keyword_match(query, retrieved_docs)
        
        # 3. Context Relevance
        factors['context_relevance'] = self._calculate_context_relevance(query, retrieved_docs)
        
        # 4. Data Freshness
        factors['data_freshness'] = self._calculate_data_freshness(retrieved_docs)
        
        # 5. Source Reliability
        factors['source_reliability'] = self._calculate_source_reliability(retrieved_docs)
        
        # 6. Query Clarity
        factors['query_clarity'] = self._calculate_query_clarity(query)
        
        # 7. Answer Completeness
        factors['answer_completeness'] = self._calculate_answer_completeness(query, answer)
        
        # Calculate weighted overall score
        overall_score = sum(
            factors[factor] * self.weights[factor] 
            for factor in factors
        )
        
        # Determine confidence level
        level = self._get_confidence_level(overall_score)
        
        # Generate explanation and recommendations
        explanation = self._generate_explanation(factors, overall_score)
        recommendations = self._generate_recommendations(factors, level)
        
        return ConfidenceScore(
            overall_score=overall_score,
            level=level,
            factors=factors,
            explanation=explanation,
            recommendations=recommendations
        )
    
    def _calculate_semantic_similarity(self, similarity_scores: List[float]) -> float:
        """
        Improved semantic similarity calculation
        """
        if not similarity_scores:
            return 0.0
        
        # Use weighted average with exponential decay
        weights = np.exp(-np.arange(len(similarity_scores)) * 0.5)
        weights = weights / weights.sum()
        
        weighted_avg = np.average(similarity_scores, weights=weights)
        
        # Apply sigmoid transformation for better distribution
        sigmoid_score = 2 / (1 + np.exp(-4 * (weighted_avg - 0.5)))
        
        return min(sigmoid_score, 1.0)
    
    def _calculate_keyword_match(self, query: str, docs: List[Dict]) -> float:
        """
        Calculate exact keyword matching score
        """
        if not docs:
            return 0.0
        
        query_lower = query.lower()
        query_words = set(re.findall(r'\b\w+\b', query_lower))
        
        total_matches = 0
        total_possible = len(query_words)
        
        for doc in docs:
            doc_text = ""
            if doc.get('type') == 'recipe':
                doc_text = f"{doc.get('name', '')} {doc.get('searchable_text', '')}"
            elif doc.get('type') == 'faq':
                doc_text = f"{doc.get('question', '')} {doc.get('answer', '')}"
            
            doc_words = set(re.findall(r'\b\w+\b', doc_text.lower()))
            matches = len(query_words.intersection(doc_words))
            total_matches += matches
        
        if total_possible == 0:
            return 0.0
        
        # Normalize by number of documents and query length
        avg_match_rate = (total_matches / len(docs)) / total_possible
        return min(avg_match_rate, 1.0)
    
    def _calculate_context_relevance(self, query: str, docs: List[Dict]) -> float:
        """
        Calculate context relevance using cooking domain knowledge
        """
        if not docs:
            return 0.0
        
        query_lower = query.lower()
        relevance_scores = []
        
        for doc in docs:
            score = 0.0
            
            # Check for cooking-specific context matches
            for category, keywords in self.cooking_keywords.items():
                query_has_category = any(keyword in query_lower for keyword in keywords)
                
                if query_has_category:
                    doc_text = ""
                    if doc.get('type') == 'recipe':
                        doc_text = doc.get('searchable_text', '').lower()
                    elif doc.get('type') == 'faq':
                        doc_text = f"{doc.get('question', '')} {doc.get('answer', '')}".lower()
                    
                    doc_has_category = any(keyword in doc_text for keyword in keywords)
                    if doc_has_category:
                        score += 0.2  # Each category match adds 0.2
            
            # Bonus for recipe type matching
            if 'công thức' in query_lower or 'cách làm' in query_lower:
                if doc.get('type') == 'recipe':
                    score += 0.3
            
            # Bonus for FAQ type matching  
            if any(word in query_lower for word in ['tại sao', 'làm sao', 'như thế nào', 'có nên']):
                if doc.get('type') == 'faq':
                    score += 0.3
            
            relevance_scores.append(min(score, 1.0))
        
        return np.mean(relevance_scores) if relevance_scores else 0.0
    
    def _calculate_data_freshness(self, docs: List[Dict]) -> float:
        """
        Calculate data freshness score
        """
        if not docs:
            return 0.5  # Neutral score for missing data
        
        current_time = datetime.now()
        freshness_scores = []
        
        for doc in docs:
            # For recipes from MongoDB, check creation/update time
            if doc.get('type') == 'recipe':
                created_at = doc.get('createdAt')
                if created_at:
                    try:
                        if isinstance(created_at, str):
                            created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        else:
                            created_time = created_at
                        
                        days_old = (current_time - created_time).days
                        # Fresh data (< 30 days) gets high score
                        freshness = max(0, 1 - (days_old / 365))  # Decay over 1 year
                        freshness_scores.append(freshness)
                    except:
                        freshness_scores.append(0.7)  # Default for parsing errors
                else:
                    freshness_scores.append(0.7)  # Default for missing timestamp
            else:
                # FAQ data is generally static, give medium score
                freshness_scores.append(0.8)
        
        return np.mean(freshness_scores)
    
    def _calculate_source_reliability(self, docs: List[Dict]) -> float:
        """
        Calculate source reliability score
        """
        if not docs:
            return 0.5
        
        reliability_scores = []
        
        for doc in docs:
            score = 0.5  # Base score
            
            # Recipe sources are generally reliable
            if doc.get('type') == 'recipe':
                score = 0.8
                
                # Bonus for complete recipes
                if doc.get('ingredients') and doc.get('instructions'):
                    score += 0.1
                
                # Bonus for detailed recipes
                if len(doc.get('instructions', [])) >= 3:
                    score += 0.1
            
            # FAQ sources
            elif doc.get('type') == 'faq':
                score = 0.9  # FAQ is curated content
                
                # Bonus for detailed answers
                if len(doc.get('answer', '')) > 50:
                    score += 0.1
            
            reliability_scores.append(min(score, 1.0))
        
        return np.mean(reliability_scores)
    
    def _calculate_query_clarity(self, query: str) -> float:
        """
        Calculate query clarity and specificity
        """
        query_lower = query.lower().strip()
        
        if len(query_lower) < 5:
            return 0.2  # Too short
        
        score = 0.5  # Base score
        
        # Length bonus (optimal 10-50 characters)
        length = len(query_lower)
        if 10 <= length <= 50:
            score += 0.2
        elif length > 50:
            score += 0.1
        
        # Specificity bonus
        specific_words = ['cách làm', 'công thức', 'nguyên liệu', 'thời gian', 'làm sao']
        if any(word in query_lower for word in specific_words):
            score += 0.2
        
        # Question word bonus
        question_words = ['gì', 'sao', 'nào', 'bao nhiêu', 'như thế nào']
        if any(word in query_lower for word in question_words):
            score += 0.1
        
        # Grammar and completeness
        if query_lower.endswith('?'):
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_answer_completeness(self, query: str, answer: str) -> float:
        """
        Calculate answer completeness and quality
        """
        if not answer or len(answer) < 10:
            return 0.1
        
        score = 0.5  # Base score
        
        # Length appropriateness
        answer_length = len(answer)
        if 50 <= answer_length <= 500:
            score += 0.2
        elif answer_length > 500:
            score += 0.1
        
        # Structure bonus
        if any(marker in answer for marker in ['1.', '2.', '-', '•']):
            score += 0.1  # Structured answer
        
        # Cooking-specific completeness
        query_lower = query.lower()
        answer_lower = answer.lower()
        
        if 'cách làm' in query_lower or 'công thức' in query_lower:
            # Should mention ingredients and steps
            if 'nguyên liệu' in answer_lower:
                score += 0.1
            if any(word in answer_lower for word in ['bước', 'cách', 'làm']):
                score += 0.1
        
        return min(score, 1.0)
    
    def _get_confidence_level(self, score: float) -> ConfidenceLevel:
        """Convert numeric score to confidence level"""
        if score >= 0.9:
            return ConfidenceLevel.VERY_HIGH
        elif score >= 0.7:
            return ConfidenceLevel.HIGH
        elif score >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif score >= 0.3:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _generate_explanation(self, factors: Dict[str, float], overall_score: float) -> str:
        """Generate human-readable explanation"""
        explanations = []
        
        # Find strongest and weakest factors
        sorted_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)
        strongest = sorted_factors[0]
        weakest = sorted_factors[-1]
        
        explanations.append(f"Điểm tin cậy tổng thể: {overall_score:.2f}")
        explanations.append(f"Yếu tố mạnh nhất: {strongest[0]} ({strongest[1]:.2f})")
        explanations.append(f"Yếu tố yếu nhất: {weakest[0]} ({weakest[1]:.2f})")
        
        return " | ".join(explanations)
    
    def _generate_recommendations(self, factors: Dict[str, float], level: ConfidenceLevel) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        if level in [ConfidenceLevel.LOW, ConfidenceLevel.VERY_LOW]:
            if factors['semantic_similarity'] < 0.5:
                recommendations.append("Thử đặt câu hỏi với từ khóa cụ thể hơn")
            
            if factors['keyword_match'] < 0.5:
                recommendations.append("Sử dụng thuật ngữ nấu ăn chính xác hơn")
            
            if factors['query_clarity'] < 0.5:
                recommendations.append("Làm rõ câu hỏi với chi tiết cụ thể")
        
        elif level == ConfidenceLevel.MEDIUM:
            recommendations.append("Kết quả khá tốt, có thể cần thêm thông tin để chính xác hơn")
        
        else:
            recommendations.append("Kết quả có độ tin cậy cao")
        
        return recommendations

# Utility functions for integration
def get_confidence_display(confidence: ConfidenceScore) -> Dict:
    """Convert confidence score to display format"""
    return {
        'score': round(confidence.overall_score, 2),
        'level': confidence.level.value,
        'percentage': round(confidence.overall_score * 100, 1),
        'explanation': confidence.explanation,
        'recommendations': confidence.recommendations,
        'factors': {k: round(v, 2) for k, v in confidence.factors.items()}
    }
