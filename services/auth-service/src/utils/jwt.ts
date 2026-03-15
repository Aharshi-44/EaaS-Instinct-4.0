import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '@energix/shared-types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const generateTokens = (payload: JwtPayload): TokenPair => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    }
  );

  // Parse expiresIn to seconds
  const expiresInMatch = JWT_EXPIRES_IN.match(/(\d+)([mhd])/);
  let expiresIn = 900; // default 15 minutes
  if (expiresInMatch) {
    const value = parseInt(expiresInMatch[1]);
    const unit = expiresInMatch[2];
    switch (unit) {
      case 'm':
        expiresIn = value * 60;
        break;
      case 'h':
        expiresIn = value * 60 * 60;
        break;
      case 'd':
        expiresIn = value * 24 * 60 * 60;
        break;
    }
  }

  return { accessToken, refreshToken, expiresIn };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string };
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};
