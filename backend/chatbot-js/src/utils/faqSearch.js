/**
 * FAQ Search Utility
 * Provides fallback answers from FAQ dataset using simple text matching
 */
const fs = require('fs');
const path = require('path');

let faqData = [];

/**
 * Load FAQ dataset from JSON file
 */
function loadFAQData(faqPath) {
  try {
    const fullPath = path.resolve(faqPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`FAQ file not found: ${fullPath}`);
      return false;
    }
    
    const rawData = fs.readFileSync(fullPath, 'utf-8');
    faqData = JSON.parse(rawData);
    console.log(`Loaded ${faqData.length} FAQ entries`);
    return true;
  } catch (error) {
    console.error('Error loading FAQ data:', error.message);
    return false;
  }
}

/**
 * Simple text similarity (Jaccard similarity on words)
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Search FAQ by question similarity
 */
function searchFAQ(query, topK = 5, threshold = 0.2) {
  if (!faqData || faqData.length === 0) {
    return [];
  }
  
  const results = faqData
    .map(faq => ({
      ...faq,
      similarity: calculateSimilarity(query, faq.question)
    }))
    .filter(faq => faq.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  return results;
}

/**
 * Get FAQ answer if high confidence match
 */
function getFAQAnswer(query, threshold = 0.5) {
  const results = searchFAQ(query, 1, threshold);
  
  if (results.length > 0 && results[0].similarity >= threshold) {
    return {
      answer: results[0].answer,
      question: results[0].question,
      category: results[0].category,
      similarity: results[0].similarity,
      source: 'faq'
    };
  }
  
  return null;
}

/**
 * Build context from FAQ results for LLM prompt
 */
function buildFAQContext(query, topK = 3) {
  const results = searchFAQ(query, topK, 0.2);
  
  if (results.length === 0) {
    return '';
  }
  
  const contextParts = results.map((faq, idx) => 
    `FAQ ${idx + 1} (${Math.round(faq.similarity * 100)}% match):
Q: ${faq.question}
A: ${faq.answer}
Category: ${faq.category}`
  );
  
  return contextParts.join('\n\n');
}

module.exports = {
  loadFAQData,
  searchFAQ,
  getFAQAnswer,
  buildFAQContext
};
