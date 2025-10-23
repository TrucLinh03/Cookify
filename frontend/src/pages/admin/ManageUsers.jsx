import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Axios config with auth
  const getAxiosConfig = () => {
    const token = getAuthToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // Fetch users from API
  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/users/all?page=${page}&limit=10&search=${search}`,
        getAxiosConfig()
      );

      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn');
        window.location.href = '/login';
      } else if (error.response?.status === 403) {
        toast.error('Bạn không có quyền truy cập chức năng này');
      } else {
        toast.error('Không thể tải danh sách người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update user role or status
  const updateUser = async (userId, updateData) => {
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/users/manage/${userId}`,
        updateData,
        getAxiosConfig()
      );

      if (response.data.success) {
        toast.success('Cập nhật người dùng thành công');
        fetchUsers(currentPage, searchTerm);
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Lỗi cập nhật người dùng');
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `http://localhost:5000/api/users/manage/${userId}`,
        getAxiosConfig()
      );

      if (response.data.success) {
        toast.success('Xóa người dùng thành công');
        fetchUsers(currentPage, searchTerm);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Lỗi xóa người dùng');
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers(1, searchTerm);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchUsers(newPage, searchTerm);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  // Get role badge color
  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800';
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý người dùng</h1>
        <p className="text-gray-600">Xem và quản lý tài khoản người dùng</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-3 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-xs font-medium text-gray-600">Tổng</p>
          <p className="text-xl font-bold text-gray-900">
            {users.filter(u => u.status === 'active').length + users.filter(u => u.status === 'banned').length}
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-xs font-medium text-gray-600">Hoạt động</p>
          <p className="text-xl font-bold text-green-600">{users.filter(u => u.status === 'active').length}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-xs font-medium text-gray-600">Bị cấm</p>
          <p className="text-xl font-bold text-red-600">{users.filter(u => u.status === 'banned').length}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-xs font-medium text-gray-600">Admin</p>
          <p className="text-xl font-bold text-purple-600">{users.filter(u => u.role === 'admin').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p className="text-gray-500">Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lần cuối đăng nhập
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-6 w-6">
                            {user.avatar ? (
                              <img className="h-6 w-6 rounded-full object-cover" src={user.avatar} alt={user.name} />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                                <span className="text-white text-xs font-medium">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-2">
                            <div className="text-xs font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded ${getRoleBadge(user.role)}`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded ${getStatusBadge(user.status)}`}>
                          {user.status === 'active' ? 'Hoạt động' : 'Bị cấm'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-xs"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Hiển thị <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> đến{' '}
                      <span className="font-medium">{Math.min(currentPage * 10, pagination.totalUsers)}</span> trong{' '}
                      <span className="font-medium">{pagination.totalUsers}</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {[...Array(pagination.totalPages)].map((_, index) => {
                        const page = index + 1;
                        if (page === currentPage) {
                          return (
                            <span
                              key={page}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600"
                            >
                              {page}
                            </span>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {page}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Chỉnh sửa người dùng
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center mb-3">
                  {selectedUser.avatar ? (
                    <img className="h-12 w-12 rounded-full object-cover" src={selectedUser.avatar} alt={selectedUser.name} />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="user"
                        defaultChecked={selectedUser.role === 'user'}
                        className="mr-2"
                      />
                      <span className="text-sm">Người dùng</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        defaultChecked={selectedUser.role === 'admin'}
                        className="mr-2"
                      />
                      <span className="text-sm">Quản trị viên</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        defaultChecked={selectedUser.status === 'active'}
                        className="mr-2"
                      />
                      <span className="text-sm">Hoạt động</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="banned"
                        defaultChecked={selectedUser.status === 'banned'}
                        className="mr-2"
                      />
                      <span className="text-sm">Bị cấm</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const formData = new FormData(document.querySelector('form') || document.createElement('form'));
                    const role = document.querySelector('input[name="role"]:checked')?.value;
                    const status = document.querySelector('input[name="status"]:checked')?.value;
                    
                    const updateData = {};
                    if (role && role !== selectedUser.role) updateData.role = role;
                    if (status && status !== selectedUser.status) updateData.status = status;
                    
                    if (Object.keys(updateData).length > 0) {
                      updateUser(selectedUser._id, updateData);
                    } else {
                      setShowModal(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default ManageUsers;
