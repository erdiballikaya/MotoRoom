import { createRemoteJWKSet, jwtVerify } from 'jose';

import { config } from './config.js';

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const asOptionalString = (value: unknown) => (typeof value === 'string' && value.trim().length > 0 ? value : null);

const deriveDisplayName = (email: string | null, fallback: string) => {
  if (!email) {
    return fallback;
  }

  return email.split('@')[0];
};

export const verifyGoogleIdentityToken = async (idToken: string) => {
  if (config.googleAuthClientIds.length === 0) {
    throw new Error('Google auth is not configured on the backend');
  }

  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.googleAuthClientIds
  });

  return {
    provider: 'google' as const,
    providerSubject: String(payload.sub ?? ''),
    email: asOptionalString(payload.email),
    displayName: asOptionalString(payload.name) ?? deriveDisplayName(asOptionalString(payload.email), 'Google Rider'),
    avatarUrl: asOptionalString(payload.picture)
  };
};

export const verifyAppleIdentityToken = async (
  identityToken: string,
  fallbackName?: string | null,
  fallbackEmail?: string | null
) => {
  const verifyOptions =
    config.appleAuthAudiences.length > 0
      ? {
          issuer: 'https://appleid.apple.com',
          audience: config.appleAuthAudiences
        }
      : {
          issuer: 'https://appleid.apple.com'
        };

  const { payload } = await jwtVerify(identityToken, appleJwks, verifyOptions);
  const email = asOptionalString(payload.email) ?? asOptionalString(fallbackEmail);
  const displayName =
    asOptionalString(fallbackName) ??
    deriveDisplayName(email, 'Apple Rider');

  return {
    provider: 'apple' as const,
    providerSubject: String(payload.sub ?? ''),
    email,
    displayName,
    avatarUrl: null
  };
};
