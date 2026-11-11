export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

export function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const v = body[f];
    return v === undefined || v === null || v === '';
  });
  if (missing.length) {
    throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`);
  }
}

export function normalizeRequiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} must be non-empty text`);
  }
  return value.trim();
}

export function normalizeOptionalText(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be text`);
  }
  return value.trim() || null;
}

export function requireAllowedValue(value, field, allowed, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return value;
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
