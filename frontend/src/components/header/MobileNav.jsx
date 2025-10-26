import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineBars3BottomRight } from 'react-icons/hi2';
import { RiCloseCircleLine } from 'react-icons/ri';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/features/auth/authSlice';
import avatarDefault from '../../assets/avatar.png';

const MobileNav = ({ menuItems, logo, onClose, onOpen, hideLeft }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user); // lấy user từ redux

  const handleLogout = () => {
    dispatch(logout());
    onClose(); // đóng menu sau khi logout
  };

  return (
    <>
      <div className="h-16 sm:h-20 flex justify-between items-center px-4 sm:px-6">
        <a href="/" className="flex items-center">
          <img src={logo} alt="Cookify Logo" className="h-8 sm:h-12 w-auto" />
        </a>
        <button 
          className="border border-orange-500 rounded-lg p-2 hover:bg-orange-50 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center" 
          onClick={onOpen}
          aria-label="Mở menu"
        >
          <HiOutlineBars3BottomRight className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
        </button>
      </div>

      <div
        className={`transition-all duration-300 w-full h-full fixed bg-primary z-50 top-0 ${hideLeft} flex justify-center items-center`}
      >
        <button 
          className="absolute right-4 sm:right-8 top-4 sm:top-8 p-2 hover:bg-white/10 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" 
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <RiCloseCircleLine className="w-8 h-8 text-white" />
        </button>

        <div className="text-center px-4 w-full max-w-md">
          <ul className="flex flex-col gap-6 mb-8">
            {menuItems?.map((menu, index) => {
              const getMenuPath = (menuItem) => {
                if (typeof menuItem === 'object' && menuItem.path) {
                  return `/${menuItem.path}`;
                }
                // Handle specific menu items
                const menuStr = menuItem.toLowerCase();
                if (menuStr === 'home' || menuStr === 'trang chủ') return '/';
                if (menuStr === 'recipes' || menuStr === 'công thức') return '/recipes';
                if (menuStr === 'search' || menuStr === 'tìm kiếm') return '/search';
                if (menuStr === 'about' || menuStr === 'về chúng tôi') return '/about';
                if (menuStr === 'contact' || menuStr === 'liên hệ') return '/contact';
                if (menuStr === 'blog') return '/blog';
                return `/${menuItem}`;
              };

              const getMenuLabel = (menuItem) => {
                if (typeof menuItem === 'object' && menuItem.label) {
                  return menuItem.label;
                }
                // Convert to Vietnamese labels
                const menuStr = menuItem.toLowerCase();
                if (menuStr === 'home') return 'Trang chủ';
                if (menuStr === 'recipes') return 'Công thức';
                if (menuStr === 'search') return 'Tìm kiếm';
                if (menuStr === 'about') return 'Về chúng tôi';
                if (menuStr === 'contact') return 'Liên hệ';
                if (menuStr === 'blog') return 'Blog';
                return menuItem;
              };

              return (
                <li key={index}>
                  <Link
                    to={getMenuPath(menu)}
                    className="block font-medium capitalize text-secondary text-xl sm:text-2xl py-3 px-4 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] flex items-center justify-center"
                    onClick={onClose}
                  >
                    {getMenuLabel(menu)}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-center gap-4 font-medium mt-10">
            {!user ? (
              <div className="flex gap-4">
                <button
                  className="text-secondary px-4 py-2 rounded"
                  onClick={() => {
                    onClose();
                    window.location.href = '/login';
                  }}
                >
                  Đăng nhập
                </button>
                <button
                  className="bg-primary text-secondary px-4 py-2 rounded border"
                  onClick={() => {
                    onClose();
                    window.location.href = '/register';
                  }}
                >
                  Đăng ký
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={user?.avatar || avatarDefault}
                    alt="User avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="text-secondary text-lg font-medium">{user?.name}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/profile"
                    className="text-secondary px-4 py-2 rounded border border-secondary"
                    onClick={onClose}
                  >
                    Hồ sơ
                  </Link>
                  {user?.role !== 'admin' && (
                    <Link
                      to={`/favourites`}
                      className="text-secondary px-4 py-2 rounded border border-secondary"
                      onClick={onClose}
                    >
                      Yêu thích
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-red-400 px-4 py-2 rounded border border-red-400"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
