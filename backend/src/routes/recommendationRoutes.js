const express = require("express");
const {
  getPopularRecipes,
  getMostFavoritedRecipes,
  getLatestRecipes,
  getPersonalizedRecommendations
} = require("../controllers/recommendationController.js");
const verifyToken = require("../middleware/verifyToken.js");
const optionalAuth = require("../middleware/optionalAuth.js");

const router = express.Router();

/**
 * @route   GET /api/recommendations/popular
 * @desc    Lấy danh sách công thức phổ biến dựa trên rating
 * @access  Public
 * @query   limit (optional) - Số lượng kết quả (default: 10)
 */
router.get("/popular", getPopularRecipes);

/**
 * @route   GET /api/recommendations/favorites
 * @desc    Lấy danh sách công thức được yêu thích nhất
 * @access  Public
 * @query   limit (optional) - Số lượng kết quả (default: 10)
 */
router.get("/favorites", getMostFavoritedRecipes);

/**
 * @route   GET /api/recommendations/latest
 * @desc    Lấy danh sách công thức mới nhất
 * @access  Public
 * @query   limit (optional) - Số lượng kết quả (default: 10)
 */
router.get("/latest", getLatestRecipes);

/**
 * @route   GET /api/recommendations/personalized
 * @desc    Lấy gợi ý cá nhân hóa cho user đã đăng nhập
 * @access  Private (requires JWT token)
 * @query   limit (optional) - Số lượng kết quả (default: 10)
 */
router.get("/personalized", verifyToken, getPersonalizedRecommendations);

/**
 * @route   GET /api/recommendations/all
 * @desc    Lấy tất cả các loại gợi ý (tổng hợp)
 * @access  Public/Private (tùy thuộc vào có token hay không)
 * @query   limit (optional) - Số lượng kết quả cho mỗi loại (default: 8)
 */
router.get("/all", optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    // Tạo request objects cho các controller
    const mockReq = { 
      query: { limit: limit },
      user: req.user || null 
    };
    
    const results = {};
    
    // Lấy popular recipes
    try {
      const popularRes = { json: (data) => { results.popular = data; } };
      await getPopularRecipes(mockReq, popularRes);
    } catch (error) {
      results.popular = { success: false, error: error.message };
    }
    
    // Lấy most favorited recipes
    try {
      const favoritedRes = { json: (data) => { results.favorites = data; } };
      await getMostFavoritedRecipes(mockReq, favoritedRes);
    } catch (error) {
      results.favorites = { success: false, error: error.message };
    }
    
    // Lấy latest recipes
    try {
      const latestRes = { json: (data) => { results.latest = data; } };
      await getLatestRecipes(mockReq, latestRes);
    } catch (error) {
      results.latest = { success: false, error: error.message };
    }
    
    // Lấy personalized recommendations (nếu có token)
    if (req.user) {
      try {
        const personalizedRes = { json: (data) => { results.personalized = data; } };
        await getPersonalizedRecommendations(mockReq, personalizedRes);
      } catch (error) {
        results.personalized = { success: false, error: error.message };
      }
    }
    
    res.json({
      success: true,
      data: results,
      message: 'Lấy tất cả gợi ý thành công',
      metadata: {
        hasPersonalized: !!req.user,
        limit: limit,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in getAllRecommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách gợi ý',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/recommendations/stats
 * @desc    Lấy thống kê về hệ thống gợi ý
 * @access  Public
 */
router.get("/stats", async (req, res) => {
  try {
    const Recipe = require('../model/recipeModel');
    const Feedback = require('../model/feedbackModel');
    const Favorite = require('../model/favouriteModel');
    
    // Thống kê tổng quan
    const [totalRecipes, totalFeedbacks, totalFavorites] = await Promise.all([
      Recipe.countDocuments(),
      Feedback.countDocuments(),
      Favorite.countDocuments()
    ]);
    
    // Thống kê recipes có rating
    const recipesWithRatings = await Feedback.distinct('recipe_id');
    
    // Thống kê recipes có favorites
    const recipesWithFavorites = await Favorite.distinct('recipe_id');
    
    // Thống kê categories
    const categoryStats = await Recipe.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Thống kê difficulty
    const difficultyStats = await Recipe.aggregate([
      {
        $group: {
          _id: "$difficulty",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Rating distribution
    const ratingDistribution = await Feedback.aggregate([
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalRecipes,
          totalFeedbacks,
          totalFavorites,
          recipesWithRatings: recipesWithRatings.length,
          recipesWithFavorites: recipesWithFavorites.length,
          coveragePercentage: {
            ratings: Math.round((recipesWithRatings.length / totalRecipes) * 100),
            favorites: Math.round((recipesWithFavorites.length / totalRecipes) * 100)
          }
        },
        categories: categoryStats,
        difficulties: difficultyStats,
        ratingDistribution: ratingDistribution,
        algorithmInfo: {
          contentBased: {
            name: "Content-Based Filtering",
            description: "Gợi ý dựa trên đặc trưng món ăn (category, difficulty, ingredients)",
            weight: "60%"
          },
          collaborative: {
            name: "Collaborative Filtering",
            description: "Gợi ý dựa trên hành vi người dùng tương tự",
            weight: "40%"
          },
          hybrid: {
            name: "Hybrid Recommendation",
            description: "Kết hợp Content-Based và Collaborative Filtering"
          }
        }
      },
      message: 'Thống kê hệ thống gợi ý',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in getRecommendationStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
});

module.exports = router;
