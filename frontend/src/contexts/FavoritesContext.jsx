import React, { createContext, useContext, useState, useCallback } from 'react';

const FavoritesContext = createContext();

export const useFavoritesContext = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favoriteUpdates, setFavoriteUpdates] = useState(0);

  const triggerFavoriteUpdate = useCallback(() => {
    setFavoriteUpdates(prev => prev + 1);
  }, []);

  const value = {
    favoriteUpdates,
    triggerFavoriteUpdate
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesContext;
