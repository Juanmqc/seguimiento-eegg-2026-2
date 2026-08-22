import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url ?? "https://configuration-required.invalid",
  anonKey ?? "configuration-required",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
