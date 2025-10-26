import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/layout/AdminLayout';
import RecipesIcon from '../../assets/knife.svg';
import UsersIcon from '../../assets/users-three.svg';
import FeedbackIcon from '../../assets/chat-circle-dots.svg';
import BlogsIcon from '../../assets/pencil.svg';
import { getApiUrl } from '../../config/api.js';

const defaultStats = [
  {
    label: 'Công thức',
    value: 0,
    icon: RecipesIcon,
    color: 'bg-orange-500',
    textColor: 'text-white',
    change: '+12%',
    changeColor: 'text-green-500'
  },
  {
    label: 'Người dùng',
    value: 0,
    icon: UsersIcon,
    color: 'bg-blue-500',
    textColor: 'text-white',
    change: '+8%',
    changeColor: 'text-green-500'
  },
  {
    label: 'Phản hồi mới',
    value: 0,
    icon: FeedbackIcon,
    color: 'bg-green-500',
    textColor: 'text-white',
    change: '+23%',
    changeColor: 'text-green-500'
  },
  {
    label: 'Bài viết',
    value: 0,
    icon: BlogsIcon,
    color: 'bg-purple-500',
    textColor: 'text-white',
    change: '+15%',
    changeColor: 'text-green-500'
  }
];

const AdminDashboard = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }

      // Get stats from multiple APIs
      const [usersResponse, feedbackResponse, blogsResponse] = await Promise.all([
        axios.get(getApiUrl('/api/users/stats'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => ({ data: { success: false, error: err.message } })),
        axios.get(getApiUrl('/api/feedback/admin/all?page=1&limit=1'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => ({ data: { success: false, error: err.message } })),
        axios.get(getApiUrl('/api/blog/admin/all?page=1&limit=1'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => ({ data: { success: false, error: err.message } }))
      ]);

      // Process users and recipes stats
      let usersTotal = 0, recipesTotal = 0;
      if (usersResponse.data.success) {
        const { users, recipes } = usersResponse.data.data;
        usersTotal = users?.total || 0;
        recipesTotal = recipes?.total || 0;
      }
      
      // Process feedback stats
      let feedbackTotal = 0;
      if (feedbackResponse.data.success && feedbackResponse.data.data?.stats) {
        feedbackTotal = feedbackResponse.data.data.stats.total || 0;
      }

      // Process blog stats
      let blogsTotal = 0;
      if (blogsResponse.data.success && blogsResponse.data.data?.stats) {
        blogsTotal = blogsResponse.data.data.stats.total || 0;
      }
      
      const updatedStats = [
        {
          ...defaultStats[0],
          value: recipesTotal
        },
        {
          ...defaultStats[1],
          value: usersTotal
        },
        {
          ...defaultStats[2],
          value: feedbackTotal
        },
        {
          ...defaultStats[3],
          value: blogsTotal
        }
      ];

      setStats(updatedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default stats on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <main className="p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chào mừng trở lại! 👋
          </h1>
          <p className="text-gray-600">Đây là tổng quan về hệ thống của bạn</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 relative hover:shadow-md transition-shadow duration-300">
              {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-400 border-t-transparent"></div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`w-16 h-16 ${stat.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                    <img src={stat.icon} alt={stat.label} className="w-7 h-7 invert" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Tổng {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${stat.changeColor} flex items-center justify-end bg-green-50 px-3 py-1 rounded-full`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {stat.change}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Admin Content */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
            <div className="space-y-3">
              <a href="/dashboard/recipes" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <img src={RecipesIcon} alt="Recipes" className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Thêm công thức mới</p>
                  <p className="text-sm text-gray-500">Tạo công thức nấu ăn mới</p>
                </div>
              </a>
              <a href="/dashboard/users" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <img src={UsersIcon} alt="Users" className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Quản lý người dùng</p>
                  <p className="text-sm text-gray-500">Xem và quản lý tài khoản</p>
                </div>
              </a>
              <a href="/dashboard/feedbacks" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <img src={FeedbackIcon} alt="Feedback" className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Xem phản hồi</p>
                  <p className="text-sm text-gray-500">Kiểm tra đánh giá mới</p>
                </div>
              </a>
              <a href="/dashboard/blogs" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <img src={BlogsIcon} alt="Blogs" className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Quản lý bài viết</p>
                  <p className="text-sm text-gray-500">Quản lý bài viết của người dùng</p>
                </div>
              </a>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái hệ thống</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Server Status</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Response</span>
                <span className="text-gray-600">~120ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Uptime</span>
                <span className="text-gray-600">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};

export default AdminDashboard;

