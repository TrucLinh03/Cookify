import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { getApiUrl } from '../../config/api.js';
import SecureStorage from '../../utils/secureStorage';
import DatePicker from '../../components/common/DatePicker';
import Select from '../../components/common/Select';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';
import ThumbsUpIcon from '../../assets/thumbs-up.svg';
import EyeIcon from '../../assets/eye.svg';
import TrashIcon from '../../assets/trash.svg';

const ManageFeedbacks = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch feedbacks
  const fetchFeedbacks = async (page = 1) => {
    try {
      setLoading(true);
      const token = SecureStorage.getToken();
      
      const response = await axios.get(getApiUrl('/api/feedback/admin/all'), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          page,
          limit: 100,
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });

      if (response.data.success) {
        let filteredFeedbacks = response.data.data.feedbacks;
        
        // Client-side date filtering
        if (startDate || endDate) {
          filteredFeedbacks = filteredFeedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.createdAt);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            
            if (start && end) {
              return feedbackDate >= start && feedbackDate <= end;
            } else if (start) {
              return feedbackDate >= start;
            } else if (end) {
              return feedbackDate <= end;
            }
            return true;
          });
        }
        
        setFeedbacks(filteredFeedbacks);
        setCurrentPage(response.data.data.pagination.currentPage);
        setTotalPages(response.data.data.pagination.totalPages);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Có lỗi xảy ra khi tải danh sách feedback: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Update feedback status
  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      const token = SecureStorage.getToken();
      
      const response = await axios.patch(getApiUrl(`/api/feedback/admin/manage/${feedbackId}`), {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success(`Cập nhật trạng thái thành công!`);
        fetchFeedbacks(currentPage);
        setShowModal(false);
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete feedback
  const deleteFeedback = async (feedbackId) => {
    try {
      const token = SecureStorage.getToken();
      
      const response = await axios.delete(getApiUrl(`/api/feedback/admin/manage/${feedbackId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Xóa feedback thành công!');
        fetchFeedbacks(currentPage);
        setShowModal(false);
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  // Delete all feedbacks
  const deleteAllFeedbacks = async () => {
    const confirmMessage = `CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ feedback?\n\nHành động này sẽ:\n- Xóa vĩnh viễn tất cả ${stats.total || 0} feedback\n- Không thể khôi phục\n- Ảnh hưởng đến hệ thống gợi ý\n\nNhập "XOA TAT CA" để xác nhận:`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== "XOA TAT CA") {
      toast.info('Hủy bỏ thao tác xóa tất cả feedback.');
      return;
    }

    const finalConfirm = confirm('XÁC NHẬN CUỐI CÙNG: Bạn thực sự muốn xóa tất cả feedback? Hành động này KHÔNG THỂ HOÀN TÁC!');
    
    if (!finalConfirm) {
      return;
    }

    try {
      setLoading(true);
      const token = SecureStorage.getToken();
      
      const response = await axios.delete(getApiUrl('/api/feedback/admin/delete-all'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success(`Đã xóa thành công ${response.data.deletedCount || 0} feedback!`);
        fetchFeedbacks(1); // Refresh to page 1
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error deleting all feedbacks:', error);
      toast.error('Có lỗi xảy ra khi xóa tất cả feedback: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFeedbacks(1);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'visible': return 'bg-green-100 text-green-800';
      case 'hidden': return 'bg-yellow-100 text-yellow-800';
      case 'reported': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'visible': return 'Hiển thị';
      case 'hidden': return 'Ẩn';
      case 'reported': return 'Báo cáo';
      default: return status;
    }
  };

  // Render stars
  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map(star => (
      <svg
        key={star}
        className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1);
        fetchFeedbacks(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    fetchFeedbacks(1);
  }, [statusFilter, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tomato"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý phản hồi</h1>
        <p className="text-gray-600">Xem và quản lý phản hồi của người dùng</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-2">
              <img src={ChatDotsIcon} alt="Tổng số" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-blue-600">Tổng số</h3>
          </div>
          <p className="text-lg font-bold text-blue-800">{stats.total || 0}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-2">
              <img src={ThumbsUpIcon} alt="Hiển thị" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-green-600">Hiển thị</h3>
          </div>
          <p className="text-lg font-bold text-green-800">{stats.visible || 0}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-yellow-100 rounded-md flex items-center justify-center mr-2">
              <img src={EyeIcon} alt="Ẩn" className="w-3 h-3 opacity-70" />
            </div>
            <h3 className="text-xs font-medium text-yellow-600">Ẩn</h3>
          </div>
          <p className="text-lg font-bold text-yellow-800">{stats.hidden || 0}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center mb-1">
            <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mr-2">
              <img src={TrashIcon} alt="Báo cáo" className="w-3 h-3" />
            </div>
            <h3 className="text-xs font-medium text-red-600">Báo cáo</h3>
          </div>
          <p className="text-lg font-bold text-red-800">{stats.reported || 0}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 w-full lg:max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm theo nội dung bình luận..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tomato focus:border-tomato"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <DatePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            placeholder="Ngày tạo"
            className="min-w-[200px]"
          />
          
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'visible', label: 'Hiển thị' },
              { value: 'hidden', label: 'Ẩn' },
              { value: 'reported', label: 'Báo cáo' }
            ]}
            className="min-w-[200px]"
          />
          
          {/* Delete All Button */}
          <button
            onClick={deleteAllFeedbacks}
            disabled={loading || !stats.total || stats.total === 0}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
              loading || !stats.total || stats.total === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg transform hover:scale-105'
            }`}
            title={stats.total > 0 ? `Xóa tất cả ${stats.total} feedback` : 'Không có feedback để xóa'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Xóa Tất Cả</span>
            {stats.total > 0 && (
              <span className="bg-red-800 text-white text-xs px-2 py-1 rounded-full">
                {stats.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feedbacks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Món ăn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đánh giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bình luận
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feedbacks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
                      </svg>
                      <p className="text-lg font-medium">Không có feedback nào</p>
                      <p className="text-sm">Chưa có feedback nào phù hợp với bộ lọc hiện tại</p>
                    </div>
                  </td>
                </tr>
              ) : (
                feedbacks.map((feedback) => (
                  <tr key={feedback._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-tomato rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {feedback.user_id?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="ml-2">
                          <div className="text-xs font-medium text-gray-900">
                            {feedback.user_id?.name || 'Người dùng'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {feedback.recipe_id?.imageUrl && (
                          <img 
                            src={feedback.recipe_id.imageUrl} 
                            alt={feedback.recipe_id.name}
                            className="w-8 h-8 rounded object-cover mr-2"
                          />
                        )}
                        <div className="text-xs font-medium text-gray-900 truncate max-w-20">
                          {feedback.recipe_id?.name || 'Món ăn đã xóa'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {renderStars(feedback.rating)}
                        <span className="ml-1 text-xs text-gray-600">({feedback.rating})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-900 max-w-32 truncate">
                        {feedback.comment}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded ${getStatusBadgeColor(feedback.status)}`}>
                        {getStatusText(feedback.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(feedback.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setModalType('status');
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 text-xs"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setModalType('delete');
                            setShowModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchFeedbacks(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => fetchFeedbacks(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => fetchFeedbacks(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => fetchFeedbacks(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-4 border w-80 shadow-lg rounded-md bg-white">
            {modalType === 'status' ? (
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-3">Cập nhật trạng thái</h3>
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">Feedback: "{selectedFeedback.comment.substring(0, 50)}..."</p>
                  <p className="text-xs text-gray-600">Hiện tại: <span className={`px-1 py-0.5 text-xs rounded ${getStatusBadgeColor(selectedFeedback.status)}`}>{getStatusText(selectedFeedback.status)}</span></p>
                </div>
                <div className="space-y-1 mb-3">
                  <button onClick={() => updateFeedbackStatus(selectedFeedback._id, 'visible')} className="w-full text-left px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Hiển thị</button>
                  <button onClick={() => updateFeedbackStatus(selectedFeedback._id, 'hidden')} className="w-full text-left px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">Ẩn</button>
                  <button onClick={() => updateFeedbackStatus(selectedFeedback._id, 'reported')} className="w-full text-left px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Báo cáo</button>
                </div>
                <button onClick={() => { setShowModal(false); setSelectedFeedback(null); }} className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Hủy</button>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-medium text-gray-900 text-center mb-3">Xác nhận xóa</h3>
                <p className="text-xs text-gray-600 text-center mb-3">Bạn có chắc chắn muốn xóa feedback này?</p>
                <div className="mb-3 p-2 bg-gray-50 rounded">
                  <p className="text-xs"><strong>Người dùng:</strong> {selectedFeedback.user_id?.name}</p>
                  <p className="text-xs"><strong>Bình luận:</strong> "{selectedFeedback.comment.substring(0, 30)}..."</p>
                </div>
                <div className="flex gap-3 w-full lg:w-auto justify-center space-x-2">
                  <button onClick={() => { setShowModal(false); setSelectedFeedback(null); }} className="w-full lg:w-auto text-left px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Hủy</button>
                  <button onClick={() => deleteFeedback(selectedFeedback._id)} className="w-full lg:w-auto text-left px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700">Xóa</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default ManageFeedbacks;
