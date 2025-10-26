import React from 'react';
import { Link } from 'react-router-dom';

function CategoryItem({ name, displayName, href, backgroundColor, color, icon }) {
  const style = {
    backgroundColor: backgroundColor,
    color: color,
    borderColor: color
  };

  return (
    <div>
      <Link to={href} className="rounded-full block hover:scale-105 transition-transform duration-200">
        <div className="category-tag px-6 py-3 text-center rounded-full font-medium flex items-center gap-2 justify-center" style={style}>
          <span className="text-lg">{displayName}</span>
        </div>
      </Link>
    </div>
  );
}

function CategoryList() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <CategoryItem 
        name="tatca" 
        displayName="Tất Cả" 
        href="/categories/tatca" 
        backgroundColor="#f3f4f6" 
        color="#374151" 
      />
      <CategoryItem 
        name="monchinh" 
        displayName="Món Chính" 
        href="/categories/monchinh" 
        backgroundColor="#dbeafe" 
        color="#1d4ed8" 
      />
      <CategoryItem 
        name="monphu" 
        displayName="Món Phụ" 
        href="/categories/monphu" 
        backgroundColor="#e8f5fa" 
        color="#397a9e" 
      />
      <CategoryItem 
        name="trangmieng" 
        displayName="Tráng Miệng" 
        href="/categories/trangmieng" 
        backgroundColor="#efedfa" 
        color="#3c3a8f" 
      />
      <CategoryItem 
        name="anvat" 
        displayName="Món Ăn Vặt" 
        href="/categories/anvat" 
        backgroundColor="#fef3c7" 
        color="#d97706" 
      />
      <CategoryItem 
        name="douong" 
        displayName="Đồ Uống" 
        href="/categories/douong" 
        backgroundColor="#dcfce7" 
        color="#16a34a" 
      />
    </div>
  );
}

function CategoryWrapper() {
  // return (
  //   <div className="category-wrapper w-dyn-list">
  //     <CategoryList />
  //   </div>
  // );
}

export default CategoryWrapper;
