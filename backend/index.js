const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

// Load environment variables FIRST
dotenv.config();

// Verify JWT_SECRET is loaded
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const userRoute = require('./src/routes/userRoute.js');
const recipeRoute = require('./src/routes/recipeRoute.js');
const favouriteRoute = require('./src/routes/favouriteRoutes.js');
const feedbackRoute = require('./src/routes/feedbackRoutes.js');
const recommendationRoute = require('./src/routes/recommendationRoutes.js');
const blogRoute = require('./src/routes/blogRoutes.js');
const viewHistoryRoute = require('./src/routes/viewHistoryRoutes.js');
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - Smart CORS for Development & Production
const allowedOrigins = [
  process.env.CORS_ORIGIN || "https://cookifychef.netlify.app", "https://cookify2025.netlify.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow production origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all localhost origins for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Block other origins
    console.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error('CORS blocked: This origin is not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());


// Handle preflight requests
app.options('*', cors());

// Connect to MongoDB with error handling
const mongoURI = process.env.mongoURI;
if (!mongoURI) {
  console.error("MongoDB URI is not defined in environment variables");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log("Mongodb connected successfully!"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// API Routes - v1
const API_PREFIX = '/api/v1';

// User routes for login/register
app.use('/api/users', userRoute);
app.use(`${API_PREFIX}/users`, userRoute); // Alias

// Recipe routes
app.use('/api/recipes', recipeRoute);
app.use(`${API_PREFIX}/recipes`, recipeRoute); // Alias

// Favourite routes (chuẩn hóa thành favorites)
app.use('/api/favourites', favouriteRoute); // Backward compatibility
app.use('/api/favorites', favouriteRoute); // US spelling
app.use(`${API_PREFIX}/favorites`, favouriteRoute); // Versioned

// Feedback routes
app.use('/api/feedback', feedbackRoute);
app.use(`${API_PREFIX}/feedback`, feedbackRoute); // Alias

// Recommendation routes
app.use('/api/recommendations', recommendationRoute);
app.use(`${API_PREFIX}/recommendations`, recommendationRoute); // Alias

// Blog routes
app.use('/api/blog', blogRoute);
app.use('/api/blogs', blogRoute); // Plural alias
app.use(`${API_PREFIX}/blogs`, blogRoute); // Versioned

// View History routes
app.use('/api/view-history', viewHistoryRoute);
app.use(`${API_PREFIX}/view-history`, viewHistoryRoute); // Versioned


app.get('/', (req, res) => {
  res.send('Cookify App Server is running!');
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Cookify API',
    version: '1.0.0',
    endpoints: {
      users: ['/api/users', '/api/v1/users'],
      recipes: ['/api/recipes', '/api/v1/recipes'],
      favorites: ['/api/favourites', '/api/favorites', '/api/v1/favorites'],
      feedback: ['/api/feedback', '/api/v1/feedback'],
      recommendations: ['/api/recommendations', '/api/v1/recommendations'],
      blogs: ['/api/blog', '/api/blogs', '/api/v1/blogs'],
      viewHistory: ['/api/view-history', '/api/v1/view-history']
    },
    documentation: 'https://github.com/your-repo/cookify-api'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found` 
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
