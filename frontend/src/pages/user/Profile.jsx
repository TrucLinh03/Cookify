import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { updateUser } from "../../redux/features/auth/authSlice";
import { getApiUrl } from '../../config/api.js';
import EditIcon from '../../assets/pencil.svg';

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    avatar: "",
    role: "",
    status: "",
    createdAt: "",
    lastLogin: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    // Admin stats
    recipesCreated: 0,
    totalUsers: 0,
    totalBlogs: 0,
    totalFeedbacks: 0,
    // User stats
    favoriteRecipes: 0,
    reviewsGiven: 0,
    blogsPosted: 0
  });

  // Lấy token từ localStorage
  const getAuthToken = () => {
    const token = localStorage.getItem("token");
    return token;
  };

  // Cấu hình axios với token
  const getAxiosConfig = () => {
    const token = getAuthToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Listen for focus events to refresh data when user returns from edit page
  useEffect(() => {
    const handleFocus = () => {
      fetchUserProfile();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Lấy thông tin profile từ API
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const config = getAxiosConfig();
      const response = await axios.get(getApiUrl('/api/users/profile'), config);
      
      if (response.data.success) {
        const userData = response.data.user;
        setProfileData({
          name: userData.name || "",
          email: userData.email || "",
          avatar: userData.avatar || "",
          role: userData.role || "",
          status: userData.status || "active",
          createdAt: userData.createdAt || "",
          lastLogin: userData.lastLogin || ""
        });
        
        // Update Redux store to keep header avatar in sync
        dispatch(updateUser(userData));
        
        // Fetch stats only for regular users (no system stats for admin)
        if (userData.role !== 'admin') {
          try {
            const userId = userData._id || userData.id;
            
            // 1) Favourites: use current user endpoint
            const favRes = await axios.get(
              getApiUrl('/api/favourites/current'),
              config
            );
            const favCount = favRes?.data?.totalFavorites ?? (favRes?.data?.favourites?.length ?? 0);
            
            // 2) Feedbacks: current user's feedbacks
            const fbRes = await axios.get(
              getApiUrl('/api/feedback/user/my'),
              config
            );
            const reviewsCount = fbRes?.data?.data?.pagination?.totalItems ?? (fbRes?.data?.data?.feedbacks?.length ?? 0);
            
            // 3) Blogs: user's published blogs
            const blogRes = await axios.get(
              getApiUrl(`/api/blog/user/${userId}?page=1&limit=1`)
            );
            const blogsCount = blogRes?.data?.data?.pagination?.totalItems ?? (blogRes?.data?.data?.blogs?.length ?? 0);
            
            setStats({
              favoriteRecipes: favCount,
              reviewsGiven: reviewsCount,
              blogsPosted: blogsCount
            });
          } catch (error) {
            console.error("Error fetching user stats:", error);
            setStats({
              favoriteRecipes: 0,
              reviewsGiven: 0,
              blogsPosted: 0
            });
          }
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        navigate("/login");
      } else {
        toast.error("Không thể tải thông tin profile");
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick actions based on role
  const getQuickActions = () => {
    if (profileData.role === 'admin') {
      return [
        {
          title: "Chỉnh sửa hồ sơ",
          description: "Cập nhật thông tin cá nhân",
          action: () => navigate("/edit-profile"),
          color: "bg-blue-50 text-blue-600 hover:bg-blue-100"
        },
        {
          title: "Quản lý công thức",
          description: "Quản lý tất cả công thức",
          action: () => navigate("/dashboard/recipes"),
          color: "bg-peachLight text-tomato hover:bg-peach"
        },
        {
          title: "Quản lý người dùng",
          description: "Quản lý tài khoản người dùng",
          action: () => navigate("/dashboard/users"),
          color: "bg-purple-50 text-purple-600 hover:bg-purple-100"
        },
        {
          title: "Quản lý phản hồi",
          description: "Xem và quản lý feedback",
          action: () => navigate("/dashboard/feedbacks"),
          color: "bg-green-50 text-green-600 hover:bg-green-100"
        },
        {
          title: "Quản lý bài viết",
          description: "Quản lý blog và bài viết",
          action: () => navigate("/dashboard/blogs"),
          color: "bg-pink-50 text-pink-600 hover:bg-pink-100"
        }
      ];
    } else {
      return [
        {
          title: "Chỉnh sửa hồ sơ",
          description: "Cập nhật thông tin cá nhân",
          action: () => navigate("/edit-profile"),
          color: "bg-blue-50 text-blue-600 hover:bg-blue-100"
        },
        {
          title: "Công thức yêu thích",
          description: "Xem danh sách yêu thích",
          action: () => navigate("/favourites"),
          color: "bg-red-50 text-red-600 hover:bg-red-100"
        }
      ];
    }
  };

  const quickActions = getQuickActions();

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có thông tin";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading && !profileData.name) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Đang tải thông tin profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button for Admin */}
      {profileData.role === 'admin' && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Quay lại Dashboard</span>
          </button>
        </div>
      )}
      
      {/* Cover Photo Section */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: profileData.role === 'admin' 
              ? "url('https://i.pinimg.com/1200x/9b/7b/5b/9b7b5b494bef013a462b4fb04664fe9d.jpg')" 
              : "url('https://i.pinimg.com/1200x/96/9d/77/969d770d6d6f017f2745a1f5aebe846b.jpg')"
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar */}
            <div className="relative">
              {profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt="Profile"
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {/* Edit button */}
              <button
                onClick={() => navigate('/edit-profile')}
                className="absolute bottom-0 right-0 bg-tomato text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <img src={EditIcon} alt="Chỉnh sửa" className="w-4 h-4 invert" />
              </button>
            </div>
            
            {/* User Info */}
            <div className="text-white pb-4">
              <h1 className="text-3xl font-bold">{profileData.name}</h1>
              <p className="text-blue-100 text-lg">{profileData.email}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profileData.role === 'admin' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {profileData.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profileData.status === 'active' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {profileData.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-8">
                {profileData.role === 'admin' ? 'Quản lý hệ thống' : 'Thao tác nhanh'}
              </h2>
              <div className={`grid grid-cols-1 ${
                profileData.role === 'admin' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'
              } gap-5`}>
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`w-full p-6 rounded-xl transition-all duration-200 ${action.color} text-left hover:scale-105 hover:shadow-md`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{action.icon}</span>
                      <div>
                        <div className="text-lg font-semibold">{action.title}</div>
                        <div className="text-base opacity-75">{action.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-8">Thông tin cá nhân</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-base font-medium text-gray-500 mb-3">Họ và tên</label>
                  <p className="text-2xl font-semibold text-gray-800">{profileData.name}</p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-500 mb-3">Email</label>
                  <p className="text-2xl text-gray-800">{profileData.email}</p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-500 mb-3">Ngày tham gia</label>
                  <p className="text-2xl text-gray-800">{formatDate(profileData.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-500 mb-3">Lần đăng nhập cuối</label>
                  <p className="text-2xl text-gray-800">{formatDate(profileData.lastLogin)}</p>
                </div>
              </div>
            </div>

            {/* Stats Cards - Only for regular users */}
            {profileData.role !== 'admin' && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-8">📈 Hoạt động của bạn</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg text-red-600 font-medium mb-2">Công thức yêu thích</p>
                        <p className="text-5xl font-bold text-red-700 mt-3">{stats.favoriteRecipes}</p>
                      </div>
                      <div className="bg-red-200 rounded-full p-4">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg text-blue-600 font-medium mb-2">Đánh giá bài viết</p>
                        <p className="text-5xl font-bold text-blue-700 mt-3">{stats.reviewsGiven}</p>
                      </div>
                      <div className="bg-blue-200 rounded-full p-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg text-green-600 font-medium mb-2">Bài viết đã đăng</p>
                        <p className="text-5xl font-bold text-green-700 mt-3">{stats.blogsPosted}</p>
                      </div>
                      <div className="bg-green-200 rounded-full p-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Status */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Trạng thái tài khoản</h3>
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-xl text-gray-600">Trạng thái:</span>
                  <span className={`px-4 py-2 rounded-full text-base font-medium ${
                    profileData.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {profileData.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xl text-gray-600">Vai trò:</span>
                  <span className={`px-4 py-2 rounded-full text-base font-medium ${
                    profileData.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {profileData.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
