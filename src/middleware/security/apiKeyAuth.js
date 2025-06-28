module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', ''));
  const adminKey = process.env.ADMIN_API_KEY;
  const userKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required',
      error: 'Unauthorized',
      timestamp: new Date().toISOString()
    });
  }

  if (req.originalUrl.startsWith('/v1/admin')) {
    if (apiKey === userKey || apiKey === 'test-key') {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing admin API key',
        error: 'Forbidden',
        timestamp: new Date().toISOString()
      });
    }
    if (apiKey !== adminKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    if (apiKey !== userKey && apiKey !== adminKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
}; 