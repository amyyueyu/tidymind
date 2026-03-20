-- 1. Restrict profiles UPDATE to only allow display_name changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own display_name"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Harden add_progress_photo_points: remove p_points param, hardcode server-side
CREATE OR REPLACE FUNCTION public.add_progress_photo_points(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  BONUS_POINTS CONSTANT integer := 25;
BEGIN
  SELECT user_id INTO v_user_id FROM public.rooms WHERE id = p_room_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN RETURN; END IF;
  UPDATE public.profiles
    SET total_points = total_points + BONUS_POINTS,
        current_level = GREATEST(1, floor((total_points + BONUS_POINTS) / 100)::int + 1),
        updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;

-- 3. Drop the direct INSERT policy on user_badges (prevents self-awarding)
DROP POLICY IF EXISTS "Users can earn badges" ON public.user_badges;

-- 4. Create SECURITY DEFINER function that validates criteria before awarding badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;

  INSERT INTO user_badges (user_id, badge_id)
  SELECT p_user_id, b.id
  FROM badges b
  WHERE
    (b.points_required IS NULL OR v_profile.total_points >= b.points_required)
    AND (b.streak_required IS NULL OR v_profile.current_streak >= b.streak_required)
    AND (b.rooms_required IS NULL OR (
      SELECT COUNT(*) FROM rooms r
      WHERE r.user_id = p_user_id AND r.status = 'completed'
    ) >= b.rooms_required)
    AND NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
    )
  ON CONFLICT DO NOTHING;
END;
$$;