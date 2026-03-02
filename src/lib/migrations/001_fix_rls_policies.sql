-- Migration 001: Fix RLS policies for chat_messages, activity_log, and trip_invitations
-- These tables previously had `using (true)` which exposed all data publicly.

-- ── chat_messages ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Trip members can view chat" ON public.chat_messages;
CREATE POLICY "Trip members can view chat" ON public.chat_messages
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trip members can send chat" ON public.chat_messages;
CREATE POLICY "Trip members can send chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::text
    AND trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

-- ── activity_log ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view activity" ON public.activity_log;
CREATE POLICY "Trip members can view activity" ON public.activity_log
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can insert activity" ON public.activity_log;
CREATE POLICY "Trip members can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND trip_id IN (
      SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
    )
  );

-- ── trip_invitations ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view invitations" ON public.trip_invitations;
CREATE POLICY "Inviter or invitee can view invitation" ON public.trip_invitations
  FOR SELECT USING (
    inviter_id = auth.uid()::text
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create invitations" ON public.trip_invitations;
CREATE POLICY "Trip organizers can create invitations" ON public.trip_invitations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('organizer', 'co-organizer')
    )
  );

DROP POLICY IF EXISTS "Anyone can update invitations" ON public.trip_invitations;
CREATE POLICY "Inviter or invitee can update invitation" ON public.trip_invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()::text
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
