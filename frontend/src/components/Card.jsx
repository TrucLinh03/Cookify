import React, { useState, useEffect } from "react";
import ClockImg from "../assets/clock.svg";
import HeartIcon from '../assets/heart.svg';
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useFavoritesContext } from '../contexts/FavoritesContext';
import favoritesService from '../services/favoritesService.js';
import SecureStorage from '../utils/secureStorage';

const Card = ({ item, source = 'direct', contextTab = null }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { favoriteUpdates, triggerFavoriteUpdate } = useFavoritesContext();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(
    typeof item?.totalLikes === 'number' ? item.totalLikes : 0
  );

  // Check if recipe is favorited using backend API
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user && item?._id) {
        const token = SecureStorage.getToken();
        if (!token) return;

        try {
          const response = await favoritesService.checkIsFavorite(item._id);
          
          if (response.success) {
            setIsFavorited(response.isFavorited);
          }
        } catch (error) {
          console.error('Error checking favorite status:', error);
          // Fallback to localStorage for offline functionality
          const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
          setIsFavorited(favorites.includes(item._id));
        }
      }
    };

    checkFavoriteStatus();
  }, [user, item?._id, favoriteUpdates]);

  useEffect(() => {
    if (typeof item?.totalLikes === 'number') {
      setLikeCount(item.totalLikes);
    }
  }, [item?.totalLikes]);

  const difficultyStyles = {
    easy: { backgroundColor: "#d1fae5", color: "#059669" }, // green
    medium: { backgroundColor: "#fef3c7", color: "#d97706" }, // yellow
    hard: { backgroundColor: "#fee2e2", color: "#dc2626" }, // red
    default: { backgroundColor: "#f3f4f6", color: "#374151" },
  };

  const categoryStyles = {
    tatca: { backgroundColor: "#f3f4f6", color: "#374151" }, // gray - Tất Cả
    monchinh: { backgroundColor: "#dbeafe", color: "#1d4ed8" }, // blue - Món Chính
    monphu: { backgroundColor: "#e8f5fa", color: "#397a9e" }, // light blue - Món Phụ
    trangmieng: { backgroundColor: "#efedfa", color: "#3c3a8f" }, // purple - Tráng Miệng
    anvat: { backgroundColor: "#fef3c7", color: "#d97706" }, // yellow - Món Ăn Vặt
    douong: { backgroundColor: "#dcfce7", color: "#16a34a" }, // green - Đồ Uống
    default: { backgroundColor: "#f3f4f6", color: "#374151" },
  };

  const getDifficultyStyle = (difficulty) => {
    const difficultyLower = difficulty?.toLowerCase();
    return difficultyStyles[difficultyLower] || difficultyStyles.default;
  };

  const getDifficultyName = (difficulty) => {
    const difficultyNames = {
      easy: 'Dễ',
      medium: 'Trung bình',
      hard: 'Khó'
    };
    return difficultyNames[difficulty?.toLowerCase()] || difficulty || 'Chưa xác định';
  };

  const getCategoryStyle = (category) => {
    const categoryLower = category?.toLowerCase();
    return categoryStyles[categoryLower] || categoryStyles.default;
  };

  const getCategoryName = (category) => {
    const categoryNames = {
      tatca: 'Tất Cả',
      monchinh: 'Món Chính',
      monphu: 'Món Phụ', 
      trangmieng: 'Tráng Miệng',
      anvat: 'Món Ăn Vặt',
      douong: 'Đồ Uống'
    };
    return categoryNames[category?.toLowerCase()] || category || 'Khác';
  };

  // Format backend 'reasons' into human-friendly strings
  const prettyReason = (text) => {
    if (!text || typeof text !== 'string') return text;
    let t = text;
    // Normalize known category slugs to Vietnamese labels
    t = t.replace(/\bmonchinh\b/gi, 'món chính')
         .replace(/\bmonphu\b/gi, 'món phụ')
         .replace(/\btrangmieng\b/gi, 'tráng miệng')
         .replace(/\banvat\b/gi, 'món ăn vặt')
         .replace(/\bdouong\b/gi, 'đồ uống');
    // Trim very long decimals like 0.2857142857 -> 0.29
    t = t.replace(/(\d+\.\d{2})\d+/g, '$1');
    // Remove stray technical tokens
    t = t.replace(/\s+mon\s*chinh/gi, ' món chính');
    return t;
  };

  const difficultyStyle = getDifficultyStyle(item?.difficulty);
  const categoryStyle = getCategoryStyle(item?.category);

  const handleCardClick = () => {
    // Navigate with source information for view tracking
    navigate(`/recipes/${item._id}?source=${encodeURIComponent(source)}`, {
      state: { from: source }
    });
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation(); 
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (!item?._id || isLoading) return;

    const token = SecureStorage.getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await favoritesService.removeFromFavorites(item._id);
        
        if (response.success) {
          setIsFavorited(false);
          toast.success('Đã bỏ yêu thích công thức!');
          // Update localStorage as backup
          const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
          const updatedFavorites = favorites.filter(id => id !== item._id);
          localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
          // Trigger update for other components
          setLikeCount(prev => Math.max(0, prev - 1));
          triggerFavoriteUpdate();
        } else {
          console.error('Remove favorite failed:', response);
          toast.error('Không thể bỏ yêu thích: ' + (response.message || 'Lỗi không xác định'));
        }
      } else {
        // Add to favorites
        const response = await favoritesService.addToFavorites(item._id);
        
        if (response.success) {
          setIsFavorited(true);
          toast.success('Đã thêm vào danh sách yêu thích!');
          // Update localStorage as backup
          const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
          const updatedFavorites = [...favorites, item._id];
          localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
          // Trigger update for other components
          triggerFavoriteUpdate();
        } else {
          console.error('Add favorite failed:', response);
          toast.error('Không thể thêm yêu thích: ' + (response.message || 'Lỗi không xác định'));
        }
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      console.error('Favorite operation error:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        const message = error.response.data?.message || '';
        if (message.includes('Already favorited') || message.includes('already in favourites')) {
          // Recipe is already favorited, update UI
          setIsFavorited(true);
          toast.info('Công thức đã có trong danh sách yêu thích!');
        } else {
          toast.error('Lỗi: ' + message);
        }
      } else if (error.response?.status === 404) {
        const message = error.response.data?.message || '';
        if (message.includes('Favorite not found') || message.includes('not found')) {
          // Recipe is not favorited, update UI
          setIsFavorited(false);
          toast.info('Công thức không có trong danh sách yêu thích!');
        } else {
          toast.error('Lỗi: ' + message);
        }
      } else {
        // For other errors, fallback to localStorage
        toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
        
        const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
        let updatedFavorites;

        if (isFavorited) {
          updatedFavorites = favorites.filter(id => id !== item._id);
          setIsFavorited(false);
          setLikeCount(prev => Math.max(0, prev - 1));
          toast.success('Đã bỏ yêu thích (offline)');
        } else {
          updatedFavorites = [...favorites, item._id];
          setIsFavorited(true);
          setLikeCount(prev => prev + 1);
          toast.success('Đã thêm yêu thích (offline)');
        }

        localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex justify-center md:justify-start">
      <div 
        className="max-w-sm w-full cursor-pointer transition-transform hover:scale-105"
        onClick={handleCardClick}
      >
        <div className="bg-white relative shadow-lg hover:shadow-xl transition duration-300 rounded-lg h-full flex flex-col">
          {/* Difficulty Tag - Top Left */}
          <div 
            className="absolute top-3 left-3 z-10 py-1 px-2 font-medium rounded-md text-xs shadow-lg"
            style={{
              backgroundColor: difficultyStyle.backgroundColor,
              color: difficultyStyle.color,
            }}
          >
            {getDifficultyName(item?.difficulty)}
          </div>

          {/* Match Badge - Lower middle on image (personalized) */}
          {item?.matchBadge && item?.matchPercentage && (
            <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '30%' }}>
              {item.matchBadge === 'perfect' && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                  ⭐ Perfect Match
                </div>
              )}
              {item.matchBadge === 'excellent' && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  🔥 Highly Recommended
                </div>
              )}
              {item.matchBadge === 'good' && (
                <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  ✨ Good Match
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleFavoriteClick}
            disabled={isLoading}
            className={`absolute top-3 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={isLoading ? "Đang xử lý..." : (isFavorited ? "Bỏ yêu thích" : "Thêm vào yêu thích")}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isFavorited ? "red" : "none"}
                stroke="red"
                strokeWidth="2"
                className="w-6 h-6 transition-all duration-300 ease-in-out"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21s-6.5-4.33-10-9.5C-0.42 8.55 1.55 3.5 6 3.5c2.28 0 4.5 1.5 6 3.5 1.5-2 3.72-3.5 6-3.5 4.45 0 6.42 5.05 4 8.0C18.5 16.67 12 21 12 21z"
                />
              </svg>
            )}
          </button>         
          <div className="relative">
            <img 
              className="rounded-t-lg w-full h-48 object-cover" 
              src={item?.imageUrl} 
              alt={item?.name}
              loading="lazy"
              onError={(e) => {
                e.target.src = `https://picsum.photos/400/300?random=${item?._id || Math.random()}`;
              }}
            />
            
            {/* Remove badge from image - will show at bottom */}
            
            {/* Match Count Badge - Bottom Right */}
            {item?.matchCount !== undefined && item?.totalSearchIngredients && (
              <div className="absolute bottom-3 right-3 z-10 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                <span className="flex items-center gap-1">
                  {item.matchCount}/{item.totalSearchIngredients}
                </span>
              </div>
            )}

            {/* Recommendation metrics overlay - Bottom Right */}
            {contextTab === 'popular' && (
              <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1">
                {/* Average rating */}
                {typeof item?.avgRating === 'number' && (
                  <div className="bg-white/95 backdrop-blur px-2 py-0.5 rounded-full text-xs font-semibold shadow border border-yellow-200 text-yellow-700 flex items-center gap-1">
                    {/* Star icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-yellow-500">
                      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.168L12 18.897l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192L12 .587z"/>
                    </svg>
                    {Number(item.avgRating).toFixed(1)}
                  </div>
                )}
                {/* Total reviews/comments */}
                {typeof item?.totalRatings === 'number' && (
                  <div className="bg-white/95 backdrop-blur px-2 py-0.5 rounded-full text-xs font-semibold shadow border border-blue-200 text-blue-700 flex items-center gap-1">
                    {/* Comment icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-blue-500">
                      <path d="M20 2H4a2 2 0 00-2 2v14l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>
                    </svg>
                    {item.totalRatings}
                  </div>
                )}
              </div>
            )}

            {contextTab === 'favorites' && (
              <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur px-2 py-0.5 rounded-full text-xs font-semibold shadow border border-red-200 text-red-600 flex items-center gap-1">
                {/* Heart icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-red-500">
                  <path d="M12 21s-6.5-4.33-10-9.5C-0.42 8.55 1.55 3.5 6 3.5c2.28 0 4.5 1.5 6 3.5 1.5-2 3.72-3.5 6-3.5 4.45 0 6.42 5.05 4 8.0C18.5 16.67 12 21 12 21z"/>
                </svg>
                {likeCount}
              </div>
            )}
          </div>
          <div className="py-6 px-5 rounded-lg bg-white flex-1 flex flex-col">
            <h2 className="text-gray-700 font-bold text-xl mb-2 hover:text-gray-900 line-clamp-2">
              {item?.name}
            </h2>
            
            {item?.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                {item.description}
              </p>
            )}

            <div className="flex justify-between items-center mt-4">
              <span
                className="py-2 px-3 font-medium rounded-lg text-sm"
                style={{
                  backgroundColor: categoryStyle.backgroundColor,
                  color: categoryStyle.color,
                }}
              >
                {getCategoryName(item?.category)}
              </span>
              <div className="flex items-center">
                <img
                  src={ClockImg}
                  loading="lazy"
                  alt="Thời gian"
                  className="w-4 h-4"
                />
                <span className="ml-1 text-sm text-gray-600">
                  {item?.cookingTime || '30 phút'}
                </span>
              </div>
            </div>

            {/* Recommendation Reasons - Bottom of Card */}
            {item?.reasons && item.reasons.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="space-y-1.5">
                  {item.reasons.slice(0, 2).map((reason, index) => (
                    <div 
                      key={index}
                      className="text-xs text-gray-600 flex items-start gap-1.5 leading-relaxed"
                    >
                      <span className="flex-shrink-0 mt-0.5">•</span>
                      <span className="flex-1">{prettyReason(reason)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;
