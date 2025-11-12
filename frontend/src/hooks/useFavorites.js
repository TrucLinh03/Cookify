import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFavoritesContext } from '../contexts/FavoritesContext';
import favoritesService from '../services/favoritesService.js';
import SecureStorage from '../utils/secureStorage';

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

    const token = SecureStorage.getToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await favoritesService.getUserFavorites();
      
      if (response.success) {
        setFavorites(response.favourites);
        setFavoriteCount(response.favourites.length);
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

    const token = SecureStorage.getToken();
    if (!token) return false;

    try {
      const response = await favoritesService.addToFavorites(recipeId);
      
      if (response.success) {
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

    const token = SecureStorage.getToken();
    if (!token) return false;

    try {
      const response = await favoritesService.removeFromFavorites(recipeId);
      
      if (response.success) {
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

    const token = SecureStorage.getToken();
    if (!token) return false;

    try {
      const response = await favoritesService.checkIsFavorite(recipeId);
      
      if (response.success) {
        return response.isFavorited;
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
