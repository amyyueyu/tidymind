
## What needs to change

**Goal**: Remove ALL UI entry points to `/stats` for everyone, and lock the page itself to `yuyueamy@gmail.com` only (hardcoded, not "first registered user").

### Current state
1. `src/pages/Index.tsx` — has a `BarChart2` icon button in the header, conditionally shown only when `isAdmin` is true. This needs to be **fully removed** (icon, state, RPC call).
2. `src/pages/Stats.tsx` — uses `is_admin()` RPC to gate access. The `is_admin()` function currently identifies admin as the **first registered user by `created_at`**, which is fragile.
3. `supabase/migrations` — `is_admin()` function needs to be updated to check against the hardcoded email `yuyueamy@gmail.com` via `auth.jwt()` claims or by joining against `auth.users`.

### Changes

**1. Update `is_admin()` database function (migration)**
Replace the "first created user" logic with a direct email check against `auth.users`:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'yuyueamy@gmail.com'
  );
$$;
```
This is server-side and cannot be spoofed.

**2. `src/pages/Index.tsx`**
- Remove `isAdmin` state entirely
- Remove the `supabase.rpc("is_admin")` call from the `useEffect`
- Remove the `{isAdmin && <Button>}` block and the `BarChart2` import

**3. `src/pages/Stats.tsx`**
- Keep the existing `is_admin` RPC check — it will now use the updated function that checks the hardcoded email, so no frontend change needed here.

### Security layers
- Database functions `get_platform_stats` and `get_daily_activity` already raise an exception if `is_admin()` returns false — data is fully protected server-side.
- The `/stats` route remains in the router but shows the "Access Restricted" screen to anyone who isn't `yuyueamy@gmail.com`.
- No UI entry point exists for any user.
