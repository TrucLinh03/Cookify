const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String,
        trim: true
    },
    ingredients: [{ 
        type: String,
        trim: true
    }], // Array of strings for ingredients
    instructions: { 
        type: String, 
        required: true
    },
    imageUrl: { 
        type: String,
        trim: true
    },
    video: { 
        type: String,
        trim: true
    },
    category: { 
        type: String, 
        enum: ["tatca", "monchinh", "monphu", "trangmieng", "anvat", "douong"], 
        required: true 
    },
    difficulty: { 
        type: String, 
        enum: ["easy", "medium", "hard"], 
        required: true 
    },
    cookingTime: { 
        type: String,
        trim: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Index để tối ưu query
recipeSchema.index({ category: 1 });
recipeSchema.index({ difficulty: 1 });
recipeSchema.index({ createdAt: -1 });

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;