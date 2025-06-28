const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required for this endpoint'
    });
  }

  const validApiKey = process.env.ADMIN_API_KEY;
  
  if (!validApiKey) {
    console.error('ADMIN_API_KEY not configured in environment variables');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'API key validation not properly configured'
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  next();
};

module.exports = {
  validateApiKey
}; 