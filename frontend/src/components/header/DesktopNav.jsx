import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import avatarDefault from '../../assets/avatar.png';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/features/auth/authSlice';
import FavoriteCounter from '../FavoriteCounter';

const DesktopNav = ({ menuItems, logo }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    setDropdownOpen(false);
  };


  const dropdownMenus = [
    { label: 'Profile', path: '/profile' },
    { 
      label: (
        <div className="flex items-center">
          Saved Recipes
          <FavoriteCounter />
        </div>
      ), 
      path: `/favourites` 
    },
  ];

  // đóng menu khi click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="h-20 flex justify-between items-center px-6 lg:px-12 relative">
      <a href="/" className="flex items-center">
        <img src={logo} alt="flex site logo" className="h-10 w-auto" />
      </a>

      <ul className="flex gap-8">
        {menuItems?.map((menu, index) => {
          const getMenuPath = (menuItem) => {
            if (typeof menuItem === 'object' && menuItem.path) {
              return `/${menuItem.path}`;
            }
            return `/${menuItem}`;
          };

          const getMenuLabel = (menuItem) => {
            if (typeof menuItem === 'object' && menuItem.label) {
              return menuItem.label;
            }
            return menuItem;
          };

          return (
            <li key={index}>
              <Link
                to={getMenuPath(menu)}
                className="font-semibold text-lg capitalize text-secondary hover:text-orange-500 transition-colors duration-200 py-2 px-1"
              >
                {getMenuLabel(menu)}
              </Link>
            </li>
          );
        })}
      </ul>

      {!user ? (
        <ul className="flex items-center gap-4 font-medium">
          <li>
            <Link to="/login" className="text-secondary px-5 py-2.5 rounded-lg hover:bg-white hover:text-orange-600 transition-colors duration-200">
              Đăng nhập
            </Link>
          </li>
          <li>
            <Link
              to="/register"
              className="bg-primary text-secondary px-5 py-2.5 rounded-lg hover:bg-orange-600 hover:text-white transition-colors duration-200"
            >
              Đăng ký
            </Link>
          </li>
        </ul>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <img
            src={user?.avatar || avatarDefault}
            alt="User avatar"
            className="w-[50px] h-[50px] rounded-full cursor-pointer object-cover border-2 border-gray-200 hover:border-orange-500 transition-colors duration-200"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-white shadow-lg rounded-xl border border-gray-100 z-50">
              <ul className="flex flex-col text-sm text-gray-700 py-2">
                {dropdownMenus.map((item, index) => (
                  <li key={index}>
                    <Link
                      to={item.path}
                      className="block px-5 py-3 hover:bg-gray-50 transition-colors duration-200 font-medium"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-5 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 font-medium"
                  >
                    Đăng xuất
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DesktopNav;
