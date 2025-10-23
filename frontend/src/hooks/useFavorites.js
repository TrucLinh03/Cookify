import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { useFavoritesContext } from '../contexts/FavoritesContext';

export const useFavorites = () => {
  const { user } = useSelector((state) => state.auth);
  const { favoriteUpdates } = useFavoritesContext();
  const [favorites, setFavorites] = useState([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/users/favourites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setFavorites(response.data.favourites);
        setFavoriteCount(response.data.favourites.length);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      // Fallback to localStorage
      const localFavorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
      setFavoriteCount(localFavorites.length);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addToFavorites = useCallback(async (recipeId) => {
    if (!user) return false;

    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await axios.post(`http://localhost:5000/api/users/favourites/${recipeId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setFavoriteCount(prev => prev + 1);
        // Update localStorage as backup
        const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
        const updatedFavorites = [...favorites, recipeId];
        localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
        return true;
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
    return false;
  }, [user]);

  const removeFromFavorites = useCallback(async (recipeId) => {
    if (!user) return false;

    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await axios.delete(`http://localhost:5000/api/users/favourites/${recipeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setFavoriteCount(prev => Math.max(0, prev - 1));
        // Update localStorage as backup
        const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
        const updatedFavorites = favorites.filter(id => id !== recipeId);
        localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updatedFavorites));
        return true;
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
    return false;
  }, [user]);

  const checkIsFavorited = useCallback(async (recipeId) => {
    if (!user || !recipeId) return false;

    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await axios.get(`http://localhost:5000/api/favourites/check/${recipeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        return response.data.isFavorited;
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
      // Fallback to localStorage
      const favorites = JSON.parse(localStorage.getItem(`favorites_${user._id}`) || '[]');
      return favorites.includes(recipeId);
    }
    return false;
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites, favoriteUpdates]);

  return {
    favorites,
    favoriteCount,
    isLoading,
    fetchFavorites,
    addToFavorites,
    removeFromFavorites,
    checkIsFavorited
  };
};

export default useFavorites;
