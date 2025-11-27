import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import DatePicker from '../../components/common/DatePicker';
import SecureStorage from '../../utils/secureStorage';
import PencilIcon from '../../assets/pencil.svg';
import ThumbsUpIcon from '../../assets/thumbs-up.svg';
import ClockIcon from '../../assets/clock.svg';
import EyeIcon from '../../assets/eye.svg';
import TrashIcon from '../../assets/trash.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';
import { getApiUrl } from '../../config/api.js';

const ManageBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [stats, setStats] = useState({});
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const categories = [
    { value: 'all', label: 'Tất cả danh mục' },
    { value: 'recipe_share', label: 'Chia sẻ công thức' },
    { value: 'cooking_tips', label: 'Mẹo nấu ăn' },
    { value: 'food_story', label: 'Câu chuyện ẩm thực' },
    { value: 'kitchen_hacks', label: 'Thủ thuật bếp núc' },
    { value: 'nutrition', label: 'Dinh dưỡng' },
    { value: 'other', label: 'Khác' }
  ];

  // Fetch blogs
  const fetchBlogs = async (page = 1) => {
    try {
      setLoading(true);
      const token = SecureStorage.getToken();
      
      const params = {
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        sort: sortBy
      };

      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }
      
      const response = await axios.get(getApiUrl('/api/blog/admin/all'), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params
      });

      if (response.data.success) {
        setBlogs(response.data.data.blogs);
        setCurrentPage(response.data.data.pagination.currentPage);
        setTotalPages(response.data.data.pagination.totalPages);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Có lỗi xảy ra khi tải danh sách blog: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Update blog status/featured
  const updateBlogStatus = async (blogId, updates) => {
    try {
      const token = SecureStorage.getToken();
      
      const response = await axios.patch(getApiUrl(`/api/blog/admin/manage/${blogId}`), updates, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Cập nhật thành công!');
        fetchBlogs(currentPage);
        setShowModal(false);
        setSelectedBlog(null);
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete blog
  const deleteBlog = async (blogId) => {
    try {
      const token = SecureStorage.getToken();
      
      const response = await axios.delete(getApiUrl(`/api/blog/admin/manage/${blogId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Xóa blog thành công!');
        fetchBlogs(currentPage);
        setShowModal(false);
        setSelectedBlog(null);
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete all blogs
  const deleteAllBlogs = async () => {
    const confirmMessage = `CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ blog?\n\nHành động này sẽ:\n- Xóa vĩnh viễn tất cả ${stats.total || 0} blog\n- Không thể khôi phục\n- Ảnh hưởng đến nội dung website\n\nNhập "XOA TAT CA" để xác nhận:`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== "XOA TAT CA") {
      toast.info('Hủy bỏ thao tác xóa tất cả blog.');
      return;
    }

    const finalConfirm = confirm('XÁC NHẬN CUỐI CÙNG: Bạn thực sự muốn xóa tất cả blog? Hành động này KHÔNG THỂ HOÀN TÁC!');
    
    if (!finalConfirm) {
      return;
    }

    try {
      setLoading(true);
      const token = SecureStorage.getToken();
      
      const response = await axios.delete(getApiUrl('/api/blog/admin/delete-all'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success(`Đã xóa thành công ${response.data.deletedCount || 0} blog!`);
        fetchBlogs(1); // Refresh to page 1
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error deleting all blogs:', error);
      toast.error('Có lỗi xảy ra khi xóa tất cả blog: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBlogs(1);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'hidden': return 'bg-gray-100 text-gray-800';
      case 'reported': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'published': return 'Đã xuất bản';
      case 'draft': return 'Bản nháp';
      case 'hidden': return 'Ẩn';
      case 'reported': return 'Báo cáo';
      default: return status;
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setCurrentPage(1);
      fetchBlogs(1);
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    fetchBlogs(1);
  }, [statusFilter, categoryFilter, sortBy, startDate, endDate]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý Blog</h1>
        <p className="text-gray-600">Quản lý tất cả bài viết blog trong hệ thống</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-2">
              <img src={PencilIcon} alt="Tổng số" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-blue-600">Tổng số</h3>
          </div>
          <p className="text-lg font-bold text-blue-800">{stats.total || 0}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-2">
              <img src={ThumbsUpIcon} alt="Đã xuất bản" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-green-600">Đã xuất bản</h3>
          </div>
          <p className="text-lg font-bold text-green-800">{stats.published || 0}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-yellow-100 rounded-md flex items-center justify-center mr-2">
              <img src={PencilIcon} alt="Bản nháp" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-yellow-600">Bản nháp</h3>
          </div>
          <p className="text-lg font-bold text-yellow-800">{stats.draft || 0}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center mr-2">
              <img src={EyeIcon} alt="Ẩn" className="w-3 h-3 opacity-70" />
            </div>
            <h3 className="text-xs font-medium text-gray-600">Ẩn</h3>
          </div>
          <p className="text-lg font-bold text-gray-800">{stats.hidden || 0}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mr-2">
              <img src={TrashIcon} alt="Báo cáo" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-red-600">Báo cáo</h3>
          </div>
          <p className="text-lg font-bold text-red-800">{stats.reported || 0}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-2">
              <img src={LightbulbIcon} alt="Nổi bật" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-purple-600">Nổi bật</h3>
          </div>
          <p className="text-lg font-bold text-purple-800">{stats.featured || 0}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 w-full lg:max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tiêu đề, nội dung, tác giả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                />
                <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Delete All Button */}
            <button
              onClick={deleteAllBlogs}
              disabled={loading || !stats.total || stats.total === 0}
              className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 whitespace-nowrap ${
                loading || !stats.total || stats.total === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 hover:shadow-md'
              }`}
              title={stats.total > 0 ? `Xóa tất cả ${stats.total} blog` : 'Không có blog để xóa'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Xóa Tất Cả</span>
              {stats.total > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {stats.total}
                </span>
              )}
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white min-w-[140px] appearance-none bg-no-repeat bg-right pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                <option value="all">Tất cả</option>
                <option value="published">Đã xuất bản</option>
                <option value="draft">Bản nháp</option>
                <option value="hidden">Ẩn</option>
                <option value="reported">Báo cáo</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Danh mục:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white min-w-[160px] appearance-none bg-no-repeat bg-right pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white min-w-[140px] appearance-none bg-no-repeat bg-right pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="most_liked">Nhiều like</option>
                <option value="most_viewed">Nhiều view</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Ngày đăng:</label>
              <DatePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                placeholder="Chọn khoảng thời gian"
                className="min-w-[200px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Blogs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bài viết
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tác giả
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thống kê
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-6 animate-pulse"></div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-10 animate-pulse"></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : blogs.length > 0 ? (
                blogs.map((blog, index) => (
                  <tr key={blog._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {index + 1 + (currentPage - 1) * 10}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16">
                          <img
                            className="h-16 w-16 rounded-lg object-cover"
                            src={blog.imageUrl || 'https://via.placeholder.com/64x64?text=Blog'}
                            alt={blog.title}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {blog.title}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {blog.excerpt}
                          </div>
                          {blog.featured && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              Nổi bật
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{blog.authorInfo?.name || blog.author?.name}</div>
                      <div className="text-sm text-gray-500">{blog.authorInfo?.email || blog.author?.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categories.find(cat => cat.value === blog.category)?.label || blog.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(blog.status)}`}>
                        {getStatusText(blog.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center mb-1">
                        <img src={EyeIcon} alt="Lượt xem" className="w-4 h-4 mr-2 opacity-80" />
                        <span className="text-gray-700">{blog.views || 0}</span>
                      </div>
                      <div className="flex items-center mb-1">
                        <img src={ThumbsUpIcon} alt="Lượt thích" className="w-4 h-4 mr-2 opacity-80" />
                        <span className="text-gray-700">{blog.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center">
                        <img src={ChatDotsIcon} alt="Bình luận" className="w-4 h-4 mr-2 opacity-80" />
                        <span className="text-gray-700">{blog.commentCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(blog.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBlog(blog);
                            setModalType('edit');
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBlog(blog);
                            setModalType('delete');
                            setShowModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <img src={PencilIcon} alt="Empty" className="w-12 h-12 mb-4 opacity-80 mx-auto" />
                      <p className="text-lg font-medium mb-2">
                        {startDate || endDate 
                          ? 'Không có blog nào trong khoảng thời gian này' 
                          : searchTerm 
                          ? `Không tìm thấy blog với từ khóa "${searchTerm}"`
                          : 'Không có blog nào được tìm thấy'}
                      </p>
                      {(startDate || endDate || searchTerm) && (
                        <p className="text-sm text-gray-400">
                          Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchBlogs(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Trước
              </button>
              <button
                onClick={() => fetchBlogs(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => fetchBlogs(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Trước
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => fetchBlogs(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => fetchBlogs(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedBlog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {modalType === 'edit' ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Chỉnh sửa blog: {selectedBlog.title}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Trạng thái
                      </label>
                      <select
                        defaultValue={selectedBlog.status}
                        onChange={(e) => setSelectedBlog({...selectedBlog, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 appearance-none bg-no-repeat bg-right pr-8"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="published">Đã xuất bản</option>
                        <option value="draft">Bản nháp</option>
                        <option value="hidden">Ẩn</option>
                        <option value="reported">Báo cáo</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked={selectedBlog.featured}
                          onChange={(e) => setSelectedBlog({...selectedBlog, featured: e.target.checked})}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Đánh dấu nổi bật</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => updateBlogStatus(selectedBlog._id, {
                        status: selectedBlog.status,
                        featured: selectedBlog.featured
                      })}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      Lưu
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Xác nhận xóa
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Bạn có chắc chắn muốn xóa blog "{selectedBlog.title}"? Hành động này không thể hoàn tác.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => deleteBlog(selectedBlog._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default ManageBlogs;
