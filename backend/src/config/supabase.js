import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Server-side only client using the service role key. This key bypasses
// Row Level Security by design — it must NEVER be sent to the frontend.
// All tenant-isolation checks happen in this backend's middleware/queries.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
