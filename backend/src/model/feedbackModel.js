const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating phải là số nguyên từ 1 đến 5'
    }
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  status: {
    type: String,
    enum: ['visible', 'hidden', 'reported'],
    default: 'visible'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Index để tối ưu hóa query
feedbackSchema.index({ recipe_id: 1, created_at: -1 });
feedbackSchema.index({ user_id: 1, recipe_id: 1 }, { unique: true }); // Mỗi user chỉ có thể đánh giá 1 lần cho 1 recipe

// Middleware để tự động cập nhật updated_at
feedbackSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Virtual để format thời gian
feedbackSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.created_at;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Vừa xong' : `${minutes} phút trước`;
    }
    return hours === 1 ? '1 giờ trước' : `${hours} giờ trước`;
  }
  return days === 1 ? '1 ngày trước' : `${days} ngày trước`;
});

// Static method để tính rating trung bình
feedbackSchema.statics.getAverageRating = async function(recipeId) {
  try {
    const result = await this.aggregate([
      { $match: { recipe_id: new mongoose.Types.ObjectId(recipeId), status: 'visible' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });

    return {
      averageRating: Math.round(data.averageRating * 10) / 10,
      totalReviews: data.totalReviews,
      ratingDistribution: distribution
    };
  } catch (error) {
    console.error('Error calculating average rating:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
};

// Ensure virtual fields are serialized
feedbackSchema.set('toJSON', { virtuals: true });

const Feedback = mongoose.model('Feedback', feedbackSchema, 'feedbacks');

module.exports = Feedback;
