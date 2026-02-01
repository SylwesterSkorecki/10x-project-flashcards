import { type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "../db/database.types.ts";

// For client-side usage, we need PUBLIC_ prefix
// For server-side (SSR), we can use regular env vars
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

// Client-side Supabase client for use in React components
// Using createBrowserClient from @supabase/ssr for proper cookie handling with SSR
export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

// Export typed SupabaseClient for use across the project
// This ensures all services use a client typed with our Database schema
export type SupabaseClient = SupabaseClientBase<Database>;

// Cookie options for SSR authentication
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD, // Only secure in production
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Helper function to parse Cookie header string into array of cookie objects
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates a Supabase server client for SSR with proper cookie handling
 * Used in middleware and Astro pages to handle authentication server-side
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, { ...cookieOptions, ...options })
        );
      },
    },
  });

  return supabase;
};
