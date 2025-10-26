import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Card from '../../components/Card';
import CategoryWrapper from './CategoryWrapper';
import { getApiUrl } from '../../config/api.js';

const CategoryPage = () => {
  const { category } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mapping category names to Vietnamese display names
  const categoryNames = {
    tatca: 'Tất Cả',
    monchinh: 'Món Chính',
    monphu: 'Món Phụ', 
    trangmieng: 'Tráng Miệng',
    anvat: 'Món Ăn Vặt',
    douong: 'Đồ Uống'
  };

  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounted
    let fetchInProgress = false; // Prevent multiple simultaneous fetches
    
    const fetchCategoryData = async () => {
      if (!category) {
        return;
      }
      
      if (fetchInProgress) {
        return;
      }
      
      fetchInProgress = true;
      
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      
      try {
        const response = await axios.get(getApiUrl('/api/recipes'), {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!isMounted) return; // Component unmounted, don't update state
        
        // Check if response has the expected structure
        if (response.data && response.data.success && response.data.data) {
          const allRecipes = response.data.data;
          
          const filteredItems = category === 'tatca' 
            ? allRecipes 
            : allRecipes.filter(item => item.category === category);
          
          setItems(filteredItems);
        } else {
          setError('Định dạng dữ liệu không đúng');
        }
      } catch (err) {
        if (!isMounted) return; // Component unmounted, don't update state
        
        if (err.code === 'ECONNREFUSED') {
          setError('Không thể kết nối đến server. Vui lòng kiểm tra server đã chạy chưa.');
        } else if (err.code === 'ENOTFOUND') {
          setError('Không tìm thấy server. Vui lòng kiểm tra địa chỉ server.');
        } else if (err.response) {
          setError(`Lỗi server: ${err.response.status} - ${err.response.statusText}`);
        } else if (err.request) {
          setError('Không nhận được phản hồi từ server. Vui lòng thử lại.');
        } else {
          setError(err.message || 'Lỗi không xác định');
        }
      } finally {
        fetchInProgress = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchCategoryData();
    }, 100);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [category]);


  if (loading) {
    return (
      <div className='px-6 lg:px-12 py-20'>
        <div className='text-center'>
          <div className='text-lg'>Đang tải...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='px-6 lg:px-12 py-20'>
        <div className='text-center text-red-600'>
          <div className='text-lg'>Lỗi: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className='px-6 lg:px-12 py-20'>
      <h1 className='text-center text-3xl py-10 font-semibold text-secondary sm:text-6xl sm:leading-relaxed'>
        {categoryNames[category] || category}
      </h1>
      <CategoryWrapper />
      
      {items.length === 0 ? (
        <div className='text-center mt-20'>
          <div className='text-gray-500 text-lg'>
            Chưa có công thức nào trong danh mục này
          </div>
        </div>
      ) : (
        <ul className='mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'>
          {items.map(item => (
            <Card key={item._id} item={item}/>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CategoryPage;
