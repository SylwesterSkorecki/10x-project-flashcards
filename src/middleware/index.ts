import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

/**
 * Public paths that don't require authentication
 * - Auth pages (login, register, forgot-password, reset-password, verify-email)
 * - Auth callback (for OAuth and email verification)
 * - Landing page
 */
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/callback",
];

/**
 * Middleware to handle authentication and session management.
 *
 * Responsibilities:
 * 1. Creates a per-request Supabase client with proper cookie handling
 * 2. Checks user session and sets locals.user
 * 3. Implements auth guard - redirects unauthenticated users to login
 * 4. Allows public paths without authentication
 */
export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create a Supabase server client with proper cookie handling for SSR
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase client available to all pages and API routes
  locals.supabase = supabase;

  // Handle OAuth/Email errors from Supabase
  // When link expires or is invalid, Supabase redirects with error parameters
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  
  if (error && url.pathname === "/") {
    // Handle specific error cases
    if (errorCode === "otp_expired") {
      return redirect("/auth/forgot-password?error=link_expired");
    }
    // Other errors - redirect to forgot password with generic error
    return redirect("/auth/forgot-password?error=invalid_token");
  }

  // Handle OAuth callback and email confirmation codes
  // When Supabase redirects with ?code=..., exchange it for a session
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Successfully exchanged code for session
      // Redirect based on the type parameter or user state
      if (url.pathname === "/auth/callback" || url.pathname === "/") {
        if (type === "recovery") {
          return redirect("/auth/reset-password");
        } else if (type === "signup") {
          return redirect("/auth/verify-email");
        }
        
        // No type parameter - determine flow from user state
        const user = data.user;
        if (user) {
          // If email is NOT confirmed, this is email verification
          if (!user.email_confirmed_at) {
            return redirect("/auth/verify-email");
          }
          // If email IS confirmed, this is password reset
          return redirect("/auth/reset-password");
        }
        
        // Fallback - shouldn't reach here
        return redirect("/generate");
      }
    } else if (error) {
      // Code exchange failed - redirect to error page
      if (url.pathname === "/auth/callback" || url.pathname === "/") {
        return redirect("/auth/forgot-password?error=invalid_token");
      }
    }
  }

  // Get the current user session (if exists)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Set user in locals for easy access in pages and API routes
  locals.user = user;

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.includes(url.pathname);

  // Auth guard: redirect to login if user is not authenticated and trying to access protected route
  if (!user && !isPublicPath) {
    const returnTo = encodeURIComponent(url.pathname + url.search);
    return redirect(`/auth/login?returnTo=${returnTo}`);
  }

  return next();
});
