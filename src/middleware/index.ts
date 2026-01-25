import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../db/database.types";

/**
 * Middleware to initialize a per-request Supabase client.
 * Creates a server client that properly handles JWT tokens from the Authorization header.
 * This ensures each request has its own authenticated client instance.
 */
export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  // Create a Supabase client for this specific request
  // The client will extract and use the JWT token from the Authorization header
  locals.supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      // For API routes, we read the Authorization header instead of cookies
      get: (key: string) => {
        // Try to get from Authorization header (Bearer token)
        const authHeader = request.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          return authHeader.substring(7); // Remove "Bearer " prefix
        }
        // Fallback to cookies if needed
        return request.headers.get(key);
      },
      // API routes are read-only for cookies (intentionally empty)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      set: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      remove: () => {},
    },
  });

  return next();
});
