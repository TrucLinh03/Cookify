const Recipe = require('../model/recipeModel');
const Feedback = require('../model/feedbackModel');
const Favorite = require('../model/favouriteModel');

/**
 * 1. Gợi ý theo độ phổ biến (Popular Recipes)
 * Sử dụng Aggregation Pipeline để tính rating trung bình
 */
const getPopularRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const popularRecipes = await Feedback.aggregate([
      // Group by recipe_id và tính toán thống kê
      {
        $group: {
          _id: "$recipe_id",
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
          ratings: { $push: "$rating" }
        }
      },
      // Lọc các món có ít nhất 1 lượt đánh giá
      {
        $match: {
          totalRatings: { $gte: 1 }
        }
      },
      // Sắp xếp theo rating trung bình giảm dần
      {
        $sort: { avgRating: -1, totalRatings: -1 }
      },
      // Giới hạn số lượng kết quả
      {
        $limit: limit
      },
      // Lookup để lấy thông tin recipe
      {
        $lookup: {
          from: "recipes",
          localField: "_id",
          foreignField: "_id",
          as: "recipe"
        }
      },
      // Unwind recipe array
      {
        $unwind: "$recipe"
      },
      // Project các trường cần thiết
      {
        $project: {
          _id: "$recipe._id",
          name: "$recipe.name",
          description: "$recipe.description",
          imageUrl: "$recipe.imageUrl",
          category: "$recipe.category",
          difficulty: "$recipe.difficulty",
          cookingTime: "$recipe.cookingTime",
          ingredients: "$recipe.ingredients",
          instructions: "$recipe.instructions",
          createdAt: "$recipe.createdAt",
          avgRating: { $round: ["$avgRating", 1] },
          totalRatings: 1,
          popularityScore: {
            $add: [
              { $multiply: ["$avgRating", 0.7] },
              { $multiply: [{ $ln: "$totalRatings" }, 0.3] }
            ]
          }
        }
      },
      // Sắp xếp lại theo popularity score
      {
        $sort: { popularityScore: -1 }
      }
    ]);

    // Nếu không có công thức nào có feedback, lấy các công thức mới nhất
    if (popularRecipes.length === 0) {
      console.log('No recipes with feedback found, falling back to latest recipes');
      
      const latestRecipes = await Recipe.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const recipesWithDefaultStats = latestRecipes.map(recipe => ({
        ...recipe,
        avgRating: 0,
        totalRatings: 0,
        popularityScore: 0,
        fallback: true
      }));

      return res.json({
        success: true,
        data: recipesWithDefaultStats,
        message: `Tìm thấy ${recipesWithDefaultStats.length} công thức mới nhất (chưa có đánh giá)`,
        metadata: {
          type: 'popular',
          algorithm: 'fallback_to_latest',
          limit: limit,
          fallback: true
        }
      });
    }

    res.json({
      success: true,
      data: popularRecipes,
      message: `Tìm thấy ${popularRecipes.length} công thức phổ biến`,
      metadata: {
        type: 'popular',
        algorithm: 'rating_based_popularity',
        limit: limit
      }
    });

  } catch (error) {
    console.error('Error in getPopularRecipes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách công thức phổ biến',
      error: error.message
    });
  }
};

/**
 * 2. Gợi ý theo lượt yêu thích (Most Favorited Recipes)
 * Đếm số lượng favorites cho mỗi recipe
 */
const getMostFavoritedRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const favoritedRecipes = await Favorite.aggregate([
      // Group by recipe_id và đếm số lượt yêu thích
      {
        $group: {
          _id: "$recipe_id",
          totalLikes: { $sum: 1 },
          likedBy: { $push: "$user_id" }
        }
      },
      // Sắp xếp theo số lượt yêu thích giảm dần
      {
        $sort: { totalLikes: -1 }
      },
      // Giới hạn kết quả
      {
        $limit: limit
      },
      // Lookup recipe information
      {
        $lookup: {
          from: "recipes",
          localField: "_id",
          foreignField: "_id",
          as: "recipe"
        }
      },
      // Unwind recipe
      {
        $unwind: "$recipe"
      },
      // Lookup rating statistics
      {
        $lookup: {
          from: "feedbacks",
          localField: "_id",
          foreignField: "recipe_id",
          as: "ratings"
        }
      },
      // Project final result
      {
        $project: {
          _id: "$recipe._id",
          name: "$recipe.name",
          description: "$recipe.description",
          imageUrl: "$recipe.imageUrl",
          category: "$recipe.category",
          difficulty: "$recipe.difficulty",
          cookingTime: "$recipe.cookingTime",
          ingredients: "$recipe.ingredients",
          instructions: "$recipe.instructions",
          createdAt: "$recipe.createdAt",
          totalLikes: 1,
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: "$ratings" }, 0] },
              then: { $round: [{ $avg: "$ratings.rating" }, 1] },
              else: 0
            }
          },
          totalRatings: { $size: "$ratings" }
        }
      }
    ]);

    res.json({
      success: true,
      data: favoritedRecipes,
      message: `Tìm thấy ${favoritedRecipes.length} công thức được yêu thích nhất`,
      metadata: {
        type: 'most_favorited',
        algorithm: 'favorite_count_based',
        limit: limit
      }
    });

  } catch (error) {
    console.error('Error in getMostFavoritedRecipes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách công thức được yêu thích',
      error: error.message
    });
  }
};

/**
 * 3. Gợi ý theo thời gian (Latest Recipes)
 * Sắp xếp theo thời gian tạo mới nhất
 */
const getLatestRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Lấy recipes mới nhất
    const latestRecipes = await Recipe.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Thêm thông tin rating và favorites cho mỗi recipe
    const recipesWithStats = await Promise.all(
      latestRecipes.map(async (recipe) => {
        // Lấy thống kê rating
        const ratingStats = await Feedback.aggregate([
          { $match: { recipe_id: recipe._id } },
          {
            $group: {
              _id: null,
              avgRating: { $avg: "$rating" },
              totalRatings: { $sum: 1 }
            }
          }
        ]);

        // Lấy số lượt yêu thích
        const favoriteCount = await Favorite.countDocuments({ recipe_id: recipe._id });

        return {
          ...recipe,
          avgRating: ratingStats.length > 0 ? Math.round(ratingStats[0].avgRating * 10) / 10 : 0,
          totalRatings: ratingStats.length > 0 ? ratingStats[0].totalRatings : 0,
          totalLikes: favoriteCount,
          daysAgo: Math.floor((new Date() - new Date(recipe.createdAt)) / (1000 * 60 * 60 * 24))
        };
      })
    );

    res.json({
      success: true,
      data: recipesWithStats,
      message: `Tìm thấy ${recipesWithStats.length} công thức mới nhất`,
      metadata: {
        type: 'latest',
        algorithm: 'creation_time_based',
        limit: limit
      }
    });

  } catch (error) {
    console.error('Error in getLatestRecipes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách công thức mới nhất',
      error: error.message
    });
  }
};

/**
 * 4. Gợi ý cá nhân hóa (Personalized Recommendations)
 * Sử dụng Content-Based + Collaborative Filtering
 */
const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để nhận gợi ý cá nhân hóa'
      });
    }

    // Lấy danh sách recipes user đã yêu thích
    const userFavorites = await Favorite.find({ user_id: userId })
      .populate('recipe_id')
      .lean();

    if (userFavorites.length === 0) {
      // Nếu user chưa có favorites, trả về popular recipes
      return getPopularRecipes(req, res);
    }

    // Content-Based Filtering
    const contentBasedScores = await calculateContentBasedScores(userId, userFavorites);
    
    // Collaborative Filtering
    const collaborativeScores = await calculateCollaborativeScores(userId, userFavorites);
    
    // Hybrid Recommendation (kết hợp 2 thuật toán)
    const hybridRecommendations = combineRecommendationScores(
      contentBasedScores, 
      collaborativeScores, 
      0.6, // Content weight
      0.4  // Collaborative weight
    );

    // Lấy top recommendations
    const topRecommendations = hybridRecommendations
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    // Lấy thông tin chi tiết của recipes
    const recommendedRecipes = await Recipe.find({
      _id: { $in: topRecommendations.map(r => r.recipeId) }
    }).lean();

    // Thêm scores và metadata
    const finalRecommendations = recommendedRecipes.map(recipe => {
      const scoreData = topRecommendations.find(r => r.recipeId.toString() === recipe._id.toString());
      return {
        ...recipe,
        recommendationScore: Math.round(scoreData.finalScore * 100) / 100,
        contentScore: Math.round(scoreData.contentScore * 100) / 100,
        collaborativeScore: Math.round(scoreData.collaborativeScore * 100) / 100,
        reasons: scoreData.reasons || []
      };
    });

    res.json({
      success: true,
      data: finalRecommendations,
      message: `Tìm thấy ${finalRecommendations.length} gợi ý cá nhân hóa`,
      metadata: {
        type: 'personalized',
        algorithm: 'hybrid_content_collaborative',
        userId: userId,
        userFavoritesCount: userFavorites.length,
        contentWeight: 0.6,
        collaborativeWeight: 0.4,
        limit: limit
      }
    });

  } catch (error) {
    console.error('Error in getPersonalizedRecommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo gợi ý cá nhân hóa',
      error: error.message
    });
  }
};

/**
 * Content-Based Filtering Algorithm
 * Tính độ tương đồng dựa trên đặc trưng của recipes
 */
const calculateContentBasedScores = async (userId, userFavorites) => {
  try {
    // Lấy tất cả recipes (trừ những cái user đã favorite)
    const favoriteRecipeIds = userFavorites.map(f => f.recipe_id._id);
    const allRecipes = await Recipe.find({
      _id: { $nin: favoriteRecipeIds }
    }).lean();

    // Phân tích sở thích user từ favorites
    const userPreferences = analyzeUserPreferences(userFavorites);
    
    // Tính điểm cho mỗi recipe
    const contentScores = allRecipes.map(recipe => {
      let score = 0;
      let reasons = [];

      // 1. Category similarity (30%)
      if (userPreferences.favoriteCategories[recipe.category]) {
        const categoryScore = userPreferences.favoriteCategories[recipe.category] * 0.3;
        score += categoryScore;
        reasons.push(`Cùng loại món: ${recipe.category}`);
      }

      // 2. Difficulty similarity (20%)
      if (userPreferences.favoriteDifficulties[recipe.difficulty]) {
        const difficultyScore = userPreferences.favoriteDifficulties[recipe.difficulty] * 0.2;
        score += difficultyScore;
        reasons.push(`Độ khó phù hợp: ${recipe.difficulty}`);
      }

      // 3. Ingredients similarity (40%)
      const ingredientScore = calculateIngredientSimilarity(
        recipe.ingredients, 
        userPreferences.favoriteIngredients
      ) * 0.4;
      score += ingredientScore;
      
      if (ingredientScore > 0.1) {
        reasons.push('Nguyên liệu tương tự món bạn yêu thích');
      }

      // 4. Cooking time similarity (10%)
      const timeScore = calculateCookingTimeSimilarity(
        recipe.cookingTime, 
        userPreferences.averageCookingTime
      ) * 0.1;
      score += timeScore;

      return {
        recipeId: recipe._id,
        contentScore: score,
        reasons: reasons
      };
    });

    return contentScores.filter(s => s.contentScore > 0);

  } catch (error) {
    console.error('Error in calculateContentBasedScores:', error);
    return [];
  }
};

/**
 * Collaborative Filtering Algorithm
 * Tìm users có sở thích tương tự và gợi ý recipes họ thích
 */
const calculateCollaborativeScores = async (userId, userFavorites) => {
  try {
    // Lấy tất cả users khác và favorites của họ
    const allUserFavorites = await Favorite.find({
      user_id: { $ne: userId }
    }).lean();

    // Tạo user-recipe matrix
    const userRecipeMatrix = {};
    allUserFavorites.forEach(fav => {
      if (!userRecipeMatrix[fav.user_id]) {
        userRecipeMatrix[fav.user_id] = new Set();
      }
      userRecipeMatrix[fav.user_id].add(fav.recipe_id.toString());
    });

    // Tạo set recipes user hiện tại đã thích
    const currentUserRecipes = new Set(
      userFavorites.map(f => f.recipe_id._id.toString())
    );

    // Tính độ tương đồng với các users khác
    const userSimilarities = [];
    for (const [otherUserId, otherUserRecipes] of Object.entries(userRecipeMatrix)) {
      const similarity = calculateJaccardSimilarity(currentUserRecipes, otherUserRecipes);
      if (similarity > 0.1) { // Chỉ xét users có độ tương đồng > 10%
        userSimilarities.push({
          userId: otherUserId,
          similarity: similarity,
          recipes: otherUserRecipes
        });
      }
    }

    // Sắp xếp theo độ tương đồng
    userSimilarities.sort((a, b) => b.similarity - a.similarity);

    // Tạo recommendations từ similar users
    const recipeScores = {};
    userSimilarities.slice(0, 20).forEach(similarUser => { // Top 20 similar users
      similarUser.recipes.forEach(recipeId => {
        if (!currentUserRecipes.has(recipeId)) {
          if (!recipeScores[recipeId]) {
            recipeScores[recipeId] = 0;
          }
          recipeScores[recipeId] += similarUser.similarity;
        }
      });
    });

    // Chuyển đổi thành array và normalize scores
    const maxScore = Math.max(...Object.values(recipeScores));
    const collaborativeScores = Object.entries(recipeScores).map(([recipeId, score]) => ({
      recipeId: recipeId,
      collaborativeScore: maxScore > 0 ? score / maxScore : 0,
      reasons: ['Người dùng có sở thích tương tự cũng thích món này']
    }));

    return collaborativeScores;

  } catch (error) {
    console.error('Error in calculateCollaborativeScores:', error);
    return [];
  }
};

/**
 * Kết hợp điểm từ Content-Based và Collaborative Filtering
 */
const combineRecommendationScores = (contentScores, collaborativeScores, contentWeight, collaborativeWeight) => {
  const combinedScores = new Map();

  // Thêm content-based scores
  contentScores.forEach(item => {
    combinedScores.set(item.recipeId.toString(), {
      recipeId: item.recipeId,
      contentScore: item.contentScore,
      collaborativeScore: 0,
      reasons: [...item.reasons]
    });
  });

  // Thêm collaborative scores
  collaborativeScores.forEach(item => {
    const recipeId = item.recipeId.toString();
    if (combinedScores.has(recipeId)) {
      const existing = combinedScores.get(recipeId);
      existing.collaborativeScore = item.collaborativeScore;
      existing.reasons = [...existing.reasons, ...item.reasons];
    } else {
      combinedScores.set(recipeId, {
        recipeId: item.recipeId,
        contentScore: 0,
        collaborativeScore: item.collaborativeScore,
        reasons: [...item.reasons]
      });
    }
  });

  // Tính final score
  const finalScores = Array.from(combinedScores.values()).map(item => ({
    ...item,
    finalScore: (item.contentScore * contentWeight) + (item.collaborativeScore * collaborativeWeight)
  }));

  return finalScores;
};

/**
 * Helper Functions
 */

// Phân tích sở thích user từ favorites
const analyzeUserPreferences = (userFavorites) => {
  const preferences = {
    favoriteCategories: {},
    favoriteDifficulties: {},
    favoriteIngredients: {},
    averageCookingTime: 0
  };

  let totalCookingTime = 0;
  let validCookingTimeCount = 0;

  userFavorites.forEach(fav => {
    const recipe = fav.recipe_id;
    
    // Categories
    if (recipe.category) {
      preferences.favoriteCategories[recipe.category] = 
        (preferences.favoriteCategories[recipe.category] || 0) + 1;
    }

    // Difficulties
    if (recipe.difficulty) {
      preferences.favoriteDifficulties[recipe.difficulty] = 
        (preferences.favoriteDifficulties[recipe.difficulty] || 0) + 1;
    }

    // Ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        preferences.favoriteIngredients[normalizedIngredient] = 
          (preferences.favoriteIngredients[normalizedIngredient] || 0) + 1;
      });
    }

    // Cooking time
    if (recipe.cookingTime && !isNaN(recipe.cookingTime)) {
      totalCookingTime += recipe.cookingTime;
      validCookingTimeCount++;
    }
  });

  // Normalize counts to percentages
  const totalFavorites = userFavorites.length;
  Object.keys(preferences.favoriteCategories).forEach(key => {
    preferences.favoriteCategories[key] /= totalFavorites;
  });
  Object.keys(preferences.favoriteDifficulties).forEach(key => {
    preferences.favoriteDifficulties[key] /= totalFavorites;
  });

  // Calculate average cooking time
  preferences.averageCookingTime = validCookingTimeCount > 0 ? 
    totalCookingTime / validCookingTimeCount : 30; // Default 30 minutes

  return preferences;
};

// Tính độ tương đồng ingredients sử dụng Jaccard similarity
const calculateIngredientSimilarity = (recipeIngredients, userFavoriteIngredients) => {
  if (!recipeIngredients || !Array.isArray(recipeIngredients)) return 0;
  
  const recipeSet = new Set(
    recipeIngredients.map(ing => ing.toLowerCase().trim())
  );
  
  const favoriteSet = new Set(Object.keys(userFavoriteIngredients));
  
  const intersection = new Set([...recipeSet].filter(x => favoriteSet.has(x)));
  const union = new Set([...recipeSet, ...favoriteSet]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
};

// Tính độ tương đồng thời gian nấu
const calculateCookingTimeSimilarity = (recipeCookingTime, userAverageCookingTime) => {
  if (!recipeCookingTime || !userAverageCookingTime) return 0;
  
  const timeDifference = Math.abs(recipeCookingTime - userAverageCookingTime);
  const maxTime = Math.max(recipeCookingTime, userAverageCookingTime);
  
  return maxTime > 0 ? 1 - (timeDifference / maxTime) : 0;
};

// Tính Jaccard similarity giữa 2 sets
const calculateJaccardSimilarity = (set1, set2) => {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
};

module.exports = {
  getPopularRecipes,
  getMostFavoritedRecipes,
  getLatestRecipes,
  getPersonalizedRecommendations
};
