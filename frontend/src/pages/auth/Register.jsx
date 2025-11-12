import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterUserMutation } from '../../redux/features/auth/authApi';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { setUser } from '../../redux/features/auth/authSlice';
import SecureStorage from '../../utils/secureStorage';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [registerUser, { isLoading }] = useRegisterUserMutation();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      const res = await registerUser({ name, email, password }).unwrap();
      
      // Lưu token vào SecureStorage (localStorage với prefix để persistent)
      if (res.token) {
        SecureStorage.setToken(res.token);
      }
      
      // Lưu user vào Redux store (sẽ tự động lưu vào SecureStorage)
      dispatch(setUser({ user: res.user }));
      
      toast.success(`Chào mừng ${res.user.name}! Đăng ký thành công.`);
      navigate('/');
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Registration error:', err);
      }
      if (err?.data?.message) {
        setMessage(err.data.message);
      } else {
        setMessage('Đăng ký thất bại. Vui lòng thử lại.');
      }
    }
  };

  // Example usage of axiosInstance
  // const handleRegister = async (e) => {
  //   e.preventDefault();
  //   try {
  //     const res = await axiosInstance.post('/auth/register', { username, email, password });
  //     dispatch(setUser({ user: res.data.user }));
  //     alert('Registration successful!');
  //     navigate('/');
  //   } catch (err) {
  //     console.error(err);
  //     setMessage('Registration failed. Please try again.');
  //   }
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <img src="/logo.svg" alt="Cookify" className="h-12 w-auto" />
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Tham gia Cookify</h1>
          <p className="mt-2 text-gray-600">Tạo tài khoản để chia sẻ và khám phá công thức</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên của bạn"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tạo mật khẩu mạnh"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Mật khẩu nên có ít nhất 6 ký tự
              </p>
            </div>

            {message && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Đang tạo tài khoản...</span>
                </div>
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">hoặc</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">Đã có tài khoản? </span>
              <Link 
                to="/login" 
                className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Bằng việc đăng ký, bạn đồng ý với{' '}
            <Link to="/terms" className="text-orange-600 hover:underline">Điều khoản sử dụng</Link>
            {' '}và{' '}
            <Link to="/privacy" className="text-orange-600 hover:underline">Chính sách bảo mật</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
