import axiosInstance from '../api/axiosConfig.js';

class FavoritesService {
  // Get all user favorites
  async getUserFavorites() {
    const response = await axiosInstance.get('/users/favourites');
    return response.data;
  }

  // Add recipe to favorites
  async addToFavorites(recipeId) {
    const response = await axiosInstance.post(`/users/favourites/${recipeId}`, {});
    return response.data;
  }

  // Remove recipe from favorites
  async removeFromFavorites(recipeId) {
    const response = await axiosInstance.delete(`/users/favourites/${recipeId}`);
    return response.data;
  }

  // Check if recipe is in favorites
  async checkIsFavorite(recipeId) {
    const response = await axiosInstance.get(`/favourites/check/${recipeId}`);
    return response.data;
  }
}

export default new FavoritesService();
