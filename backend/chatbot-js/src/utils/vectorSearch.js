/**
 * MongoDB Atlas Vector Search utilities
 */

/**
 * Perform vector search on a collection
 * @param {Collection} collection - MongoDB collection
 * @param {string} indexName - Name of the vector search index
 * @param {number[]} queryVector - Query embedding vector
 * @param {number} limit - Number of results
 * @param {number} numCandidates - Number of candidates to consider
 * @returns {Promise<Array>} - Search results with scores
 */
async function vectorSearch(collection, indexName, queryVector, limit = 5, numCandidates = 200) {
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: numCandidates,
          limit: limit
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          title: 1,
          description: 1,
          content: 1,
          excerpt: 1,
          ingredients: 1,
          instructions: 1,
          category: 1,
          difficulty: 1,
          cookingTime: 1,
          imageUrl: 1,
          tags: 1,
          rating: 1,
          comment: 1,
          sentiment: 1,
          recipe_id: 1,
          user_id: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];
    
    const results = await collection.aggregate(pipeline).toArray();
    return results;
  } catch (error) {
    console.error(`Error in vector search for ${collection.collectionName}:`, error.message);
    return [];
  }
}

/**
 * Search across multiple collections and merge results
 * @param {Object} db - MongoDB database instance
 * @param {number[]} queryVector - Query embedding vector
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Merged and sorted results
 */
async function multiCollectionSearch(db, queryVector, options = {}) {
  const {
    limit = 10,
    numCandidates = 200,
    threshold = 0.3
  } = options;
  
  // Define collections and their vector search indexes
  // Note: favourites excluded (no vector index on M0 free tier - only 3 indexes allowed)
  const searches = [
    {
      collection: db.collection('recipes'),
      indexName: 'vector_recipes',
      sourceType: 'recipe',
      weight: 1.5 // Recipes are more important
    },
    {
      collection: db.collection('blogs'),
      indexName: 'vector_blogs',
      sourceType: 'blog',
      weight: 1.2
    },
    {
      collection: db.collection('feedbacks'),
      indexName: 'vector_feedbacks',
      sourceType: 'feedback',
      weight: 1.0
    }
    // favourites: not included in vector search, use getPopularRecipes() instead
  ];
  
  // Perform searches in parallel
  const searchPromises = searches.map(({ collection, indexName, sourceType, weight }) =>
    vectorSearch(collection, indexName, queryVector, Math.ceil(limit / 2), numCandidates)
      .then(results => results.map(doc => ({
        ...doc,
        sourceType,
        weightedScore: doc.score * weight
      })))
      .catch(error => {
        console.warn(`Search failed for ${sourceType}:`, error.message);
        return [];
      })
  );
  
  const allResults = await Promise.all(searchPromises);
  
  // Flatten and filter by threshold
  const mergedResults = allResults
    .flat()
    .filter(doc => doc.score >= threshold)
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, limit);
  
  return mergedResults;
}

/**
 * Get popular recipes from favourites (aggregation)
 * @param {Collection} favouritesCollection - Favourites collection
 * @param {Collection} recipesCollection - Recipes collection
 * @param {number} limit - Number of popular recipes
 * @returns {Promise<Array>} - Popular recipes
 */
async function getPopularRecipes(favouritesCollection, recipesCollection, limit = 10) {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$recipe_id',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'recipes',
          localField: '_id',
          foreignField: '_id',
          as: 'recipe'
        }
      },
      {
        $unwind: '$recipe'
      },
      {
        $project: {
          _id: '$recipe._id',
          name: '$recipe.name',
          description: '$recipe.description',
          category: '$recipe.category',
          imageUrl: '$recipe.imageUrl',
          favouriteCount: '$count'
        }
      }
    ];
    
    const popularRecipes = await favouritesCollection.aggregate(pipeline).toArray();
    return popularRecipes;
  } catch (error) {
    console.error('Error getting popular recipes:', error.message);
    return [];
  }
}

module.exports = {
  vectorSearch,
  multiCollectionSearch,
  getPopularRecipes
};
