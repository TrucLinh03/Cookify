/**
 * Auto-sync utility for automatic embedding generation
 * Periodically checks for new documents without embeddings and processes them
 */

const { embedBatch } = require('./embedding');
const { buildSearchableText } = require('./buildSearchText');

class AutoSyncManager {
  constructor(db, options = {}) {
    this.db = db;
    this.isRunning = false;
    this.interval = options.interval || 5 * 60 * 1000; // Default: 5 minutes
    this.batchSize = options.batchSize || 20; // Process 20 docs at a time
    this.collections = options.collections || ['recipes', 'blogs', 'feedbacks'];
    this.intervalId = null;
    this.stats = {
      lastRun: null,
      totalSynced: 0,
      errors: 0,
      runs: 0
    };
  }

  /**
   * Start auto-sync scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('Auto-sync already running');
      return;
    }

    this.isRunning = true;

    // Run immediately on start
    this.syncNewDocuments().catch(err => {
      console.error('Error in initial auto-sync:', err.message);
    });

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.syncNewDocuments().catch(err => {
        console.error('Error in auto-sync:', err.message);
      });
    }, this.interval);
  }

  /**
   * Stop auto-sync scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Sync new documents without embeddings
   */
  async syncNewDocuments() {
    if (!this.db) {
      console.warn('Database not connected, skipping auto-sync');
      return;
    }

    const startTime = Date.now();
    this.stats.runs++;
    this.stats.lastRun = new Date();

    let totalSynced = 0;

    for (const collName of this.collections) {
      try {
        const sourceType = this.getSourceType(collName);
        const collection = this.db.collection(collName);

        // Find documents without embeddings (limited batch)
        const docsWithoutEmbedding = await collection
          .find({ embedding: { $exists: false } })
          .limit(this.batchSize)
          .toArray();

        if (docsWithoutEmbedding.length === 0) {
          continue; // Skip if no new documents
        }

        console.log(`   Processing ${docsWithoutEmbedding.length} new documents from ${collName}...`);

        // Build searchable texts
        const searchableTexts = docsWithoutEmbedding.map(doc => 
          buildSearchableText(doc, sourceType)
        );

        // Create embeddings
        const embeddings = await embedBatch(searchableTexts, docsWithoutEmbedding.length);

        // Update documents
        const bulkOps = docsWithoutEmbedding.map((doc, idx) => ({
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
        totalSynced += result.modifiedCount;

        console.log(`Synced ${result.modifiedCount} documents in ${collName}`);

      } catch (error) {
        console.error(`Error syncing ${collName}:`, error.message);
        this.stats.errors++;
      }
    }

    const duration = Date.now() - startTime;
    this.stats.totalSynced += totalSynced;

    if (totalSynced > 0) {
      console.log(`Auto-sync completed: ${totalSynced} documents synced in ${duration}ms`);
    } else {
      console.log(`Auto-sync completed: No new documents to sync`);
    }
  }

  /**
   * Get source type from collection name
   */
  getSourceType(collName) {
    const mapping = {
      'recipes': 'recipe',
      'blogs': 'blog',
      'feedbacks': 'feedback',
      'favourites': 'favourite'
    };
    return mapping[collName] || collName;
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      interval: this.interval,
      batchSize: this.batchSize,
      collections: this.collections
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      lastRun: null,
      totalSynced: 0,
      errors: 0,
      runs: 0
    };
  }
}

module.exports = AutoSyncManager;
