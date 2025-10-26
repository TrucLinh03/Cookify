import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/layout/AdminLayout';
import BowlFoodIcon from '../../assets/bowl-food.svg';
import CarrotIcon from '../../assets/carrot.svg';
import CakeIcon from '../../assets/cake.svg';
import CookieIcon from '../../assets/cookie.svg';
import CoffeeIcon from '../../assets/coffee.svg';
import ChefHatIcon from '../../assets/chef-hat.svg';
import { getApiUrl } from '../../config/api.js';

const ManageRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [''],
    instructions: '',
    imageUrl: '',
    video: '',
    category: '',
    difficulty: '',
    cookingTime: ''
  });


  // Lấy danh sách công thức
  useEffect(() => {
    fetchRecipes();
  }, []);
  // Filter recipes based on search term and category
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
    
    setFilteredRecipes(filtered);
  }, [recipes, searchTerm, selectedCategory]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate ingredients
    const validIngredients = formData.ingredients.filter(ing => ing.trim());
    
    if (validIngredients.length === 0) {
      alert('Vui lòng thêm ít nhất một nguyên liệu!');
      return;
    }
    
    // Chuẩn bị dữ liệu
    const submitData = {
      name: formData.name,
      description: formData.description,
      instructions: formData.instructions,
      imageUrl: formData.imageUrl,
      video: formData.video,
      category: formData.category,
      difficulty: formData.difficulty,
      cookingTime: formData.cookingTime,
      ingredients: validIngredients
    };
    
    try {
      const token = localStorage.getItem('token');
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
          alert("Cập nhật công thức thành công!");
        } else {
          alert(response.data.message || "Có lỗi xảy ra khi cập nhật");
        }
      } else {
        // Thêm công thức mới
        const response = await axios.post(getApiUrl('/api/recipes'), submitData, config);
        if (response.data.success) {
          alert("Thêm công thức thành công!");
        } else {
          alert(response.data.message || "Có lỗi xảy ra khi thêm công thức");
        }
      }
      fetchRecipes(); // load lại danh sách
      handleCloseForm(); // đóng pop-up và reset
    } catch (err) {
      console.error("Lỗi xử lý công thức:", err.response?.data || err.message);
      if (err.response?.status === 401) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        alert(err.response?.data?.message || "Không thể xử lý công thức. Kiểm tra console để biết chi tiết.");
      }
    }
  };

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    
    setFormData({
      name: recipe.name || '',
      description: recipe.description || '',
      ingredients: recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients : [''],
      instructions: recipe.instructions || '',
      imageUrl: recipe.imageUrl || '',
      video: recipe.video || '',
      category: recipe.category || '',
      difficulty: recipe.difficulty || '',
      cookingTime: recipe.cookingTime || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (recipeId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công thức này?')) {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const response = await axios.delete(getApiUrl(`/api/recipes/${recipeId}`), config);
        if (response.data.success) {
          alert("Xóa công thức thành công!");
          fetchRecipes();
        } else {
          alert(response.data.message || "Có lỗi xảy ra khi xóa");
        }
      } catch (err) {
        console.error("Lỗi xóa công thức:", err.response?.data || err.message);
        if (err.response?.status === 401) {
          alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          alert(err.response?.data?.message || "Không thể xóa công thức.");
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
      instructions: '',
      imageUrl: '',
      video: '',
      category: '',
      difficulty: '',
      cookingTime: ''
    });
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý công thức ({filteredRecipes.length})
          </h1>
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Thêm công thức
          </button>
        </div>

        {/* SEARCH AND FILTER SECTION */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
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
          </div>
          
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === 'all' ? '#374151' : '#f3f4f6',
                color: selectedCategory === 'all' ? '#ffffff' : '#374151'
              }}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedCategory('monchinh')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === 'monchinh' ? '#1d4ed8' : '#dbeafe',
                color: selectedCategory === 'monchinh' ? '#ffffff' : '#1d4ed8'
              }}
            >
              Món Chính
            </button>
            <button
              onClick={() => setSelectedCategory('monphu')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === 'monphu' ? '#397a9e' : '#e8f5fa',
                color: selectedCategory === 'monphu' ? '#ffffff' : '#397a9e'
              }}
            >
              Món Phụ
            </button>
            <button
              onClick={() => setSelectedCategory('trangmieng')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === 'trangmieng' ? '#3c3a8f' : '#efedfa',
                color: selectedCategory === 'trangmieng' ? '#ffffff' : '#3c3a8f'
              }}
            >
              Tráng Miệng
            </button>
            <button
              onClick={() => setSelectedCategory('anvat')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === 'anvat' ? '#d97706' : '#fef3c7',
                color: selectedCategory === 'anvat' ? '#ffffff' : '#d97706'
              }}
            >
              Món Ăn Vặt
            </button>
            <button
              onClick={() => setSelectedCategory('douong')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === 'douong' ? '#16a34a' : '#dcfce7',
                color: selectedCategory === 'douong' ? '#ffffff' : '#16a34a'
              }}
            >
              Đồ Uống
            </button>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại món</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition"
                    >
                    <option value="">Chọn loại món</option>
                    <option value="monchinh">Món Chính</option>
                    <option value="monphu">Món Phụ</option>
                    <option value="trangmieng">Tráng Miệng</option>
                    <option value="anvat">Món Ăn Vặt</option>
                    <option value="douong">Đồ Uống</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition"
                    >
                      <option value="">Chọn độ khó</option>
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh</label>
                    <input
                      type="text"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleChange}
                      placeholder="URL hình ảnh"
                      required
                      className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition"
                    />
                  </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn nấu</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleChange}
                    placeholder="Các bước thực hiện chi tiết"
                    required
                    rows={4}
                    className="w-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3 rounded-lg outline-none transition resize-none"
                  />
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
                  <td colSpan="8" className="px-6 py-12 text-center">
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
                filteredRecipes.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
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
      </div>
      </div>
    </AdminLayout>
  );
};


export default ManageRecipes;
