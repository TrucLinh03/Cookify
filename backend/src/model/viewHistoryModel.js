const mongoose = require('mongoose');

const viewHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true,
    index: true
  },
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: {
    type: Number, // seconds spent viewing
    default: 0
  },
  source: {
    type: String,
    enum: ['search', 'recommendation', 'category', 'related', 'direct'],
    default: 'direct'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
viewHistorySchema.index({ userId: 1, recipeId: 1 });
viewHistorySchema.index({ userId: 1, viewedAt: -1 });

// Static method to get user's view history with aggregation
viewHistorySchema.statics.getUserViewHistory = async function(userId, limit = 50) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $sort: { viewedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'recipes',
        localField: 'recipeId',
        foreignField: '_id',
        as: 'recipe'
      }
    },
    { $unwind: '$recipe' },
    {
      $project: {
        recipeId: 1,
        viewedAt: 1,
        duration: 1,
        source: 1,
        'recipe.name': 1,
        'recipe.category': 1,
        'recipe.difficulty': 1,
        'recipe.cookingTime': 1,
        'recipe.ingredients': 1
      }
    }
  ]);
};

// Static method to get view frequency for a user
viewHistorySchema.statics.getUserViewFrequency = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$recipeId',
        viewCount: { $sum: 1 },
        lastViewed: { $max: '$viewedAt' },
        totalDuration: { $sum: '$duration' }
      }
    },
    { $sort: { viewCount: -1, lastViewed: -1 } }
  ]);
};

// Static method to get category preferences based on view history
viewHistorySchema.statics.getCategoryPreferences = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'recipes',
        localField: 'recipeId',
        foreignField: '_id',
        as: 'recipe'
      }
    },
    { $unwind: '$recipe' },
    {
      $group: {
        _id: '$recipe.category',
        viewCount: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    { $sort: { viewCount: -1 } }
  ]);
};

module.exports = mongoose.model('ViewHistory', viewHistorySchema);
