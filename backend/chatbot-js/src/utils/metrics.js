/**
 * Metrics and Logging utilities for RAG system
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      totalResponses: 0,
      totalErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      embeddingCalls: 0,
      vectorSearches: 0,
      confidenceScores: [],
      tokenUsage: {
        totalTokens: 0,
        estimatedCost: 0
      }
    };
    this.requestTimes = [];
  }

  // Record request metrics
  recordRequest() {
    this.metrics.totalRequests++;
  }

  recordResponse(responseTime, confidence, cached = false) {
    this.metrics.totalResponses++;
    
    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Update response time
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift(); // Keep only last 100
    }
    this.metrics.averageResponseTime = 
      this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;

    // Record confidence
    this.metrics.confidenceScores.push(confidence);
    if (this.metrics.confidenceScores.length > 100) {
      this.metrics.confidenceScores.shift();
    }
  }

  recordError() {
    this.metrics.totalErrors++;
  }

  recordEmbedding() {
    this.metrics.embeddingCalls++;
  }

  recordVectorSearch() {
    this.metrics.vectorSearches++;
  }

  recordTokenUsage(tokens, estimatedCost = 0) {
    this.metrics.tokenUsage.totalTokens += tokens;
    this.metrics.tokenUsage.estimatedCost += estimatedCost;
  }

  getMetrics() {
    const avgConfidence = this.metrics.confidenceScores.length > 0
      ? this.metrics.confidenceScores.reduce((a, b) => a + b, 0) / this.metrics.confidenceScores.length
      : 0;

    const cacheHitRate = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0;

    return {
      ...this.metrics,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorRate: this.metrics.totalRequests > 0
        ? Math.round((this.metrics.totalErrors / this.metrics.totalRequests) * 100 * 100) / 100
        : 0,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      totalResponses: 0,
      totalErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      embeddingCalls: 0,
      vectorSearches: 0,
      confidenceScores: [],
      tokenUsage: {
        totalTokens: 0,
        estimatedCost: 0
      }
    };
    this.requestTimes = [];
  }
}

// Enhanced logging functions
function logRequest(req, startTime) {
  const timestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const origin = req.headers.origin || 'No origin';
  
  console.log(`📨 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   User-Agent: ${userAgent.substring(0, 100)}...`);
  console.log(`   Body size: ${JSON.stringify(req.body).length} bytes`);
}

function logResponse(responseTime, confidence, cached, sources) {
  const timestamp = new Date().toISOString();
  console.log(`📤 [${timestamp}] Response sent`);
  console.log(`   Processing time: ${responseTime}ms`);
  console.log(`   Confidence: ${Math.round(confidence * 100)}%`);
  console.log(`   Cached: ${cached ? 'Yes' : 'No'}`);
  console.log(`   Sources: ${sources} documents`);
}

function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  console.error(`❌ [${timestamp}] Error ${context}`);
  console.error(`   Message: ${error.message}`);
  console.error(`   Stack: ${error.stack?.split('\n')[0]}`);
}

function logEmbedding(text, cached, processingTime) {
  const timestamp = new Date().toISOString();
  console.log(`🔤 [${timestamp}] Embedding ${cached ? '(cached)' : '(new)'}`);
  console.log(`   Text length: ${text.length} chars`);
  if (!cached) {
    console.log(`   Processing time: ${processingTime}ms`);
  }
}

function logVectorSearch(queryLength, resultsCount, processingTime) {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] Vector search`);
  console.log(`   Query vector: ${queryLength}D`);
  console.log(`   Results: ${resultsCount} documents`);
  console.log(`   Processing time: ${processingTime}ms`);
}

// Create global metrics instance
const metricsCollector = new MetricsCollector();

module.exports = {
  MetricsCollector,
  metricsCollector,
  logRequest,
  logResponse,
  logError,
  logEmbedding,
  logVectorSearch
};
