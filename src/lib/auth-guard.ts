/**
 * Auth Guard — Client-side authentication checks
 *
 * Checks if the user is authenticated by calling GET /api/me.
 * Redirects to /login on 401 (requireAuth) or when the session is not
 * admin (requireAdminAuth).
 *
 * UI polish only — SSG HTML is public by design; the API enforces the
 * real authorization boundary server-side (Back requireAdmin, 403).
 *
 * Usage: import { requireAuth, requireAdminAuth } from '../lib/auth-guard';
 *        await requireAuth();
 *        await requireAdminAuth();
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

export async function requireAdminAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/me`, { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "/login";
      return false;
    }
    const data = (await res.json()) as { user?: { role?: string } };
    if (data.user?.role !== "admin") {
      window.location.href = "/login";
      return false;
    }
    return true;
  } catch {
    // Network error or malformed response — redirect to login as safety measure
    window.location.href = "/login";
    return false;
  }
}
