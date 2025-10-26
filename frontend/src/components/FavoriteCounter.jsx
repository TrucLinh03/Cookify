import React from 'react';
import { useSelector } from 'react-redux';
import { useFavorites } from '../hooks/useFavorites';
import { useFavoritesContext } from '../contexts/FavoritesContext';

const FavoriteCounter = () => {
  const { user } = useSelector((state) => state.auth);
  const { favoriteCount } = useFavorites();

  if (!user || favoriteCount === 0) return null;

  return (
    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
      {favoriteCount}
    </span>
  );
};

export default FavoriteCounter;
