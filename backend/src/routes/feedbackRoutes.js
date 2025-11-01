const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const Feedback = require('../model/feedbackModel');

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Feedback routes working!'
  });
});

// GET /api/feedback/recipe/:recipeId - Lấy tất cả feedback của một recipe
router.get('/recipe/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Lấy feedback với thông tin user
    const feedbacks = await Feedback.find({ 
      recipe_id: recipeId, 
      status: 'visible' 
    })
    .populate('user_id', 'name email')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Đếm tổng số feedback
    const total = await Feedback.countDocuments({ 
      recipe_id: recipeId, 
      status: 'visible' 
    });

    // Tính thống kê rating đơn giản
    let ratingStats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (feedbacks.length > 0) {
      const ratings = feedbacks.map(f => f.rating);
      const sum = ratings.reduce((a, b) => a + b, 0);
      ratingStats.averageRating = Math.round((sum / ratings.length) * 10) / 10;
      ratingStats.totalReviews = feedbacks.length;
      
      // Đếm distribution
      ratings.forEach(rating => {
        ratingStats.ratingDistribution[rating]++;
      });
    }

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        ratingStats
      },
      message: feedbacks.length > 0 ? 'Lấy feedback thành công' : 'Chưa có đánh giá nào'
    });

  } catch (error) {
    console.error('Lỗi khi lấy feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy feedback'
    });
  }
});

// POST /api/feedback - Tạo feedback mới (yêu cầu đăng nhập)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { recipe_id, rating, comment } = req.body;
    const user_id = req.user.id;

    // Validate dữ liệu
    if (!recipe_id || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin đánh giá'
      });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Điểm đánh giá phải là số nguyên từ 1 đến 5'
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Bình luận phải có ít nhất 10 ký tự'
      });
    }

    // Kiểm tra xem user đã đánh giá recipe này chưa
    const existingFeedback = await Feedback.findOne({ user_id, recipe_id });
    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá công thức này rồi. Mỗi người chỉ được đánh giá 1 lần cho mỗi công thức.'
      });
    }

    // Tạo feedback mới
    const newFeedback = new Feedback({
      user_id,
      recipe_id,
      rating,
      comment: comment.trim(),
      sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral'
    });

    await newFeedback.save();

    // Populate user info để trả về
    await newFeedback.populate('user_id', 'name email');

    res.status(201).json({
      success: true,
      data: newFeedback,
      message: 'Đánh giá đã được gửi thành công'
    });

  } catch (error) {
    console.error('Lỗi khi tạo feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo feedback: ' + error.message
    });
  }
});

// PUT /api/feedback/:id - Cập nhật feedback (chỉ chủ sở hữu)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    // Tìm feedback
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    // Kiểm tra quyền sở hữu
    if (feedback.user_id.toString() !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể chỉnh sửa đánh giá của mình'
      });
    }

    // Validate dữ liệu
    if (rating && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return res.status(400).json({
        success: false,
        message: 'Điểm đánh giá phải là số nguyên từ 1 đến 5'
      });
    }

    if (comment && comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Bình luận phải có ít nhất 10 ký tự'
      });
    }

    // Cập nhật feedback
    if (rating) feedback.rating = rating;
    if (comment) feedback.comment = comment.trim();
    feedback.updated_at = new Date();

    await feedback.save();
    await feedback.populate('user_id', 'name email');

    res.json({
      success: true,
      data: feedback,
      message: 'Đánh giá đã được cập nhật'
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật feedback: ' + error.message
    });
  }
});

// DELETE /api/feedback/:id - Xóa feedback (chỉ chủ sở hữu)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Tìm feedback
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    // Kiểm tra quyền (chủ sở hữu hoặc admin)
    if (feedback.user_id.toString() !== user_id && user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đánh giá này'
      });
    }

    await Feedback.findByIdAndDelete(id);
    res.json({
      success: true,
      message: 'Đánh giá đã được xóa'
    });

  } catch (error) {
    console.error('Lỗi khi xóa feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa feedback: ' + error.message
    });
  }
});

// GET /api/feedback/check/:recipeId - Kiểm tra xem user đã feedback recipe này chưa
router.get('/check/:recipeId', verifyToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const user_id = req.user.id;

    const existingFeedback = await Feedback.findOne({ 
      user_id, 
      recipe_id: recipeId 
    });

    res.json({
      success: true,
      data: {
        hasRated: !!existingFeedback,
        feedback: existingFeedback
      },
      message: existingFeedback ? 'User đã đánh giá' : 'User chưa đánh giá'
    });

  } catch (error) {
    console.error('Lỗi khi kiểm tra feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra feedback'
    });
  }
});

// GET /api/feedback/user/my - Lấy tất cả feedback của user hiện tại
router.get('/user/my', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find({ user_id })
      .populate('recipe_id', 'name imageUrl category')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments({ user_id });

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      },
      message: 'Lấy danh sách đánh giá thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy feedback của user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy feedback: ' + error.message
    });
  }
});

// ===== ADMIN ROUTES =====

// GET /api/feedback/admin/all - Lấy tất cả feedback (admin only)
router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search in comment or user name
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    const feedbacks = await Feedback.find(query)
      .populate('user_id', 'name email')
      .populate('recipe_id', 'name imageUrl category')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    // Get statistics for ALL feedbacks (not filtered)
    const allStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total count of all feedbacks
    const totalAllFeedbacks = await Feedback.countDocuments();

    const statusStats = {
      visible: 0,
      hidden: 0,
      reported: 0,
      total: totalAllFeedbacks
    };

    allStats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        stats: statusStats
      },
      message: 'Lấy danh sách feedback thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy tất cả feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// PATCH /api/feedback/admin/manage/:id - Cập nhật status feedback (admin only)
router.patch('/admin/manage/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['visible', 'hidden', 'reported'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status không hợp lệ. Chỉ chấp nhận: visible, hidden, reported'
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { 
        status,
        updated_at: new Date()
      },
      { new: true }
    ).populate('user_id', 'name email')
     .populate('recipe_id', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy feedback'
      });
    }

    res.json({
      success: true,
      data: feedback,
      message: `Cập nhật trạng thái feedback thành ${status} thành công`
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/feedback/admin/manage/:id - Xóa feedback (admin only)
router.delete('/admin/manage/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy feedback'
      });
    }

    res.json({
      success: true,
      message: 'Xóa feedback thành công'
    });

  } catch (error) {
    console.error('Lỗi khi xóa feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/feedback/admin/delete-all - Xóa tất cả feedback (admin only)
router.delete('/admin/delete-all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Đếm số feedback trước khi xóa
    const totalCount = await Feedback.countDocuments();
    
    if (totalCount === 0) {
      return res.json({
        success: true,
        message: 'Không có feedback nào để xóa',
        deletedCount: 0
      });
    }

    // Xóa tất cả feedback
    const result = await Feedback.deleteMany({});

    res.json({
      success: true,
      message: `Đã xóa thành công ${result.deletedCount} feedback`,
      deletedCount: result.deletedCount,
      previousTotal: totalCount
    });

  } catch (error) {
    console.error('Lỗi khi xóa tất cả feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = router;
