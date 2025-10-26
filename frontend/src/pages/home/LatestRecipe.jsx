import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import { getApiUrl } from '../../config/api.js';

const LatestRecipe = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lấy danh sách công thức đã xem gần đây từ localStorage
        const getRecentlyViewedRecipes = async () => {
            try {
                setLoading(true);
                
                // Lấy danh sách ID công thức đã xem từ localStorage
                const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewedRecipes') || '[]');
                
                if (recentlyViewed.length === 0) {
                    // Nếu chưa xem công thức nào, hiển thị 4 công thức mới nhất
                    const response = await axios.get(getApiUrl('/api/recipes'));
                    if (response.data.success) {
                        setItems(response.data.data.slice(0, 4));
                    }
                } else {
                    // Lấy chi tiết các công thức đã xem gần đây
                    const recentRecipes = [];
                    for (const recipeId of recentlyViewed.slice(0, 4)) {
                        try {
                            const response = await axios.get(getApiUrl(`/api/recipes/${recipeId}`));
                            if (response.data.success) {
                                recentRecipes.push(response.data.data);
                            }
                        } catch (error) {
                            console.error(`Lỗi khi tải công thức ${recipeId}:`, error);
                        }
                    }
                    setItems(recentRecipes);
                }
            } catch (error) {
                console.error('Lỗi khi tải công thức đã xem:', error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        
        getRecentlyViewedRecipes();
    }, [])

  return (
    <div className='px-5 xl:px-10 py-16'>
        <h2 className='text-3xl mb-8 font-semibold text-secondary sm:text-5xl sm:leading-relaxed'>Công thức mới nhất</h2>

        {/* get all items */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'>
            {
                loading ? (
                    <p className="col-span-full text-center text-gray-500">Đang tải...</p>
                ) : items.length > 0 ? (
                    items.slice(0, 4).map((item, index) => (
                        <Card key={item._id || index} item={item}/>
                    ))
                ) : (
                    <p className="col-span-full text-center text-gray-500">Chưa có công thức nào</p>
                )
            }
        </div>

        <div className='sm:w-64 mx-auto mt-16'>
            <Link
                to="/recipes"
                className="py-4 px-8 hover:bg-btnColor hover:text-white text-secondary w-full transition ease-in duration-200 text-center text-base font-semibold border border-[#9c702a] focus:outline-none rounded-lg inline-block"
            >
                Xem Tất Cả Công Thức
            </Link>
        </div>
    </div>
  )
}

export default LatestRecipe