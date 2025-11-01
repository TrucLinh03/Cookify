const jwt = require('jsonwebtoken');

/**
 * Optional Authentication Middleware
 * Kiểm tra JWT token nếu có, nhưng không bắt buộc
 * Sử dụng cho các routes có thể hoạt động với hoặc không có authentication
 */
const optionalAuth = (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded; // Attach user info to request
      } catch (tokenError) {
        // Token invalid, but continue without authentication
        req.user = null;
      }
    } else {
      // No token provided, continue without authentication
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error('Error in optionalAuth middleware:', error);
    // Even if there's an error, continue without authentication
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
