export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo is too large — the maximum size is 4MB' : err.message;
    return res.status(400).json({ error: message });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
}
