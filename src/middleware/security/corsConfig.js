const cors = require('cors');

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim());
const allowedMethods = 'GET,POST,PUT,DELETE,OPTIONS';
const allowedHeaders = 'Content-Type,Authorization,x-api-key';

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: allowedMethods,
  allowedHeaders: allowedHeaders,
  credentials: false,
};

module.exports = cors(corsOptions);

module.exports = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', allowedMethods);
  res.header('Access-Control-Allow-Headers', allowedHeaders);
  // Do not allow credentials for security
  // res.header('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
}; 