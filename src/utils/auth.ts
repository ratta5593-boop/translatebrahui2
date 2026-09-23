/**
 * Admin Authentication utility & API wrapper
 */

import { safeFetchJson, ApiResponse } from './api.js';

export type { ApiResponse };

const TOKEN_KEY = 'brahui_admin_token';
const USER_KEY = 'brahui_admin_user';
const GOOGLE_USER_KEY = 'brahui_google_user';

export interface GoogleUserProfile {
  name: string;
  email: string;
  picture?: string;
  id?: string;
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminSession(token: string, username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAdminUsername(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USER_KEY) || 'admin';
}

export function getGoogleUser(): GoogleUserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(GOOGLE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setGoogleUser(user: GoogleUserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user));
}

export function clearGoogleUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GOOGLE_USER_KEY);
}

export function clearAllSessions(): void {
  clearAdminSession();
  clearGoogleUser();
}

/**
 * Fetch wrapper that attaches Admin Bearer token to requests
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    // If token expired or rejected by server, clear session
    clearAdminSession();
  }

  return response;
}

/**
 * Safe authenticated JSON fetch wrapper that guarantees valid JSON parsing,
 * handles plain text / HTML error messages, and auto-attaches admin token.
 */
export async function authSafeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await safeFetchJson<T>(input, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    clearAdminSession();
  }

  return res;
}
