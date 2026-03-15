import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GoogleUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  googleId: string;
  picture?: string;
  emailVerified: boolean;
}

export const verifyGoogleToken = async (idToken: string): Promise<GoogleUserInfo> => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token payload');
    }

    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture,
      email_verified: emailVerified,
    } = payload;

    if (!email || !firstName || !lastName) {
      throw new Error('Incomplete Google profile information');
    }

    return {
      email,
      firstName,
      lastName,
      googleId,
      picture,
      emailVerified: emailVerified || false,
    };
  } catch (error) {
    logger.error('Google token verification failed:', error);
    throw new Error('Invalid Google token');
  }
};

export const getGoogleAuthUrl = (redirectUri: string, state?: string): string => {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });

  return authUrl;
};

export const getTokensFromCode = async (
  code: string,
  redirectUri: string
): Promise<{ id_token: string; access_token: string }> => {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.id_token) {
    throw new Error('No ID token received from Google');
  }

  return {
    id_token: tokens.id_token,
    access_token: tokens.access_token || '',
  };
};
