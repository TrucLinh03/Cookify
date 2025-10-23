import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { updateUser } from '../../redux/features/auth/authSlice';
import UserIcon from '../../assets/users-three.svg';
import EmailIcon from '../../assets/chat-circle-dots.svg';
import EditIcon from '../../assets/pencil.svg';
import EyeIcon from '../../assets/eye.svg';
import ChefHatIcon from '../../assets/chef-hat.svg';

const EditProfile = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Lấy profile của user hiện tại
        const apiUrl = 'http://localhost:5000/api/users/profile';
          
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          const userData = {
            name: response.data.user.name || '',
            email: response.data.user.email || '',
            avatar: response.data.user.avatar || ''
          };
          setFormData(prev => ({ ...prev, ...userData }));
          setOriginalData(userData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          toast.error('Không thể tải thông tin profile');
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [navigate, dispatch]);

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Tên không được để trống';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Tên phải có ít nhất 2 ký tự';
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Validate password if changing
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Xác nhận mật khẩu không khớp';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, GIF)');
      return;
    }
    
    // Validate file size (max 2MB for better performance)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
          const base64String = event.target.result;          
          setFormData(prev => ({
            ...prev,
            avatar: base64String
          }));
          
          toast.success('Ảnh đã được tải lên thành công!');
        } catch (error) {
          console.error(' Error processing file:', error);
          toast.error('Lỗi xử lý file ảnh');
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        toast.error('Lỗi đọc file ảnh');
      };
      
      reader.readAsDataURL(file);
    }
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        avatar: formData.avatar
      };

      // Add password change data if provided
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // Call API to update profile
      const response = await axios.patch(
        'http://localhost:5000/api/users/edit-profile',
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.success) {
        toast.success('Cập nhật profile thành công!');
        
        // Use data from API response
        const updatedUserData = response.data.user;        
        // Update Redux store - this will also update localStorage
        dispatch(updateUser(updatedUserData));        
        // Update original data with API response
        setOriginalData({
          name: updatedUserData.name,
          email: updatedUserData.email,
          avatar: updatedUserData.avatar
        });

        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));

        // Redirect to profile after 2 seconds
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } else {
        console.error('API Response failed:', response.data);
        toast.error('Cập nhật thất bại: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.name !== originalData.name ||
      formData.avatar !== originalData.avatar ||
      formData.newPassword !== ''
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow border border-orange-600">
            <img src={ChefHatIcon} alt="Profile" className="w-9 h-9" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Chỉnh sửa Profile</h1>
          <p className="text-lg text-gray-600">Cập nhật thông tin cá nhân của bạn</p>
        </div>


        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Avatar Section */}
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center overflow-hidden mx-auto">
                  {formData.avatar ? (
                    <img 
                      src={formData.avatar} 
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img src={ChefHatIcon} alt="Avatar placeholder" className="w-16 h-16 opacity-70" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full cursor-pointer hover:bg-orange-600 transition-colors shadow">
                  <img src={EditIcon} alt="Chỉnh sửa" className="w-4 h-4 invert" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Nhấp vào nút chỉnh sửa để thay đổi ảnh đại diện
              </p>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên *
                </label>
                <div className="relative">
                  <img src={UserIcon} alt="Tên" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nhập họ và tên"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <img src={EmailIcon} alt="Email" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder="Email không thể thay đổi"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Email không thể thay đổi sau khi đăng ký
                </p>
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Thay đổi mật khẩu</h3>
              <p className="text-sm text-gray-600 mb-4">
                Để lại trống nếu không muốn thay đổi mật khẩu
              </p>
              
              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className={`w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      <img src={EyeIcon} alt="Hiện/Ẩn" className={`w-5 h-5 ${showCurrentPassword ? '' : 'opacity-80'}`} />
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className={`w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Nhập mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      <img src={EyeIcon} alt="Hiện/Ẩn" className={`w-5 h-5 ${showNewPassword ? '' : 'opacity-80'}`} />
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full pr-10 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Xác nhận mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      <img src={EyeIcon} alt="Hiện/Ẩn" className={`w-5 h-5 ${showConfirmPassword ? '' : 'opacity-80'}`} />
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                to="/profile"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={saving || !hasChanges()}
                className={`px-6 py-3 rounded-lg text-white font-medium transition-colors flex items-center ${
                  saving || !hasChanges()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <img src={EditIcon} alt="Lưu" className="w-4 h-4 mr-2 invert" />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;