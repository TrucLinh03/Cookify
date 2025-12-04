import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const CreateBlog = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    category: 'recipe_share',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' or 'url'
  
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, imageFile: 'Vui lòng chọn file ảnh' }));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, imageFile: 'Kích thước ảnh không được vượt quá 5MB' }));
        return;
      }
      setImageFile(file);
      setErrors(prev => ({ ...prev, imageFile: '' }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setFormData(prev => ({ ...prev, imageUrl: base64String }));
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
      if (uploadMethod === 'upload') {
        if (!imageUrl) {
          toast.error('Vui lòng chọn ảnh trước khi đăng bài');
          setLoading(false);
          return;
        }
      }

      const response = await axios.post(
        getApiUrl('/api/blog'),
        { ...formData, imageUrl },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Tạo bài viết thành công!');
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || categories[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-50 to-yellow-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Chia sẻ câu chuyện của bạn
          </h1>
          <p className="text-xl text-gray-600">
            Hãy kể cho chúng tôi nghe về những trải nghiệm ẩm thực tuyệt vời của bạn
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
                  Upload ảnh
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
                  Nhập URL
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
                        <span className="text-tomato font-medium mb-1">Nhấn để chọn ảnh</span>
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
                  {formData.imageUrl && isValidUrl(formData.imageUrl) && (
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

            {/* Tags */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Thẻ tag (tối đa 10)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-peachLight text-tomato rounded-full text-sm"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-tomato hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Nhập tag và nhấn Enter"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-l-xl focus:ring-2 focus:ring-tomato focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag(e);
                    }
                  }}
                  disabled={formData.tags.length >= 10}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={formData.tags.length >= 10 || !tagInput.trim()}
                  className="px-6 py-3 bg-tomato text-white rounded-r-xl hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Thêm
                </button>
              </div>
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
                placeholder="Hãy chia sẻ câu chuyện, công thức, hoặc kinh nghiệm nấu ăn của bạn một cách chi tiết và sinh động..."
                rows={15}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-tomato focus:border-transparent transition-all resize-vertical ${
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

            {/* Preview */}
            {formData.title && formData.content && (
              <div className="border-t pt-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  Xem trước bài viết
                </h3>
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <span className="bg-peachLight text-tomato px-3 py-1 rounded-full text-sm inline-flex items-center">
                      <img src={getCategoryInfo(formData.category).icon} alt="Danh mục" className="w-4 h-4 mr-2" /> {getCategoryInfo(formData.category).label}
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800 mb-3">
                    {formData.title}
                  </h4>
                  {formData.imageUrl && isValidUrl(formData.imageUrl) && (
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {formData.content.substring(0, 300)}
                    {formData.content.length > 300 && '...'}
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-tomato text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/blog')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.content.trim() || formData.content.length < 50}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                  loading || !formData.title.trim() || !formData.content.trim() || formData.content.length < 50
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-tomato text-white hover:bg-red-600 transform hover:scale-105'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang đăng...
                  </div>
                ) : (
                  'Đăng bài viết'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBlog;
