import { createClient, type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export typed SupabaseClient for use across the project
// This ensures all services use a client typed with our Database schema
export type SupabaseClient = SupabaseClientBase<Database>;
