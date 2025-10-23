const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken = (req, res, next) => {
    try {
        console.log('VerifyToken middleware called');
        console.log('Request headers:', req.headers);
        
        const authHeader = req.headers['authorization'];
        console.log('Auth header:', authHeader);
        
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.split(' ')[1] 
            : req.cookies?.token;

        console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'No token');

        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'Access token required' });
        }

        console.log('JWT_SECRET available:', !!JWT_SECRET);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Token decoded successfully:', { id: decoded.id, email: decoded.email, role: decoded.role });
        
        if (!decoded) {
            console.log('Token decode failed');
            return res.status(401).json({ message: 'Invalid token or not valid' });
        }

        // Sử dụng đúng field từ token
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        
        console.log('User set in request:', req.user);
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        console.log('Token verification error details:', {
            name: error.name,
            message: error.message
        });
        return res.status(401).json({ message: 'Invalid token' });
    }
}

module.exports = verifyToken;