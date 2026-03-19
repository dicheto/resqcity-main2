import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return 'fallback-secret-key';
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN 
  } as any);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get authenticated user from request (for API routes)
 * Returns null if not authenticated
 */
export async function getAuth(request?: NextRequest): Promise<{ user: TokenPayload } | null> {
  try {
    // If request is provided, extract from Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      return payload ? { user: payload } : null;
    }

    // Otherwise, try to get from cookies (for server components)
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return null;
    }
    
    const payload = verifyToken(token);
    return payload ? { user: payload } : null;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}
