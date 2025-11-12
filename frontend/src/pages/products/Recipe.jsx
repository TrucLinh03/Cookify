import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { IoSearchOutline } from "react-icons/io5";
import Card from '../../components/Card';
import { getApiUrl } from '../../config/api.js';

const Recipe = () => {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('tatca');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12); // 12 items per page

    useEffect(() => {
        const fetchData = async () => {
          try {
            setLoading(true);
            const response = await axios.get(getApiUrl('/api/recipes'));
            
            if (response.data.success) {
              setItems(response.data.data);
              setFilteredItems(response.data.data);
            } else {
              console.error('API Error:', response.data.message);
              setItems([]);
              setFilteredItems([]);
            }
          } catch (err) {
            console.error('Lỗi khi tải công thức:', err);
            setItems([]);
            setFilteredItems([]);
          } finally {
            setLoading(false);
          }
        };
    
        fetchData();
      }, []);

      // Filter functionality (search + category)
      useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
          let filtered = items;

          // Filter by category first
          if (selectedCategory !== 'tatca') {
            filtered = filtered.filter(item => item.category === selectedCategory);
          }

          // Then filter by search query if exists
          if (searchQuery.trim()) {
            const searchIngredients = parseSearchQuery(searchQuery);
            
            if (searchIngredients.length > 1) {
              // Multiple ingredients search - calculate match count
              filtered = filtered.map(item => {
                const recipeIngredients = item.ingredients || [];
                const matchCount = searchIngredients.filter(searchIng => 
                  recipeIngredients.some(recipeIng => 
                    recipeIng.toLowerCase().includes(searchIng.toLowerCase())
                  ) ||
                  item.name?.toLowerCase().includes(searchIng.toLowerCase()) ||
                  item.description?.toLowerCase().includes(searchIng.toLowerCase())
                ).length;
                
                return { 
                  ...item, 
                  matchCount,
                  totalSearchIngredients: searchIngredients.length
                };
              })
              .filter(item => item.matchCount > 0) // Only show items with at least 1 match
              .sort((a, b) => b.matchCount - a.matchCount); // Sort by match count descending
            } else {
              // Single search term
              const searchTerm = searchQuery.toLowerCase();
              filtered = filtered.filter(item => {
                // Tìm kiếm theo tên món ăn
                const nameMatch = item.name?.toLowerCase().includes(searchTerm);
                
                // Tìm kiếm theo mô tả
                const descriptionMatch = item.description?.toLowerCase().includes(searchTerm);
                
                // Tìm kiếm theo nguyên liệu
                const ingredientMatch = item.ingredients?.some(ingredient => 
                  ingredient.toLowerCase().includes(searchTerm)
                );
                
                return nameMatch || descriptionMatch || ingredientMatch;
              }).map(item => {
                // Remove match count properties for single search
                const { matchCount, totalSearchIngredients, ...cleanItem } = item;
                return cleanItem;
              });
            }
          } else {
            // No search query - remove match count properties
            filtered = filtered.map(item => {
              const { matchCount, totalSearchIngredients, ...cleanItem } = item;
              return cleanItem;
            });
          }
          
          setFilteredItems(filtered);
          setCurrentPage(1); // Reset to first page when filters change
          setIsSearching(false);
        }, 300); // Debounce 300ms

        return () => clearTimeout(timer);
      }, [searchQuery, selectedCategory, items]);

      // Handle search input
      const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
      };

      // Clear search
      const clearSearch = () => {
        setSearchQuery('');
      };

      // Parse search query to extract multiple ingredients
      const parseSearchQuery = (searchQuery) => {
        // Split by comma and clean up each ingredient
        const ingredients = searchQuery
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
        
        return ingredients;
      };

      // Categories data
      const categories = [
        { name: 'tatca', displayName: 'Tất Cả', backgroundColor: '#f3f4f6', color: '#374151' },
        { name: 'monchinh', displayName: 'Món Chính', backgroundColor: '#dbeafe', color: '#1d4ed8' },
        { name: 'monphu', displayName: 'Món Phụ', backgroundColor: '#e8f5fa', color: '#397a9e' },
        { name: 'trangmieng', displayName: 'Tráng Miệng', backgroundColor: '#efedfa', color: '#3c3a8f' },
        { name: 'anvat', displayName: 'Món Ăn Vặt', backgroundColor: '#fef3c7', color: '#d97706' },
        { name: 'douong', displayName: 'Đồ Uống', backgroundColor: '#dcfce7', color: '#16a34a' }
      ];

      // Handle category selection
      const handleCategorySelect = (category) => {
        setSelectedCategory(category);
      };

      // Pagination logic
      const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentItems = filteredItems.slice(startIndex, endIndex);

      // Handle page change
      const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      // Generate page numbers for pagination
      const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
          for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
          }
        } else {
          if (currentPage <= 3) {
            for (let i = 1; i <= 4; i++) {
              pageNumbers.push(i);
            }
            pageNumbers.push('...');
            pageNumbers.push(totalPages);
          } else if (currentPage >= totalPages - 2) {
            pageNumbers.push(1);
            pageNumbers.push('...');
            for (let i = totalPages - 3; i <= totalPages; i++) {
              pageNumbers.push(i);
            }
          } else {
            pageNumbers.push(1);
            pageNumbers.push('...');
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
              pageNumbers.push(i);
            }
            pageNumbers.push('...');
            pageNumbers.push(totalPages);
          }
        }
        
        return pageNumbers;
      };

      // Category filter component
      const CategoryFilter = () => {

        return (
          <div className="flex flex-wrap items-center justify-center gap-6">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategorySelect(category.name)}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 ${
                  selectedCategory === category.name 
                    ? 'ring-2 ring-offset-2 ring-orange-400 transform scale-105' 
                    : ''
                }`}
                style={{
                  backgroundColor: category.backgroundColor,
                  color: category.color,
                }}
              >
                <span className="text-lg">{category.displayName}</span>
              </button>
            ))}
          </div>
        );
      };

      // Pagination component
      const PaginationComponent = () => {
        if (totalPages <= 1) return null;

        const pageNumbers = getPageNumbers();

        return (
          <div className="flex justify-center items-center space-x-2 mt-12 mb-8">
            {/* Previous button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-200'
              }`}
            >
              ‹ Trước
            </button>

            {/* Page numbers */}
            {pageNumbers.map((pageNumber, index) => (
              <button
                key={index}
                onClick={() => typeof pageNumber === 'number' ? handlePageChange(pageNumber) : null}
                disabled={pageNumber === '...'}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  pageNumber === currentPage
                    ? 'bg-orange-500 text-white shadow-lg transform scale-105'
                    : pageNumber === '...'
                    ? 'text-gray-400 cursor-default'
                    : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-200'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            {/* Next button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-200'
              }`}
            >
              Sau ›
            </button>
          </div>
        );
      };

  return (
    <div className='px-6 lg:px-12 py-20'>
      <h1 className='text-center text-3xl py-10 font-semibold text-secondary sm:text-6xl sm:leading-relaxed'>
        Tất cả công thức nấu ăn
      </h1>
      
      {/* Thanh tìm kiếm */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <IoSearchOutline className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl text-gray-800 placeholder-gray-500 transition-all duration-200 text-base bg-white shadow-sm"
            placeholder="Tìm kiếm công thức theo tên, nguyên liệu (cách nhau bằng dấu phẩy), danh mục..."
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              title="Xóa tìm kiếm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Gợi ý tìm kiếm */}
        {!searchQuery && (
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-400">
              💡 Mẹo: Tìm kiếm nhiều nguyên liệu cùng lúc bằng cách cách nhau bằng dấu phẩy (VD: "thịt bò, hành tây, cà chua")
            </p>
          </div>
        )}
        
        {/* Hiển thị trạng thái tìm kiếm */}
        {(searchQuery || selectedCategory !== 'tatca') && (
          <div className="mt-3 text-center">
            {isSearching ? (
              <p className="text-sm text-orange-500 animate-pulse">Đang lọc kết quả...</p>
            ) : (
              <div className="text-sm text-gray-600">
                {searchQuery && selectedCategory !== 'tatca' ? (
                  <div>
                    <p>
                      Tìm thấy <span className="font-semibold text-orange-600">{filteredItems.length}</span> kết quả cho "{searchQuery}" 
                      trong danh mục <span className="font-semibold text-blue-600">
                        {categories.find(cat => cat.name === selectedCategory)?.displayName}
                      </span>
                      {totalPages > 1 && (
                        <span className="text-gray-500 ml-2">
                          (Trang {currentPage}/{totalPages})
                        </span>
                      )}
                    </p>
                    {parseSearchQuery(searchQuery).length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Kết quả được sắp xếp theo độ phù hợp với các nguyên liệu: {parseSearchQuery(searchQuery).join(', ')}
                      </p>
                    )}
                  </div>
                ) : searchQuery ? (
                  <div>
                    <p>
                      Tìm thấy <span className="font-semibold text-orange-600">{filteredItems.length}</span> kết quả cho "{searchQuery}"
                      {totalPages > 1 && (
                        <span className="text-gray-500 ml-2">
                          (Trang {currentPage}/{totalPages})
                        </span>
                      )}
                    </p>
                    {parseSearchQuery(searchQuery).length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Kết quả được sắp xếp theo độ phù hợp với các nguyên liệu: {parseSearchQuery(searchQuery).join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>
                    Hiển thị <span className="font-semibold text-orange-600">{filteredItems.length}</span> công thức trong danh mục 
                    <span className="font-semibold text-blue-600 ml-1">
                      {categories.find(cat => cat.name === selectedCategory)?.displayName}
                    </span>
                    {totalPages > 1 && (
                      <span className="text-gray-500 ml-2">
                        (Trang {currentPage}/{totalPages})
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <CategoryFilter />
      
      {loading ? (
        <div className="text-center mt-20">
          <p className="text-gray-500 text-lg">Đang tải công thức...</p>
        </div>
      ) : (
        <ul className='mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'>
          {filteredItems.length > 0 ? (
            currentItems.map(item => (
              <Card key={item._id} item={item}/>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              {searchQuery || selectedCategory !== 'tatca' ? (
                <div>
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Không tìm thấy công thức nào
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery && selectedCategory !== 'tatca' ? (
                      <>Không có công thức nào phù hợp với từ khóa "{searchQuery}" trong danh mục {categories.find(cat => cat.name === selectedCategory)?.displayName}</>
                    ) : searchQuery ? (
                      <>Không có công thức nào phù hợp với từ khóa "{searchQuery}"</>
                    ) : (
                      <>Không có công thức nào trong danh mục {categories.find(cat => cat.name === selectedCategory)?.displayName}</>
                    )}
                  </p>
                  <div className="flex gap-2 justify-center">
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="px-4 py-2 bg-tomato text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Xóa tìm kiếm
                      </button>
                    )}
                    {selectedCategory !== 'tatca' && (
                      <button
                        onClick={() => handleCategorySelect('tatca')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Xem tất cả
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-500 text-lg">Chưa có công thức nào</p>
                </div>
              )}
            </div>
          )}
        </ul>
      )}
      
      {/* Pagination */}
      <PaginationComponent />
    </div>
  )
}

export default Recipe