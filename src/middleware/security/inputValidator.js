const { body, query, validationResult } = require('express-validator');
const errorResponse = require('../../utils/response').errorResponse;

const commodityNameValidator = body('commodity')
  .isString().withMessage('Commodity name must be a string')
  .trim().notEmpty().withMessage('Commodity name is required');

const priceValidator = body('price')
  .isFloat({ min: 0 }).withMessage('Price must be a positive number');

const dateValidator = body('date')
  .isISO8601().withMessage('Date must be in ISO8601 or YYYY-MM-DD format');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errorResponse('Validation error', 400, errors.array()));
  }
  next();
};

module.exports = {
  commodityNameValidator,
  priceValidator,
  dateValidator,
  validate,
}; 