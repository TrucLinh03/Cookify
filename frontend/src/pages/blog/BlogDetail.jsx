import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import ChefHatIcon from '../../assets/chef-hat.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';
import KnifeIcon from '../../assets/knife.svg';
import CarrotIcon from '../../assets/carrot.svg';
import SmileyIcon from '../../assets/smiley.svg';
import EyeIcon from '../../assets/eye.svg';
import ClockIcon from '../../assets/clock.svg';
import HeartIcon from '../../assets/heart.svg';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [relatedBlogs, setRelatedBlogs] = useState([]);

  const categories = {
    recipe_share: { label: 'Chia sẻ công thức', icon: ChefHatIcon },
    cooking_tips: { label: 'Mẹo nấu ăn', icon: LightbulbIcon },
    food_story: { label: 'Câu chuyện ẩm thực', icon: ChatDotsIcon },
    kitchen_hacks: { label: 'Thủ thuật bếp núc', icon: KnifeIcon },
    nutrition: { label: 'Dinh dưỡng', icon: CarrotIcon },
    other: { label: 'Khác', icon: SmileyIcon }
  };

  useEffect(() => {
    fetchBlogDetail();
    fetchRelatedBlogs();
  }, [id]);

  const fetchBlogDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/blog/${id}`);
      
      if (response.data.success) {
        const blogData = response.data.data;
        setBlog(blogData);
        setLikeCount(blogData.likeCount || 0);
        
        // Check if user liked this blog
        if (user && blogData.likes) {
          setIsLiked(blogData.likes.some(like => like.user === user.id));
        }
      }
    } catch (error) {
      console.error('Error fetching blog detail:', error);
      setError(error.response?.data?.message || 'Không thể tải bài viết');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedBlogs = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/blog?limit=4`);
      if (response.data.success) {
        // Filter out current blog
        const filtered = response.data.data.blogs.filter(b => b._id !== id);
        setRelatedBlogs(filtered.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching related blogs:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/blog/${id}/like`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setIsLiked(response.data.data.isLiked);
        setLikeCount(response.data.data.likeCount);
      }
    } catch (error) {
      console.error('Error liking blog:', error);
      alert('Có lỗi xảy ra khi thích bài viết');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Vui lòng đăng nhập để bình luận');
      return;
    }

    if (!commentContent.trim()) {
      alert('Vui lòng nhập nội dung bình luận');
      return;
    }

    try {
      setSubmittingComment(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/blog/${id}/comment`,
        { content: commentContent.trim() },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Refresh blog to get updated comments
        await fetchBlogDetail();
        setCommentContent('');
        alert('Bình luận thành công!');
      }
    } catch (error) {
      console.error('Error commenting:', error);
      alert('Có lỗi xảy ra khi bình luận: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryInfo = (categoryValue) => {
    return categories[categoryValue] || categories.other;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-50 to-yellow-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded mb-6"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-50 to-yellow-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <img src={ChefHatIcon} alt="Error" className="w-16 h-16 mb-4 opacity-80 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops! Có lỗi xảy ra</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/blog"
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              ← Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-50 to-yellow-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/blog"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách
          </Link>
        </div>

        {/* Main Content */}
        <article className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          {/* Header */}
          <div className="p-8 pb-6">
            <div className="flex items-center mb-4">
              <span className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium inline-flex items-center">
                <img src={getCategoryInfo(blog.category).icon} alt="Danh mục" className="w-4 h-4 mr-2" /> {getCategoryInfo(blog.category).label}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 leading-tight">
              {blog.title}
            </h1>

            {/* Author and Meta Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 mb-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-orange-600 font-semibold text-lg">
                    {blog.author?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{blog.author?.name || 'Anonymous'}</p>
                  <p className="text-gray-500">{formatDate(blog.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <span className="flex items-center">
                  <img src={EyeIcon} alt="Lượt xem" className="w-5 h-5 mr-1" />
                  {blog.views} lượt xem
                </span>
                {blog.readingTime && (
                  <span className="flex items-center">
                    <img src={ClockIcon} alt="Thời gian đọc" className="w-5 h-5 mr-1" />
                    {blog.readingTime} phút đọc
                  </span>
                )}
              </div>
            </div>

            {/* Featured Image */}
            {blog.imageUrl && (
              <div className="mb-8">
                <img
                  src={blog.imageUrl}
                  alt={blog.title}
                  className="w-full h-64 md:h-96 object-cover rounded-xl"
                />
              </div>
            )}

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {blog.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {blog.content}
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <img src={ChatDotsIcon} alt="Bình luận" className="w-6 h-6 mr-2" /> Bình luận ({blog.commentCount})
          </h3>

          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleComment} className="mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-semibold">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Chia sẻ suy nghĩ của bạn về bài viết này..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-gray-500">
                      {commentContent.length}/500 ký tự
                    </span>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentContent.trim()}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        submittingComment || !commentContent.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {submittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl mb-8">
              <p className="text-gray-600 mb-4">Đăng nhập để tham gia thảo luận</p>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          )}

          {/* Comments List */}
          {blog.comments && blog.comments.length > 0 ? (
            <div className="space-y-6">
              {blog.comments.map((comment) => (
                <div key={comment._id} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-semibold text-sm">
                      {comment.user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">
                          {comment.user?.name || 'Anonymous'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <img src={LightbulbIcon} alt="No comments" className="w-10 h-10 mb-2 opacity-80 mx-auto" />
              <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            </div>
          )}
        </div>

        {/* Related Blogs */}
        {relatedBlogs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Bài viết liên quan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBlogs.map((relatedBlog) => (
                <Link
                  key={relatedBlog._id}
                  to={`/blog/${relatedBlog._id}`}
                  className="group block"
                >
                  <div className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <img
                      src={relatedBlog.imageUrl || 'https://via.placeholder.com/300x200?text=Blog+Image'}
                      alt={relatedBlog.title}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {relatedBlog.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {relatedBlog.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                        <span>{relatedBlog.author?.name}</span>
                        <span>{formatDate(relatedBlog.createdAt).split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogDetail;
