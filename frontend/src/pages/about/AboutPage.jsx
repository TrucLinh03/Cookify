import React from "react";
import { FaQuoteLeft } from "react-icons/fa";

const AboutPage = () => {
  return (
    <section className="px-6 lg:px-10 py-10">
      <h1 className="text-center text-3xl pb-4 text-orange-500 font-semibold sm:text-6xl sm:leading-relaxed">
        Về Cookify
      </h1>
      <p className="text-center text-lg sm:w-1/2 mx-auto mb-10">
        Cookify - Nền tảng chia sẻ công thức nấu ăn thông minh với trợ lý AI, 
        giúp bạn khám phá và tạo ra những món ăn ngon mỗi ngày.
      </p>

    <article className="relative bg-[url(https://i.pinimg.com/1200x/81/ad/df/81addf6ac1bccd653561bfd668763b8a.jpg)] bg-cover bg-center bg-no-repeat rounded-md scale-90">
      {/* overlay gradient ngang + dọc */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/40 to-black/70"></div>
      
      <div className="relative mx-auto max-w-screen-xl px-4 py-32 sm:px-6 lg:flex lg:h-screen lg:items-center lg:px-8">
        <div className="max-w-xl text-center sm:text-left">
          <h1 className="text-3xl font-extrabold sm:text-5xl text-white">
            Hãy để chúng tôi tìm cho bạn
            <strong className="block font-extrabold text-tomato pt-2">
              Công thức hoàn hảo
            </strong>
          </h1>

          <p className="mt-4 max-w-lg sm:text-xl/relaxed text-white/90">
            Với hàng nghìn công thức từ khắp nơi trên thế giới và trợ lý AI thông minh, 
            Cookify sẽ giúp bạn nấu những món ăn tuyệt vời nhất!
          </p>

          <div className="mt-8 flex flex-wrap gap-4 text-center">
            <a
              href="/recipes"
              className="block w-full rounded bg-tomato hover:bg-red-600 px-12 py-3 text-sm font-medium text-white shadow sm:w-auto transition-all duration-300"
            >
              Khám phá ngay
            </a>

            <a
              href="/contact"
              className="block w-full rounded bg-white px-12 py-3 text-sm font-medium text-secondary shadow hover:bg-tomato hover:text-white sm:w-auto transition-all duration-300"
            >
              Liên hệ
            </a>
          </div>
        </div>
      </div>
    </article>

      {/* Quate section */}
      <div className="container m-auto px-6 py-40">
        <div className="flex flex-col md:flex-row items-center justify-between relative w-100 h-auto md:h-64 bg-100 shadow-2xl rounded-lg p-8">
          <div className="w-8/12 text-2xl">
            <FaQuoteLeft className="float-left mr-2 text-tomato" />
            <span className="flex">
              "Chúng tôi là đội ngũ thích nghiên cứu, tham khảo các công thức nấu ăn và tạo ra những món ăn ngon miệng cho bạn."
            </span>
          </div>
          <div className="relative shadow-md font-medium my-5 py-2 px-4 text-white cursor-pointer bg-tomato hover:bg-red-600 rounded text-lg text-center w-48">
            <span className="absolute h-3 w-3 right-0 top-0 animate-ping inline-flex rounded-full h-3 w-3 bg-tomato"></span>
            Liên hệ ngay
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;
