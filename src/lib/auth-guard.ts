/**
 * Auth Guard — Client-side authentication check
 *
 * Checks if the user is authenticated by calling GET /api/me.
 * Redirects to /login on 401.
 *
 * Usage: import { requireAuth } from '../lib/auth-guard';
 *        await requireAuth();
 */

import { getApiUrl } from './api-url';

const API_URL = getApiUrl();

export async function requireAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/me`, { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "/login";
      return false;
    }
    return true;
  } catch {
    // Network error — redirect to login as safety measure
    window.location.href = "/login";
    return false;
  }
}
