import { supabase } from '../config/supabaseClient.js';

/**
 * Middleware to validate Supabase JWT Access Tokens.
 * Extracts Bearer token from the Authorization header and verifies it with Supabase Auth.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.'
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error verifying Supabase token:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

