import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import DatePicker from '../../components/common/DatePicker';
import BowlFoodIcon from '../../assets/bowl-food.svg';
import ChefHatIcon from '../../assets/chef-hat.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';
import KnifeIcon from '../../assets/knife.svg';
import CarrotIcon from '../../assets/carrot.svg';
import SmileyIcon from '../../assets/smiley.svg';
import HeartIcon from '../../assets/heart.svg';
import EyeIcon from '../../assets/eye.svg';
import PencilIcon from '../../assets/pencil.svg';
import { getApiUrl } from '../../config/api.js';

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { user } = useSelector((state) => state.auth);

  const categories = [
    { value: 'all', label: 'Tất cả', icon: BowlFoodIcon },
    { value: 'recipe_share', label: 'Chia sẻ công thức', icon: ChefHatIcon },
    { value: 'cooking_tips', label: 'Mẹo nấu ăn', icon: LightbulbIcon },
    { value: 'food_story', label: 'Câu chuyện ẩm thực', icon: ChatDotsIcon },
    { value: 'kitchen_hacks', label: 'Thủ thuật bếp núc', icon: KnifeIcon },
    { value: 'nutrition', label: 'Dinh dưỡng', icon: CarrotIcon },
    { value: 'other', label: 'Khác', icon: SmileyIcon }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'oldest', label: 'Cũ nhất' },
    { value: 'popular', label: 'Phổ biến' },
    { value: 'most_liked', label: 'Nhiều lượt thích' }
  ];

  // Fetch blogs
  const fetchBlogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        category: selectedCategory,
        sort: sortBy
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (startDate) {
        params.startDate = startDate;
      }

      if (endDate) {
        params.endDate = endDate;
      }

      const response = await axios.get(getApiUrl('/api/blog'), { params });

      if (response.data.success) {
        setBlogs(response.data.data.blogs);
        setCurrentPage(response.data.data.pagination.currentPage);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch featured blogs
  const fetchFeaturedBlogs = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/blog/featured?limit=3'));
      if (response.data.success) {
        setFeaturedBlogs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching featured blogs:', error);
    }
  };

  useEffect(() => {
    fetchBlogs(1);
    fetchFeaturedBlogs();
  }, [selectedCategory, sortBy, startDate, endDate]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '') {
        fetchBlogs(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchBlogs(1);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get category info
  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || categories[0];
  };

  return (
    <div className="min-h-screen bg-peachLight">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-peach via-lightOrange to-peachDark py-10">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-3">
            Góc cộng đồng Cookify
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-3 max-w-3xl mx-auto">
            "Cùng chia sẻ mẹo hay và lan tỏa niềm vui nấu ăn."
          </p>
          
          {user && (
            <Link
              to="/blog/create"
              className="inline-flex items-center px-8 py-4 bg-tomato text-white font-semibold rounded-full hover:bg-red-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <img src={PencilIcon} alt="Tạo bài viết" className="w-5 h-5 mr-2" />
              Chia sẻ câu chuyện của bạn
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Featured Blogs */}
        {featuredBlogs.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              Câu chuyện nổi bật
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredBlogs.map((blog) => (
                <div key={blog._id} className="group h-full">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col">
                    <div className="relative">
                      <img
                        src={blog.imageUrl || 'https://via.placeholder.com/400x250?text=Blog+Image'}
                        alt={blog.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-tomato text-white px-3 py-1 rounded-full text-sm font-medium">
                          Nổi bật
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/90 text-gray-700 px-3 py-1 rounded-full text-sm inline-flex items-center">
                          <img src={getCategoryInfo(blog.category).icon} alt="Danh mục" className="w-4 h-4 mr-1 flex-shrink-0" /> 
                          <span>{getCategoryInfo(blog.category).label}</span>
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-tomato transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
                        {blog.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <img src={HeartIcon} alt="Lượt thích" className="w-4 h-4 mr-1" />
                            {blog.likeCount}
                          </span>
                          <span className="flex items-center">
                            <img src={ChatDotsIcon} alt="Bình luận" className="w-4 h-4 mr-1" />
                            {blog.commentCount}
                          </span>
                          <span className="flex items-center">
                            <img src={EyeIcon} alt="Lượt xem" className="w-4 h-4 mr-1" />
                            {blog.views}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(blog.createdAt)}
                        </span>
                      </div>
                      <Link
                        to={`/blog/${blog._id || 'invalid'}`}
                        className="inline-flex items-center text-tomato hover:text-red-600 font-medium transition-colors mt-auto"
                      >
                        Đọc tiếp
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="space-y-6">
            {/* Category Filter and Sort - First Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 flex-1">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category.value
                        ? 'bg-tomato text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-peachLight hover:text-tomato'
                    }`}
                  >
                    <span className="inline-flex items-center">
                      <img src={category.icon} alt="Danh mục" className="w-4 h-4 mr-2 flex-shrink-0" /> 
                      <span>{category.label}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <DatePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                placeholder="Ngày đăng"
                className="min-w-[200px]"
              />

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-tomato focus:border-transparent min-w-[150px] appearance-none bg-no-repeat bg-right pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search - Second Row (Full Width) */}
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm câu chuyện theo tiêu đề, nội dung hoặc tác giả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-tomato focus:border-transparent text-lg"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 animate-pulse rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-20"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {blogs.map((blog) => (
                <div key={blog._id} className="group h-full">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col">
                    <div className="relative">
                      <img
                        src={blog.imageUrl || 'https://via.placeholder.com/400x250?text=Blog+Image'}
                        alt={blog.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/90 text-gray-700 px-3 py-1 rounded-full text-sm inline-flex items-center">
                          <img src={getCategoryInfo(blog.category).icon} alt="Danh mục" className="w-4 h-4 mr-1 flex-shrink-0" /> 
                          <span>{getCategoryInfo(blog.category).label}</span>
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-tomato transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
                        {blog.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {blog.likeCount}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {blog.commentCount}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {blog.views}
                          </span>
                        </div>
                        <span className="text-xs">{formatDate(blog.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-peachLight rounded-full flex items-center justify-center mr-3">
                            <span className="text-tomato font-semibold text-sm">
                              {blog.author?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">{blog.author?.name || 'Anonymous'}</span>
                        </div>
                        <Link
                          to={`/blog/${blog._id || 'invalid'}`}
                          className="text-tomato hover:text-red-600 font-medium text-sm flex items-center"
                        >
                          Đọc thêm
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => fetchBlogs(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-tomato text-white hover:bg-red-600'
                  }`}
                >
                  Trước
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => fetchBlogs(page)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === page
                            ? 'bg-tomato text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-peachLight'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 3 ||
                    page === currentPage + 3
                  ) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => fetchBlogs(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-tomato text-white hover:bg-red-600'
                  }`}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <img src={PencilIcon} alt="Empty" className="w-16 h-16 mb-4 opacity-80 mx-auto" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Chưa có câu chuyện nào
            </h3>
            <p className="text-gray-600 mb-6">
              Hãy là người đầu tiên chia sẻ câu chuyện ẩm thực của bạn!
            </p>
            {user && (
              <Link
                to="/blog/create"
                className="inline-flex items-center px-6 py-3 bg-tomato text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                <img src={PencilIcon} alt="Tạo bài viết" className="w-5 h-5 mr-2" />
                Viết câu chuyện đầu tiên
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
