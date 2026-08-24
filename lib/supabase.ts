import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url ?? "https://configuration-required.invalid",
  anonKey ?? "configuration-required",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

export async function recordPortalPasswordLogin(accessToken: string): Promise<string> {
  if (!url || !anonKey) throw new Error("Supabase no está configurado.");

  let lastError = "No se pudo registrar el acceso.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${url}/rest/v1/rpc/record_portal_password_login_v2`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (response.ok) return (await response.json()) as string;
    lastError = await response.text();
    if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 200));
  }
  throw new Error(lastError);
}
