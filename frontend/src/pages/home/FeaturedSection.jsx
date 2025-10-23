import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import featuredImg from "../../assets/featured.webp"

const FeaturedSection = () => {
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getFeaturedRecipe = async () => {
      try {
        setLoading(true);
        // Sử dụng API recommendations/favorites để lấy món được yêu thích nhất
        const response = await axios.get('http://localhost:5000/api/recommendations/favorites?limit=1');
        
        if (response.data.success && response.data.data.length > 0) {
          // Lấy món được yêu thích nhiều nhất (đầu tiên trong danh sách)
          setFeaturedRecipe(response.data.data[0]);
        } else {
          // Fallback: Nếu không có món yêu thích, lấy món mới nhất
          const fallbackResponse = await axios.get('http://localhost:5000/api/recipes?limit=1');
          if (fallbackResponse.data.success && fallbackResponse.data.data.length > 0) {
            setFeaturedRecipe(fallbackResponse.data.data[0]);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải món được yêu thích nhất:', error);
        // Fallback: Thử lấy món mới nhất nếu API recommendations lỗi
        try {
          const fallbackResponse = await axios.get('http://localhost:5000/api/recipes?limit=1');
          if (fallbackResponse.data.success && fallbackResponse.data.data.length > 0) {
            setFeaturedRecipe(fallbackResponse.data.data[0]);
          }
        } catch (fallbackError) {
          console.error('Lỗi khi tải fallback recipe:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    getFeaturedRecipe();
  }, []);

  if (loading) {
    return (
      <div className="overflow-hidden flex md:flex-row flex-col justify-between items-center sm:my-20 my-4 md:gap-20 gap-12 px-5 xl:px-10">
        <div className="relative md:w-1/2 w-full">
          <div className="absolute top-6 left-6 bg-white text-secondary px-4 py-2 rounded-lg uppercase tracking-wider text-sm font-semibold shadow-md z-10">
            Món Nổi Bật
          </div>
          <div className="w-full h-80 md:h-96 lg:h-[450px] bg-gray-200 animate-pulse rounded-xl"></div>
        </div>
        <div className="text-start md:w-1/2 w-full">
          <div className="h-12 lg:h-16 bg-gray-200 animate-pulse rounded mb-6"></div>
          <div className="h-24 lg:h-32 bg-gray-200 animate-pulse rounded mb-8"></div>
          <div className="h-12 w-40 bg-gray-200 animate-pulse rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden flex md:flex-row flex-col justify-between items-center sm:my-20 my-4 md:gap-20 gap-12 px-5 xl:px-10">
      <div className="relative md:w-1/2 w-full">
        <div className="absolute top-6 left-6 bg-white text-secondary px-4 py-2 rounded-lg uppercase tracking-wider text-sm font-semibold shadow-md z-10">
          Yêu Thích Nhất
        </div>
        {/* Badge hiển thị số lượt yêu thích */}
        {featuredRecipe?.totalLikes && (
          <div className="absolute top-6 right-6 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-md z-10 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span>{featuredRecipe.totalLikes}</span>
          </div>
        )}
        <div className="relative overflow-hidden rounded-xl shadow-lg">
          <img
            src={featuredRecipe?.imageUrl || featuredImg}
            alt={featuredRecipe?.name || "Món ăn được yêu thích nhất"}
            className="w-full h-80 md:h-96 lg:h-[450px] object-cover transform hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      </div>
      <div className="text-start md:w-1/2 w-full">
        <h2 className="text-3xl font-bold text-secondary sm:text-4xl lg:text-5xl sm:leading-relaxed">
          {featuredRecipe?.name || "Phở Bò Hà Nội Truyền Thống"}
        </h2>
        <p className="text-lg lg:text-xl mt-6 text-[#5c5c5c] leading-relaxed">
          {featuredRecipe?.description || "Khám phá hương vị đậm đà của tô phở bò Hà Nội với nước dùng trong vắt, bánh phở mềm mại và thịt bò tươi ngon. Một món ăn không thể thiếu trong ẩm thực Việt Nam, mang đến cảm giác ấm áp cho mọi bữa ăn."}
        </p>
        
        {/* Thông tin thống kê */}
        {featuredRecipe && (
          <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
            {featuredRecipe.totalLikes && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{featuredRecipe.totalLikes} lượt yêu thích</span>
              </div>
            )}
            {featuredRecipe.avgRating && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">{featuredRecipe.avgRating}/5</span>
                {featuredRecipe.totalRatings && (
                  <span>({featuredRecipe.totalRatings} đánh giá)</span>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="lg:mt-0 lg:flex-shrink-0">
          <div className="mt-8 lg:mt-12 inline-flex">
            <Link
              to={featuredRecipe ? `/recipes/${featuredRecipe._id}` : "/recipes"}
              className="py-4 px-8 hover:bg-btnColor hover:text-white text-secondary transition ease-in duration-300 text-center text-base font-semibold border-2 border-[#9c702a] focus:outline-none rounded-xl inline-block hover:shadow-lg transform hover:-translate-y-1"
            >
              Xem Công Thức
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;
