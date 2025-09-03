const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided for:', req.url);
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    console.log('Auth successful for user:', req.userId, 'accessing:', req.url);
    next();
  } catch (error) {
    console.log('Auth error for:', req.url, error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
