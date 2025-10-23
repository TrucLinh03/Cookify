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
      <div className="h-20 flex justify-between items-center px-6 lg:px-12">
        <a href="/" className="flex items-center">
          <img src={logo} alt="flex site logo" className="h-12 w-auto" />
        </a>
        <button className="border border-orange-500 rounded p-2 hover:bg-orange-50 transition-colors duration-200" onClick={onOpen}>
          <HiOutlineBars3BottomRight className="w-7 h-7 text-orange-500" />
        </button>
      </div>

      <div
        className={`transition-all w-full h-full fixed bg-primary z-50 top-0 ${hideLeft} flex justify-center items-center`}
      >
        <button className="absolute right-8 top-32" onClick={onClose}>
          <RiCloseCircleLine className="w-7 h-6" />
        </button>

        <div className="text-center">
          <ul className="flex flex-col gap-5">
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
                    className="font-medium capitalize text-secondary text-2xl"
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
                  Log In
                </button>
                <button
                  className="bg-primary text-secondary px-4 py-2 rounded border"
                  onClick={() => {
                    onClose();
                    window.location.href = '/register';
                  }}
                >
                  Sign Up
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
                    Profile
                  </Link>
                  {user?.role !== 'admin' && (
                    <Link
                      to={`/favourites`}
                      className="text-secondary px-4 py-2 rounded border border-secondary"
                      onClick={onClose}
                    >
                      Saved Recipes
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-red-400 px-4 py-2 rounded border border-red-400"
                  >
                    Log Out
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
