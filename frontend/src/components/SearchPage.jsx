import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from './Card';
import { IoSearchOutline, IoImageOutline, IoClose } from "react-icons/io5";

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('tatca');
  const [filteredResults, setFilteredResults] = useState([]);

  // Handle URL query parameters and image data from navigation state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('q');
    
    // Handle text search from URL
    if (queryParam) {
      setQuery(queryParam);
      searchRecipes(queryParam);
    }
    
    // Handle image search from navigation state
    if (location.state?.imageFile && location.state?.imagePreview) {
      setSelectedImage(location.state.imageFile);
      setPreviewUrl(location.state.imagePreview);
      searchRecipesByImage(location.state.imageFile);
    }
  }, [location]);

  // Debounce search when query changes (only from user input, not from URL)
  useEffect(() => {
    if (!query || query.trim() === '') {
      setIsTyping(false);
      return;
    }

    // Check if query is different from URL param to avoid infinite loop
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    
    if (urlQuery === query) {
      setIsTyping(false);
      return; // Query already in URL, don't search again
    }

    setIsTyping(true);

    const timer = setTimeout(() => {
      setIsTyping(false);
      navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
      searchRecipes(query);
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [query, navigate]);

  // Filter results when category changes
  useEffect(() => {
    if (results.length > 0) {
      filterResultsByCategory(results, selectedCategory);
    }
  }, [selectedCategory, results]);

  // Categories configuration
  const categories = [
    { name: 'tatca', displayName: 'Tất Cả', backgroundColor: '#f3f4f6', color: '#374151' },
    { name: 'monchinh', displayName: 'Món Chính', backgroundColor: '#dbeafe', color: '#1d4ed8' },
    { name: 'monphu', displayName: 'Món Phụ', backgroundColor: '#e8f5fa', color: '#397a9e' },
    { name: 'trangmieng', displayName: 'Tráng Miệng', backgroundColor: '#efedfa', color: '#3c3a8f' },
    { name: 'anvat', displayName: 'Món Ăn Vặt', backgroundColor: '#fef3c7', color: '#d97706' },
    { name: 'douong', displayName: 'Đồ Uống', backgroundColor: '#dcfce7', color: '#16a34a' }
  ];

  // Filter results by category
  const filterResultsByCategory = (recipes, category) => {
    if (category === 'tatca') {
      setFilteredResults(recipes);
    } else {
      const filtered = recipes.filter(recipe => recipe.category === category);
      setFilteredResults(filtered);
    }
  };

  // Handle category selection
  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  // Parse search query to extract multiple ingredients
  const parseSearchQuery = (searchQuery) => {
    // Split by comma and clean up each ingredient
    const ingredients = searchQuery
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    return ingredients;
  };

  // Search function for recipes by name or ingredients
  const searchRecipes = async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Parse ingredients from query
      const ingredients = parseSearchQuery(searchQuery);
      
      const response = await axios.get('http://localhost:5000/api/recipes', {
        params: { 
          q: searchQuery.trim(),
          ingredients: ingredients.length > 1 ? ingredients.join(',') : undefined
        }
      });
      
      if (response.data.success) {
        let recipes = response.data.data;
        
        // Backend already sorted by matchCount, just use the results
        // If matchCount not in response, calculate it on frontend
        if (ingredients.length > 1 && recipes.length > 0 && !recipes[0].matchCount) {
          recipes = recipes.map(recipe => {
            const recipeIngredients = recipe.ingredients || [];
            const matchCount = ingredients.filter(searchIng => 
              recipeIngredients.some(recipeIng => 
                recipeIng.toLowerCase().includes(searchIng.toLowerCase())
              )
            ).length;
            return { ...recipe, matchCount };
          });
        }
        
        setResults(recipes);
        // Apply category filter to results
        filterResultsByCategory(recipes, selectedCategory);
      } else {
        setError(response.data.message || 'Lỗi khi tìm kiếm');
        setResults([]);
        setFilteredResults([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tìm kiếm công thức');
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Search function for image-based search (mock implementation)
  const searchRecipesByImage = async (imageFile) => {
    setLoading(true);
    setError(null);
    setQuery(''); // Clear text query when doing image search
    
    try {
      // For now, we'll simulate image search by returning all recipes
      // In a real implementation, you would send the image to an AI service
      const response = await axios.get('http://localhost:5000/api/recipes');
      
      if (response.data.success) {
        // Simulate image recognition results by showing a subset
        const mockResults = response.data.data.slice(0, 3);
        setResults(mockResults);
        // Apply category filter to results
        filterResultsByCategory(mockResults, selectedCategory);
      } else {
        setError('Lỗi khi tìm kiếm bằng hình ảnh');
        setResults([]);
      }
    } catch (err) {
      setError('Lỗi khi tìm kiếm bằng hình ảnh');
      console.error('Image search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle text search with debounce
  const handleTextSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear image search when doing text search
    if (selectedImage) {
      clearImageSearch();
    }
    
    if (value.trim() === '') {
      setResults([]);
      setFilteredResults([]);
      navigate('/search', { replace: true });
      return;
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Clear text search when doing image search
    setQuery('');
    navigate('/search');
    
    // Perform search with image
    searchRecipesByImage(file);
  };

  // Clear image search
  const clearImageSearch = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setResults([]);
    setFilteredResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='px-4 lg:px-12 py-12 max-w-7xl mx-auto'>
      <h1 className='text-center text-3xl py-8 font-semibold text-secondary sm:text-5xl sm:leading-relaxed'>
        Tìm kiếm công thức
      </h1>
      
      {/* Search Box */}
      <div className='space-y-6 max-w-4xl mx-auto'>
        <div className='bg-white rounded-lg shadow-md p-6'>
          <div className='flex items-center border-2 border-gray-200 rounded-lg px-4 py-3 focus-within:border-primary-500 transition-colors'>
            <IoSearchOutline className='w-6 h-6 text-gray-400 mr-3 flex-shrink-0' />
            <input
              type='text'
              value={query}
              onChange={handleTextSearch}
              className='w-full outline-none text-lg text-gray-800 placeholder-gray-400 pr-12'
              placeholder='Tìm kiếm theo tên món hoặc nguyên liệu (vd: cà chua, trứng)...'
            />
            <div className="flex items-center gap-2">
              {isTyping && (
                <span className="text-xs text-orange-500 whitespace-nowrap animate-pulse">Đang gõ...</span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-md"
                title="Tìm kiếm bằng hình ảnh"
              >
                <IoImageOutline className="w-6 h-6" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>
          
          {/* Image Preview */}
          {previewUrl && (
            <div className='mt-4 p-4 bg-gray-50 rounded-lg'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-sm font-medium text-gray-700'>Tìm kiếm bằng hình ảnh:</span>
                <button
                  onClick={clearImageSearch}
                  className='text-gray-500 hover:text-red-500 transition-colors'
                  title='Xóa ảnh'
                >
                  <IoClose className='w-5 h-5' />
                </button>
              </div>
              <div className='w-32 h-32 rounded-md overflow-hidden border-2 border-dashed border-gray-300'>
                <img
                  src={previewUrl}
                  alt='Preview'
                  className='w-full h-full object-cover'
                />
              </div>
            </div>
          )}
          
          <p className='text-sm text-gray-500 mt-2'>
            Ví dụ: "Phở", "thịt bò", "trứng gà" hoặc "cà chua, trứng, hành" (ngăn cách bởi dấu phẩy)
          </p>
          
          {/* Ingredient Tags */}
          {query && parseSearchQuery(query).length > 1 && (
            <div className='mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <p className='text-sm font-medium text-gray-700 mb-2'>
                Đang tìm công thức có các nguyên liệu:
              </p>
              <div className='flex flex-wrap gap-2'>
                {parseSearchQuery(query).map((ingredient, index) => (
                  <span
                    key={index}
                    className='px-3 py-1 bg-white border border-blue-300 rounded-full text-sm font-medium text-blue-700 shadow-sm'
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
              <p className='text-xs text-gray-600 mt-2'>
                💡 Kết quả ưu tiên theo số lượng nguyên liệu khớp (nhiều nhất trước)
              </p>
            </div>
          )}
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto'></div>
            <p className='mt-2 text-gray-600'>Đang tìm kiếm...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className='bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded'>
            <p>{error}</p>
          </div>
        )}
        
        {/* Search Results */}
        {results.length > 0 ? (
          <div className='mt-8'>
            <h2 className='text-2xl font-semibold text-gray-800 mb-6'>
              {selectedImage ? 
                `Kết quả tìm kiếm từ ảnh (${filteredResults.length}/${results.length} món)` : 
                `Kết quả tìm kiếm cho "${query}" (${filteredResults.length}/${results.length} món)`
              }
            </h2>
            
            {/* Category Filter */}
            <div className='mb-6'>
              <h3 className='text-lg font-medium text-gray-700 mb-3'>Lọc theo phân loại:</h3>
              <div className='flex flex-wrap gap-3'>
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => handleCategorySelect(category.name)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-md ${
                      selectedCategory === category.name
                        ? 'ring-2 ring-offset-2 ring-gray-400 shadow-md'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: category.backgroundColor,
                      color: category.color,
                    }}
                  >
                    {category.displayName}
                    {selectedCategory === category.name && (
                      <span className='ml-2 text-xs'>
                        ({category.name === 'tatca' ? results.length : results.filter(r => r.category === category.name).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Filtered Results */}
            {filteredResults.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {filteredResults.map((recipe) => (
                <div key={recipe._id} className="relative">
                  <Card item={recipe} />
                  {recipe.matchCount !== undefined && recipe.matchCount > 0 && (
                    <div 
                      className={`absolute top-2 left-2 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10 ${
                        recipe.matchCount === parseSearchQuery(query).length 
                          ? 'bg-green-600' 
                          : recipe.matchCount >= parseSearchQuery(query).length / 2 
                          ? 'bg-yellow-600' 
                          : 'bg-orange-600'
                      }`}
                    >
                      {recipe.matchCount}/{parseSearchQuery(query).length}
                    </div>
                  )}
                </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <div className='text-gray-400 mb-4'>
                  <IoSearchOutline className='w-16 h-16 mx-auto' />
                </div>
                <h3 className='text-xl font-semibold text-gray-700 mb-2'>
                  Không có món nào trong phân loại này
                </h3>
                <p className='text-gray-500'>
                  Thử chọn phân loại khác hoặc tìm kiếm với từ khóa mới.
                </p>
              </div>
            )}
          </div>
        ) : (
          !loading && (query || selectedImage) && (
            <div className='text-center py-12'>
              <div className='text-gray-400 mb-4'>
                <IoSearchOutline className='w-16 h-16 mx-auto' />
              </div>
              <h3 className='text-xl font-semibold text-gray-700 mb-2'>
                Không tìm thấy công thức
              </h3>
              <p className='text-gray-500'>
                {selectedImage ? 
                  'Không có món nào phù hợp với hình ảnh này. Thử tải ảnh khác hoặc tìm kiếm bằng text.' :
                  `Không có món nào phù hợp với "${query}". Thử tìm kiếm với từ khóa khác.`
                }
              </p>
            </div>
          )
        )}
        
        {/* Initial State */}
        {!loading && !query && !selectedImage && results.length === 0 && (
          <div className='text-center py-12'>
            <div className='text-gray-300 mb-4'>
              <IoSearchOutline className='w-20 h-20 mx-auto' />
            </div>
            <h3 className='text-xl font-semibold text-gray-600 mb-2'>
              Tìm kiếm công thức yêu thích
            </h3>
            <p className='text-gray-500'>
              Nhập tên món ăn, nguyên liệu hoặc tải ảnh để tìm công thức phù hợp
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
