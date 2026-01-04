import React, { useState, useEffect } from "react";
import axios from 'axios';
import Card from '../../components/Card';
import ThumbsUpIcon from '../../assets/thumbs-up.svg';
import HeartIcon from '../../assets/heart.svg';
import ClockIcon from '../../assets/clock.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import BowlFoodIcon from '../../assets/bowl-food.svg';
import MagnifyingGlassIcon from '../../assets/magnifying-glass.svg';
import ChefHatIcon from '../../assets/chef-hat.svg';
import { getApiUrl } from '../../config/api.js';
import SecureStorage from '../../utils/secureStorage';
import { useFavoritesContext } from '../../contexts/FavoritesContext';

const Recommendations = () => {
  const [activeTab, setActiveTab] = useState('popular');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { favoriteUpdates } = useFavoritesContext();

  // Check authentication status
  useEffect(() => {
    const token = SecureStorage.getToken();
    setIsAuthenticated(!!token);
  }, []);

  // Tabs configuration (use SVG icons)
  const tabs = [
    { id: 'popular', label: 'Phổ Biến', icon: ThumbsUpIcon, endpoint: '/popular' },
    { id: 'favorites', label: 'Yêu Thích Nhất', icon: HeartIcon, endpoint: '/favorites' },
    { id: 'latest', label: 'Mới Nhất', icon: ClockIcon, endpoint: '/latest' },
    ...(isAuthenticated ? [{ id: 'personalized', label: 'Gợi ý cho bạn', icon: LightbulbIcon, endpoint: '/personalized' }] : [])
  ];

  // Fetch recommendations based on active tab
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      setMetadata(null);
      
      try {
        const currentTab = tabs.find(tab => tab.id === activeTab);
        if (!currentTab) return;

        // Prepare request config
        const config = {
          params: { limit: 12 }
        };

        // Add auth header if available and needed
        const token = SecureStorage.getToken();
        if (token && (activeTab === 'personalized')) {
          config.headers = {
            'Authorization': `Bearer ${token}`
          };
        }

        // Make API call to specific recommendation endpoint
        const response = await axios.get(
          getApiUrl(`/api/recommendations${currentTab.endpoint}`),
          config
        );
        
        if (response.data && response.data.success) {
          setRecipes(response.data.data || []);
          setMetadata(response.data.metadata || null);
        } else {
          setError(response.data.message || 'Không thể tải dữ liệu');
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        
        if (err.response?.status === 401 && activeTab === 'personalized') {
          setError('Vui lòng đăng nhập để xem gợi ý cá nhân hóa');
        } else {
          setError(err.response?.data?.message || 'Lỗi khi tải gợi ý công thức');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [activeTab, isAuthenticated, favoriteUpdates]);

  return (
    <section className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="relative py-20 px-6 lg:px-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-200 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center"> 
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-3">
            Khám Phá Công Thức
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-600">
              {" "}Được Yêu Thích
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-3">
            Tìm hiểu những công thức nấu ăn được cộng đồng yêu thích nhất, 
            từ những món ăn truyền thống đến các xu hướng ẩm thực mới nhất.
          </p>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <img src={tab.icon} alt="tab" className="w-5 h-5 mr-2 opacity-80" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h2>
                <p className="text-gray-600">
                  {activeTab === 'popular' && 'Những công thức có điểm đánh giá cao nhất từ cộng đồng'}
                  {activeTab === 'favorites' && 'Công thức có lượt yêu thích cao nhất từ người dùng'}
                  {activeTab === 'latest' && 'Những công thức mới được thêm vào gần đây'}
                  {activeTab === 'personalized' && 'Gợi ý được cá nhân hóa dựa trên sở thích của bạn'}
                </p>
              </div>
              
              {metadata && (
                <div className="text-right">
                  {metadata.type === 'personalized' && (
                    <div className="space-y-1">
                      <div className="text-xs text-blue-600">
                        Dựa trên {metadata.userFavoritesCount} món yêu thích
                      </div>
                      {metadata.userViewHistoryCount > 0 && (
                        <div className="text-xs text-green-600">
                          {metadata.userViewHistoryCount} lượt xem
                        </div>
                      )}
                      {metadata.userFeedbackCount > 0 && (
                        <div className="text-xs text-purple-600">
                          {metadata.userFeedbackCount} đánh giá
                        </div>
                      )}
                      {metadata.algorithm === 'enhanced_hybrid_with_behavior' && (
                        <div className="text-xs text-gray-500">
                          Gợi ý dựa trên ({Math.round(metadata.contentWeight * 100)}% nội dung, {Math.round(metadata.collaborativeWeight * 100)}% cộng đồng)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Đang tải gợi ý...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <div className="flex items-center justify-center text-red-500 text-lg mb-4">
                <img src={ChefHatIcon} alt="Error" className="w-6 h-6 mr-2 opacity-80" />
                {error}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-tomato text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Thử Lại
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Hiển thị message hướng dẫn nếu là fallback */}
              {metadata?.type === 'personalized_fallback' && (
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                  <div className="flex items-start">
                    <img src={LightbulbIcon} alt="Tip" className="w-6 h-6 mr-3 mt-1 opacity-80" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">
                        💡 Gợi ý cho bạn
                      </h3>
                      <p className="text-blue-800 text-sm mb-2">
                        {metadata.suggestion}
                      </p>
                      <p className="text-blue-700 text-xs">
                        Hiện tại chúng tôi đang hiển thị các công thức phổ biến nhất. 
                        Hãy tương tác với các công thức để nhận gợi ý phù hợp hơn với sở thích của bạn!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {recipes.length === 0 ? (
                <div className="text-center py-20">
                  <img src={BowlFoodIcon} alt="Empty" className="w-16 h-16 mb-4 opacity-80 mx-auto" />
                  <div className="text-gray-500 text-lg">
                    {activeTab === 'personalized' && !isAuthenticated 
                      ? 'Vui lòng đăng nhập để xem gợi ý cá nhân hóa'
                      : 'Chưa có gợi ý nào cho danh mục này'
                    }
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recipes.map((recipe) => (
                    <Card key={recipe._id} item={recipe} source="recommendation" contextTab={activeTab} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* View More Button */}
          {!loading && !error && recipes.length > 0 && (
            <div className="text-center mt-12">
              <button className="px-8 py-4 bg-tomato text-white font-semibold rounded-xl hover:bg-red-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Xem Thêm Gợi Ý
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-20"></div>
    </section>
  );
};

export default Recommendations;
