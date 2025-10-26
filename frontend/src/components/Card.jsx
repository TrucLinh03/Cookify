import React, { useState, useEffect } from "react";
import ClockImg from "../assets/clock.svg";
import HeartIcon from '../assets/heart.svg';
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useFavoritesContext } from '../contexts/FavoritesContext';
import { getApiUrl } from '../config/api.js';

const Card = ({ item }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { favoriteUpdates, triggerFavoriteUpdate } = useFavoritesContext();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if recipe is favorited using backend API
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user && item?._id) {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const response = await axios.get(getApiUrl(`/api/favourites/check/${item._id}`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.data.success) {
            setIsFavorited(response.data.isFavorited);
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

  const difficultyStyle = getDifficultyStyle(item?.difficulty);
  const categoryStyle = getCategoryStyle(item?.category);

  const handleCardClick = () => {
    if (item?._id) {
      navigate(`/recipes/${item._id}`);
    }
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation(); 
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (!item?._id || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await axios.delete(getApiUrl(`/api/users/favourites/${item._id}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Remove favorite response:', response.data);
        if (response.data.success) {
          setIsFavorited(false);
          toast.success('Đã bỏ yêu thích công thức!');
          // Update localStorage as backup
          const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
          const updatedFavorites = favorites.filter(id => id !== item._id);
          localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
          // Trigger update for other components
          triggerFavoriteUpdate();
        } else {
          console.error('Remove favorite failed:', response.data);
          toast.error('Không thể bỏ yêu thích: ' + (response.data.message || 'Lỗi không xác định'));
        }
      } else {
        // Add to favorites
        const response = await axios.post(getApiUrl(`/api/users/favourites/${item._id}`), {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Add favorite response:', response.data);
        if (response.data.success) {
          setIsFavorited(true);
          toast.success('Đã thêm vào danh sách yêu thích!');
          // Update localStorage as backup
          const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
          const updatedFavorites = [...favorites, item._id];
          localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
          // Trigger update for other components
          triggerFavoriteUpdate();
        } else {
          console.error('Add favorite failed:', response.data);
          toast.error('Không thể thêm yêu thích: ' + (response.data.message || 'Lỗi không xác định'));
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
        console.log('Falling back to localStorage');
        
        const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
        let updatedFavorites;

        if (isFavorited) {
          updatedFavorites = favorites.filter(id => id !== item._id);
          setIsFavorited(false);
          toast.success('Đã bỏ yêu thích (offline)');
        } else {
          updatedFavorites = [...favorites, item._id];
          setIsFavorited(true);
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
            
            {/* Match Count Badge - Bottom Right */}
            {item?.matchCount !== undefined && item?.totalSearchIngredients && (
              <div className="absolute bottom-3 right-3 z-10 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                <span className="flex items-center gap-1">
                  {item.matchCount}/{item.totalSearchIngredients}
                </span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;
