// Centralized error handler. Any route that calls next(err) or throws
// inside an async wrapper ends up here, so we format errors in one place.
export function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

// Anything that didn't match a route falls through to here.
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}
