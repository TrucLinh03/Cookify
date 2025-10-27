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
const mongoURI = process.env.mongoURI || "mongodb+srv://admin:3dk5BqyUu0FlzQ4t@liliflowerstore.byu1dsr.mongodb.net/Cookify?retryWrites=true&w=majority&appName=LiliFlowerStore";
mongoose.connect(mongoURI)
  .then(() => console.log("Mongodb connected successfully!"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// User routes for login/register
app.use('/api/users', userRoute);

// Recipe routes
app.use('/api/recipes', recipeRoute);

// Favourite routes
app.use('/api/favourites', favouriteRoute);

// Feedback routes
app.use('/api/feedback', feedbackRoute);

// Recommendation routes
app.use('/api/recommendations', recommendationRoute);

// Blog routes
app.use('/api/blog', blogRoute);


app.get('/', (req, res) => {
  res.send('Cookify App Server is running!');
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
