-- Migration 001: Fix RLS policies for chat_messages, activity_log, and trip_invitations
-- These tables previously had `using (true)` which exposed all data publicly.

-- ── chat_messages ───────────────────────────────────────────────────────

-- Replace the wide-open SELECT policy with trip-member-scoped one
DROP POLICY IF EXISTS "Trip members can view chat" ON public.chat_messages;
CREATE POLICY "Trip members can view chat" ON public.chat_messages
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

-- Replace the wide-open INSERT policy with trip-member-scoped one
DROP POLICY IF EXISTS "Anyone can send chat" ON public.chat_messages;
CREATE POLICY "Trip members can send chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

-- ── activity_log ────────────────────────────────────────────────────────

-- The SELECT policy is already scoped — keep it
-- Replace the wide-open INSERT policy
DROP POLICY IF EXISTS "Anyone can log activity" ON public.activity_log;
CREATE POLICY "Trip members can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

-- ── trip_invitations ────────────────────────────────────────────────────

-- Replace wide-open SELECT
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.trip_invitations;
CREATE POLICY "Inviter or invitee can view invitation" ON public.trip_invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Replace wide-open INSERT
DROP POLICY IF EXISTS "Trip members can create invitations" ON public.trip_invitations;
CREATE POLICY "Trip organizers can create invitations" ON public.trip_invitations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('organizer', 'co-organizer')
    )
  );

-- Replace wide-open UPDATE
DROP POLICY IF EXISTS "Invitations can be updated" ON public.trip_invitations;
CREATE POLICY "Inviter or invitee can update invitation" ON public.trip_invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
