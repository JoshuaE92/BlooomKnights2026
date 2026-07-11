/**
 * Lightweight request-body validator.
 *
 * Usage: router.post('/register', validateRequest(['username', 'email', 'password']), handler)
 * Rejects with 400 if any listed field is missing or blank.
 */
const validateRequest = (requiredFields = []) => (req, res, next) => {
  const body = req.body || {};

  const missing = requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  next();
};

module.exports = validateRequest;
