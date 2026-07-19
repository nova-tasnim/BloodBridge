const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }
  if (err.name === 'CastError') {
    return res
      .status(400)
      .json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: `Duplicate value for: ${Object.keys(err.keyValue).join(', ')}`
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
};

module.exports = errorHandler;