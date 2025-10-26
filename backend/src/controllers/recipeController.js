const Recipe = require("../model/recipeModel.js");

// Lấy tất cả công thức với tìm kiếm
const getRecipes = async (req, res) => {
  try {
    const { q, search, ingredients } = req.query;
    const searchQuery = q || search;
    
    let recipes;
    
    if (searchQuery && searchQuery.trim()) {
      // Check if searching for multiple ingredients (comma-separated)
      if (ingredients) {
        // Parse multiple ingredients
        const ingredientList = ingredients.split(',').map(item => item.trim()).filter(item => item.length > 0);
        
        
        if (ingredientList.length >= 1) {
          
          // Search ONLY in ingredients array for each ingredient
          const ingredientConditions = [];
          
          ingredientList.forEach(ing => {
            // Escape special regex characters and trim
            const escapedIng = ing.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Create regex pattern
            ingredientConditions.push({
              'ingredients': { 
                $regex: escapedIng, 
                $options: 'i' 
              }
            });
          });
                    
          // Get ALL recipes that match ANY ingredient
          recipes = await Recipe.find({
            $or: ingredientConditions
          });
                    
          // Calculate match count for each recipe
          recipes = recipes.map(recipe => {
            const recipeIngredients = recipe.ingredients || [];
            
            // Count how many search ingredients are found in this recipe
            const matchCount = ingredientList.filter(searchIng => {
              const searchLower = searchIng.toLowerCase().trim();
              return recipeIngredients.some(recipeIng => {
                const recipeLower = recipeIng.toLowerCase();
                return recipeLower.includes(searchLower);
              });
            }).length;
            
            return {
              ...recipe.toObject(),
              matchCount
            };
          });
          
          // Sort by match count (highest first), then by createdAt
          recipes.sort((a, b) => {
            if (b.matchCount !== a.matchCount) {
              return b.matchCount - a.matchCount;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          
        } else {
          // Single ingredient search
          const regex = new RegExp(searchQuery, 'i');
          recipes = await Recipe.find({
            $or: [
              { name: regex },
              { description: regex },
              { ingredients: { $elemMatch: { $regex: regex } } },
              { ingredients: regex }
            ]
          }).sort({ createdAt: -1 });
        }
      } else {
        // Regular search (name, description, or ingredients)
        const regex = new RegExp(searchQuery, 'i');
        recipes = await Recipe.find({
          $or: [
            { name: regex },
            { description: regex },
            { ingredients: { $elemMatch: { $regex: regex } } },
            { ingredients: regex }
          ]
        }).sort({ createdAt: -1 });
      }
    } else {
      // Lấy tất cả recipes
      recipes = await Recipe.find({}).sort({ createdAt: -1 });
    }
    
    res.status(200).json({
      success: true,
      message: searchQuery ? `Tìm thấy ${recipes.length} công thức cho "${searchQuery}"` : "Lấy danh sách công thức thành công",
      data: recipes
    });
  } catch (error) {
    console.error("Error getting recipes:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi khi lấy công thức", 
      error: error.message 
    });
  }
};

// Lấy chi tiết 1 công thức
const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy công thức" 
      });
    }
    res.status(200).json({
      success: true,
      message: "Lấy công thức thành công",
      data: recipe
    });
  } catch (error) {
    console.error("Error getting recipe:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi khi lấy công thức", 
      error: error.message 
    });
  }
};

// Thêm công thức
const createRecipe = async (req, res) => {
  try {
    const recipe = new Recipe(req.body);
    const savedRecipe = await recipe.save();
    
    res.status(201).json({
      success: true,
      message: "Tạo công thức thành công",
      data: savedRecipe
    });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(400).json({ 
      success: false,
      message: "Lỗi khi tạo công thức", 
      error: error.message 
    });
  }
};

// Cập nhật công thức
const updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!recipe) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy công thức" 
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Cập nhật công thức thành công",
      data: recipe
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(400).json({ 
      success: false,
      message: "Lỗi khi cập nhật công thức", 
      error: error.message 
    });
  }
};

// Xóa công thức
const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy công thức" 
      });
    }
    
    res.status(200).json({ 
      success: true,
      message: "Xóa công thức thành công" 
    });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi khi xóa công thức", 
      error: error.message 
    });
  }
};

module.exports = {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
