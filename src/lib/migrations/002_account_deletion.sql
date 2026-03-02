-- Migration 002: Cascade account deletion RPC
-- Properly cleans up all user data when account is deleted.

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is deleting their own account
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- 1. Delete trips where user is the sole organizer
  DELETE FROM public.trips
  WHERE id IN (
    SELECT trip_id FROM public.trip_members
    WHERE user_id = target_user_id AND role = 'organizer'
    AND trip_id NOT IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id != target_user_id AND role IN ('organizer', 'co-organizer')
    )
  );

  -- 2. Remove user from shared trips
  DELETE FROM public.trip_members
  WHERE user_id = target_user_id;

  -- 3. Anonymize chat messages in shared trips
  UPDATE public.chat_messages
  SET user_name = 'Deleted User'
  WHERE user_id = target_user_id;

  -- 4. Anonymize activity log entries
  UPDATE public.activity_log
  SET user_name = 'Deleted User'
  WHERE user_id = target_user_id;

  -- 5. Delete notifications
  DELETE FROM public.notifications
  WHERE user_id = target_user_id;

  -- 6. Delete packing items
  DELETE FROM public.packing_items
  WHERE user_id = target_user_id;

  -- 7. Delete poll votes
  DELETE FROM public.poll_votes
  WHERE user_id = target_user_id;

  -- 8. Delete invitations created by user
  DELETE FROM public.trip_invitations
  WHERE inviter_id = target_user_id;

  -- 9. Delete profile
  DELETE FROM public.profiles
  WHERE id = target_user_id;
END;
$$;
