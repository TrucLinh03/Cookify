import React from 'react'
import { Link } from 'react-router-dom'
import AboutImg from '../../assets/about-image.jpg'

const AboutSection = () => {
  return (
    <section className="relative py-16 sm:py-24 bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Content Section */}
          <div className="space-y-8 lg:pr-8">

            {/* Main Heading */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Khám phá thế giới 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-600">
                {" "}ẩm thực
              </span>
              <br />cùng Cookify
            </h2>

            {/* Description */}
            <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
              <p>
                Chào mừng bạn đến với <strong className="text-orange-600">Cookify</strong> - nơi chia sẻ những công thức nấu ăn đậm chất Việt Nam. 
                Từ những món ăn truyền thống như phở, bánh mì đến các món tráng miệng hiện đại.
              </p>
              <p>
                Hãy cùng chúng tôi khám phá hương vị đặc trưng của từng vùng miền, 
                học cách chế biến những món ăn ngon từ nguyên liệu quen thuộc trong căn bếp gia đình Việt.
              </p>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">✓</span>
                </div>
                <span className="text-gray-700">Công thức truyền thống</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">✓</span>
                </div>
                <span className="text-gray-700">Dễ thực hiện</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">✓</span>
                </div>
                <span className="text-gray-700">Nguyên liệu quen thuộc</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">✓</span>
                </div>
                <span className="text-gray-700">Hương vị đặc trưng</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Link
                to="/categories/monchinh"
                className="py-4 px-8 hover:bg-btnColor hover:text-white text-secondary w-full transition ease-in duration-200 text-center text-base font-semibold border border-[#9c702a] focus:outline-none rounded-lg inline-block"
              >
                Khám phá công thức
              </Link>
            </div>
          </div>

          {/* Image Section */}
          <div className="relative lg:order-last">
            {/* Decorative elements */}
            <div className="absolute -inset-4 bg-gradient-to-r from-orange-200 to-yellow-200 rounded-3xl opacity-30 blur-lg"></div>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-300 rounded-full opacity-40"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-yellow-300 rounded-full opacity-30"></div>
            
            {/* Main image */}
            <div className="relative">
              <img
                src={AboutImg}
                alt="Ẩm thực Việt Nam - Cookify"
                className="relative w-full h-[500px] lg:h-[600px] object-cover rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection