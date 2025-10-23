const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    minlength: 50
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  imageUrl: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['recipe_share', 'cooking_tips', 'food_story', 'kitchen_hacks', 'nutrition', 'other'],
    default: 'recipe_share'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'hidden', 'reported'],
    default: 'published'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ category: 1, createdAt: -1 });
blogSchema.index({ featured: 1, createdAt: -1 });
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Virtual for like count
blogSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
blogSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for reading time (estimated)
blogSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Method to check if user liked the post
blogSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Static method to get popular posts
blogSchema.statics.getPopularPosts = function(limit = 5) {
  return this.aggregate([
    { $match: { status: 'published' } },
    {
      $addFields: {
        likeCount: { $size: '$likes' },
        commentCount: { $size: '$comments' },
        popularityScore: {
          $add: [
            { $multiply: [{ $size: '$likes' }, 2] },
            { $size: '$comments' },
            { $divide: ['$views', 10] }
          ]
        }
      }
    },
    { $sort: { popularityScore: -1, createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorInfo'
      }
    },
    { $unwind: '$authorInfo' }
  ]);
};

// Pre-save middleware to generate excerpt
blogSchema.pre('save', function(next) {
  if (!this.excerpt && this.content) {
    // Remove HTML tags and get first 250 characters
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 250) + (plainText.length > 250 ? '...' : '');
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
