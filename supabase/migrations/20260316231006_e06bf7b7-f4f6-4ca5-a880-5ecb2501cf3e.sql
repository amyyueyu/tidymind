
-- Fix complete_challenge_add_points to correctly handle streaks
-- Key fixes:
-- 1. Store last_activity_date as DATE explicitly (not full timestamp)
-- 2. Fix longest_streak bug (was comparing against stale pre-update value)
-- 3. Use AT TIME ZONE 'UTC' consistently

CREATE OR REPLACE FUNCTION public.complete_challenge_add_points(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_points integer;
  v_room_id uuid;
  v_profile profiles%ROWTYPE;
  v_today date;
  v_last_activity date;
  v_new_streak integer;
  v_new_longest integer;
  v_new_points integer;
  v_new_level integer;
BEGIN
  SELECT user_id, points, room_id
  INTO v_user_id, v_points, v_room_id
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Challenge not found: %', p_challenge_id;
  END IF;

  UPDATE public.challenges
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_challenge_id;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = v_user_id;

  v_today := (now() AT TIME ZONE 'UTC')::date;
  v_last_activity := v_profile.last_activity_date;

  IF v_last_activity IS NULL THEN
    v_new_streak := 1;
  ELSIF v_today = v_last_activity THEN
    -- Already active today: preserve streak, don't double-increment
    v_new_streak := GREATEST(v_profile.current_streak, 1);
  ELSIF v_today = v_last_activity + 1 THEN
    -- Consecutive day
    v_new_streak := v_profile.current_streak + 1;
  ELSE
    -- Gap: reset
    v_new_streak := 1;
  END IF;

  v_new_points  := v_profile.total_points + v_points;
  v_new_level   := GREATEST(1, (v_new_points / 100) + 1);
  v_new_longest := GREATEST(v_profile.longest_streak, v_new_streak);

  UPDATE public.profiles
  SET total_points       = v_new_points,
      current_level      = v_new_level,
      current_streak     = v_new_streak,
      longest_streak     = v_new_longest,
      last_activity_date = v_today,
      updated_at         = now()
  WHERE user_id = v_user_id;
END;
$$;
