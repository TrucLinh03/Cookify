import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useFavoritesContext } from '../../contexts/FavoritesContext';
import { getApiUrl } from '../../config/api.js';

const Favourite = () => {
  const [favouriteRecipes, setFavouriteRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('tatca');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { userId } = useParams();
  const { favoriteUpdates, triggerFavoriteUpdate } = useFavoritesContext();

  useEffect(() => {
    const fetchFavouriteRecipes = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(getApiUrl('/api/users/favourites'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const recipes = response.data.favourites || [];
          setFavouriteRecipes(recipes);
          setFilteredRecipes(recipes);
        }
      } catch (err) {
        console.error('Error fetching favourite recipes:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Không thể tải danh sách công thức yêu thích');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavouriteRecipes();
  }, [navigate, userId, favoriteUpdates]);

  const handleRemoveFavourite = async (recipeId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.delete(getApiUrl(`/api/users/favourites/${recipeId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const updatedRecipes = favouriteRecipes.filter(recipe => recipe._id !== recipeId);
        setFavouriteRecipes(updatedRecipes);
        // Apply current filter to updated recipes
        filterRecipes(updatedRecipes, selectedCategory);
        // Trigger update for other components
        triggerFavoriteUpdate();
      }
    } catch (err) {
      console.error('Error removing favourite:', err);
      setError('Không thể bỏ yêu thích công thức này');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getDifficultyColor = (difficulty) => {
    // Handle both English and lowercase variations
    const normalizedDifficulty = difficulty?.toLowerCase();
    switch (normalizedDifficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyName = (difficulty) => {
    const normalizedDifficulty = difficulty?.toLowerCase();
    switch (normalizedDifficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty || 'Chưa xác định';
    }
  };

  // Category mapping from backend to frontend
  const getCategoryKey = (backendCategory) => {
    // If backend already uses frontend keys, return as is
    if (['monchinh', 'trangmieng', 'douong', 'anvat', 'monphu'].includes(backendCategory?.toLowerCase())) {
      return backendCategory.toLowerCase();
    }
    
    // Otherwise map English to Vietnamese keys
    const mapping = {
      'Main': 'monchinh',
      'Dessert': 'trangmieng', 
      'Drink': 'douong',
      'Side': 'monphu',
      'Snack': 'anvat'
    };
    return mapping[backendCategory] || 'monchinh';
  };

  const getCategoryInfo = (categoryKey) => {
    const categories = {
      'tatca': { name: 'Tất Cả', bg: '#f3f4f6', color: '#374151' },
      'monchinh': { name: 'Món Chính', bg: '#dbeafe', color: '#1d4ed8' },
      'monphu': { name: 'Món Phụ', bg: '#e8f5fa', color: '#397a9e' },
      'trangmieng': { name: 'Tráng Miệng', bg: '#efedfa', color: '#3c3a8f' },
      'anvat': { name: 'Món Ăn Vặt', bg: '#fef3c7', color: '#d97706' },
      'douong': { name: 'Đồ Uống', bg: '#dcfce7', color: '#16a34a' }
    };
    return categories[categoryKey] || categories['monchinh'];
  };

  // Advanced filter and search
  useEffect(() => {
    let filtered = [...favouriteRecipes];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(recipe =>
        recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'tatca') {
      filtered = filtered.filter(recipe => {
        const recipeCategory = getCategoryKey(recipe.category);
        return recipeCategory === selectedCategory;
      });
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(recipe =>
        recipe.difficulty?.toLowerCase() === selectedDifficulty
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'time':
          return (a.cookingTime || 0) - (b.cookingTime || 0);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredRecipes(filtered);
  }, [favouriteRecipes, searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('tatca');
    setSelectedDifficulty('all');
    setSortBy('newest');
  };

  const getCategoryColor = (category) => {
    const categoryKey = getCategoryKey(category);
    const categoryInfo = getCategoryInfo(categoryKey);
    return `text-xs font-medium px-2 py-1 rounded-full`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách yêu thích...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="text-xl">←</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Quay lại
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Công thức yêu thích</h1>
          <p className="text-gray-600 mt-2">Quản lý và khám phá các món ăn bạn yêu thích</p>
        </div>

        {/* Stats */}
        {favouriteRecipes.length > 0 && (
          <div className="bg-peachLight rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                Thống kê yêu thích
              </h3>
              <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                <span className="text-sm font-medium text-gray-600">Tổng: {favouriteRecipes.length} món</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Recipes */}
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-peach">
                <div className="w-12 h-12 bg-tomato rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">{favouriteRecipes.length}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">Tổng công thức</div>
                <div className="text-xs text-gray-500 mt-1">Đã yêu thích</div>
              </div>
              
              {/* Easy Recipes */}
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-green-100">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">{favouriteRecipes.filter(r => r.difficulty?.toLowerCase() === 'easy').length}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">Dễ làm</div>
                <div className="text-xs text-gray-500 mt-1">Nấu nhanh</div>
              </div>
              
              {/* Medium Recipes */}
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-yellow-100">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">{favouriteRecipes.filter(r => r.difficulty?.toLowerCase() === 'medium').length}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">Trung bình</div>
                <div className="text-xs text-gray-500 mt-1">Cần kỹ năng</div>
              </div>
              
              {/* Hard Recipes */}
              <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-red-100">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">{favouriteRecipes.filter(r => r.difficulty?.toLowerCase() === 'hard').length}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">Khó làm</div>
                <div className="text-xs text-gray-500 mt-1">Thử thách</div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {favouriteRecipes.length > 0 && (
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
                  placeholder="Tìm kiếm công thức theo tên hoặc mô tả..."
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
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tomato focus:border-transparent"
                  >
                    <option value="tatca">Tất cả</option>
                    <option value="monchinh">Món Chính</option>
                    <option value="monphu">Món Phụ</option>
                    <option value="trangmieng">Tráng Miệng</option>
                    <option value="anvat">Món Ăn Vặt</option>
                    <option value="douong">Đồ Uống</option>
                  </select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Độ khó</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tomato focus:border-transparent"
                  >
                    <option value="all">Tất cả</option>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
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
                    <option value="name">Tên A-Z</option>
                    <option value="time">Thời gian nấu</option>
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
                  Hiển thị <span className="font-semibold text-gray-900">{filteredRecipes.length}</span> trong tổng số <span className="font-semibold text-gray-900">{favouriteRecipes.length}</span> công thức
                </p>
                {(searchTerm || selectedCategory !== 'tatca' || selectedDifficulty !== 'all') && (
                  <span className="text-sm text-tomato font-medium">Đang áp dụng bộ lọc</span>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <span className="mr-2">❌</span>
            {error}
          </div>
        )}

        {filteredRecipes.length === 0 && favouriteRecipes.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy công thức nào
            </h3>
            <p className="text-gray-600 mb-6">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
            <button
              onClick={clearFilters}
              className="bg-tomato text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : favouriteRecipes.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Chưa có công thức yêu thích
            </h3>
            <p className="text-gray-600 mb-6">
              Hãy khám phá và thêm những công thức bạn yêu thích vào danh sách này!
            </p>
            <button
              onClick={() => navigate('/recipes')}
              className="bg-tomato hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Khám phá công thức
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <div key={recipe._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="relative">
                  <img
                    src={recipe.imageUrl || '/placeholder-recipe.jpg'}
                    alt={recipe.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                    onError={(e) => {
                      e.target.src = '/placeholder-recipe.jpg';
                    }}
                  />
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {recipe.name}
                  </h3>

                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                      {getDifficultyName(recipe.difficulty)}
                    </span>
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: getCategoryInfo(getCategoryKey(recipe.category)).bg,
                        color: getCategoryInfo(getCategoryKey(recipe.category)).color
                      }}
                    >
                      {getCategoryInfo(getCategoryKey(recipe.category)).name}
                    </span>
                  </div>

                  {recipe.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
{/* 
                  {recipe.cookingTime && (
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <span className="mr-1">⏱️</span>
                      Thời gian: {recipe.cookingTime}
                    </div>
                  )}

                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        <span className="mr-1">🥘</span>
                        Nguyên liệu:
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {recipe.ingredients.slice(0, 3).join(', ')}
                        {recipe.ingredients.length > 3 && '...'}
                      </p>
                    </div>
                  )} */}

                  {/* Action Buttons - UPDATED WITH CORRECT ROUTE */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate(`/recipes/${recipe._id}`)}
                      className="flex-1 bg-tomato hover:bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Xem chi tiết
                    </button>
                    <button
                      onClick={() => handleRemoveFavourite(recipe._id)}
                      className="px-4 py-3 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center border border-gray-200 hover:border-red-200"
                      title="Bỏ yêu thích"
                    >
                      X
                    </button>
                  </div>

                  {/* Created Date */}
                  {recipe.createdAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Tạo ngày: {new Date(recipe.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favourite;
