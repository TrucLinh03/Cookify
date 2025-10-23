import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import avatarDefault from '../../assets/avatar.png';
import OverviewIcon from '../../assets/chef-hat.svg';
import RecipesIcon from '../../assets/knife.svg';
import UsersIcon from '../../assets/users-three.svg';
import FeedbackIcon from '../../assets/chat-circle-dots.svg';
import BlogsIcon from '../../assets/pencil.svg';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const sidebarItems = [
    {
      label: 'Tổng quan',
      icon: OverviewIcon,
      href: '/dashboard/admin',
      path: '/dashboard/admin'
    },
    {
      label: 'Công thức',
      icon: RecipesIcon,
      href: '/dashboard/recipes',
      path: '/dashboard/recipes'
    },
    {
      label: 'Người dùng',
      icon: UsersIcon,
      href: '/dashboard/users',
      path: '/dashboard/users'
    },
    {
      label: 'Phản hồi',
      icon: FeedbackIcon,
      href: '/dashboard/feedbacks',
      path: '/dashboard/feedbacks'
    },
    {
      label: 'Bài viết',
      icon: BlogsIcon,
      href: '/dashboard/blogs',
      path: '/dashboard/blogs'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg fixed h-full z-10">
        {/* Logo */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img
              src={user?.avatar || avatarDefault}
              alt="Admin avatar"
              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500"
            />
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                COOKIFY<span className="text-orange-500">.</span>
              </h2>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <a
                key={item.label}
                href={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 rounded-r-lg ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-500'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {/* Icon Container */}
                <span className="mr-3">
                  <span
                    className={`w-9 h-9 inline-flex items-center justify-center rounded-xl shadow-sm transition-all duration-300 transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-orange-100 border border-orange-200 scale-105'
                        : 'bg-orange-50 border border-transparent group-hover:bg-orange-100'
                    }`}
                  >
                    <img
                      src={item.icon}
                      alt="icon"
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isActive ? 'scale-110 opacity-100' : 'opacity-90 group-hover:scale-110'
                      }`}
                    />
                  </span>
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-4 w-64 px-4 border-t border-gray-200 pt-4">
          <a
            href="/profile"
            className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-gray-50 rounded transition-all duration-300"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-sm text-gray-600">Profile</span>
          </a>

          <div
            className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-red-50 rounded transition-all duration-300"
            onClick={handleLogout}
          >
            <svg
              className="w-4 h-4 text-red-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-600">Đăng xuất</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">{children}</div>
    </div>
  );
};

export default AdminLayout;
