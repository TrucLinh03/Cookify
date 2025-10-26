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
    color: 'bg-tomato',
    textColor: 'text-white',
  },
  {
    label: 'Người dùng',
    value: 0,
    icon: UsersIcon,
    color: 'bg-blue-500',
    textColor: 'text-white',
  },
  {
    label: 'Phản hồi mới',
    value: 0,
    icon: FeedbackIcon,
    color: 'bg-green-500',
    textColor: 'text-white',
  },
  {
    label: 'Bài viết',
    value: 0,
    icon: BlogsIcon,
    color: 'bg-purple-500',
    textColor: 'text-white',
  }
];

const AdminDashboard = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
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

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setActivitiesLoading(false);
        return;
      }

      // Fetch recent data from multiple endpoints
      const [usersResponse, recipesResponse, feedbackResponse, blogsResponse] = await Promise.all([
        // Recent users (last 5)
        axios.get(getApiUrl('/api/users/admin/all?page=1&limit=5&sortBy=createdAt&sortOrder=desc'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } })),
        
        // Recent recipes (last 5) - assuming there's an endpoint
        axios.get(getApiUrl('/api/recipes?page=1&limit=5&sortBy=createdAt&sortOrder=desc'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } })),
        
        // Recent feedback (last 5)
        axios.get(getApiUrl('/api/feedback/admin/all?page=1&limit=5&sortBy=created_at&sortOrder=desc'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } })),
        
        // Recent blogs (last 5)
        axios.get(getApiUrl('/api/blog/admin/all?page=1&limit=5&sortBy=createdAt&sortOrder=desc'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ data: { success: false } }))
      ]);

      const activities = [];

      // Process users
      if (usersResponse.data.success && usersResponse.data.data?.users) {
        usersResponse.data.data.users.forEach(user => {
          activities.push({
            id: `user-${user._id}`,
            type: 'user',
            title: 'Người dùng mới đăng ký',
            description: user.name || user.email,
            time: user.createdAt,
            color: 'blue',
            icon: 'user'
          });
        });
      }

      // Process recipes
      if (recipesResponse.data.success && recipesResponse.data.data) {
        const recipes = Array.isArray(recipesResponse.data.data) ? recipesResponse.data.data : recipesResponse.data.data.recipes || [];
        recipes.forEach(recipe => {
          activities.push({
            id: `recipe-${recipe._id}`,
            type: 'recipe',
            title: 'Công thức mới được thêm',
            description: recipe.name,
            time: recipe.createdAt,
            color: 'green',
            icon: 'recipe'
          });
        });
      }

      // Process feedback
      if (feedbackResponse.data.success && feedbackResponse.data.data?.feedbacks) {
        feedbackResponse.data.data.feedbacks.forEach(feedback => {
          activities.push({
            id: `feedback-${feedback._id}`,
            type: 'feedback',
            title: 'Đánh giá mới',
            description: `${feedback.rating} sao - ${feedback.comment?.substring(0, 30)}...`,
            time: feedback.created_at,
            color: 'orange',
            icon: 'feedback'
          });
        });
      }

      // Process blogs
      if (blogsResponse.data.success && blogsResponse.data.data?.blogs) {
        blogsResponse.data.data.blogs.forEach(blog => {
          activities.push({
            id: `blog-${blog._id}`,
            type: 'blog',
            title: 'Bài viết mới',
            description: blog.title,
            time: blog.createdAt,
            color: 'purple',
            icon: 'blog'
          });
        });
      }

      // Sort by time (newest first) and take top 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  const getActivityIcon = (color) => {
    const colorClasses = {
      green: 'bg-green-100',
      blue: 'bg-blue-100', 
      orange: 'bg-orange-100',
      purple: 'bg-purple-100'
    };
    
    const dotClasses = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      orange: 'bg-orange-500', 
      purple: 'bg-purple-500'
    };
    
    return { bg: colorClasses[color], dot: dotClasses[color] };
  };

  return (
    <AdminLayout>
      <main className="p-8 bg-gray-50 min-h-screen">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Dashboard Admin
              </h1>
              <p className="text-lg text-gray-600">Tổng quan hệ thống Cookify</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
                <span className="text-sm text-gray-500">Hôm nay</span>
                <p className="font-semibold text-gray-900">{new Date().toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative hover:shadow-lg hover:border-gray-200 transition-all duration-300 group">
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-orange-500"></div>
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <img src={stat.icon} alt={stat.label} className="w-6 h-6 invert" />
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">Tổng cộng</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Section */}
        <div className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Thao tác nhanh</h3>
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/dashboard/recipes" className="group flex items-center p-4 rounded-xl hover:bg-orange-50 transition-all duration-200 border border-transparent hover:border-orange-100">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-orange-200 transition-colors">
                  <img src={RecipesIcon} alt="Recipes" className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-orange-700">Quản lý công thức</p>
                  <p className="text-sm text-gray-500">Tạo và chỉnh sửa công thức</p>
                </div>
              </a>
              
              <a href="/dashboard/users" className="group flex items-center p-4 rounded-xl hover:bg-blue-50 transition-all duration-200 border border-transparent hover:border-blue-100">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                  <img src={UsersIcon} alt="Users" className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700">Quản lý người dùng</p>
                  <p className="text-sm text-gray-500">Xem và quản lý tài khoản</p>
                </div>
              </a>
              
              <a href="/dashboard/feedbacks" className="group flex items-center p-4 rounded-xl hover:bg-green-50 transition-all duration-200 border border-transparent hover:border-green-100">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                  <img src={FeedbackIcon} alt="Feedback" className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-green-700">Phản hồi người dùng</p>
                  <p className="text-sm text-gray-500">Kiểm tra đánh giá mới</p>
                </div>
              </a>
              
              <a href="/dashboard/blogs" className="group flex items-center p-4 rounded-xl hover:bg-purple-50 transition-all duration-200 border border-transparent hover:border-purple-100">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-purple-200 transition-colors">
                  <img src={BlogsIcon} alt="Blogs" className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-purple-700">Quản lý bài viết</p>
                  <p className="text-sm text-gray-500">Duyệt và chỉnh sửa blog</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Hoạt động gần đây</h3>
            {activitiesLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-orange-500"></div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activitiesLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 rounded-xl border border-gray-100 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))
            ) : recentActivities.length > 0 ? (
              // Real activities
              recentActivities.map((activity) => {
                const iconStyle = getActivityIcon(activity.color);
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                    <div className={`w-10 h-10 ${iconStyle.bg} rounded-full flex items-center justify-center`}>
                      <div className={`w-4 h-4 ${iconStyle.dot} rounded-full`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getTimeAgo(activity.time)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              // No activities
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 text-gray-400">📝</div>
                </div>
                <p className="text-gray-500 mb-2">Chưa có hoạt động nào</p>
                <p className="text-sm text-gray-400">Các hoạt động mới sẽ hiển thị ở đây</p>
              </div>
            )}
          </div>
          
          {recentActivities.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Hiển thị {recentActivities.length} hoạt động gần nhất
              </p>
              <button 
                onClick={fetchRecentActivities}
                className="px-4 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors font-medium"
              >
                Làm mới
              </button>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
};

export default AdminDashboard;

