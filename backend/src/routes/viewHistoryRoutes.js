const express = require('express');
const router = express.Router();
const ViewHistory = require('../model/viewHistoryModel');
const { verifyToken } = require('../middleware/verifyToken');

// Log a recipe view
router.post('/log', verifyToken, async (req, res) => {
  try {
    const { recipeId, duration = 0, source = 'direct' } = req.body;
    const userId = req.user.id;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    // Check if this view already exists in the last 5 minutes (avoid duplicate logs)
    const recentView = await ViewHistory.findOne({
      userId,
      recipeId,
      viewedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentView) {
      // Update duration if it's a continuation of the same view
      recentView.duration = Math.max(recentView.duration, duration);
      await recentView.save();
      
      return res.json({
        success: true,
        message: 'View duration updated',
        data: recentView
      });
    }

    // Create new view history entry
    const viewHistory = new ViewHistory({
      userId,
      recipeId,
      duration,
      source
    });

    await viewHistory.save();

    res.json({
      success: true,
      message: 'View logged successfully',
      data: viewHistory
    });

  } catch (error) {
    console.error('Error logging view:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging view history'
    });
  }
});

// Get user's view history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const history = await ViewHistory.getUserViewHistory(userId, limit);

    res.json({
      success: true,
      data: history,
      total: history.length
    });

  } catch (error) {
    console.error('Error fetching view history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching view history'
    });
  }
});

// Get user's category preferences
router.get('/preferences/categories', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await ViewHistory.getCategoryPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    console.error('Error fetching category preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching preferences'
    });
  }
});

// Get view frequency stats
router.get('/frequency', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const frequency = await ViewHistory.getUserViewFrequency(userId);

    res.json({
      success: true,
      data: frequency
    });

  } catch (error) {
    console.error('Error fetching view frequency:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching view frequency'
    });
  }
});

module.exports = router;
