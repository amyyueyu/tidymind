-- Create get_full_platform_stats RPC
CREATE OR REPLACE FUNCTION public.get_full_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_signed_up_users',
      (SELECT COUNT(*)::int FROM profiles),
    'new_users_7d',
      (SELECT COUNT(*)::int FROM profiles WHERE created_at >= now() - interval '7 days'),
    'new_users_30d',
      (SELECT COUNT(*)::int FROM profiles WHERE created_at >= now() - interval '30 days'),
    'total_rooms_created',
      (SELECT COUNT(*)::int FROM rooms),
    'rooms_by_intent',
      (SELECT json_agg(row_to_json(t)) FROM (
        SELECT intent, COUNT(*)::int as count FROM rooms GROUP BY intent ORDER BY count DESC
      ) t),
    'rooms_completed',
      (SELECT COUNT(*)::int FROM rooms WHERE status = 'completed'),
    'rooms_completion_rate',
      ROUND(
        (SELECT COUNT(*) FROM rooms WHERE status = 'completed')::numeric /
        NULLIF((SELECT COUNT(*) FROM rooms), 0) * 100, 1
      ),
    'total_challenges_generated',
      (SELECT COUNT(*)::int FROM challenges),
    'total_challenges_completed',
      (SELECT COUNT(*)::int FROM challenges WHERE status = 'completed'),
    'total_challenges_skipped',
      (SELECT COUNT(*)::int FROM challenges WHERE status = 'skipped'),
    'challenge_completion_rate',
      ROUND(
        (SELECT COUNT(*) FROM challenges WHERE status = 'completed')::numeric /
        NULLIF((SELECT COUNT(*) FROM challenges), 0) * 100, 1
      ),
    'avg_challenges_per_room',
      ROUND(
        (SELECT COUNT(*) FROM challenges)::numeric /
        NULLIF((SELECT COUNT(*) FROM rooms), 0), 1
      ),
    'funnel_signed_up',
      (SELECT COUNT(*)::int FROM profiles),
    'funnel_uploaded_photo',
      (SELECT COUNT(DISTINCT user_id)::int FROM rooms),
    'funnel_completed_at_least_one_challenge',
      (SELECT COUNT(DISTINCT user_id)::int FROM challenges WHERE status = 'completed'),
    'funnel_uploaded_progress_photo',
      (SELECT COUNT(DISTINCT user_id)::int FROM rooms WHERE wip_image_url IS NOT NULL),
    'funnel_finished_a_room',
      (SELECT COUNT(DISTINCT user_id)::int FROM rooms WHERE status = 'completed'),
    'rooms_with_vision_image',
      (SELECT COUNT(*)::int FROM rooms WHERE after_image_url IS NOT NULL),
    'vision_image_success_rate',
      ROUND(
        (SELECT COUNT(*) FROM rooms WHERE after_image_url IS NOT NULL)::numeric /
        NULLIF((SELECT COUNT(*) FROM rooms), 0) * 100, 1
      ),
    'progress_photos_uploaded',
      (SELECT COUNT(*)::int FROM rooms WHERE wip_image_url IS NOT NULL),
    'users_who_uploaded_progress_photo',
      (SELECT COUNT(DISTINCT user_id)::int FROM rooms WHERE wip_image_url IS NOT NULL),
    'users_with_streak_gt_0',
      (SELECT COUNT(*)::int FROM profiles WHERE current_streak > 0),
    'users_with_streak_gte_3',
      (SELECT COUNT(*)::int FROM profiles WHERE current_streak >= 3),
    'users_with_streak_gte_7',
      (SELECT COUNT(*)::int FROM profiles WHERE current_streak >= 7),
    'avg_current_streak',
      ROUND((SELECT AVG(current_streak) FROM profiles), 1),
    'max_streak',
      (SELECT COALESCE(MAX(longest_streak), 0)::int FROM profiles),
    'avg_points_per_user',
      ROUND((SELECT COALESCE(AVG(total_points), 0) FROM profiles), 0),
    'avg_level',
      ROUND((SELECT COALESCE(AVG(current_level), 1) FROM profiles), 1),
    'users_above_level_2',
      (SELECT COUNT(*)::int FROM profiles WHERE current_level >= 2),
    'users_above_level_5',
      (SELECT COUNT(*)::int FROM profiles WHERE current_level >= 5),
    'users_with_multiple_rooms',
      (SELECT COUNT(*)::int FROM (
        SELECT user_id FROM rooms GROUP BY user_id HAVING COUNT(*) > 1
      ) t),
    'active_users_7d',
      (SELECT COUNT(DISTINCT user_id)::int FROM challenges
       WHERE completed_at >= now() - interval '7 days'),
    'active_users_30d',
      (SELECT COUNT(DISTINCT user_id)::int FROM challenges
       WHERE completed_at >= now() - interval '30 days'),
    'rate_limit_hits_7d',
      (SELECT COUNT(*)::int FROM rate_limits
       WHERE window_start >= now() - interval '7 days'
         AND call_count >= 10)
  ) INTO result;
  RETURN result;
END;
$$;

-- Create get_daily_activity_v2 RPC
CREATE OR REPLACE FUNCTION public.get_daily_activity_v2(p_days integer DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT json_agg(row_to_json(t) ORDER BY t.date)
    FROM (
      SELECT
        d::date as date,
        COALESCE((
          SELECT COUNT(*)::int FROM rooms r
          WHERE r.created_at::date = d::date
        ), 0) as rooms_created,
        COALESCE((
          SELECT COUNT(*)::int FROM challenges c
          WHERE c.completed_at::date = d::date
            AND c.status = 'completed'
        ), 0) as challenges_completed,
        COALESCE((
          SELECT COUNT(*)::int FROM profiles p
          WHERE p.created_at::date = d::date
        ), 0) as new_signups,
        COALESCE((
          SELECT COUNT(*)::int FROM rooms r2
          WHERE r2.wip_image_url IS NOT NULL
            AND r2.updated_at::date = d::date
        ), 0) as progress_photos
      FROM generate_series(
        now()::date - (p_days - 1),
        now()::date,
        '1 day'::interval
      ) d
    ) t
  );
END;
$$;