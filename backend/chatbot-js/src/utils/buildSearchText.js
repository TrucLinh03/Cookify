/**
 * Build searchable text from different document types
 * Based on actual MongoDB schemas from backend/src/model/
 */

/**
 * Build searchable text for Recipe
 * Schema: name, description, ingredients[], instructions, category, difficulty, cookingTime, imageUrl, video
 */
function buildRecipeSearchText(recipe) {
  const parts = [];
  
  // Name
  if (recipe.name) {
    parts.push(`Tên món: ${recipe.name}`);
  }
  
  // Description
  if (recipe.description) {
    parts.push(`Mô tả: ${recipe.description}`);
  }
  
  // Category mapping
  if (recipe.category) {
    const categoryMap = {
      'tatca': 'tất cả',
      'monchinh': 'món chính',
      'monphu': 'món phụ',
      'trangmieng': 'tráng miệng',
      'douong': 'đồ uống',
      'anvat': 'ăn vặt'
    };
    const categoryName = categoryMap[recipe.category] || recipe.category;
    parts.push(`Danh mục: ${categoryName}`);
  }
  
  // Ingredients (array of strings)
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    const ingredientsText = recipe.ingredients.join(', ');
    parts.push(`Nguyên liệu: ${ingredientsText}`);
  }
  
  // Instructions (string)
  if (recipe.instructions) {
    parts.push(`Cách làm: ${recipe.instructions}`);
  }
  
  // Difficulty
  if (recipe.difficulty) {
    const difficultyMap = {
      'easy': 'dễ',
      'medium': 'trung bình',
      'hard': 'khó'
    };
    const difficultyText = difficultyMap[recipe.difficulty] || recipe.difficulty;
    parts.push(`Độ khó: ${difficultyText}`);
  }
  
  // Cooking time
  if (recipe.cookingTime) {
    parts.push(`Thời gian: ${recipe.cookingTime}`);
  }
  
  return parts.join(' | ');
}

/**
 * Build searchable text for Blog
 * Schema: title, content, excerpt, category, tags[], author, status, likes[], comments[], views
 */
function buildBlogSearchText(blog) {
  const parts = [];
  
  // Title
  if (blog.title) {
    parts.push(`Tiêu đề: ${blog.title}`);
  }
  
  // Excerpt or content preview
  const contentPreview = blog.excerpt || (blog.content ? blog.content.substring(0, 300) : '');
  if (contentPreview) {
    parts.push(`Nội dung: ${contentPreview}`);
  }
  
  // Category
  if (blog.category) {
    const categoryMap = {
      'recipe_share': 'chia sẻ công thức',
      'cooking_tips': 'mẹo nấu ăn',
      'food_story': 'câu chuyện ẩm thực',
      'kitchen_hacks': 'thủ thuật nhà bếp',
      'nutrition': 'dinh dưỡng',
      'other': 'khác'
    };
    const categoryName = categoryMap[blog.category] || blog.category;
    parts.push(`Danh mục: ${categoryName}`);
  }
  
  // Tags
  if (blog.tags && Array.isArray(blog.tags) && blog.tags.length > 0) {
    const tagsText = blog.tags.join(', ');
    parts.push(`Tags: ${tagsText}`);
  }
  
  // Full content (limited)
  if (blog.content && !blog.excerpt) {
    parts.push(`Chi tiết: ${blog.content.substring(0, 500)}`);
  }
  
  return parts.join(' | ');
}

/**
 * Build searchable text for Feedback
 * Schema: user_id, recipe_id, rating, comment, sentiment, status
 */
function buildFeedbackSearchText(feedback) {
  const parts = [];
  
  // Rating
  if (feedback.rating) {
    parts.push(`Đánh giá: ${feedback.rating}/5 sao`);
  }
  
  // Comment
  if (feedback.comment) {
    parts.push(`Nhận xét: ${feedback.comment}`);
  }
  
  // Sentiment
  if (feedback.sentiment) {
    const sentimentMap = {
      'positive': 'tích cực',
      'neutral': 'trung lập',
      'negative': 'tiêu cực'
    };
    const sentimentText = sentimentMap[feedback.sentiment] || feedback.sentiment;
    parts.push(`Cảm xúc: ${sentimentText}`);
  }
  
  // If we have recipe info populated
  if (feedback.recipe_id && typeof feedback.recipe_id === 'object' && feedback.recipe_id.name) {
    parts.push(`Món ăn: ${feedback.recipe_id.name}`);
  }
  
  return parts.join(' | ');
}

/**
 * Build searchable text for Favourite (popularity signal)
 * Schema: user_id, recipe_id, created_at
 * Note: Favourites themselves don't have much text, but we aggregate them for popularity
 */
function buildFavouriteSearchText(favourite) {
  const parts = [];
  
  // If recipe is populated
  if (favourite.recipe_id && typeof favourite.recipe_id === 'object') {
    const recipe = favourite.recipe_id;
    if (recipe.name) {
      parts.push(`Món yêu thích: ${recipe.name}`);
    }
    if (recipe.description) {
      parts.push(`Mô tả: ${recipe.description}`);
    }
    if (recipe.category) {
      const categoryMap = {
        'tatca': 'tất cả',
        'monchinh': 'món chính',
        'monphu': 'món phụ',
        'trangmieng': 'tráng miệng',
        'douong': 'đồ uống',
        'anvat': 'ăn vặt'
      };
      parts.push(`Danh mục: ${categoryMap[recipe.category] || recipe.category}`);
    }
  }
  
  return parts.join(' | ') || 'Món ăn được yêu thích';
}

/**
 * Build searchable text based on document type
 * @param {object} doc - Document from MongoDB
 * @param {string} sourceType - Type: 'recipe', 'blog', 'feedback', 'favourite'
 * @returns {string} - Searchable text
 */
function buildSearchableText(doc, sourceType) {
  switch (sourceType) {
    case 'recipe':
      return buildRecipeSearchText(doc);
    case 'blog':
      return buildBlogSearchText(doc);
    case 'feedback':
      return buildFeedbackSearchText(doc);
    case 'favourite':
      return buildFavouriteSearchText(doc);
    default:
      return JSON.stringify(doc).substring(0, 500);
  }
}

module.exports = {
  buildRecipeSearchText,
  buildBlogSearchText,
  buildFeedbackSearchText,
  buildFavouriteSearchText,
  buildSearchableText
};
