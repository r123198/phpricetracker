const helmet = require('helmet');

module.exports = function helmetConfig(app) {
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
}; 