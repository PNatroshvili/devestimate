"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase URL and publishable key are intentionally public browser configuration.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tenbxnjymiiegarxdoxf.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_C8Snkb1nlkgSQHwOzKH3aA_y_5NbRCB";

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
