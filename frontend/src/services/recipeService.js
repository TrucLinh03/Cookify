import axiosInstance from '../api/axiosConfig.js';

class RecipeService {
  // Get all recipes
  async getAllRecipes(params = {}) {
    const response = await axiosInstance.get('/recipes', { params });
    return response.data;
  }

  // Get recipe by ID
  async getRecipeById(id) {
    const response = await axiosInstance.get(`/recipes/${id}`);
    return response.data;
  }

  // Search recipes
  async searchRecipes(query, filters = {}) {
    const response = await axiosInstance.get('/recipes/search', {
      params: { q: query, ...filters }
    });
    return response.data;
  }

  // Get recipes by category
  async getRecipesByCategory(category) {
    const response = await axiosInstance.get(`/recipes/category/${category}`);
    return response.data;
  }

  // Create recipe (admin)
  async createRecipe(recipeData) {
    const response = await axiosInstance.post('/recipes', recipeData);
    return response.data;
  }

  // Update recipe (admin)
  async updateRecipe(id, recipeData) {
    const response = await axiosInstance.put(`/recipes/${id}`, recipeData);
    return response.data;
  }

  // Delete recipe (admin)
  async deleteRecipe(id) {
    const response = await axiosInstance.delete(`/recipes/${id}`);
    return response.data;
  }
}

export default new RecipeService();
