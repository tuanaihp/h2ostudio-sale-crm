// Shared auth helper cho API handlers — verify Supabase JWT + check staff role.
// Prefix _ → Vercel KHÔNG deploy file này thành endpoint công khai.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const STAFF_ROLES = ['admin', 'staff', 'superadmin', 'super_admin'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin'];

export interface VerifiedUser {
  id: string;
  email?: string;
  role: string | null;
}

/**
 * Lấy Bearer token từ request, verify với Supabase Auth, rồi đọc role
 * từ user_roles bằng chính JWT của user (policy read_own_role cho phép).
 * Trả về null nếu token thiếu/không hợp lệ.
 */
export async function verifyUser(req: any): Promise<VerifiedUser | null> {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  // Client gắn JWT của user → mọi query chịu RLS của user đó
  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return { id: user.id, email: user.email, role: roleRow?.role ?? null };
}

/** true nếu user có role staff trở lên */
export function isStaff(u: VerifiedUser | null): boolean {
  return !!u && !!u.role && STAFF_ROLES.includes(u.role);
}

/** true nếu user có role admin trở lên */
export function isAdmin(u: VerifiedUser | null): boolean {
  return !!u && !!u.role && ADMIN_ROLES.includes(u.role);
}

/** Service-role client cho cron/endpoint cần bypass RLS (server-only, KHÔNG bao giờ VITE_). */
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
