import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getApiUrl } from '../../config/api.js';
import SecureStorage from '../../utils/secureStorage';
import ChefHatIcon from '../../assets/chef-hat.svg';
import LightbulbIcon from '../../assets/lightbulb-filament.svg';
import ChatDotsIcon from '../../assets/chat-circle-dots.svg';
import KnifeIcon from '../../assets/knife.svg';
import CarrotIcon from '../../assets/carrot.svg';
import SmileyIcon from '../../assets/smiley.svg';

const EditBlog = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    category: 'recipe_share',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadMethod, setUploadMethod] = useState('url'); // 'upload' or 'url' - default to url for existing images
  
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const categories = [
    { value: 'recipe_share', label: 'Chia sẻ công thức', icon: ChefHatIcon },
    { value: 'cooking_tips', label: 'Mẹo nấu ăn', icon: LightbulbIcon },
    { value: 'food_story', label: 'Câu chuyện ẩm thực', icon: ChatDotsIcon },
    { value: 'kitchen_hacks', label: 'Thủ thuật bếp núc', icon: KnifeIcon },
    { value: 'nutrition', label: 'Dinh dưỡng', icon: CarrotIcon },
    { value: 'other', label: 'Khác', icon: SmileyIcon }
  ];

  // Redirect if not logged in
  if (!user) {
    navigate('/login');
    return null;
  }

  // Fetch blog data on component mount
  useEffect(() => {
    fetchBlogData();
  }, [id]);

  const fetchBlogData = async () => {
    try {
      setFetchLoading(true);
      const token = SecureStorage.getToken();
      const response = await axios.get(
        getApiUrl(`/api/blog/${id}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const blog = response.data.data;
        
        // Check if user owns this blog
        if (blog.author._id !== user.id && blog.author._id !== user._id) {
          toast.error('Bạn không có quyền chỉnh sửa bài viết này');
          navigate('/profile');
          return;
        }

        setFormData({
          title: blog.title || '',
          content: blog.content || '',
          imageUrl: blog.imageUrl || '',
          category: blog.category || 'recipe_share',
          tags: blog.tags || []
        });
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Không thể tải thông tin bài viết');
      navigate('/profile');
    } finally {
      setFetchLoading(false);
    }
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

  const handleAddTag = (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, imageFile: 'Vui lòng chọn file ảnh' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, imageFile: 'Kích thước ảnh không được vượt quá 5MB' }));
        return;
      }
      setImageFile(file);
      setErrors(prev => ({ ...prev, imageFile: '' }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Tiêu đề không được quá 200 ký tự';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Nội dung là bắt buộc';
    } else if (formData.content.length < 50) {
      newErrors.content = 'Nội dung phải có ít nhất 50 ký tự';
    }

    if (uploadMethod === 'url' && formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'URL hình ảnh không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = SecureStorage.getToken();
      let imageUrl = formData.imageUrl;

      // Upload image if file is selected
      if (uploadMethod === 'upload' && imageFile) {
        const formDataImage = new FormData();
        formDataImage.append('image', imageFile);

        try {
          const uploadResponse = await axios.post(
            getApiUrl('/api/upload/image'),
            formDataImage,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );

          if (uploadResponse.data.success) {
            imageUrl = uploadResponse.data.data.url;
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Lỗi khi upload ảnh: ' + (uploadError.response?.data?.message || uploadError.message));
          setLoading(false);
          return;
        }
      }

      const response = await axios.put(
        getApiUrl(`/api/blog/${id}`),
        { ...formData, imageUrl },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Cập nhật bài viết thành công!');
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || categories[0];
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tomato mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin bài viết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-50 to-yellow-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Chỉnh sửa bài viết
          </h1>
          <p className="text-xl text-gray-600">
            Cập nhật nội dung bài viết của bạn
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-lg font-semibold text-gray-700 mb-3">
                Tiêu đề bài viết *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Nhập tiêu đề hấp dẫn cho bài viết của bạn..."
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-tomato focus:border-transparent transition-all ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={200}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-2">{errors.title}</p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                {formData.title.length}/200 ký tự
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-lg font-semibold text-gray-700 mb-3">
                Danh mục
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <label
                    key={category.value}
                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.category === category.value
                        ? 'border-tomato bg-peachLight text-tomato'
                        : 'border-gray-300 hover:border-tomato hover:bg-peachLight'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={formData.category === category.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <img src={category.icon} alt="Danh mục" className="w-6 h-6 mr-3" />
                    <span className="font-medium">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Image Upload/URL */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Hình ảnh đại diện
              </label>
              
              {/* Upload Method Toggle */}
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMethod('upload');
                    setFormData(prev => ({ ...prev, imageUrl: '' }));
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    uploadMethod === 'upload'
                      ? 'bg-tomato text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📤 Upload ảnh mới
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMethod('url');
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    uploadMethod === 'url'
                      ? 'bg-tomato text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔗 Giữ URL hiện tại
                </button>
              </div>

              {/* Upload File */}
              {uploadMethod === 'upload' && (
                <div>
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-tomato transition-colors">
                      <input
                        type="file"
                        id="imageFile"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="imageFile"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-tomato font-medium mb-1">Nhấn để chọn ảnh mới</span>
                        <span className="text-gray-500 text-sm">hoặc kéo thả ảnh vào đây</span>
                        <span className="text-gray-400 text-xs mt-2">PNG, JPG, GIF tối đa 5MB</span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-w-md h-64 object-cover rounded-xl border"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {errors.imageFile && (
                    <p className="text-red-500 text-sm mt-2">{errors.imageFile}</p>
                  )}
                </div>
              )}

              {/* URL Input */}
              {uploadMethod === 'url' && (
                <div>
                  <input
                    type="url"
                    id="imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-tomato focus:border-transparent transition-all ${
                      errors.imageUrl ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.imageUrl && (
                    <p className="text-red-500 text-sm mt-2">{errors.imageUrl}</p>
                  )}
                  {formData.imageUrl && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Xem trước:</p>
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-full max-w-md h-64 object-cover rounded-xl border"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-lg font-semibold text-gray-700 mb-3">
                Nội dung bài viết *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Hãy chia sẻ câu chuyện, kinh nghiệm hoặc công thức của bạn..."
                rows={12}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-tomato focus:border-transparent transition-all resize-none ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-2">{errors.content}</p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                {formData.content.length} ký tự (tối thiểu 50 ký tự)
              </p>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-lg font-semibold text-gray-700 mb-3">
                Thẻ tag (tối đa 10 thẻ)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-tomato text-white"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Nhập tag và nhấn Enter"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tomato focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-6 py-2 bg-tomato text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-tomato text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Cập nhật bài viết</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBlog;
