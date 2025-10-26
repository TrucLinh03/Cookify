import React, { useRef } from 'react';
import { IoSearchOutline, IoImageOutline, IoClose } from "react-icons/io5";
import bowlFoodIcon from '../assets/bowl-food.svg';
import carrotIcon from '../assets/carrot.svg';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [previewImage, setPreviewImage] = React.useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleImageSearch = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      // Navigate to search with image data
      navigate('/search', { state: { imageFile: file, imagePreview: reader.result } });
    };
    reader.readAsDataURL(file);
  };

  const clearImagePreview = () => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-full min-h-[70vh] bg-gradient-to-br from-orange-50 via-white to-amber-50 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-200 rounded-full opacity-15 animate-pulse"></div>
        <div className="absolute top-16 -left-10 w-24 h-24 bg-amber-200 rounded-full opacity-15 animate-pulse delay-1000"></div>
        <div className="absolute bottom-16 right-16 w-20 h-20 bg-orange-300 rounded-full opacity-15 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Tiêu đề */}
            <h1 className="flex flex-col text-4xl sm:text-5xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              <span>Nấu ăn thông minh,</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-600 mt-2">
                cảm hứng mỗi ngày
              </span>
            </h1>
            {/* Mô tả */}
            <p className="text-base sm:text-lg text-gray-600 mb-10 max-w-xl">
              Khám phá hàng nghìn công thức nấu ăn từ khắp nơi trên thế giới.  
              Tìm kiếm theo nguyên liệu có sẵn hoặc chụp ảnh món ăn yêu thích.
            </p>

            {/* Form tìm kiếm */}
            <div className="relative mb-10">
              <form
                onSubmit={handleSearch}
                className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-orange-100 transition-all hover:shadow-xl"
              >
                <div className="flex flex-col sm:flex-row items-stretch gap-4">
                  {/* Ô input */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <IoSearchOutline className="w-6 h-6 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-all duration-200 text-base"
                      placeholder="Tìm kiếm theo tên món hoặc nguyên liệu..."
                    />
                    {/* Nút upload ảnh */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-orange-600 transition-colors rounded-lg hover:bg-orange-50"
                        title="Tìm kiếm bằng hình ảnh"
                      >
                        <IoImageOutline className="w-6 h-6" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSearch}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Nút tìm kiếm */}
                  <button
                    type="submit"
                    className="px-8 py-4 bg-tomato text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-red-600 transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-red-200"
                  >
                    Tìm kiếm
                  </button>
                </div>

                {/* Gợi ý nhỏ */}
                <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    💡 <strong className="font-medium text-tomato">Mẹo:</strong> Thử “cà chua, trứng, hành” hoặc chụp ảnh món ăn
                  </span>
                </div>
              </form>

              {/* Ảnh preview khi tìm bằng hình */}
              {previewImage && (
                <div className="absolute top-full left-0 right-0 mt-4 p-4 bg-white rounded-xl shadow-lg z-20 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Đang tìm kiếm với ảnh:
                    </span>
                    <button
                      onClick={clearImagePreview}
                      className="text-gray-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                      title="Xóa ảnh"
                    >
                      <IoClose className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>
            {/* Right Content - Food Images */}
            <div className="relative hidden lg:flex justify-center items-center scale-90 xl:scale-95">
              <div className="grid grid-cols-2 gap-5 max-w-md">
                {/* Ảnh lớn chính */}
                <div className="col-span-2 relative">
                  <div className="rounded-3xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.1)] border border-orange-100 hover:scale-[1.02] transition-transform duration-300 ease-out">
                    <img
                      src="https://i.pinimg.com/736x/dc/e3/5c/dce35cc1ea093946ce29a1787d5ba955.jpg"
                      alt="Delicious food"
                      className="w-full h-64 object-cover"
                    />
                  </div>

                  {/* Nhãn “Món Việt” */}
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-orange-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></span>
                    <span className="text-sm font-medium text-gray-700">Món Việt</span>
                  </div>
                </div>

                {/* Ảnh phụ */}
                <div className="rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:scale-105 transition-transform duration-300 ease-out border border-orange-50">
                  <img
                    src="https://i.pinimg.com/736x/fa/74/a1/fa74a1051787c3d9ce707215be6eedd8.jpg"
                    alt="Food 2"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:scale-105 transition-transform duration-300 ease-out border border-orange-50">
                  <img
                    src="https://i.pinimg.com/1200x/44/16/a9/4416a9181736469fe78f6288db68ce3e.jpg"
                    alt="Food 3"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Biểu tượng nổi */}
              <div className="absolute top-10 right-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white p-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-110 transition-transform duration-300">
                <img 
                  src={bowlFoodIcon} 
                  alt="Bowl Food" 
                  className="w-6 h-6 filter brightness-0 invert"
                />
              </div>

              <div className="absolute bottom-10 left-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white p-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-110 transition-transform duration-300 delay-1000">
                <img 
                  src={carrotIcon} 
                  alt="Carrot" 
                  className="w-6 h-6 filter brightness-0 invert"
                />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;