const mongoose = require("mongoose");

const favouriteSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  recipe_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Recipe", 
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Create compound index to ensure unique user-recipe pairs
favouriteSchema.index({ user_id: 1, recipe_id: 1 }, { unique: true });

module.exports = mongoose.model("Favourite", favouriteSchema);
