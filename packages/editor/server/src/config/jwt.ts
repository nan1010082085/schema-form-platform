const secret = process.env.JWT_SECRET

if (!secret) {
  const msg = process.env.NODE_ENV === 'production'
    ? '⚠️ JWT_SECRET is not set — using fallback. Set it in Vercel environment variables for security.'
    : 'JWT_SECRET not set, using development fallback.'
  console.warn(msg)
}

export const JWT_SECRET = secret || 'schema-form-secret'
