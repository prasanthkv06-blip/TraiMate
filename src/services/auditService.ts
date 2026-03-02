import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecurityAction =
  | 'account_login'
  | 'account_logout'
  | 'account_delete_requested'
  | 'password_reset_requested'
  | 'document_added'
  | 'document_viewed'
  | 'data_export'
  | 'trip_shared'
  | 'biometric_enabled'
  | 'biometric_disabled';

// ---------------------------------------------------------------------------
// Fire-and-forget security event logger
// ---------------------------------------------------------------------------

/**
 * Log a security-relevant action to the backend audit table.
 *
 * This is intentionally **fire-and-forget** — it will never throw and will
 * silently swallow errors so that audit logging can never break core flows.
 */
export function logSecurityEvent(
  action: SecurityAction,
  details?: Record<string, unknown>,
): void {
  try {
    // Guard: skip if Supabase is not configured
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) {
      return;
    }

    // Fire the RPC call but do not await — true fire-and-forget
    (supabase.rpc as any)('log_security_event', {
      p_action: action,
      p_details: JSON.stringify(details || {}),
    })
      .then(() => {
        // success — nothing to do
      })
      .catch(() => {
        // silently swallow — audit logging must never surface errors
      });
  } catch {
    // Outer guard: catch any synchronous issues (e.g. supabase not initialised)
  }
}
