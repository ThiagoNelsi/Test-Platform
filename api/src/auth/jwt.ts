import jwt, { type SignOptions } from 'jsonwebtoken';

export type SessionTokenPayload = {
  userId: number;
};

export function signSessionToken(
  payload: SessionTokenPayload,
  secret: string,
  expiresIn: SignOptions['expiresIn'] = '7d',
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
): SessionTokenPayload | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === 'string' || typeof decoded !== 'object' || !('userId' in decoded)) {
      return null;
    }

    const userId = Number((decoded as { userId: unknown }).userId);

    if (!Number.isFinite(userId)) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}
