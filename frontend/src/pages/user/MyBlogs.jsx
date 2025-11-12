import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getApiUrl } from '../../config/api.js';
import SecureStorage from '../../utils/secureStorage';
import ChefHatIcon from '../../assets/chef-hat.svg';
import CheckIcon from '../../assets/thumbs-up.svg';
import PencilIcon from '../../assets/pencil.svg';
import EyeIcon from '../../assets/eye.svg';

const MyBlogs = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [userBlogs, setUserBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    hidden: 0
  });

  // Redirect if not logged in
  if (!user) {
    navigate('/login');
    return null;
  }

  // Redirect admin to admin dashboard
  if (user.role === 'admin') {
    navigate('/dashboard/blogs');
    return null;
  }

  useEffect(() => {
    fetchUserBlogs();
  }, []);

  // Filter and search blogs
  useEffect(() => {
    let filtered = [...userBlogs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(blog =>
        blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(blog => blog.status === filterStatus);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(blog => blog.category === filterCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'most_viewed':
          return (b.views || 0) - (a.views || 0);
        case 'most_liked':
          return (b.likes?.length || 0) - (a.likes?.length || 0);
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredBlogs(filtered);
  }, [userBlogs, searchTerm, filterStatus, filterCategory, sortBy]);

  const getAuthToken = () => {
    return SecureStorage.getToken();
  };

  const getAxiosConfig = () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Vui lòng đăng nhập lại');
      navigate('/login');
      return null;
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  const fetchUserBlogs = async () => {
    try {
      setLoading(true);
      const config = getAxiosConfig();
      
      if (!config) {
        setLoading(false);
        return;
      }

      const response = await axios.get(
        getApiUrl('/api/blog/my-blogs'),
        config
      );

      if (response.data.success) {
        const blogs = response.data.data?.blogs || [];
        setUserBlogs(blogs);
        
        // Calculate stats
        const statsData = {
          total: blogs.length,
          published: blogs.filter(blog => blog.status === 'published').length,
          draft: blogs.filter(blog => blog.status === 'draft').length,
          hidden: blogs.filter(blog => blog.status === 'hidden').length
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching user blogs:', error);
      toast.error('Không thể tải danh sách bài viết: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteBlog = async (blogId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      return;
    }

    try {
      const config = getAxiosConfig();
      
      if (!config) return;

      const response = await axios.delete(
        getApiUrl(`/api/blog/${blogId}`),
        config
      );

      if (response.data.success) {
        toast.success('Xóa bài viết thành công!');
        fetchUserBlogs(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Không thể xóa bài viết: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có thông tin";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã xuất bản' },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bản nháp' },
      hidden: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Ẩn' },
      reported: { bg: 'bg-red-100', text: 'text-red-800', label: 'Báo cáo' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryLabel = (category) => {
    const categories = {
      recipe_share: 'Chia sẻ công thức',
      cooking_tips: 'Mẹo nấu ăn',
      food_story: 'Câu chuyện ẩm thực',
      kitchen_hacks: 'Thủ thuật bếp núc',
      nutrition: 'Dinh dưỡng',
      other: 'Khác'
    };
    return categories[category] || 'Khác';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategory('all');
    setSortBy('newest');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tomato mx-auto"></div>
          <p className="mt-4 text-gray-500">Đang tải danh sách bài viết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Quay lại Profile</span>
            </button>
            <button
              onClick={() => navigate('/blog/create')}
              className="bg-tomato text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tạo bài viết mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bài viết của tôi</h1>
          <p className="text-gray-600 mt-2">Quản lý tất cả bài viết blog của bạn</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <img src={ChefHatIcon} alt="Total" className="w-6 h-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng số bài viết</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <img src={CheckIcon} alt="Published" className="w-6 h-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đã xuất bản</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.published}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <img src={PencilIcon} alt="Draft" className="w-6 h-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bản nháp</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <img src={EyeIcon} alt="Hidden" className="w-6 h-6" style={{opacity: 0.5}} />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ẩn</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.hidden}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-tomato focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tomato focus:border-transparent"
                >
                  <option value="all">Tất cả</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="draft">Bản nháp</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tomato focus:border-transparent"
                >
                  <option value="all">Tất cả</option>
                  <option value="recipe_share">Chia sẻ công thức</option>
                  <option value="cooking_tips">Mẹo nấu ăn</option>
                  <option value="food_story">Câu chuyện ẩm thực</option>
                  <option value="kitchen_hacks">Thủ thuật bếp núc</option>
                  <option value="nutrition">Dinh dưỡng</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sắp xếp</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tomato focus:border-transparent"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="most_viewed">Nhiều lượt xem</option>
                  <option value="most_liked">Nhiều lượt thích</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold text-gray-900">{filteredBlogs.length}</span> trong tổng số <span className="font-semibold text-gray-900">{userBlogs.length}</span> bài viết
              </p>
              {(searchTerm || filterStatus !== 'all' || filterCategory !== 'all') && (
                <span className="text-sm text-tomato font-medium">Đang áp dụng bộ lọc</span>
              )}
            </div>
          </div>
        </div>

        {/* Blog List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Danh sách bài viết</h2>
          </div>
          
          {userBlogs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có bài viết nào</h3>
              <p className="text-gray-500 mb-4">Hãy bắt đầu chia sẻ câu chuyện của bạn!</p>
              <button
                onClick={() => navigate('/blog/create')}
                className="bg-tomato text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                Viết bài viết đầu tiên
              </button>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy bài viết</h3>
              <p className="text-gray-500 mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              <button
                onClick={clearFilters}
                className="bg-tomato text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBlogs.map((blog) => (
                <div key={blog._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 
                          className="text-xl font-semibold text-gray-900 hover:text-tomato cursor-pointer truncate"
                          onClick={() => blog.status === 'published' && navigate(`/blog/${blog._id}`)}
                        >
                          {blog.title}
                        </h3>
                        <div className="flex space-x-2 flex-shrink-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            blog.category === 'recipe_share' ? 'bg-orange-100 text-orange-800' :
                            blog.category === 'cooking_tips' ? 'bg-blue-100 text-blue-800' :
                            blog.category === 'food_story' ? 'bg-purple-100 text-purple-800' :
                            blog.category === 'kitchen_hacks' ? 'bg-green-100 text-green-800' :
                            blog.category === 'nutrition' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getCategoryLabel(blog.category)}
                          </span>
                          {getStatusBadge(blog.status)}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {blog.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                      </p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <span>📅 {formatDate(blog.createdAt)}</span>
                        <span>👀 {blog.views || 0} lượt xem</span>
                        <span>💬 {blog.comments?.length || 0} bình luận</span>
                        <span>❤️ {blog.likes?.length || 0} lượt thích</span>
                        {blog.tags && blog.tags.length > 0 && (
                          <span>🏷️ {blog.tags.slice(0, 2).join(', ')}{blog.tags.length > 2 && '...'}</span>
                        )}
                      </div>
                    </div>
                    
                    {blog.imageUrl && (
                      <div className="ml-6 flex-shrink-0">
                        <img 
                          src={blog.imageUrl} 
                          alt={blog.title}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100">
                    {blog.status === 'published' && (
                      <button
                        onClick={() => navigate(`/blog/${blog._id}`)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Xem</span>
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/edit-blog/${blog._id}`)}
                      className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Sửa</span>
                    </button>
                    <button
                      onClick={() => deleteBlog(blog._id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBlogs;
