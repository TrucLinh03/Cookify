const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Favourite = require('../model/favouriteModel');
const Recipe = require('../model/recipeModel');
const User = require('../model/userModel');
const { verifyToken } = require('../middleware/verifyToken');

// GET /api/favourites/user/:id - Get user's favourite recipes
router.get('/user/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verify user can only access their own favourites (or admin can access any)
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const favouriteRecords = await Favourite.find({ user_id: userId })
      .populate('recipe_id')
      .sort({ created_at: -1 });

    // Extract recipe data from populated favourites
    const favourites = favouriteRecords
      .filter(fav => fav.recipe_id) // Filter out favourites with deleted recipes
      .map(fav => fav.recipe_id);

    res.json({
      success: true,
      favourites: favourites,
      totalFavorites: favourites.length
    });

  } catch (error) {
    console.error('Error fetching user favourites:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách yêu thích'
    });
  }
});

// GET /api/favourites/current - Get current user's favourite recipes
router.get('/current', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const favouriteRecords = await Favourite.find({ user_id: userId })
      .populate('recipe_id')
      .sort({ created_at: -1 });

    // Extract recipe data from populated favourites
    const favourites = favouriteRecords
      .filter(fav => fav.recipe_id) // Filter out favourites with deleted recipes
      .map(fav => fav.recipe_id);

    res.json({
      success: true,
      favourites: favourites,
      totalFavorites: favourites.length
    });

  } catch (error) {
    console.error('Error fetching current user favourites:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách yêu thích'
    });
  }
});

// POST /api/favourites - Add recipe to favourites
router.post('/', verifyToken, async (req, res) => {
  try {
    const { recipe_id } = req.body;
    const user_id = req.user.id;

    if (!recipe_id) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    // Check if recipe exists
    const recipe = await Recipe.findById(recipe_id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Check if already favourited in favorites collection
    const existingFavourite = await Favourite.findOne({ user_id, recipe_id });
    if (existingFavourite) {
      return res.status(400).json({
        success: false,
        message: 'Already favorited'
      });
    }

    // Check if user exists and recipe not in user.favorites array
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.favourites && user.favourites.includes(recipe_id)) {
      return res.status(400).json({
        success: false,
        message: 'Already favorited'
      });
    }

    // Create new favourite record in favorites collection
    const newFavourite = new Favourite({
      user_id,
      recipe_id
    });

    await newFavourite.save();

    // Add recipe_id to user.favourites array
    await User.findByIdAndUpdate(
      user_id,
      { $addToSet: { favourites: recipe_id } }, // $addToSet prevents duplicates
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Added to favourites',
      favourite: newFavourite
    });

  } catch (error) {
    console.error('Error adding to favourites:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể thêm vào danh sách yêu thích'
    });
  }
});

// DELETE /api/favourites/:recipeId - Remove recipe from favourites
router.delete('/:recipeId', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user_id = req.user.id;

    // Remove from favorites collection
    const deletedFavourite = await Favourite.findOneAndDelete({
      user_id,
      recipe_id: recipeId
    });

    if (!deletedFavourite) {
      return res.status(404).json({
        success: false,
        message: 'Favourite not found'
      });
    }

    // Remove recipe_id from user.favourites array
    await User.findByIdAndUpdate(
      user_id,
      { $pull: { favourites: recipeId } }, // $pull removes the item from array
      { new: true }
    );

    res.json({
      success: true,
      message: 'Removed from favourites'
    });

  } catch (error) {
    console.error('Error removing from favourites:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể bỏ yêu thích'
    });
  }
});

// GET /api/favourites/check/:recipeId - Check if recipe is favourite by current user
router.get('/check/:recipeId', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user_id = req.user.id;

    // Check in favorites collection for detailed info
    const favourite = await Favourite.findOne({
      user_id,
      recipe_id: recipeId
    });

    // Also check in user.favourites array for quick verification
    const user = await User.findById(user_id).select('favourites');
    const isInUserFavorites = user && user.favourites && user.favourites.includes(recipeId);

    res.json({
      success: true,
      isFavorited: !!favourite,
      isInUserArray: isInUserFavorites,
      favoriteDetails: favourite || null
    });

  } catch (error) {
    console.error('Error checking favourite status:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra trạng thái yêu thích'
    });
  }
});

// POST /api/favourites/:recipeId - Add recipe to favourites (alternative endpoint)
router.post('/:recipeId', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user_id = req.user.id;

    // Check if recipe exists
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Check if already favourited
    const existingFavourite = await Favourite.findOne({ user_id, recipe_id: recipeId });
    if (existingFavourite) {
      return res.status(400).json({
        success: false,
        message: 'Already favorited'
      });
    }

    // Check user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create new favourite record
    const newFavourite = new Favourite({
      user_id,
      recipe_id: recipeId
    });

    await newFavourite.save();

    // Add to user.favourites array
    await User.findByIdAndUpdate(
      user_id,
      { $addToSet: { favourites: recipeId } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Added to favourites',
      favourite: newFavourite
    });

  } catch (error) {
    console.error('Error adding to favourites:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể thêm vào danh sách yêu thích'
    });
  }
});

// GET /api/favourites/stats/:userId - Get user's favorite statistics
router.get('/stats/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify access permission
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get total favorites count
    const totalFavorites = await Favourite.countDocuments({ user_id: userId });
    
    // Get favorites by category
    const favoritesByCategory = await Favourite.aggregate([
      { $match: { user_id: mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'recipes',
          localField: 'recipe_id',
          foreignField: '_id',
          as: 'recipe'
        }
      },
      { $unwind: '$recipe' },
      {
        $group: {
          _id: '$recipe.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent favorites (last 10)
    const recentFavorites = await Favourite.find({ user_id: userId })
      .populate('recipe_id', 'name imageUrl category')
      .sort({ created_at: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalFavorites,
        favoritesByCategory,
        recentFavorites: recentFavorites.map(fav => fav.recipe_id)
      }
    });

  } catch (error) {
    console.error('Error fetching favorite statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê yêu thích'
    });
  }
});

module.exports = router;
