const secret = process.env.JWT_SECRET

if (process.env.NODE_ENV === 'production' && !secret) {
  throw new Error('JWT_SECRET environment variable is required in production.')
}

export const JWT_SECRET = secret || 'schema-form-secret'
