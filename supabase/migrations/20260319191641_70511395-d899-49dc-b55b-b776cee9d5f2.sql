-- Fix get_daily_activity_v2: rooms table has no updated_at column
-- Use created_at instead for progress_photos tracking
CREATE OR REPLACE FUNCTION public.get_daily_activity_v2(p_days integer DEFAULT 30)
RETURNS json
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
            AND r2.created_at::date = d::date
        ), 0) as progress_photos
      FROM generate_series(
        now()::date - (p_days - 1),
        now()::date,
        '1 day'::interval
      ) d
    ) t
  );
EXCEPTION WHEN OTHERS THEN
  RETURN '[]'::json;
END;
$$;