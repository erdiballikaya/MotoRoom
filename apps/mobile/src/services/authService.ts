import { appConfig } from '../config';
import { AuthSession, EmailLoginInput, EmailRegisterInput } from '../types';

let inMemorySession: AuthSession | null = null;

type RequestOptions = {
  method?: 'GET' | 'POST';
  token?: string;
  body?: object;
};

const buildHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

const requestJson = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: buildHeaders(options.token),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error('Backend baglantisi kurulamadi. API URL veya servis durumunu kontrol et.');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'İstek başarısız oldu');
  }

  return (await response.json()) as T;
};

export const persistSession = async (session: AuthSession) => {
  inMemorySession = session;
};

export const clearStoredSession = async () => {
  inMemorySession = null;
};

export const restoreStoredSession = async () => {
  return inMemorySession;
};

export const getCurrentSessionUser = async (token: string) =>
  requestJson<{ user: AuthSession['user'] }>('/api/auth/me', {
    token
  });

const completeAuth = async (path: string, body: object) => {
  const session = await requestJson<AuthSession>(path, {
    method: 'POST',
    body
  });

  await persistSession(session);
  return session;
};

export const registerWithEmail = async (input: EmailRegisterInput) =>
  completeAuth('/api/auth/register', input);

export const loginWithEmail = async (input: EmailLoginInput) =>
  completeAuth('/api/auth/login', input);

export const loginWithGoogle = async (idToken: string) =>
  completeAuth('/api/auth/social/google', { idToken });

export const loginWithApple = async (payload: {
  identityToken: string;
  displayName?: string | null;
  email?: string | null;
}) => completeAuth('/api/auth/social/apple', payload);
