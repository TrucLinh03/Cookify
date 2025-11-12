const Recipe = require('../model/recipeModel');
const Feedback = require('../model/feedbackModel');
const Favorite = require('../model/favouriteModel');
const ViewHistory = require('../model/viewHistoryModel');

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
          // ✅ OPTIMIZED: Thêm Time Decay Factor
          daysOld: {
            $divide: [
              { $subtract: [new Date(), "$recipe.createdAt"] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          },
          timeDecayFactor: {
            $cond: {
              if: { $lte: [{ $divide: [{ $subtract: [new Date(), "$recipe.createdAt"] }, 1000 * 60 * 60 * 24] }, 7] },
              then: 1.0, // < 7 days: full boost
              else: {
                $cond: {
                  if: { $lte: [{ $divide: [{ $subtract: [new Date(), "$recipe.createdAt"] }, 1000 * 60 * 60 * 24] }, 30] },
                  then: 0.8, // < 30 days: 80%
                  else: {
                    $cond: {
                      if: { $lte: [{ $divide: [{ $subtract: [new Date(), "$recipe.createdAt"] }, 1000 * 60 * 60 * 24] }, 90] },
                      then: 0.5, // < 90 days: 50%
                      else: 0.3 // > 90 days: 30%
                    }
                  }
                }
              }
            }
          },
          popularityScore: {
            $add: [
              { $multiply: ["$avgRating", 0.5] }, // Rating: 50% (giảm từ 70%)
              { $multiply: [{ $ln: "$totalRatings" }, 0.2] }, // Volume: 20% (giảm từ 30%)
              { 
                $multiply: [
                  // Time Decay: 30% (mới)
                  {
                    $cond: {
                      if: { $lte: [{ $divide: [{ $subtract: [new Date(), "$recipe.createdAt"] }, 1000 * 60 * 60 * 24] }, 7] },
                      then: 1.5, // Boost món mới
                      else: {
                        $cond: {
                          if: { $lte: [{ $divide: [{ $subtract: [new Date(), "$recipe.createdAt"] }, 1000 * 60 * 60 * 24] }, 30] },
                          then: 1.2,
                          else: {
                            $cond: {
                              if: { $lte: [{ $divide: [{ $subtract: [new Date(), "$recipe.createdAt"] }, 1000 * 60 * 60 * 24] }, 90] },
                              then: 0.8,
                              else: 0.5
                            }
                          }
                        }
                      }
                    }
                  },
                  0.3
                ]
              }
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
 * OPTIMIZED: Fixed N+1 query problem - Batch queries
 */
const getLatestRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Lấy recipes mới nhất
    const latestRecipes = await Recipe.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (latestRecipes.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Không tìm thấy công thức nào',
        metadata: { type: 'latest', algorithm: 'creation_time_based', limit: limit }
      });
    }

    // ✅ OPTIMIZED: Batch queries thay vì N+1 queries
    const recipeIds = latestRecipes.map(r => r._id);

    // Parallel batch queries
    const [ratingStats, favoriteCounts] = await Promise.all([
      // Batch query cho ratings
      Feedback.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        {
          $group: {
            _id: "$recipe_id",
            avgRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 }
          }
        }
      ]),
      // Batch query cho favorites
      Favorite.aggregate([
        { $match: { recipe_id: { $in: recipeIds } } },
        {
          $group: {
            _id: "$recipe_id",
            totalLikes: { $sum: 1 }
          }
        }
      ])
    ]);

    // Map results to recipes
    const ratingMap = new Map(ratingStats.map(r => [r._id.toString(), r]));
    const favoriteMap = new Map(favoriteCounts.map(f => [f._id.toString(), f]));

    const recipesWithStats = latestRecipes.map(recipe => {
      const recipeIdStr = recipe._id.toString();
      const rating = ratingMap.get(recipeIdStr);
      const favorite = favoriteMap.get(recipeIdStr);

      return {
        ...recipe,
        avgRating: rating ? Math.round(rating.avgRating * 10) / 10 : 0,
        totalRatings: rating ? rating.totalRatings : 0,
        totalLikes: favorite ? favorite.totalLikes : 0,
        daysAgo: Math.floor((new Date() - new Date(recipe.createdAt)) / (1000 * 60 * 60 * 24))
      };
    });

    res.json({
      success: true,
      data: recipesWithStats,
      message: `Tìm thấy ${recipesWithStats.length} công thức mới nhất`,
      metadata: {
        type: 'latest',
        algorithm: 'creation_time_based_optimized',
        limit: limit,
        performance: {
          queriesUsed: 3, // 1 find + 2 aggregates (instead of 1 + N*2)
          optimized: true
        }
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
 * Sử dụng Content-Based + Collaborative Filtering + View History + Feedback
 */
const getPersonalizedRecommendations = async (req, res) => {
  try {
    // Kiểm tra user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để nhận gợi ý cá nhân hóa'
      });
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Lấy dữ liệu hành vi user với error handling
    let userFavorites = [];
    let userViewHistory = [];
    let userFeedback = [];

    try {
      [userFavorites, userViewHistory, userFeedback] = await Promise.all([
        Favorite.find({ user_id: userId }).populate('recipe_id').lean().catch(() => []),
        ViewHistory.getUserViewHistory ? ViewHistory.getUserViewHistory(userId, 100).catch(() => []) : Promise.resolve([]),
        Feedback.find({ user_id: userId }).populate('recipe_id').lean().catch(() => [])
      ]);
    } catch (error) {
      console.error('Error fetching user behavior data:', error);
      // Continue with empty arrays if data fetch fails
    }

    // Kiểm tra dữ liệu có đủ để tạo gợi ý không
    const totalUserData = userFavorites.length + userViewHistory.length + userFeedback.length;
    if (totalUserData === 0) {
      // Nếu user chưa có dữ liệu, trả về popular recipes với message hướng dẫn
      console.log(`User ${userId} has no data, returning popular recipes as fallback`);
      
      // Lấy popular recipes trực tiếp
      const popularRecipes = await Feedback.aggregate([
        {
          $group: {
            _id: "$recipe_id",
            avgRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 }
          }
        },
        {
          $match: {
            totalRatings: { $gte: 1 }
          }
        },
        {
          $lookup: {
            from: "recipes",
            localField: "_id",
            foreignField: "_id",
            as: "recipe"
          }
        },
        {
          $unwind: "$recipe"
        },
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
        {
          $sort: { popularityScore: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return res.json({
        success: true,
        data: popularRecipes,
        message: 'Bạn chưa có đủ dữ liệu để tạo gợi ý cá nhân hóa. Hãy yêu thích, xem và đánh giá một số công thức để nhận gợi ý phù hợp hơn!',
        metadata: {
          type: 'personalized_fallback',
          algorithm: 'popular_recipes',
          reason: 'insufficient_user_data',
          userDataCount: totalUserData,
          suggestion: 'Hãy tương tác với ít nhất 3-5 công thức (yêu thích, xem, đánh giá) để nhận gợi ý cá nhân hóa tốt hơn',
          limit: limit
        }
      });
    }

    // Tính trọng số động dựa trên lượng dữ liệu
    const dynamicWeights = calculateDynamicWeights(userFavorites, userViewHistory, userFeedback);

    // Content-Based Filtering (tích hợp view history và feedback)
    const contentBasedScores = await calculateEnhancedContentBasedScores(
      userId, userFavorites, userViewHistory, userFeedback
    );
    
    // Collaborative Filtering (tích hợp feedback)
    const collaborativeScores = await calculateEnhancedCollaborativeScores(
      userId, userFavorites, userFeedback
    );
    
    // Hybrid Recommendation với trọng số động
    const hybridRecommendations = combineRecommendationScores(
      contentBasedScores, 
      collaborativeScores, 
      dynamicWeights.contentWeight,
      dynamicWeights.collaborativeWeight
    );

    // Lấy top recommendations
    const topRecommendations = hybridRecommendations
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    // Lấy thông tin chi tiết của recipes
    const recommendedRecipes = await Recipe.find({
      _id: { $in: topRecommendations.map(r => r.recipeId) }
    }).lean();

    // Thêm scores và metadata với enhanced reasons
    const finalRecommendations = recommendedRecipes.map(recipe => {
      const scoreData = topRecommendations.find(r => r.recipeId.toString() === recipe._id.toString());
      const matchPercentage = Math.round(scoreData.finalScore * 100);
      
      // Enhanced reasons với thông tin thêm
      const enhancedReasons = [...(scoreData.reasons || [])];
      
      // 1. Add Match Score Badge (nếu > 70%)
      if (matchPercentage >= 70) {
        enhancedReasons.unshift(`💯 Phù hợp ${matchPercentage}% với sở thích của bạn`);
      }
      
      // 2. Add Quick Info - Cooking Time
      const cookingTimeMinutes = parseCookingTime(recipe.cookingTime);
      if (cookingTimeMinutes > 0 && cookingTimeMinutes <= 30) {
        enhancedReasons.push(`⚡ Nhanh - Chỉ ${cookingTimeMinutes} phút`);
      }
      
      // 3. Add Rating if high
      if (recipe.averageRating >= 4.5 && recipe.totalReviews > 0) {
        enhancedReasons.push(`⭐ ${recipe.averageRating.toFixed(1)}/5 sao (${recipe.totalReviews} đánh giá)`);
      }
      
      return {
        ...recipe,
        recommendationScore: Math.round(scoreData.finalScore * 100) / 100,
        contentScore: Math.round(scoreData.contentScore * 100) / 100,
        collaborativeScore: Math.round(scoreData.collaborativeScore * 100) / 100,
        matchPercentage: matchPercentage,
        matchBadge: matchPercentage >= 85 ? 'perfect' : matchPercentage >= 75 ? 'excellent' : matchPercentage >= 65 ? 'good' : 'fair',
        reasons: enhancedReasons
      };
    });

    res.json({
      success: true,
      data: finalRecommendations,
      message: `Tìm thấy ${finalRecommendations.length} gợi ý cá nhân hóa`,
      metadata: {
        type: 'personalized',
        algorithm: 'enhanced_hybrid_with_behavior',
        userId: userId,
        userFavoritesCount: userFavorites.length,
        userViewHistoryCount: userViewHistory.length,
        userFeedbackCount: userFeedback.length,
        contentWeight: dynamicWeights.contentWeight,
        collaborativeWeight: dynamicWeights.collaborativeWeight,
        dataQuality: dynamicWeights.dataQuality,
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
 * Tính trọng số động dựa trên lượng và chất lượng dữ liệu user
 */
const calculateDynamicWeights = (userFavorites, userViewHistory, userFeedback) => {
  const favCount = userFavorites.length;
  const viewCount = userViewHistory.length;
  const feedbackCount = userFeedback.length;
  
  // Tính điểm chất lượng dữ liệu (0-1)
  const dataQuality = Math.min(1, (favCount * 0.4 + viewCount * 0.3 + feedbackCount * 0.3) / 20);
  
  // Điều chỉnh trọng số dựa trên dữ liệu có sẵn
  let contentWeight = 0.6; // Mặc định
  let collaborativeWeight = 0.4;
  
  // Nếu ít dữ liệu collaborative (favorites), tăng content-based
  if (favCount < 3) {
    contentWeight = 0.8;
    collaborativeWeight = 0.2;
  }
  // Nếu có nhiều dữ liệu collaborative, tăng collaborative
  else if (favCount > 10) {
    contentWeight = 0.4;
    collaborativeWeight = 0.6;
  }
  
  // Điều chỉnh thêm dựa trên feedback quality
  if (feedbackCount > 5) {
    const avgRating = userFeedback.reduce((sum, f) => sum + f.rating, 0) / feedbackCount;
    if (avgRating > 4) {
      // User có xu hướng đánh giá cao, tăng collaborative
      collaborativeWeight += 0.1;
      contentWeight -= 0.1;
    }
  }
  
  return {
    contentWeight: Math.max(0.2, Math.min(0.8, contentWeight)),
    collaborativeWeight: Math.max(0.2, Math.min(0.8, collaborativeWeight)),
    dataQuality
  };
};

/**
 * Enhanced Content-Based Filtering Algorithm
 * Tích hợp view history và feedback để tính độ tương đồng chính xác hơn
 */
const calculateEnhancedContentBasedScores = async (userId, userFavorites, userViewHistory, userFeedback) => {
  try {
    // Lấy tất cả recipes (trừ những cái user đã favorite)
    // Filter out null/undefined recipe_id before mapping
    const favoriteRecipeIds = userFavorites
      .filter(f => f.recipe_id && f.recipe_id._id)
      .map(f => f.recipe_id._id);
    const allRecipes = await Recipe.find({
      _id: { $nin: favoriteRecipeIds }
    }).lean();

    // Phân tích sở thích user từ tất cả dữ liệu hành vi
    const userPreferences = analyzeEnhancedUserPreferences(userFavorites, userViewHistory, userFeedback);
    
    // Tính điểm cho mỗi recipe
    const contentScores = allRecipes.map(recipe => {
      let score = 0;
      let reasons = [];

      // 1. Ingredients similarity (40%) - Ưu tiên cao nhất
      const ingredientSimilarity = calculateIngredientSimilarity(
        recipe.ingredients,
        recipe.category, // Pass current recipe category
        userPreferences.favoriteIngredients,
        userFavorites // Pass favorites to find most similar recipe
      );
      const ingredientScore = ingredientSimilarity.score * 0.40;
      score += ingredientScore;
      
      // Show similarity with specific favorite recipe (only if truly similar)
      if (ingredientSimilarity.commonIngredients.length >= 2 && ingredientSimilarity.mostSimilarRecipe) {
        const commonIngs = ingredientSimilarity.commonIngredients.slice(0, 3).join(', ');
        reasons.push(`🥘 Tương tự món ${ingredientSimilarity.mostSimilarRecipe} (${commonIngs})`);
      } else if (ingredientSimilarity.commonIngredients.length > 0) {
        const commonIngs = ingredientSimilarity.commonIngredients.slice(0, 3).join(', ');
        reasons.push(`🥘 Có nguyên liệu bạn thích: ${commonIngs}`);
      }

      // 2. Category similarity (20%)
      if (userPreferences.favoriteCategories[recipe.category]) {
        const categoryScore = userPreferences.favoriteCategories[recipe.category] * 0.20;
        score += categoryScore;
        const categoryCount = userPreferences.favoriteCategories[recipe.category];
        if (categoryCount >= 1) {
          reasons.push(`📂 Bạn đã thích ${Math.round(categoryCount)} món ${recipe.category}`);
        } else {
          reasons.push(`📂 Bạn quan tâm đến ${recipe.category}`);
        }
      }

      // 3. Difficulty similarity (15%)
      if (userPreferences.favoriteDifficulties[recipe.difficulty]) {
        const difficultyScore = userPreferences.favoriteDifficulties[recipe.difficulty] * 0.15;
        score += difficultyScore;
        reasons.push(`⭐ Độ khó phù hợp với bạn: ${recipe.difficulty}`);
      }

      // 4. Cooking time similarity (15%)
      const timeScore = calculateEnhancedCookingTimeSimilarity(
        recipe.cookingTime, 
        userPreferences.averageCookingTime
      ) * 0.15;
      score += timeScore;

      // 5. View frequency bonus (10%)
      const viewBonus = userPreferences.viewFrequency[recipe.category] || 0;
      score += viewBonus * 0.1;
      if (viewBonus > 0.3) {
        reasons.push('Bạn thường xem loại món này');
      }

      return {
        recipeId: recipe._id,
        contentScore: score,
        reasons: reasons
      };
    });

    return contentScores.filter(s => s.contentScore > 0);

  } catch (error) {
    console.error('Error in calculateEnhancedContentBasedScores:', error);
    return [];
  }
};

/**
 * Content-Based Filtering Algorithm (Legacy)
 * Tính độ tương đồng dựa trên đặc trưng của recipes
 */
const calculateContentBasedScores = async (userId, userFavorites) => {
  try {
    // Lấy tất cả recipes (trừ những cái user đã favorite)
    // Filter out null/undefined recipe_id before mapping
    const favoriteRecipeIds = userFavorites
      .filter(f => f.recipe_id && f.recipe_id._id)
      .map(f => f.recipe_id._id);
    const allRecipes = await Recipe.find({
      _id: { $nin: favoriteRecipeIds }
    }).lean();

    // Phân tích sở thích user từ favorites
    const userPreferences = analyzeUserPreferences(userFavorites);
    
    // Tính điểm cho mỗi recipe
    const contentScores = allRecipes.map(recipe => {
      let score = 0;
      let reasons = [];

      // 1. Ingredients similarity (45%) - Ưu tiên cao nhất
      const ingredientSimilarity = calculateIngredientSimilarity(
        recipe.ingredients,
        recipe.category, // Pass category
        userPreferences.favoriteIngredients,
        userFavorites
      );
      const ingredientScore = ingredientSimilarity.score * 0.45;
      score += ingredientScore;
      
      if (ingredientScore > 0.1 && ingredientSimilarity.commonIngredients.length >= 2 && ingredientSimilarity.mostSimilarRecipe) {
        const commonIngs = ingredientSimilarity.commonIngredients.slice(0, 3).join(', ');
        reasons.push(`🥘 Tương tự món ${ingredientSimilarity.mostSimilarRecipe} (${commonIngs})`);
      } else if (ingredientScore > 0.1) {
        reasons.push('🥘 Có nguyên liệu bạn thích');
      }

      // 2. Category similarity (20%)
      if (userPreferences.favoriteCategories[recipe.category]) {
        const categoryScore = userPreferences.favoriteCategories[recipe.category] * 0.20;
        score += categoryScore;
        reasons.push(`Cùng loại món: ${recipe.category}`);
      }

      // 3. Difficulty similarity (20%)
      if (userPreferences.favoriteDifficulties[recipe.difficulty]) {
        const difficultyScore = userPreferences.favoriteDifficulties[recipe.difficulty] * 0.20;
        score += difficultyScore;
        reasons.push(`Độ khó phù hợp: ${recipe.difficulty}`);
      }

      // 4. Cooking time similarity (15%)
      const timeScore = calculateCookingTimeSimilarity(
        recipe.cookingTime, 
        userPreferences.averageCookingTime
      ) * 0.15;
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
 * Enhanced Collaborative Filtering Algorithm
 * Tích hợp feedback ratings để tính similarity chính xác hơn
 */
const calculateEnhancedCollaborativeScores = async (userId, userFavorites, userFeedback) => {
  try {
    // Lấy tất cả users khác và favorites + feedback của họ (populate user info)
    const [allUserFavorites, allUserFeedback] = await Promise.all([
      Favorite.find({ user_id: { $ne: userId } }).populate('user_id', 'name username').lean(),
      Feedback.find({ user_id: { $ne: userId } }).populate('user_id', 'name username').lean()
    ]);

    // Tạo user-recipe matrix với ratings và user info
    const userRecipeMatrix = {};
    const userRatingMatrix = {};
    const userInfoMap = {}; // Store user info
    
    // Thêm favorites (rating = 5)
    allUserFavorites.forEach(fav => {
      const userIdStr = fav.user_id?._id?.toString() || fav.user_id?.toString();
      if (!userIdStr) return;
      
      if (!userRecipeMatrix[userIdStr]) {
        userRecipeMatrix[userIdStr] = new Set();
        userRatingMatrix[userIdStr] = {};
        // Store user info
        if (fav.user_id?.name || fav.user_id?.username) {
          userInfoMap[userIdStr] = {
            name: fav.user_id.name || fav.user_id.username || `User${userIdStr.slice(-4)}`
          };
        }
      }
      userRecipeMatrix[userIdStr].add(fav.recipe_id.toString());
      userRatingMatrix[userIdStr][fav.recipe_id.toString()] = 5;
    });
    
    // Thêm feedback ratings
    allUserFeedback.forEach(feedback => {
      const userIdStr = feedback.user_id?._id?.toString() || feedback.user_id?.toString();
      if (!userIdStr) return;
      
      if (!userRecipeMatrix[userIdStr]) {
        userRecipeMatrix[userIdStr] = new Set();
        userRatingMatrix[userIdStr] = {};
        // Store user info
        if (feedback.user_id?.name || feedback.user_id?.username) {
          userInfoMap[userIdStr] = {
            name: feedback.user_id.name || feedback.user_id.username || `User${userIdStr.slice(-4)}`
          };
        }
      }
      const recipeIdStr = feedback.recipe_id?.toString ? feedback.recipe_id.toString() : String(feedback.recipe_id);
      if (recipeIdStr) {
        userRecipeMatrix[userIdStr].add(recipeIdStr);
        userRatingMatrix[userIdStr][recipeIdStr] = feedback.rating;
      }
    });

    // Tạo current user profile
    const currentUserRecipes = new Set(
      userFavorites
        .filter(f => f.recipe_id && f.recipe_id._id)
        .map(f => f.recipe_id._id.toString())
    );
    const currentUserRatings = {};
    
    // Thêm favorites của current user
    userFavorites.forEach(fav => {
      if (fav.recipe_id && fav.recipe_id._id) {
        currentUserRatings[fav.recipe_id._id.toString()] = 5;
      }
    });
    
    // Thêm feedback của current user
    userFeedback.forEach(feedback => {
      if (feedback.recipe_id && feedback.recipe_id._id) {
        currentUserRecipes.add(feedback.recipe_id._id.toString());
        currentUserRatings[feedback.recipe_id._id.toString()] = feedback.rating;
      }
    });

    // Tính độ tương đồng với các users khác (sử dụng Pearson correlation)
    const userSimilarities = [];
    for (const [otherUserId, otherUserRecipes] of Object.entries(userRecipeMatrix)) {
      const similarity = calculatePearsonSimilarity(
        currentUserRatings, 
        userRatingMatrix[otherUserId]
      );
      
      if (similarity > 0.1) {
        userSimilarities.push({
          userId: otherUserId,
          similarity: similarity,
          recipes: otherUserRecipes,
          ratings: userRatingMatrix[otherUserId]
        });
      }
    }

    // Sắp xếp theo độ tương đồng
    userSimilarities.sort((a, b) => b.similarity - a.similarity);

    // Tạo recommendations từ similar users với weighted ratings
    const recipeScores = {};
    const recipeSimilarUsers = {}; // Track which users recommended each recipe
    
    userSimilarities.slice(0, 20).forEach(similarUser => {
      similarUser.recipes.forEach(recipeId => {
        if (!currentUserRecipes.has(recipeId)) {
          if (!recipeScores[recipeId]) {
            recipeScores[recipeId] = { totalScore: 0, count: 0 };
            recipeSimilarUsers[recipeId] = [];
          }
          const rating = similarUser.ratings[recipeId] || 3;
          const weightedScore = similarUser.similarity * (rating / 5); // Normalize rating to 0-1
          recipeScores[recipeId].totalScore += weightedScore;
          recipeScores[recipeId].count += 1;
          
          // Track top similar users for this recipe with their names
          if (recipeSimilarUsers[recipeId].length < 3) {
            const userName = userInfoMap[similarUser.userId]?.name || `User${similarUser.userId.slice(-4)}`;
            recipeSimilarUsers[recipeId].push({
              userId: similarUser.userId,
              userName: userName,
              similarity: Math.round(similarUser.similarity * 100)
            });
          }
        }
      });
    });

    // Tính average weighted score và normalize
    const maxScore = Math.max(...Object.values(recipeScores).map(s => s.totalScore / s.count));
    const collaborativeScores = Object.entries(recipeScores)
      .map(([recipeId, scoreData]) => {
        const similarUsers = recipeSimilarUsers[recipeId] || [];
        const userCount = scoreData.count;
        const avgSimilarity = similarUsers.length > 0 
          ? Math.round(similarUsers.reduce((sum, u) => sum + u.similarity, 0) / similarUsers.length)
          : 0;
        
        // Create persuasive collaborative reason with actual user names
        let collaborativeReason = '';
        
        if (similarUsers.length >= 2) {
          // Show actual user names
          const userNames = similarUsers.slice(0, 2).map(u => u.userName).join(', ');
          const remainingCount = userCount - 2;
          
          if (remainingCount > 0) {
            collaborativeReason = `👥 ${userNames} và ${remainingCount} người khác giống bạn đã thích món này`;
          } else {
            collaborativeReason = `👥 ${userNames} cùng gu với bạn đã thích món này`;
          }
        } else if (similarUsers.length === 1) {
          const userName = similarUsers[0].userName;
          const remainingCount = userCount - 1;
          
          if (remainingCount > 0) {
            collaborativeReason = `👥 ${userName} và ${remainingCount} người khác đã thích món này`;
          } else {
            collaborativeReason = `👥 ${userName} cùng gu với bạn đã thích món này`;
          }
        } else if (userCount >= 10) {
          collaborativeReason = `👥 ${userCount} người giống bạn (${avgSimilarity}% tương đồng) đã yêu thích món này`;
        } else if (userCount >= 5) {
          collaborativeReason = `👥 ${userCount} người cùng gu với bạn đã thích món này`;
        } else if (userCount >= 2) {
          collaborativeReason = `👥 ${userCount} người cùng gu với bạn đã thích món này`;
        } else {
          collaborativeReason = `👥 Được người dùng cùng gu yêu thích`;
        }
        
        return {
          recipeId: recipeId,
          collaborativeScore: maxScore > 0 ? (scoreData.totalScore / scoreData.count) / maxScore : 0,
          reasons: [collaborativeReason]
        };
      })
      .filter(item => item.collaborativeScore > 0.1);

    return collaborativeScores;

  } catch (error) {
    console.error('Error in calculateEnhancedCollaborativeScores:', error);
    return [];
  }
};

/**
 * Collaborative Filtering Algorithm (Legacy)
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
      userFavorites
        .filter(f => f.recipe_id && f.recipe_id._id)
        .map(f => f.recipe_id._id.toString())
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

  // Tính final score và sắp xếp reasons theo độ ưu tiên
  const finalScores = Array.from(combinedScores.values()).map(item => {
    // Sắp xếp reasons: Nguyên liệu (🥘) > Collaborative (👥) > Category (📂) > Difficulty (⭐)
    const sortedReasons = item.reasons.sort((a, b) => {
      const priorityOrder = { '🥘': 1, '👥': 2, '📂': 3, '⭐': 4 };
      const getPriority = (reason) => {
        for (const [emoji, priority] of Object.entries(priorityOrder)) {
          if (reason.startsWith(emoji)) return priority;
        }
        return 99; // Other reasons at the end
      };
      return getPriority(a) - getPriority(b);
    });

    return {
      ...item,
      reasons: sortedReasons,
      finalScore: (item.contentScore * contentWeight) + (item.collaborativeScore * collaborativeWeight)
    };
  });

  return finalScores;
};

/**
 * Helper Functions
 */

/**
 * Phân tích sở thích user từ tất cả dữ liệu hành vi
 */
const analyzeEnhancedUserPreferences = (userFavorites, userViewHistory, userFeedback) => {
  const preferences = {
    favoriteCategories: {},
    favoriteDifficulties: {},
    favoriteIngredients: {},
    averageCookingTime: 0,
    viewFrequency: {},
    ratingPatterns: {}
  };

  let totalCookingTime = 0;
  let validCookingTimeCount = 0;

  // Phân tích từ favorites (trọng số cao nhất)
  userFavorites.forEach(fav => {
    const recipe = fav.recipe_id;
    
    // Skip if recipe is null or undefined
    if (!recipe) return;
    
    if (recipe.category) {
      preferences.favoriteCategories[recipe.category] = 
        (preferences.favoriteCategories[recipe.category] || 0) + 1;
    }

    if (recipe.difficulty) {
      preferences.favoriteDifficulties[recipe.difficulty] = 
        (preferences.favoriteDifficulties[recipe.difficulty] || 0) + 1;
    }

    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        preferences.favoriteIngredients[normalizedIngredient] = 
          (preferences.favoriteIngredients[normalizedIngredient] || 0) + 1;
      });
    }

    const cookingTime = parseCookingTime(recipe.cookingTime);
    if (cookingTime > 0) {
      totalCookingTime += cookingTime;
      validCookingTimeCount++;
    }
  });

  // Phân tích từ view history (trọng số trung bình)
  userViewHistory.forEach(view => {
    if (view.recipe && view.recipe.category) {
      preferences.viewFrequency[view.recipe.category] = 
        (preferences.viewFrequency[view.recipe.category] || 0) + 1;
    }

    if (view.recipe && view.recipe.ingredients) {
      view.recipe.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        preferences.favoriteIngredients[normalizedIngredient] = 
          (preferences.favoriteIngredients[normalizedIngredient] || 0) + 0.5; // Lower weight
      });
    }

    if (view.recipe && view.recipe.cookingTime) {
      const cookingTime = parseCookingTime(view.recipe.cookingTime);
      if (cookingTime > 0) {
        totalCookingTime += cookingTime * 0.5; // Lower weight
        validCookingTimeCount += 0.5;
      }
    }
  });

  // Phân tích từ feedback (trọng số dựa trên rating)
  userFeedback.forEach(feedback => {
    const recipe = feedback.recipe_id;
    const weight = feedback.rating / 5; // Rating 5 = weight 1, rating 1 = weight 0.2
    
    if (recipe.category) {
      preferences.ratingPatterns[recipe.category] = 
        (preferences.ratingPatterns[recipe.category] || 0) + weight;
    }

    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        preferences.favoriteIngredients[normalizedIngredient] = 
          (preferences.favoriteIngredients[normalizedIngredient] || 0) + weight;
      });
    }

    const cookingTime = parseCookingTime(recipe.cookingTime);
    if (cookingTime > 0) {
      totalCookingTime += cookingTime * weight;
      validCookingTimeCount += weight;
    }
  });

  // Normalize counts to percentages
  const totalFavorites = userFavorites.length;
  const totalViews = userViewHistory.length;
  
  if (totalFavorites > 0) {
    Object.keys(preferences.favoriteCategories).forEach(key => {
      preferences.favoriteCategories[key] /= totalFavorites;
    });
    Object.keys(preferences.favoriteDifficulties).forEach(key => {
      preferences.favoriteDifficulties[key] /= totalFavorites;
    });
  }
  
  if (totalViews > 0) {
    Object.keys(preferences.viewFrequency).forEach(key => {
      preferences.viewFrequency[key] /= totalViews;
    });
  }

  // Calculate average cooking time
  preferences.averageCookingTime = validCookingTimeCount > 0 ? 
    totalCookingTime / validCookingTimeCount : 30;

  return preferences;
};

// Phân tích sở thích user từ favorites (Legacy)
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

/**
 * ✅ OPTIMIZED: Enhanced Ingredient Similarity
 * - Normalize ingredients (remove quantities, units)
 * - Category matching (meat, vegetables, spices)
 * - Synonym support
 */

// Ingredient categories for better matching
const INGREDIENT_CATEGORIES = {
  meat: ['thịt bò', 'thịt heo', 'thịt gà', 'thịt', 'bò', 'heo', 'gà', 'vịt', 'cá', 'tôm', 'mực', 'hải sản'],
  vegetables: ['cà chua', 'hành', 'tỏi', 'gừng', 'ớt', 'rau', 'củ', 'cải', 'bắp cải', 'su hào', 'cà rốt'],
  spices: ['muối', 'đường', 'tiêu', 'nước mắm', 'dầu', 'giấm', 'tương', 'gia vị', 'bột', 'hạt nêm'],
  grains: ['gạo', 'bún', 'phở', 'mì', 'miến', 'bánh', 'bột'],
  dairy: ['sữa', 'bơ', 'phô mai', 'cheese', 'cream']
};

// Synonyms for better matching
const INGREDIENT_SYNONYMS = {
  'cà chua': ['tomato', 'ca chua'],
  'hành tây': ['onion', 'hanh tay'],
  'tỏi': ['garlic', 'toi'],
  'gừng': ['ginger', 'gung'],
  'thịt bò': ['beef', 'bo'],
  'thịt heo': ['pork', 'heo', 'lon'],
  'thịt gà': ['chicken', 'ga']
};

// Normalize ingredient (remove quantities and units)
const normalizeIngredient = (ingredient) => {
  if (!ingredient) return '';
  
  let normalized = ingredient.toLowerCase().trim();
  
  // Remove common quantities and units
  normalized = normalized
    .replace(/\d+\s*(g|kg|ml|l|gram|lít|thìa|muỗng|củ|quả|con|kg|gr)/gi, '')
    .replace(/\d+/g, '')
    .trim();
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

// Get ingredient category
const getIngredientCategory = (ingredient) => {
  const normalized = normalizeIngredient(ingredient);
  
  for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
};

// Check if ingredients are synonyms
const areSynonyms = (ing1, ing2) => {
  for (const [base, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
    if ((ing1.includes(base) || synonyms.some(s => ing1.includes(s))) &&
        (ing2.includes(base) || synonyms.some(s => ing2.includes(s)))) {
      return true;
    }
  }
  return false;
};

// Enhanced ingredient similarity calculation
const calculateIngredientSimilarity = (recipeIngredients, recipeCategory, userFavoriteIngredients, userFavorites = []) => {
  if (!recipeIngredients || !Array.isArray(recipeIngredients)) return { score: 0, commonIngredients: [], mostSimilarRecipe: null };
  if (Object.keys(userFavoriteIngredients).length === 0) return { score: 0, commonIngredients: [], mostSimilarRecipe: null };
  
  // Normalize recipe ingredients
  const normalizedRecipeIngs = recipeIngredients
    .map(ing => normalizeIngredient(ing))
    .filter(ing => ing.length > 0);
  
  // Normalize user favorite ingredients
  const normalizedFavoriteIngs = Object.keys(userFavoriteIngredients)
    .map(ing => normalizeIngredient(ing))
    .filter(ing => ing.length > 0);
  
  if (normalizedRecipeIngs.length === 0 || normalizedFavoriteIngs.length === 0) return { score: 0, commonIngredients: [], mostSimilarRecipe: null };
  
  let matchScore = 0;
  let totalWeight = 0;
  const commonIngredients = [];
  
  // Calculate matches with different weights
  normalizedRecipeIngs.forEach(recipeIng => {
    normalizedFavoriteIngs.forEach(favIng => {
      const favWeight = userFavoriteIngredients[favIng] || 1;
      totalWeight += favWeight;
      
      // Exact match (highest score)
      if (recipeIng === favIng) {
        matchScore += favWeight * 1.0;
        if (!commonIngredients.includes(recipeIng)) {
          commonIngredients.push(recipeIng);
        }
      }
      // Partial match (one contains the other)
      else if (recipeIng.includes(favIng) || favIng.includes(recipeIng)) {
        matchScore += favWeight * 0.7;
        if (!commonIngredients.includes(recipeIng)) {
          commonIngredients.push(recipeIng);
        }
      }
      // Synonym match
      else if (areSynonyms(recipeIng, favIng)) {
        matchScore += favWeight * 0.8;
        if (!commonIngredients.includes(recipeIng)) {
          commonIngredients.push(recipeIng);
        }
      }
      // Same category (lower score)
      else if (getIngredientCategory(recipeIng) === getIngredientCategory(favIng) &&
               getIngredientCategory(recipeIng) !== 'other') {
        matchScore += favWeight * 0.3;
      }
    });
  });
  
  // Normalize score
  const maxPossibleScore = totalWeight * normalizedRecipeIngs.length;
  const finalScore = maxPossibleScore > 0 ? matchScore / maxPossibleScore : 0;
  
  // Find most similar favorite recipe based on common ingredients
  // IMPORTANT: Only compare recipes from SAME or RELATED categories
  let mostSimilarRecipe = null;
  let maxCommonCount = 0;
  
  // Define related categories (categories that can be compared)
  const relatedCategories = {
    'Món Chính': ['Món Chính', 'Món Phụ'],
    'Món Phụ': ['Món Chính', 'Món Phụ'],
    'Tráng Miệng': ['Tráng Miệng', 'Đồ Uống'],
    'Đồ Uống': ['Tráng Miệng', 'Đồ Uống'],
    'Món Ăn Vặt': ['Món Ăn Vặt', 'Tráng Miệng']
  };
  
  if (userFavorites && userFavorites.length > 0 && commonIngredients.length > 0) {
    userFavorites.forEach(fav => {
      if (fav.recipe_id && fav.recipe_id.ingredients && fav.recipe_id.name && fav.recipe_id.category) {
        // Check if categories are related
        const currentCategoryRelated = relatedCategories[recipeCategory] || [recipeCategory];
        const isCategoryRelated = currentCategoryRelated.includes(fav.recipe_id.category);
        
        // Only compare if categories are related
        if (isCategoryRelated) {
          const favIngs = fav.recipe_id.ingredients.map(ing => normalizeIngredient(ing));
          const commonCount = commonIngredients.filter(ing => favIngs.includes(ing)).length;
          
          // Only consider if has at least 2 common ingredients (avoid false matches)
          if (commonCount >= 2 && commonCount > maxCommonCount) {
            maxCommonCount = commonCount;
            mostSimilarRecipe = fav.recipe_id.name;
          }
        }
      }
    });
  }
  
  return { 
    score: finalScore, 
    commonIngredients: commonIngredients.slice(0, 5), // Top 5 common ingredients
    mostSimilarRecipe: mostSimilarRecipe
  };
};

/**
 * Parse cooking time từ string thành số phút
 */
const parseCookingTime = (cookingTime) => {
  if (typeof cookingTime === 'number') return cookingTime;
  if (typeof cookingTime !== 'string') return 0;
  
  const timeStr = cookingTime.toLowerCase();
  let minutes = 0;
  
  // Extract hours
  const hourMatch = timeStr.match(/(\d+)\s*(giờ|hour|h)/i);
  if (hourMatch) {
    minutes += parseInt(hourMatch[1]) * 60;
  }
  
  // Extract minutes
  const minuteMatch = timeStr.match(/(\d+)\s*(phút|minute|min|m)/i);
  if (minuteMatch) {
    minutes += parseInt(minuteMatch[1]);
  }
  
  // If no specific unit found, assume it's minutes
  if (minutes === 0) {
    const numberMatch = timeStr.match(/(\d+)/);
    if (numberMatch) {
      minutes = parseInt(numberMatch[1]);
    }
  }
  
  return minutes;
};

/**
 * Tính độ tương đồng thời gian nấu (Enhanced)
 */
const calculateEnhancedCookingTimeSimilarity = (recipeCookingTime, userAverageCookingTime) => {
  const recipeMinutes = parseCookingTime(recipeCookingTime);
  const userMinutes = parseCookingTime(userAverageCookingTime);
  
  if (recipeMinutes === 0 || userMinutes === 0) return 0;
  
  const timeDifference = Math.abs(recipeMinutes - userMinutes);
  const maxTime = Math.max(recipeMinutes, userMinutes);
  
  // Use exponential decay for better similarity scoring
  return Math.exp(-timeDifference / (maxTime * 0.5));
};

// Tính độ tương đồng thời gian nấu (Legacy)
const calculateCookingTimeSimilarity = (recipeCookingTime, userAverageCookingTime) => {
  if (!recipeCookingTime || !userAverageCookingTime) return 0;
  
  const timeDifference = Math.abs(recipeCookingTime - userAverageCookingTime);
  const maxTime = Math.max(recipeCookingTime, userAverageCookingTime);
  
  return maxTime > 0 ? 1 - (timeDifference / maxTime) : 0;
};

/**
 * Tính Pearson correlation coefficient cho collaborative filtering
 */
const calculatePearsonSimilarity = (ratingsA, ratingsB) => {
  const commonItems = Object.keys(ratingsA).filter(item => ratingsB[item]);
  
  if (commonItems.length === 0) return 0;
  if (commonItems.length === 1) return 0;
  
  const sumA = commonItems.reduce((sum, item) => sum + ratingsA[item], 0);
  const sumB = commonItems.reduce((sum, item) => sum + ratingsB[item], 0);
  
  const sumASq = commonItems.reduce((sum, item) => sum + ratingsA[item] ** 2, 0);
  const sumBSq = commonItems.reduce((sum, item) => sum + ratingsB[item] ** 2, 0);
  
  const sumAB = commonItems.reduce((sum, item) => sum + ratingsA[item] * ratingsB[item], 0);
  
  const n = commonItems.length;
  const numerator = sumAB - (sumA * sumB / n);
  const denominator = Math.sqrt(
    (sumASq - sumA ** 2 / n) * (sumBSq - sumB ** 2 / n)
  );
  
  return denominator === 0 ? 0 : numerator / denominator;
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
  getPersonalizedRecommendations,
  // Export helper functions for testing
  calculateDynamicWeights,
  parseCookingTime
};
