import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import DatePicker from '../../components/common/DatePicker';
import Select from '../../components/common/Select';
import SecureStorage from '../../utils/secureStorage';
import BowlFoodIcon from '../../assets/bowl-food.svg';
import CarrotIcon from '../../assets/carrot.svg';
import CakeIcon from '../../assets/cake.svg';
import CookieIcon from '../../assets/cookie.svg';
import CoffeeIcon from '../../assets/coffee.svg';
import ChefHatIcon from '../../assets/chef-hat.svg';
import { getApiUrl } from '../../config/api.js';

const ITEMS_PER_PAGE = 10;

const ManageRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    imageUrl: '',
    video: '',
    category: '',
    difficulty: '',
    cookingTime: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + ITEMS_PER_PAGE);


  // Get category counts
  const getCategoryCounts = () => {
    const counts = {
      all: recipes.length,
      monchinh: recipes.filter(recipe => recipe.category === 'monchinh').length,
      monphu: recipes.filter(recipe => recipe.category === 'monphu').length,
      trangmieng: recipes.filter(recipe => recipe.category === 'trangmieng').length,
      anvat: recipes.filter(recipe => recipe.category === 'anvat').length,
      douong: recipes.filter(recipe => recipe.category === 'douong').length
    };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
    return counts;
  };

  // Handle refresh
  const handleRefresh = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    fetchRecipes();
  };

  // Lấy danh sách công thức
  useEffect(() => {
    fetchRecipes();
  }, []);
  // Filter recipes based on search term, category and date
  useEffect(() => {
    let filtered = recipes;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.ingredients && recipe.ingredients.some(ing => 
          ing.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(recipe => {
        const recipeDate = new Date(recipe.createdAt);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (recipeDate < start) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recipeDate > end) return false;
        }
        
        return true;
      });
    }
    
    setFilteredRecipes(filtered);
  }, [recipes, searchTerm, selectedCategory, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, startDate, endDate]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredRecipes, currentPage]);

  const fetchRecipes = async () => {
    try {
      const res = await axios.get(getApiUrl('/api/recipes'));
      if (res.data.success && res.data.data) {
        setRecipes(res.data.data);
      } else {
        setRecipes([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách công thức:', error);
      setRecipes([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle image file upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh!');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 2MB!');
      return;
    }

    setIsUploadingImage(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData(prev => ({ ...prev, imageUrl: base64String }));
      setImagePreview(base64String);
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      toast.error('Có lỗi khi đọc file ảnh!');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
  };

  // Xử lý thay đổi ingredients
  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  // Thêm ingredient mới
  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  // Xóa ingredient
  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    }
  };

  // Xử lý thay đổi instructions
  const handleInstructionChange = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData(prev => ({ ...prev, instructions: newInstructions }));
  };

  // Thêm instruction mới
  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  // Xóa instruction
  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      const newInstructions = formData.instructions.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, instructions: newInstructions }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate ingredients
    const validIngredients = formData.ingredients.filter(ing => ing.trim());
    
    if (validIngredients.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một nguyên liệu!');
      return;
    }
    
    // Validate instructions
    const validInstructions = formData.instructions.filter(inst => inst.trim());
    
    if (validInstructions.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một bước hướng dẫn!');
      return;
    }
    
    // Chuẩn bị dữ liệu - Join instructions thành string với số thứ tự
    const instructionsText = validInstructions.map((step, index) => `Bước ${index + 1}: ${step}`).join('\n\n');
    
    const submitData = {
      name: formData.name,
      description: formData.description,
      instructions: instructionsText,
      imageUrl: formData.imageUrl,
      video: formData.video,
      category: formData.category,
      difficulty: formData.difficulty,
      cookingTime: formData.cookingTime,
      ingredients: validIngredients
    };
    
    try {
      const token = SecureStorage.getToken();
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (editingRecipe) {
        // Cập nhật công thức
        const response = await axios.put(getApiUrl(`/api/recipes/${editingRecipe._id}`), submitData, config);
        if (response.data.success) {
          toast.success('Cập nhật công thức thành công!');
        } else {
          toast.error(response.data.message || 'Có lỗi xảy ra khi cập nhật');
        }
      } else {
        // Thêm công thức mới
        const response = await axios.post(getApiUrl('/api/recipes'), submitData, config);
        if (response.data.success) {
          toast.success('Thêm công thức thành công!');
        } else {
          toast.error(response.data.message || 'Có lỗi xảy ra khi thêm công thức');
        }
      }
      fetchRecipes(); // load lại danh sách
      handleCloseForm(); // đóng pop-up và reset
    } catch (err) {
      console.error("Lỗi xử lý công thức:", err.response?.data || err.message);
      if (err.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setTimeout(() => window.location.href = '/login', 2000);
      } else {
        toast.error(err.response?.data?.message || 'Không thể xử lý công thức. Vui lòng thử lại.');
      }
    }
  };

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    
    // Parse instructions từ string thành array
    let instructionsArray = [''];
    if (recipe.instructions) {
      // Tách theo "Bước X:" hoặc newline
      const steps = recipe.instructions
        .split(/Bước \d+:|\n\n/)
        .map(step => step.trim())
        .filter(step => step.length > 0);
      instructionsArray = steps.length > 0 ? steps : [''];
    }
    
    setFormData({
      name: recipe.name || '',
      description: recipe.description || '',
      ingredients: recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients : [''],
      instructions: instructionsArray,
      imageUrl: recipe.imageUrl || '',
      video: recipe.video || '',
      category: recipe.category || '',
      difficulty: recipe.difficulty || '',
      cookingTime: recipe.cookingTime || ''
    });
    // Set image preview if editing
    setImagePreview(recipe.imageUrl || '');
    setShowForm(true);
  };

  const handleDelete = async (recipeId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công thức này?')) {
      try {
        const token = SecureStorage.getToken();
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const response = await axios.delete(getApiUrl(`/api/recipes/${recipeId}`), config);
        if (response.data.success) {
          toast.success('Xóa công thức thành công!');
          fetchRecipes();
        } else {
          toast.error(response.data.message || 'Có lỗi xảy ra khi xóa');
        }
      } catch (err) {
        console.error("Lỗi xóa công thức:", err.response?.data || err.message);
        if (err.response?.status === 401) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          setTimeout(() => window.location.href = '/login', 2000);
        } else {
          toast.error(err.response?.data?.message || 'Không thể xóa công thức.');
        }
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
    setFormData({
      name: '',
      description: '',
      ingredients: [''],
      instructions: [''],
      imageUrl: '',
      video: '',
      category: '',
      difficulty: '',
      cookingTime: ''
    });
    setImagePreview('');
    setIsUploadingImage(false);
  };

  // Badge hiển thị loại món - màu pastel nhẹ nhàng
  const categoryBadge = (cat) => {
    const map = {
      monchinh: { label: 'Món Chính', color: 'bg-green-100 text-green-700', icon: BowlFoodIcon },
      monphu: { label: 'Món Phụ', color: 'bg-blue-100 text-blue-700', icon: CarrotIcon },
      trangmieng: { label: 'Tráng Miệng', color: 'bg-purple-100 text-purple-700', icon: CakeIcon },
      anvat: { label: 'Món Ăn Vặt', color: 'bg-pink-100 text-pink-700', icon: CookieIcon },
      douong: { label: 'Đồ Uống', color: 'bg-cyan-100 text-cyan-700', icon: CoffeeIcon }
    };
    const c = map[cat] || { label: 'Khác', color: 'bg-gray-100 text-gray-700', icon: ChefHatIcon };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${c.color}`}>
        <img src={c.icon} alt="Loại" className="w-4 h-4 mr-1" /> {c.label}
      </span>
    );
  };

  // Badge hiển thị độ khó - màu nhẹ
  const difficultyBadge = (diff) => {
    const map = {
      easy: { label: 'Dễ', color: 'bg-green-50 text-green-600 border border-green-200' },
      medium: { label: 'Trung bình', color: 'bg-yellow-50 text-yellow-600 border border-yellow-200' },
      hard: { label: 'Khó', color: 'bg-red-50 text-red-600 border border-red-200' }
    };
    const d = map[diff] || { label: 'N/A', color: 'bg-gray-50 text-gray-600 border border-gray-200' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.color}`}>
        {d.label}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Quản lý công thức 
              </h1>
              <p className="text-gray-600">Xem và quản lý công thức nấu ăn</p>
            </div>
            <button
              onClick={() => {
                setEditingRecipe(null);
                setShowForm(true);
              }}
              className="bg-tomato hover:bg-red-600 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Thêm công thức
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTER SECTION */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm công thức theo tên, mô tả hoặc nguyên liệu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
                <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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
              
              <button
                onClick={handleRefresh}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-3">
            {(() => {
              const counts = getCategoryCounts();
              return (
                <>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === 'all'
                        ? 'bg-gray-800 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tất cả
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedCategory === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {counts.all}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedCategory('monchinh')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === 'monchinh'
                        ? 'text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === 'monchinh' ? '#1d4ed8' : '#dbeafe',
                      color: selectedCategory === 'monchinh' ? '#ffffff' : '#1d4ed8'
                    }}
                  >
                    Món Chính
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedCategory === 'monchinh' ? 'bg-blue-700 text-white' : 'bg-blue-200 text-blue-600'
                    }`}>
                      {counts.monchinh}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedCategory('monphu')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === 'monphu'
                        ? 'text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === 'monphu' ? '#397a9e' : '#e8f5fa',
                      color: selectedCategory === 'monphu' ? '#ffffff' : '#397a9e'
                    }}
                  >
                    Món Phụ
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedCategory === 'monphu' ? 'bg-teal-700 text-white' : 'bg-teal-200 text-teal-600'
                    }`}>
                      {counts.monphu}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedCategory('trangmieng')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === 'trangmieng'
                        ? 'text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === 'trangmieng' ? '#3c3a8f' : '#efedfa',
                      color: selectedCategory === 'trangmieng' ? '#ffffff' : '#3c3a8f'
                    }}
                  >
                    Tráng Miệng
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedCategory === 'trangmieng' ? 'bg-purple-700 text-white' : 'bg-purple-200 text-purple-600'
                    }`}>
                      {counts.trangmieng}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedCategory('anvat')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === 'anvat'
                        ? 'text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === 'anvat' ? '#c2410c' : '#fed7aa',
                      color: selectedCategory === 'anvat' ? '#ffffff' : '#c2410c'
                    }}
                  >
                    Món Ăn Vặt
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedCategory === 'anvat' ? 'bg-orange-700 text-white' : 'bg-orange-200 text-orange-600'
                    }`}>
                      {counts.anvat}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedCategory('douong')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === 'douong'
                        ? 'text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === 'douong' ? '#16a34a' : '#dcfce7',
                      color: selectedCategory === 'douong' ? '#ffffff' : '#16a34a'
                    }}
                  >
                    Đồ Uống
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedCategory === 'douong' ? 'bg-green-700 text-white' : 'bg-green-200 text-green-600'
                    }`}>
                      {counts.douong}
                    </span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        {/* FORM POPUP */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center w-full">
                {editingRecipe ? 'Sửa công thức' : 'Thêm công thức mới'}
              </h2>
                <button
                  className="text-red-600 hover:text-red-800 text-4xl font-bold"
                  onClick={handleCloseForm}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên món ăn</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nhập tên món ăn"
                    required
                    className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Loại món"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Chọn loại món' },
                      { value: 'monchinh', label: 'Món Chính' },
                      { value: 'monphu', label: 'Món Phụ' },
                      { value: 'trangmieng', label: 'Tráng Miệng' },
                      { value: 'anvat', label: 'Món Ăn Vặt' },
                      { value: 'douong', label: 'Đồ Uống' }
                    ]}
                    required
                  />

                  <Select
                    label="Độ khó"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Chọn độ khó' },
                      { value: 'easy', label: 'Dễ' },
                      { value: 'medium', label: 'Trung bình' },
                      { value: 'hard', label: 'Khó' }
                    ]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian nấu</label>
                  <input
                    type="text"
                    name="cookingTime"
                    value={formData.cookingTime}
                    onChange={handleChange}
                    placeholder="30 phút hoặc 1.5 giờ"
                    required
                    className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition"
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh món ăn *</label>
                  
                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                          title="Xóa ảnh"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => document.getElementById('imageUpload').click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Thay đổi ảnh
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                      <input
                        id="imageUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="imageUpload"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-gray-600 mt-2">Đang tải ảnh...</p>
                          </div>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div className="text-sm text-gray-600">
                              <span className="font-semibold text-blue-600 hover:text-blue-700">Nhấn để chọn ảnh</span>
                              <span> hoặc kéo thả ảnh vào đây</span>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF tối đa 2MB</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                  <input type="hidden" name="imageUrl" value={formData.imageUrl} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Video hướng dẫn</label>
                  <input
                    type="text"
                    name="video"
                    value={formData.video}
                    onChange={handleChange}
                    placeholder="URL video YouTube hoặc link .mp4"
                    className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Mô tả ngắn về món ăn"
                    required
                    rows={2}
                    className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition resize-none"
                  />
                </div>
                {/* Nguyên liệu - Form mới */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Nguyên liệu</label>
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      + Thêm nguyên liệu
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {formData.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Ví dụ: 500g thịt bò, 2 củ hành tây..."
                          value={ingredient}
                          onChange={(e) => handleIngredientChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800 font-bold text-lg"
                          disabled={formData.ingredients.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Hướng dẫn nấu - Form mới với nút thêm bước */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Hướng dẫn nấu</label>
                    <button
                      type="button"
                      onClick={addInstruction}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      + Thêm bước
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {formData.instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-sm mt-2">
                          {index + 1}
                        </div>
                        <textarea
                          placeholder={`Ví dụ: Rửa sạch thịt bò, cắt miếng vừa ăn...`}
                          value={instruction}
                          onChange={(e) => handleInstructionChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                          rows={3}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800 font-bold text-lg flex-shrink-0"
                          disabled={formData.instructions.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingRecipe ? 'Cập nhật công thức' : 'Thêm công thức'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BẢNG DANH SÁCH CÔNG THỨC */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ảnh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên món</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nguyên liệu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Độ khó</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">Không tìm thấy công thức nào</p>
                      <p className="text-sm">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecipes.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/48x48?text=No+Img';
                    }}
                  />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600 max-w-xs">
                      {item.ingredients && item.ingredients.length > 0 ? (
                        <div className="space-y-1">
                          {item.ingredients.slice(0, 3).map((ing, index) => (
                            <div key={index} className="text-sm">
                              • {ing}
                            </div>
                          ))}
                          {item.ingredients.length > 3 && (
                            <div className="text-gray-400 italic">
                              +{item.ingredients.length - 3} nguyên liệu khác
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Chưa có nguyên liệu</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{categoryBadge(item.category)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{difficultyBadge(item.difficulty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {item.cookingTime || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-900 mr-3 font-medium"
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleDelete(item._id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
                ))
              )}  
            </tbody>
          </table>
        </div>
        {filteredRecipes.length > ITEMS_PER_PAGE && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Trước
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
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
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Trước
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </AdminLayout>
  );
};


export default ManageRecipes;
