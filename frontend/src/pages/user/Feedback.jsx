import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Feedback = ({ recipeId, onFeedbackSubmitted }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    rating: 0,
    comment: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userHasRated, setUserHasRated] = useState(false);
  const [userFeedback, setUserFeedback] = useState(null);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 0, comment: '' });
  const [showDropdown, setShowDropdown] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch feedbacks for the recipe
  const fetchFeedbacks = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/feedback/recipe/${recipeId}`, {
        params: { page, limit: 5 }
      });

      if (response.data.success) {
        setFeedbacks(response.data.data.feedbacks);
        setRatingStats(response.data.data.ratingStats);
        setCurrentPage(response.data.data.pagination.currentPage);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Lỗi khi tải feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has already rated this recipe
  const checkUserRating = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`http://localhost:5000/api/feedback/check/${recipeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUserHasRated(response.data.data.hasRated);
        setUserFeedback(response.data.data.feedback);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra rating:', error);
      // Không hiển thị lỗi cho user vì đây không phải lỗi critical
    }
  };

  // Get current user ID from token
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  useEffect(() => {
    if (recipeId) {
      fetchFeedbacks();
      checkUserRating();
      setCurrentUserId(getCurrentUserId());
    }
  }, [recipeId]);

  // Handle rating click
  const handleRatingClick = (rating) => {
    setNewFeedback(prev => ({ ...prev, rating }));
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    setNewFeedback(prev => ({ ...prev, comment: e.target.value }));
  };

  // Handle edit feedback
  const handleEditFeedback = (feedback) => {
    setEditingFeedback(feedback._id);
    setEditForm({
      rating: feedback.rating,
      comment: feedback.comment
    });
    setShowDropdown(null);
  };

  // Handle delete feedback
  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập');
        return;
      }

      const response = await axios.delete(`http://localhost:5000/api/feedback/${feedbackId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        alert('Xóa đánh giá thành công!');
        await fetchFeedbacks();
        await checkUserRating();
        
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
      }
    } catch (error) {
      console.error('Lỗi khi xóa feedback:', error);
      alert('Có lỗi xảy ra khi xóa đánh giá: ' + (error.response?.data?.message || error.message));
    }
    setShowDropdown(null);
  };

  // Handle update feedback
  const handleUpdateFeedback = async (e) => {
    e.preventDefault();
    
    if (!editForm.rating || !editForm.comment.trim()) {
      alert('Vui lòng chọn điểm đánh giá và viết bình luận');
      return;
    }

    if (editForm.comment.trim().length < 10) {
      alert('Bình luận phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Vui lòng đăng nhập');
        return;
      }

      const payload = {
        rating: editForm.rating,
        comment: editForm.comment.trim()
      };

      const response = await axios.put(`http://localhost:5000/api/feedback/${editingFeedback}`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setEditingFeedback(null);
        setEditForm({ rating: 0, comment: '' });
        
        await fetchFeedbacks();
        await checkUserRating();
        
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
        
        alert('Cập nhật đánh giá thành công!');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật feedback:', error);
      alert('Có lỗi xảy ra khi cập nhật đánh giá: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingFeedback(null);
    setEditForm({ rating: 0, comment: '' });
  };

  // Submit feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!newFeedback.rating || !newFeedback.comment.trim()) {
      alert('Vui lòng chọn điểm đánh giá và viết bình luận');
      return;
    }

    if (newFeedback.comment.trim().length < 10) {
      alert('Bình luận phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
            
      if (!token) {
        alert('Vui lòng đăng nhập để đánh giá');
        return;
      }

      const payload = {
        recipe_id: recipeId,
        rating: newFeedback.rating,
        comment: newFeedback.comment.trim()
      };
      
      const response = await axios.post('http://localhost:5000/api/feedback', payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        // Reset form
        setNewFeedback({ rating: 0, comment: '' });
        setShowForm(false);
        
        // Refresh feedbacks and check user rating status
        await fetchFeedbacks();
        await checkUserRating();
        
        // Notify parent component
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
        
        alert('Đánh giá đã được gửi thành công!');
      }
    } catch (error) {
      console.error('Lỗi khi gửi feedback:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 400) {
        alert(error.response.data.message || 'Dữ liệu không hợp lệ');
      } else if (error.response?.status === 401) {
        alert('Vui lòng đăng nhập để đánh giá');
      } else {
        alert('Có lỗi xảy ra khi gửi đánh giá: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get user avatar letter
  const getAvatarLetter = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now - date;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  // Render star rating
  const renderStars = (rating, interactive = false, onStarClick = null) => {
    return [1, 2, 3, 4, 5].map(star => (
      <svg
        key={star}
        className={`w-4 h-4 cursor-pointer transition-colors ${
          star <= rating ? 'text-yellow-400' : 'text-gray-300'
        } ${interactive ? 'hover:text-yellow-400' : ''}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        onClick={() => interactive && onStarClick && onStarClick(star)}
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.relative')) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="text-center mb-6 p-6 bg-yellow-50 rounded-lg">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {ratingStats?.averageRating || 0}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(ratingStats?.averageRating || 0))}
            </div>
            <div className="text-sm text-gray-600">
              Dựa trên {ratingStats?.totalReviews || 0} đánh giá
            </div>
          </div>

          {/* Rating Distribution */}
          {ratingStats && (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center text-sm">
                  <span className="w-3 text-gray-600">{rating}</span>
                  <svg className="w-4 h-4 text-yellow-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="flex-1 mx-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full" 
                        style={{
                          width: `${ratingStats.totalReviews > 0 
                            ? (ratingStats.ratingDistribution[rating] / ratingStats.totalReviews) * 100 
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs w-6">
                    {ratingStats.ratingDistribution[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Form - Show based on user rating status */}
        <div className="space-y-6">
          {userHasRated ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-green-800">Bạn đã đánh giá công thức này</span>
              </div>
              {userFeedback && (
                <div className="text-sm text-green-700">
                  <div className="flex items-center mb-1">
                    <span className="mr-2">Đánh giá của bạn:</span>
                    <div className="flex">
                      {renderStars(userFeedback.rating)}
                    </div>
                  </div>
                  <p className="italic">"{userFeedback.comment}"</p>
                </div>
              )}
            </div>
          ) : !showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Viết đánh giá
            </button>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Viết đánh giá của bạn</h4>
              
              {/* Rating Stars */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Điểm đánh giá
                </label>
                <div className="flex space-x-1">
                  {renderStars(newFeedback.rating, true, handleRatingClick)}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bình luận
                </label>
                <textarea 
                  value={newFeedback.comment}
                  onChange={handleCommentChange}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="3"
                  placeholder="Chia sẻ trải nghiệm của bạn về món ăn này..."
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {newFeedback.comment.length}/1000 ký tự (tối thiểu 10)
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3">
                <button 
                  type="submit"
                  disabled={submitting || !newFeedback.rating || newFeedback.comment.trim().length < 10}
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNewFeedback({ rating: 0, comment: '' });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      </div>


      {/* Feedbacks List */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Đánh giá từ người dùng</h4>
        
        {feedbacks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">💬</span>
            <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
          </div>
        ) : (
          <>
            {feedbacks.map((feedback) => (
              <div key={feedback._id} className="bg-gray-50 rounded-lg p-4">
                {editingFeedback === feedback._id ? (
                  // Edit Form
                  <form onSubmit={handleUpdateFeedback} className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {getAvatarLetter(feedback.user_id?.name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <span className="font-medium text-gray-900 text-sm mr-2">
                            {feedback.user_id?.name || 'Người dùng'}
                          </span>
                          <div className="flex space-x-1">
                            {renderStars(editForm.rating, true, (rating) => setEditForm(prev => ({ ...prev, rating })))}
                          </div>
                        </div>
                        
                        <textarea 
                          value={editForm.comment}
                          onChange={(e) => setEditForm(prev => ({ ...prev, comment: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          rows="3"
                          placeholder="Cập nhật bình luận của bạn..."
                          required
                        />
                        <div className="text-xs text-gray-500 mt-1 mb-3">
                          {editForm.comment.length}/1000 ký tự (tối thiểu 10)
                        </div>
                        
                        <div className="flex space-x-2">
                          <button 
                            type="submit"
                            disabled={submitting || !editForm.rating || editForm.comment.trim().length < 10}
                            className="bg-orange-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Đang cập nhật...' : 'Cập nhật'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-gray-600 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  // Display Mode
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {getAvatarLetter(feedback.user_id?.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 text-sm">
                            {feedback.user_id?.name || 'Người dùng'}
                          </span>
                          <div className="flex ml-2">
                            {renderStars(feedback.rating)}
                          </div>
                        </div>
                        
                        {/* Three dots menu - only show for current user's feedback */}
                        {currentUserId && feedback.user_id?._id === currentUserId && (
                          <div className="relative">
                            <button
                              onClick={() => setShowDropdown(showDropdown === feedback._id ? null : feedback._id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            
                            {showDropdown === feedback._id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={() => handleEditFeedback(feedback)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteFeedback(feedback._id)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-1">{feedback.comment}</p>
                      <span className="text-gray-400 text-xs">
                        {feedback.timeAgo || formatTimeAgo(feedback.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-6">
                {currentPage > 1 && (
                  <button
                    onClick={() => fetchFeedbacks(currentPage - 1)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Trước
                  </button>
                )}
                
                <span className="px-3 py-1 text-sm text-gray-600">
                  Trang {currentPage} / {totalPages}
                </span>
                
                {currentPage < totalPages && (
                  <button
                    onClick={() => fetchFeedbacks(currentPage + 1)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Sau
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Feedback;
