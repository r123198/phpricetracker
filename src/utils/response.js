const createResponse = (data, message = 'Success', meta = {}) => {
  const response = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return response;
};

const createPaginatedResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return createResponse(data, 'Success', {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  });
};

const createErrorResponse = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = {
  createResponse,
  createPaginatedResponse,
  createErrorResponse
}; 