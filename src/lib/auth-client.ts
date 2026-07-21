/**
 * Better Auth Client — Frontend
 * 
 * Framework-agnostic auth client for Astro.
 * Connects to the Hono backend auth routes.
 */

import { createAuthClient } from "better-auth/client";

// API URL from environment or default to local Hono dev server
const baseURL = import.meta.env.PUBLIC_API_URL || "http://localhost:8787";

export const authClient = createAuthClient({
  baseURL,
});

// Convenience exports
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
