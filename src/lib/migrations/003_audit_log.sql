-- Migration 003: Security audit log table
-- Tracks security-relevant events for compliance and debugging.

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs" ON public.security_audit_log
  FOR SELECT USING (user_id = auth.uid());

-- Only the RPC function can insert (via SECURITY DEFINER)
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RPC function for logging events
CREATE OR REPLACE FUNCTION public.log_security_event(p_action TEXT, p_details TEXT DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, details)
  VALUES (auth.uid(), p_action, p_details::jsonb);
END;
$$;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.security_audit_log(created_at DESC);
