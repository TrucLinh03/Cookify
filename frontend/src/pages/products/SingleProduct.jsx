import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { useFavoritesContext } from '../../contexts/FavoritesContext'
import Feedback from '../user/Feedback'
import { getApiUrl } from '../../config/api.js';

const SingleProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { favoriteUpdates, triggerFavoriteUpdate } = useFavoritesContext();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [relatedRecipes, setRelatedRecipes] = useState([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
    const [relatedFavorites, setRelatedFavorites] = useState({});
    const [loadingRelatedFavorites, setLoadingRelatedFavorites] = useState({});

    // Function to convert various video URLs to embed format
    const getEmbedUrl = (url) => {
        if (!url) return '';
        
        // YouTube URLs
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('watch?v=')[1].split('&')[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        
        // Vimeo URLs
        if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1];
            return `https://player.vimeo.com/video/${videoId}`;
        }
        
        // Facebook Videos
        if (url.includes('facebook.com') || url.includes('fb.watch')) {
            return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
        }
        
        // If already an embed URL, return as is
        if (url.includes('/embed/') || url.includes('player.')) {
            return url;
        }
        
        // Default: return original URL (might be a direct video file)
        return url;
    };

    // Function to extract key ingredients from ingredient string
    const extractKeyIngredients = (ingredients) => {
        const keyIngredients = [];
        
        ingredients.forEach(ingredient => {
            const cleanIngredient = ingredient.toLowerCase()
                .replace(/\d+/g, '') // Remove numbers
                .replace(/(kg|g|ml|lít|muỗng|thìa|củ|quả|cái|miếng|lát)/g, '') // Remove units
                .replace(/[,\.]/g, '') // Remove punctuation
                .trim();
            
            // Extract main ingredient names (skip common words)
            const words = cleanIngredient.split(' ').filter(word => 
                word.length > 2 && 
                !['của', 'và', 'hoặc', 'với', 'để', 'cho', 'từ', 'trong', 'nước', 'tươi', 'khô'].includes(word)
            );
            
            keyIngredients.push(...words);
        });
        
        return [...new Set(keyIngredients)]; // Remove duplicates
    };

    // Function to calculate similarity score between two recipes
    const calculateSimilarityScore = (recipe1, recipe2) => {
        const ingredients1 = extractKeyIngredients(recipe1.ingredients || []);
        const ingredients2 = extractKeyIngredients(recipe2.ingredients || []);
        
        // Count common ingredients
        const commonIngredients = ingredients1.filter(ing1 => 
            ingredients2.some(ing2 => 
                ing1.includes(ing2) || ing2.includes(ing1) || 
                (ing1.length > 3 && ing2.length > 3 && 
                 (ing1.includes(ing2.substring(0, 3)) || ing2.includes(ing1.substring(0, 3))))
            )
        );
        
        // Calculate similarity score
        const maxIngredients = Math.max(ingredients1.length, ingredients2.length);
        const similarityScore = maxIngredients > 0 ? commonIngredients.length / maxIngredients : 0;
        
        // Bonus for same category
        const categoryBonus = recipe1.category === recipe2.category ? 0.2 : 0;
        
        // Bonus for similar difficulty
        const difficultyBonus = recipe1.difficulty === recipe2.difficulty ? 0.1 : 0;
        
        return similarityScore + categoryBonus + difficultyBonus;
    };

    // Function to fetch related recipes based on similar ingredients
    const fetchRelatedRecipes = async (currentRecipe) => {
        if (!currentRecipe || !currentRecipe.ingredients || currentRecipe.ingredients.length === 0) {
            return;
        }

        setLoadingRelated(true);
        try {
            // Get all recipes to calculate similarity
            const response = await axios.get(getApiUrl('/api/recipes'), {
                params: { 
                    limit: 100 // Get more recipes to analyze
                }
            });
            
            if (response.data.success) {
                // Filter out current recipe
                const allRecipes = response.data.data.filter(recipe => recipe._id !== currentRecipe._id);
                
                // Calculate similarity scores and sort
                const recipesWithScores = allRecipes.map(recipe => ({
                    ...recipe,
                    similarityScore: calculateSimilarityScore(currentRecipe, recipe)
                }));
                
                // Sort by similarity score (highest first) and take top 6
                const relatedRecipes = recipesWithScores
                    .sort((a, b) => b.similarityScore - a.similarityScore)
                    .filter(recipe => recipe.similarityScore > 0.1) // Only include recipes with meaningful similarity
                    .slice(0, 6);
                
                setRelatedRecipes(relatedRecipes);
            }
        } catch (err) {
            console.error('Lỗi khi tải công thức liên quan:', err);
        } finally {
            setLoadingRelated(false);
        }
    };

    // Check if recipe is favorited
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

    // Check favorite status for related recipes
    useEffect(() => {
        const checkRelatedFavorites = async () => {
            if (user && relatedRecipes.length > 0) {
                const token = localStorage.getItem('token');
                if (!token) return;

                const favorites = {};
                for (const recipe of relatedRecipes) {
                    try {
                        const response = await axios.get(getApiUrl(`/api/favourites/check/${recipe._id}`), {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (response.data.success) {
                            favorites[recipe._id] = response.data.isFavorited;
                        }
                    } catch (error) {
                        console.error('Error checking favorite status for related recipe:', error);
                        // Fallback to localStorage
                        const localFavorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
                        favorites[recipe._id] = localFavorites.includes(recipe._id);
                    }
                }
                setRelatedFavorites(favorites);
            }
        };

        checkRelatedFavorites();
    }, [user, relatedRecipes, favoriteUpdates]);

    // Handle favorite toggle
    const handleFavoriteClick = async (e) => {
        e.stopPropagation(); 
        
        if (!user) {
            navigate('/login');
            return;
        }

        if (!item?._id || isLoadingFavorite) return;

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setIsLoadingFavorite(true);

        try {
            if (isFavorited) {
                // Remove from favorites
                const response = await axios.delete(getApiUrl(`/api/users/favourites/${item._id}`), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
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
                    toast.error('Không thể bỏ yêu thích: ' + (response.data.message || 'Lỗi không xác định'));
                }
            } else {
                // Add to favorites
                const response = await axios.post(getApiUrl(`/api/users/favourites/${item._id}`), {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
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
            
            if (error.response?.status === 400) {
                const message = error.response.data?.message || '';
                if (message.includes('Already favorited') || message.includes('already in favourites')) {
                    setIsFavorited(true);
                    toast.info('Công thức đã có trong danh sách yêu thích!');
                } else {
                    toast.error('Lỗi: ' + message);
                }
            } else if (error.response?.status === 404) {
                const message = error.response.data?.message || '';
                if (message.includes('Favorite not found') || message.includes('not found')) {
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
                    toast.success('Đã bỏ yêu thích (offline)');
                } else {
                    updatedFavorites = [...favorites, item._id];
                    setIsFavorited(true);
                    toast.success('Đã thêm yêu thích (offline)');
                }

                localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
            }
        } finally {
            setIsLoadingFavorite(false);
        }
    };

    // Handle favorite toggle for related recipes
    const handleRelatedFavoriteClick = async (e, recipeId) => {
        e.stopPropagation(); 
        
        if (!user) {
            navigate('/login');
            return;
        }

        if (!recipeId || loadingRelatedFavorites[recipeId]) return;

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setLoadingRelatedFavorites(prev => ({ ...prev, [recipeId]: true }));

        try {
            const isFavorited = relatedFavorites[recipeId];
            
            if (isFavorited) {
                // Remove from favorites
                const response = await axios.delete(getApiUrl(`/api/users/favourites/${recipeId}`), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.data.success) {
                    setRelatedFavorites(prev => ({ ...prev, [recipeId]: false }));
                    toast.success('Đã bỏ yêu thích công thức!');
                    // Update localStorage as backup
                    const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
                    const updatedFavorites = favorites.filter(id => id !== recipeId);
                    localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
                    // Trigger update for other components
                    triggerFavoriteUpdate();
                } else {
                    toast.error('Không thể bỏ yêu thích: ' + (response.data.message || 'Lỗi không xác định'));
                }
            } else {
                // Add to favorites
                const response = await axios.post(getApiUrl(`/api/users/favourites/${recipeId}`), {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.data.success) {
                    setRelatedFavorites(prev => ({ ...prev, [recipeId]: true }));
                    toast.success('Đã thêm vào danh sách yêu thích!');
                    // Update localStorage as backup
                    const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
                    const updatedFavorites = [...favorites, recipeId];
                    localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
                    // Trigger update for other components
                    triggerFavoriteUpdate();
                } else {
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
            
            if (error.response?.status === 400) {
                const message = error.response.data?.message || '';
                if (message.includes('Already favorited') || message.includes('already in favourites')) {
                    setRelatedFavorites(prev => ({ ...prev, [recipeId]: true }));
                    toast.info('Công thức đã có trong danh sách yêu thích!');
                } else {
                    toast.error('Lỗi: ' + message);
                }
            } else if (error.response?.status === 404) {
                const message = error.response.data?.message || '';
                if (message.includes('Favorite not found') || message.includes('not found')) {
                    setRelatedFavorites(prev => ({ ...prev, [recipeId]: false }));
                    toast.info('Công thức không có trong danh sách yêu thích!');
                } else {
                    toast.error('Lỗi: ' + message);
                }
            } else {
                // For other errors, fallback to localStorage
                toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
                
                const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
                let updatedFavorites;

                if (relatedFavorites[recipeId]) {
                    updatedFavorites = favorites.filter(id => id !== recipeId);
                    setRelatedFavorites(prev => ({ ...prev, [recipeId]: false }));
                    toast.success('Đã bỏ yêu thích (offline)');
                } else {
                    updatedFavorites = [...favorites, recipeId];
                    setRelatedFavorites(prev => ({ ...prev, [recipeId]: true }));
                    toast.success('Đã thêm yêu thích (offline)');
                }

                localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
            }
        } finally {
            setLoadingRelatedFavorites(prev => ({ ...prev, [recipeId]: false }));
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        
        const fetchRecipe = async () => {
            try {
                setLoading(true);
                const response = await axios.get(getApiUrl(`/api/recipes/${id}`));
                
                if (response.data.success) {
                    const recipeData = response.data.data;
                    setItem(recipeData);
                    // Fetch related recipes after getting current recipe
                    fetchRelatedRecipes(recipeData);
                } else {
                    setError(response.data.message || 'Không thể tải công thức');
                }
            } catch (err) {
                console.error('Lỗi khi tải công thức:', err);
                if (err.response?.status === 404) {
                    setError('Không tìm thấy công thức');
                } else {
                    setError(err.response?.data?.message || 'Không thể tải công thức');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchRecipe();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Đang tải công thức...</p>
                </div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Không thể tải công thức</h2>
                    <p className="text-gray-600 mb-6">{error || 'Không tìm thấy công thức'}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200"
                    >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section nhỏ gọn */}
      <div className="relative h-80 bg-white shadow-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Ảnh món ăn */}
              <div className="order-2 md:order-1 relative">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-64 object-cover rounded-xl shadow-md"
                />
                {/* Nút yêu thích */}
                <button
                  onClick={handleFavoriteClick}
                  disabled={isLoadingFavorite}
                  className={`absolute top-3 right-3 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl ${
                    isLoadingFavorite ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={isLoadingFavorite ? "Đang xử lý..." : (isFavorited ? "Bỏ yêu thích" : "Thêm vào yêu thích")}
                >
                  {isLoadingFavorite ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={isFavorited ? "red" : "none"}
                      stroke="red"
                      strokeWidth="2"
                      className="w-7 h-7 transition-all duration-300 ease-in-out"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21s-6.5-4.33-10-9.5C-0.42 8.55 1.55 3.5 6 3.5c2.28 0 4.5 1.5 6 3.5 1.5-2 3.72-3.5 6-3.5 4.45 0 6.42 5.05 4 8.0C18.5 16.67 12 21 12 21z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Thông tin món ăn */}
              <div className="order-1 md:order-2">
                <div className="mb-3">
                  <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                    {item.category === 'monchinh' ? 'Món Chính' :
                     item.category === 'monphu' ? 'Món Phụ' :
                     item.category === 'trangmieng' ? 'Tráng Miệng' :
                     item.category === 'anvat' ? 'Ăn Vặt' :
                     'Đồ Uống'}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  {item.name}
                </h1>
                {item.description && (
                  <p className="text-gray-600 text-lg leading-relaxed mb-4">
                    {item.description}
                  </p>
                )}
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center px-4 py-2 bg-transparent text-secondary font-medium rounded-lg border-2 border-[#9c702a] hover:bg-btnColor hover:text-white transition ease-in duration-300 hover:shadow-lg transform hover:-translate-y-1"
                  >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Recipe Stats Cards nhỏ gọn */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-xs text-gray-600 mb-1">Độ khó</div>
            <div className="text-sm font-semibold text-green-600">
              {item.difficulty?.toLowerCase() === 'easy' ? 'Dễ' :
               item.difficulty?.toLowerCase() === 'medium' ? 'Trung bình' :
               item.difficulty?.toLowerCase() === 'hard' ? 'Khó' :
               item.difficulty || 'Dễ'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
            <div className="text-2xl mb-2">⏱️</div>
            <div className="text-xs text-gray-600 mb-1">Thời gian</div>
            <div className="text-sm font-semibold text-pink-600">{item.cookingTime || '45 phút'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-xs text-gray-600 mb-1">Khẩu phần</div>
            <div className="text-sm font-semibold text-blue-600">2 người</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Recipe Content */}
          <div className="space-y-8">
            

            {/* Video */}
            {item.video && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-lg mr-2">📹</span>
                  Video Hướng Dẫn
                </h2>
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  <iframe
                    src={getEmbedUrl(item.video)}
                    title="Video hướng dẫn nấu ăn"
                    className="w-full h-full"
                    allowFullScreen
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  ></iframe>
                  <div className="hidden flex-col items-center justify-center text-gray-500 p-8">
                    <span className="text-4xl mb-2">📹</span>
                    <p className="text-center">Không thể tải video</p>
                    <a 
                      href={item.video} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Xem video gốc
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Nguyên liệu */}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-lg mr-2">🥬</span>
                  Nguyên Liệu
                </h2>
                <div className="space-y-3">
                  {item.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{ingredient}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hướng dẫn nấu */}
            {item.instructions && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-lg mr-2">👨‍🍳</span>
                  Hướng Dẫn Nấu
                </h2>
                <div className="space-y-4">
                  {item.instructions.split('\n').map((step, index) => (
                    step.trim() && (
                      <div key={index} className="flex items-start">
                        <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-medium mr-4 mt-1 flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-gray-700 leading-relaxed flex-1">{step.trim()}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Đánh giá & Bình luận */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-lg mr-2">⭐</span>
            Đánh Giá & Bình Luận
          </h3>
          
          {item && (
            <Feedback 
              recipeId={item._id} 
              onFeedbackSubmitted={() => {
              }}
            />
          )}
          
          {!item && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải thông tin công thức...</p>
            </div>
          )}
        </div>

        {/* Công thức liên quan */}
        {relatedRecipes.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-lg mr-2">🍳</span>
              Công Thức Liên Quan
            </h3>
            
            {loadingRelated ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedRecipes.map((recipe) => (
                  <div 
                    key={recipe._id} 
                    className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => navigate(`/recipes/${recipe._id}`)}
                  >
                    <div className="aspect-video w-full overflow-hidden relative">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                      {/* Nút yêu thích cho công thức liên quan */}
                      <button
                        onClick={(e) => handleRelatedFavoriteClick(e, recipe._id)}
                        disabled={loadingRelatedFavorites[recipe._id]}
                        className={`absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl ${
                          loadingRelatedFavorites[recipe._id] ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={loadingRelatedFavorites[recipe._id] ? "Đang xử lý..." : (relatedFavorites[recipe._id] ? "Bỏ yêu thích" : "Thêm vào yêu thích")}
                      >
                        {loadingRelatedFavorites[recipe._id] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={relatedFavorites[recipe._id] ? "red" : "none"}
                            stroke="red"
                            strokeWidth="2"
                            className="w-5 h-5 transition-all duration-300 ease-in-out"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 21s-6.5-4.33-10-9.5C-0.42 8.55 1.55 3.5 6 3.5c2.28 0 4.5 1.5 6 3.5 1.5-2 3.72-3.5 6-3.5 4.45 0 6.42 5.05 4 8.0C18.5 16.67 12 21 12 21z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="mb-2">
                        <span className="inline-block bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                          {recipe.category === 'monchinh' ? 'Món Chính' :
                           recipe.category === 'monphu' ? 'Món Phụ' :
                           recipe.category === 'trangmieng' ? 'Tráng Miệng' :
                           recipe.category === 'anvat' ? 'Ăn Vặt' :
                           'Đồ Uống'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {recipe.name}
                      </h4>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span className="flex items-center">
                          <span className="mr-1">⏱️</span>
                          {recipe.cookingTime || '30 phút'}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">⭐</span>
                          {recipe.difficulty?.toLowerCase() === 'easy' ? 'Dễ' :
                           recipe.difficulty?.toLowerCase() === 'medium' ? 'Trung bình' :
                           recipe.difficulty?.toLowerCase() === 'hard' ? 'Khó' :
                           'Dễ'}
                        </span>
                      </div>
                      {recipe.similarityScore && (
                        <div className="flex items-center justify-center">
                          <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <span className="mr-1">🔗</span>
                            Liên quan {Math.round(recipe.similarityScore * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {relatedRecipes.length === 0 && !loadingRelated && (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">🔍</span>
                <p>Không tìm thấy công thức liên quan</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SingleProduct