const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const Blog = require('../model/blogModel');

// GET /api/blog - Lấy tất cả blog posts với pagination và filter
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category = '', 
      search = '', 
      sort = 'newest',
      featured = false 
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build query
    let query = { status: 'published' };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'popular':
        // Will use aggregation for popularity
        break;
      case 'most_liked':
        // Will use aggregation for likes
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }

    let blogs;
    let total;

    if (sort === 'popular' || sort === 'most_liked') {
      // Use aggregation for complex sorting
      const pipeline = [
        { $match: query },
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
        {
          $sort: sort === 'popular' 
            ? { popularityScore: -1, createdAt: -1 }
            : { likeCount: -1, createdAt: -1 }
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'authorInfo'
          }
        },
        { $unwind: '$authorInfo' },
        {
          $project: {
            title: 1,
            excerpt: 1,
            imageUrl: 1,
            category: 1,
            tags: 1,
            createdAt: 1,
            views: 1,
            likeCount: 1,
            commentCount: 1,
            popularityScore: 1,
            featured: 1,
            'authorInfo.name': 1,
            'authorInfo.email': 1
          }
        }
      ];

      blogs = await Blog.aggregate(pipeline);
      total = await Blog.countDocuments(query);
    } else {
      // Regular query with populate
      blogs = await Blog.find(query)
        .populate('author', 'name email')
        .select('title excerpt imageUrl category tags createdAt views likes comments featured')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Add virtual fields
      blogs = blogs.map(blog => ({
        ...blog,
        likeCount: blog.likes?.length || 0,
        commentCount: blog.comments?.length || 0
      }));

      total = await Blog.countDocuments(query);
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      message: 'Lấy danh sách blog thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy danh sách blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// GET /api/blog/featured - Lấy blog posts nổi bật
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const featuredBlogs = await Blog.find({ 
      status: 'published', 
      featured: true 
    })
      .populate('author', 'name email')
      .select('title excerpt imageUrl category tags createdAt views likes comments')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Add virtual fields
    const blogsWithStats = featuredBlogs.map(blog => ({
      ...blog,
      likeCount: blog.likes?.length || 0,
      commentCount: blog.comments?.length || 0
    }));

    res.json({
      success: true,
      data: blogsWithStats,
      message: 'Lấy blog nổi bật thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy blog nổi bật:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// GET /api/blog/popular - Lấy blog posts phổ biến
router.get('/popular', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const popularBlogs = await Blog.getPopularPosts(parseInt(limit));

    res.json({
      success: true,
      data: popularBlogs,
      message: 'Lấy blog phổ biến thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy blog phổ biến:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// GET /api/blog/:id - Lấy chi tiết blog post
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    // Increment view count
    await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } });

    const blog = await Blog.findById(id)
      .populate('author', 'name email')
      .populate('comments.user', 'name email')
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    if (blog.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'Blog post không khả dụng'
      });
    }

    // Add virtual fields
    const blogWithStats = {
      ...blog,
      likeCount: blog.likes?.length || 0,
      commentCount: blog.comments?.length || 0,
      readingTime: Math.ceil(blog.content.split(' ').length / 200)
    };

    res.json({
      success: true,
      data: blogWithStats,
      message: 'Lấy chi tiết blog thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy chi tiết blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// POST /api/blog - Tạo blog post mới (yêu cầu đăng nhập)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, content, imageUrl, tags, category } = req.body;
    const { id: userId } = req.user;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề và nội dung là bắt buộc'
      });
    }

    if (content.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung phải có ít nhất 50 ký tự'
      });
    }

    const newBlog = new Blog({
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl || '',
      tags: tags ? tags.map(tag => tag.trim()).filter(tag => tag) : [],
      category: category || 'recipe_share',
      author: userId
    });

    await newBlog.save();

    // Populate author info for response
    await newBlog.populate('author', 'name email');

    res.status(201).json({
      success: true,
      data: newBlog,
      message: 'Tạo blog post thành công'
    });

  } catch (error) {
    console.error('Lỗi khi tạo blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// PUT /api/blog/:id - Cập nhật blog post (chỉ tác giả hoặc admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, imageUrl, tags, category } = req.body;
    const { id: userId, role } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    // Check permission
    if (blog.author.toString() !== userId && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa blog post này'
      });
    }

    // Update fields
    if (title) blog.title = title.trim();
    if (content) blog.content = content.trim();
    if (imageUrl !== undefined) blog.imageUrl = imageUrl;
    if (tags) blog.tags = tags.map(tag => tag.trim()).filter(tag => tag);
    if (category) blog.category = category;

    await blog.save();
    await blog.populate('author', 'name email');

    res.json({
      success: true,
      data: blog,
      message: 'Cập nhật blog post thành công'
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/blog/:id - Xóa blog post (chỉ tác giả hoặc admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    // Check permission
    if (blog.author.toString() !== userId && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa blog post này'
      });
    }

    await Blog.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Xóa blog post thành công'
    });

  } catch (error) {
    console.error('Lỗi khi xóa blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// POST /api/blog/:id/like - Like/Unlike blog post (yêu cầu đăng nhập)
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    const existingLikeIndex = blog.likes.findIndex(
      like => like.user.toString() === userId
    );

    let action;
    if (existingLikeIndex > -1) {
      // Unlike
      blog.likes.splice(existingLikeIndex, 1);
      action = 'unliked';
    } else {
      // Like
      blog.likes.push({ user: userId });
      action = 'liked';
    }

    await blog.save();

    res.json({
      success: true,
      data: {
        action,
        likeCount: blog.likes.length,
        isLiked: action === 'liked'
      },
      message: action === 'liked' ? 'Đã thích blog post' : 'Đã bỏ thích blog post'
    });

  } catch (error) {
    console.error('Lỗi khi like blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// POST /api/blog/:id/comment - Thêm comment (yêu cầu đăng nhập)
router.post('/:id/comment', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung comment không được để trống'
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment không được quá 500 ký tự'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    const newComment = {
      user: userId,
      content: content.trim(),
      createdAt: new Date()
    };

    blog.comments.push(newComment);
    await blog.save();

    // Populate the new comment
    await blog.populate('comments.user', 'name email');
    const addedComment = blog.comments[blog.comments.length - 1];

    res.status(201).json({
      success: true,
      data: addedComment,
      message: 'Thêm comment thành công'
    });

  } catch (error) {
    console.error('Lỗi khi thêm comment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// ===== ADMIN ROUTES =====

// GET /api/blog/admin/all - Lấy tất cả blog posts (admin only)
router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      category = '',
      sort = 'newest'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'most_liked':
        // Will use aggregation
        break;
      case 'most_viewed':
        sortOption = { views: -1, createdAt: -1 };
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }

    let blogs;
    let total;

    if (sort === 'most_liked') {
      // Use aggregation for like-based sorting
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            commentCount: { $size: '$comments' }
          }
        },
        { $sort: { likeCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'authorInfo'
          }
        },
        { $unwind: '$authorInfo' },
        {
          $project: {
            title: 1,
            excerpt: 1,
            imageUrl: 1,
            category: 1,
            status: 1,
            featured: 1,
            tags: 1,
            createdAt: 1,
            updatedAt: 1,
            views: 1,
            likeCount: 1,
            commentCount: 1,
            'authorInfo.name': 1,
            'authorInfo.email': 1
          }
        }
      ];

      blogs = await Blog.aggregate(pipeline);
      total = await Blog.countDocuments(query);
    } else {
      // Regular query
      blogs = await Blog.find(query)
        .populate('author', 'name email')
        .select('title excerpt imageUrl category status featured tags createdAt updatedAt views likes comments')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Add virtual fields
      blogs = blogs.map(blog => ({
        ...blog,
        likeCount: blog.likes?.length || 0,
        commentCount: blog.comments?.length || 0
      }));

      total = await Blog.countDocuments(query);
    }

    const totalPages = Math.ceil(total / limit);

    // Get stats
    const stats = {
      total: await Blog.countDocuments(),
      published: await Blog.countDocuments({ status: 'published' }),
      draft: await Blog.countDocuments({ status: 'draft' }),
      hidden: await Blog.countDocuments({ status: 'hidden' }),
      reported: await Blog.countDocuments({ status: 'reported' }),
      featured: await Blog.countDocuments({ featured: true })
    };

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats
      },
      message: 'Lấy danh sách blog admin thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy danh sách blog admin:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// PATCH /api/blog/admin/manage/:id - Cập nhật status/featured blog (admin only)
router.patch('/admin/manage/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, featured } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    const updateData = {};
    if (status !== undefined) {
      if (!['draft', 'published', 'hidden', 'reported'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status không hợp lệ'
        });
      }
      updateData.status = status;
    }

    if (featured !== undefined) {
      updateData.featured = Boolean(featured);
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    res.json({
      success: true,
      data: blog,
      message: 'Cập nhật blog thành công'
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/blog/admin/manage/:id - Xóa blog (admin only)
router.delete('/admin/manage/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID blog không hợp lệ'
      });
    }

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy blog post'
      });
    }

    res.json({
      success: true,
      message: 'Xóa blog post thành công'
    });

  } catch (error) {
    console.error('Lỗi khi xóa blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/blog/admin/delete-all - Xóa tất cả blog (admin only) - DANGER!
router.delete('/admin/delete-all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalCount = await Blog.countDocuments();
    
    if (totalCount === 0) {
      return res.json({
        success: true,
        message: 'Không có blog nào để xóa',
        deletedCount: 0
      });
    }

    const result = await Blog.deleteMany({});

    res.json({
      success: true,
      message: `Đã xóa thành công ${result.deletedCount} blog posts`,
      deletedCount: result.deletedCount,
      previousTotal: totalCount
    });

  } catch (error) {
    console.error('Lỗi khi xóa tất cả blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// GET /api/blog/user/:userId - Lấy blog posts của user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID user không hợp lệ'
      });
    }

    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ 
      author: userId, 
      status: 'published' 
    })
      .populate('author', 'name email')
      .select('title excerpt imageUrl category tags createdAt views likes comments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Blog.countDocuments({ 
      author: userId, 
      status: 'published' 
    });

    // Add virtual fields
    const blogsWithStats = blogs.map(blog => ({
      ...blog,
      likeCount: blog.likes?.length || 0,
      commentCount: blog.comments?.length || 0
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        blogs: blogsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      },
      message: 'Lấy blog của user thành công'
    });

  } catch (error) {
    console.error('Lỗi khi lấy blog của user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = router;
