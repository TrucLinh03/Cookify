/**
 * Script to backfill embeddings for all documents in MongoDB
 * This will add 'embedding' field to recipes, blogs, feedbacks, and favourites
 * 
 * Usage: node scripts/backfillEmbeddings.js [collection_name]
 * Examples:
 *   node scripts/backfillEmbeddings.js recipes
 *   node scripts/backfillEmbeddings.js all
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { initializeGemini, embedBatch } = require('../src/utils/embedding');
const { buildSearchableText } = require('../src/utils/buildSearchText');

const BATCH_SIZE = 50; // Process 50 documents at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay to avoid rate limits

async function backfillCollection(db, collectionName, sourceType) {
  console.log(`\n Processing collection: ${collectionName}`);
  console.log('='.repeat(60));
  
  const collection = db.collection(collectionName);
  
  // Count total documents
  const totalDocs = await collection.countDocuments();
  console.log(`Total documents: ${totalDocs}`);
  
  // Count documents without embeddings
  const docsWithoutEmbedding = await collection.countDocuments({ 
    embedding: { $exists: false } 
  });
  console.log(`Documents without embedding: ${docsWithoutEmbedding}`);
  
  if (docsWithoutEmbedding === 0) {
    console.log('All documents already have embeddings. Skipping.');
    return { processed: 0, updated: 0, errors: 0 };
  }
  
  // Fetch documents without embeddings
  const docs = await collection.find({ embedding: { $exists: false } }).toArray();
  console.log(`Fetched ${docs.length} documents to process`);
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  // Process in batches
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(docs.length / BATCH_SIZE);
    
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} documents)`);
    
    try {
      // Build searchable texts for the batch
      const searchableTexts = batch.map(doc => buildSearchableText(doc, sourceType));
      
      // Create embeddings
      console.log(`Creating embeddings...`);
      const embeddings = await embedBatch(searchableTexts, batch.length);
      
      // Update documents with embeddings
      console.log(` Updating documents in database...`);
      const bulkOps = batch.map((doc, idx) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { 
            $set: { 
              embedding: embeddings[idx],
              embedding_updated_at: new Date()
            } 
          }
        }
      }));
      
      const result = await collection.bulkWrite(bulkOps);
      updated += result.modifiedCount;
      processed += batch.length;
      
      console.log(`Updated ${result.modifiedCount}/${batch.length} documents`);
      
    } catch (error) {
      console.error(`Error processing batch:`, error.message);
      errors += batch.length;
    }
    
    // Progress report
    const progress = Math.round((processed / docs.length) * 100);
    console.log(`Progress: ${processed}/${docs.length} (${progress}%)`);
    
    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < docs.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  console.log(`\nCollection ${collectionName} completed:`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  
  return { processed, updated, errors };
}

async function main() {
  let mongoClient = null;
  
  try {
    console.log('Starting Embedding Backfill Process');
    console.log('='.repeat(60));
    
    // Get target collection from command line
    const targetCollection = process.argv[2] || 'all';
    console.log(`Target: ${targetCollection}`);
    
    // Initialize Gemini
    console.log('\nInitializing Gemini API...');
    initializeGemini(
      process.env.GOOGLE_API_KEY,
      process.env.MODEL_EMBEDDING,
      process.env.MODEL_GENERATION
    );
    
    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.DB_NAME || 'Cookify');
    console.log(`Connected to database: ${db.databaseName}`);
    
    // Define collections to process
    const collectionsToProcess = [
      { name: 'recipes', sourceType: 'recipe' },
      { name: 'blogs', sourceType: 'blog' },
      { name: 'feedbacks', sourceType: 'feedback' },
      { name: 'favourites', sourceType: 'favourite' }
    ];
    
    // Filter based on target
    const collections = targetCollection === 'all'
      ? collectionsToProcess
      : collectionsToProcess.filter(c => c.name === targetCollection);
    
    if (collections.length === 0) {
      console.error(`Invalid collection name: ${targetCollection}`);
      console.log('Valid options: recipes, blogs, feedbacks, favourites, all');
      process.exit(1);
    }
    
    // Process each collection
    const startTime = Date.now();
    const results = {};
    
    for (const { name, sourceType } of collections) {
      results[name] = await backfillCollection(db, name, sourceType);
    }
    
    // Final summary
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('\n' + '='.repeat(60));
    console.log('BACKFILL COMPLETED');
    console.log('='.repeat(60));
    console.log(`Total time: ${totalTime}s`);
    console.log('\nSummary by collection:');
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    for (const [collName, result] of Object.entries(results)) {
      console.log(`\n  ${collName}:`);
      console.log(`    - Processed: ${result.processed}`);
      console.log(`    - Updated: ${result.updated}`);
      console.log(`    - Errors: ${result.errors}`);
      
      totalProcessed += result.processed;
      totalUpdated += result.updated;
      totalErrors += result.errors;
    }
    
    console.log(`\nTOTAL:`);
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Updated: ${totalUpdated}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('');
    
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the script
main();
