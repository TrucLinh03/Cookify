const express = require("express");
const { createRecipe, getRecipes, getRecipeById, updateRecipe, deleteRecipe } = require("../controllers/recipeController.js");
const { verifyToken } = require("../middleware/verifyToken.js");
const verifyAdmin = require("../middleware/verifyAdmin.js");

const router = express.Router();

// GET all recipes (public)
router.get("/", getRecipes);

// GET single recipe by ID (public)
router.get("/:id", getRecipeById);

// POST create new recipe (admin only)
router.post("/", verifyToken, verifyAdmin, createRecipe);

// PUT update recipe (admin only)
router.put("/:id", verifyToken, verifyAdmin, updateRecipe);

// DELETE recipe (admin only)
router.delete("/:id", verifyToken, verifyAdmin, deleteRecipe);

module.exports = router;
