const express = require('express');
const mongoose = require('mongoose');
const User = require('../model/userModel');
const Recipe = require('../model/recipeModel');
const Favourite = require('../model/favouriteModel');
const generateToken = require('../middleware/generateToken');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');

const { registerUser, loginUser } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                status: user.status,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ message: 'Error retrieving profile' });
    }
});

router.get('/profile/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                status: user.status,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ message: 'Error retrieving user profile' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).send({ message: 'Logged out successfully' });
});

router.get('/all', verifyToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admin only.' 
            });
        }

        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        // Build search query
        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Get users with pagination
        const users = await User.find(searchQuery)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit);

        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalUsers,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error retrieving users' 
        });
    }
});

router.patch('/manage/:id', verifyToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admin only.' 
            });
        }

        const { id } = req.params;
        const { role, status } = req.body;

        // Validate input
        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid role. Must be user or admin.' 
            });
        }

        if (status && !['active', 'banned'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status. Must be active or banned.' 
            });
        }

        // Prevent admin from changing their own role/status
        if (id === req.user.id) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot modify your own account.' 
            });
        }

        const updateData = {};
        if (role) updateData.role = role;
        if (status) updateData.status = status;

        const user = await User.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating user' 
        });
    }
});

router.delete('/manage/:id', verifyToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admin only.' 
            });
        }

        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        const deletedUser = await User.findByIdAndDelete(id);
        
        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully',
            data: { deletedUser }
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.get('/stats', verifyToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admin only.' 
            });
        }

        // Get user count
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const bannedUsers = await User.countDocuments({ status: 'banned' });

        // Get recipe count
        let totalRecipes = 0;
        try {
            const Recipe = require('../model/recipeModel');
            totalRecipes = await Recipe.countDocuments();
        } catch (error) {
            console.log('Recipe model error:', error.message);
        }

        // Mock feedback count (can be updated when feedback system is implemented)
        const totalFeedbacks = 0;

        const stats = {
            users: {
                total: totalUsers,
                active: activeUsers,
                banned: bannedUsers
            },
            recipes: {
                total: totalRecipes
            },
            feedbacks: {
                total: totalFeedbacks
            }
        };

        res.json({
            success: true,
            message: 'Statistics retrieved successfully',
            data: stats
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.patch('/edit-profile', verifyToken, async (req, res) => {
    try {
        const { name, avatar, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        console.log('Profile update request:', { userId, name, hasAvatar: !!avatar, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update basic fields
        if (name !== undefined && name.trim()) {
            user.name = name.trim();
            console.log('Updated name:', user.name);
        }
        if (avatar !== undefined) {
            // Validate avatar if it's a base64 string
            if (avatar && typeof avatar === 'string') {
                if (avatar.startsWith('data:image/')) {
                    // Check base64 size (roughly 2MB limit)
                    if (avatar.length > 3 * 1024 * 1024) { // ~2MB base64
                        return res.status(400).json({ 
                            success: false,
                            message: 'Avatar file is too large. Maximum 2MB allowed.' 
                        });
                    }
                    user.avatar = avatar;
                    console.log('Updated avatar, length:', avatar.length);
                } else if (avatar.length > 0) {
                    // Assume it's a URL
                    user.avatar = avatar;
                    console.log('Updated avatar URL:', avatar);
                } else {
                    // Empty string to remove avatar
                    user.avatar = '';
                    console.log('Removed avatar');
                }
            }
        }

        // Handle password change
        if (newPassword && newPassword.trim()) {
            if (!currentPassword) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Current password is required to change password' 
                });
            }

            // Verify current password
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Current password is incorrect' 
                });
            }

            // Validate new password
            if (newPassword.length < 6) {
                return res.status(400).json({ 
                    success: false,
                    message: 'New password must be at least 6 characters long' 
                });
            }

            user.password = newPassword; // Will be hashed by pre-save middleware
        }

        console.log('Saving user to database...');
        await user.save();
        console.log('User saved successfully');

        const responseUser = {
            _id: user._id,
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            status: user.status,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        console.log('Sending response:', {
            success: true,
            hasAvatar: !!responseUser.avatar,
            avatarLength: responseUser.avatar ? responseUser.avatar.length : 0
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: responseUser
        });

    } catch (error) {
        console.error("Error updating user profile:", error);
        console.error("Error stack:", error.stack);
        
        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false,
                message: 'Validation error: ' + error.message 
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid user ID format' 
            });
        }
        
        // Handle payload too large error
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ 
                success: false,
                message: 'Avatar file is too large. Please choose a smaller image.' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Internal server error while updating profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/favourites', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const favorites = await Favourite.find({ user_id: userId })
            .populate('recipe_id')
            .sort({ created_at: -1 });

        // Extract recipe data from populated favorites
        const favourites = favorites
            .filter(fav => fav.recipe_id) // Filter out favorites with deleted recipes
            .map(fav => fav.recipe_id);

        res.status(200).json({
            success: true,
            message: 'Favourites retrieved successfully',
            favourites: favourites,
            totalFavorites: favourites.length
        });
    } catch (error) {
        console.error('Error getting favourites:', error);
        res.status(500).json({ 
            success: false,
            message: 'Không thể tải danh sách yêu thích' 
        });
    }
});

router.post('/favourites/:recipeId', verifyToken, async (req, res) => {
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

        // Check if already favorited
        const existingFavorite = await Favourite.findOne({ user_id, recipe_id: recipeId });
        if (existingFavorite) {
            return res.status(400).json({
                success: false,
                message: 'Recipe already in favourites'
            });
        }

        // Create new favorite record in favorites collection
        const newFavorite = new Favourite({
            user_id,
            recipe_id: recipeId
        });

        await newFavorite.save();

        // Add recipe_id to user.favourites array
        await User.findByIdAndUpdate(
            user_id,
            { $addToSet: { favourites: recipeId } }, // $addToSet prevents duplicates
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Recipe added to favourites successfully'
        });
    } catch (error) {
        console.error('Error adding to favourites:', error);
        res.status(500).json({ 
            success: false,
            message: 'Không thể thêm vào danh sách yêu thích' 
        });
    }
});

router.delete('/favourites/:recipeId', verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;
        const user_id = req.user.id;

        // Remove from favorites collection
        const deletedFavorite = await Favourite.findOneAndDelete({
            user_id,
            recipe_id: recipeId
        });

        if (!deletedFavorite) {
            return res.status(404).json({
                success: false,
                message: 'Favorite not found'
            });
        }

        // Remove recipe_id from user.favourites array
        await User.findByIdAndUpdate(
            user_id,
            { $pull: { favourites: recipeId } }, // $pull removes the item from array
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Recipe removed from favourites successfully'
        });
    } catch (error) {
        console.error('Error removing from favourites:', error);
        res.status(500).json({ 
            success: false,
            message: 'Không thể bỏ yêu thích' 
        });
    }
});

// ===== ADMIN ROUTES =====

// GET /api/users/test-db - Test database connection (admin only)
router.get('/test-db', verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('Testing database...');
    
    const User = require('../model/userModel');
    const Recipe = require('../model/recipeModel');
    const Feedback = require('../model/feedbackModel');
    
    // Get collections info
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Count documents
    const userCount = await User.countDocuments();
    const recipeCount = await Recipe.countDocuments();
    const feedbackCount = await Feedback.countDocuments();
    
    // Get sample data
    const sampleUsers = await User.find().limit(2).select('name email');
    const sampleRecipes = await Recipe.find().limit(2).select('name');
    const sampleFeedbacks = await Feedback.find().limit(2);
    
    res.json({
      success: true,
      data: {
        collections: collectionNames,
        counts: {
          users: userCount,
          recipes: recipeCount,
          feedbacks: feedbackCount
        },
        samples: {
          users: sampleUsers,
          recipes: sampleRecipes,
          feedbacks: sampleFeedbacks
        }
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed: ' + error.message
    });
  }
});

// GET /api/users/stats - Lấy thống kê tổng quan (admin only)
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const Recipe = require('../model/recipeModel');
    const totalRecipes = await Recipe.countDocuments();
    const Feedback = require('../model/feedbackModel');

    // Get statistics for ALL feedbacks (same as ManageFeedbacks API)
    const allFeedbackStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total count of all feedbacks
    const totalFeedbacks = await Feedback.countDocuments();
    const visibleFeedbacks = await Feedback.countDocuments({ status: 'visible' });
    // Try to get some sample feedbacks
    const sampleFeedbacks = await Feedback.find().limit(3);
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        admin: adminUsers
      },
      recipes: {
        total: totalRecipes
      },
      feedbacks: {
        total: totalFeedbacks,
        visible: visibleFeedbacks
      }
    };

    res.json({
      success: true,
      data: stats,
      message: 'Lấy thống kê thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy thống kê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// GET /api/users/all - Lấy tất cả users (admin only)
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      },
      message: 'Lấy danh sách users thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy tất cả users:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// PATCH /api/users/manage/:id - Cập nhật user role/status (admin only)
router.patch('/manage/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    // Prevent admin from modifying own account
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tự chỉnh sửa tài khoản của mình'
      });
    }

    // Validate role and status
    const validRoles = ['user', 'admin'];
    const validStatuses = ['active', 'banned'];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ. Chỉ chấp nhận: user, admin'
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status không hợp lệ. Chỉ chấp nhận: active, banned'
      });
    }

    console.log('Admin updating user:', { id, role, status });

    const updateData = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'Cập nhật user thành công'
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/users/manage/:id - Xóa user (admin only)
router.delete('/manage/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting own account
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tự xóa tài khoản của mình'
      });
    }

    console.log('Admin deleting user:', { id });

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    res.json({
      success: true,
      message: 'Xóa user thành công'
    });

  } catch (error) {
    console.error('Lỗi khi xóa user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = router;
