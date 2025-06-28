const errorResponse = require('../../utils/response').errorResponse;

module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorType = status === 400 ? 'Bad Request' :
                    status === 401 ? 'Unauthorized' :
                    status === 403 ? 'Forbidden' :
                    status === 404 ? 'Not Found' :
                    status === 429 ? 'Too Many Requests' :
                    'Internal Server Error';
  res.status(status).json({
    success: false,
    message,
    error: errorType,
    timestamp: new Date().toISOString()
  });
}; 