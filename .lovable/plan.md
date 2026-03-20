
## The Bug

`startTimer()` always resets `timeRemaining` back to `ch.time_estimate_minutes * 60` before starting the interval. So clicking "Start Timer" after a pause always restarts from the full duration instead of resuming.

## The Fix

**Introduce a `timerStarted` state** to distinguish three timer phases:
- `timerStarted === false` → timer never begun → show **"Start Timer"** button
- `timerStarted === true && timerActive === false` → timer was started but is now paused → show **"Continue"** + **"Restart"** buttons
- `timerActive === true` → timer is counting → show **"Pause"** button

### State changes (line ~133)
Add one new state:
```ts
const [timerStarted, setTimerStarted] = useState(false)
```
Reset it to `false` in `selectChallenge()` and when moving to next challenge after `completeChallenge()` / `skipChallenge()`.

### `startTimer` → split into two functions

**`startTimer()`** (fresh start, used by "Start Timer" and "Restart"):
- Keep existing logic (resets `timeRemaining` to full estimate, starts interval)
- Also sets `setTimerStarted(true)`

**`resumeTimer()`** (used by "Continue"):
- Does **not** reset `timeRemaining` — picks up from current value
- Starts the interval from the current `timeRemaining` value
- Sets `setTimerActive(true)`

### Button UI change (lines 835–853)

Replace the current two-state toggle with three states:

```
!timerStarted            → <Start Timer> button (full width)
timerStarted && !timerActive → two buttons side-by-side:
                              [▶ Continue]  [↺ Restart]
timerActive              → <Pause> button
```

The "Continue" button calls `resumeTimer()`.  
The "Restart" button calls `startTimer()` (resets to full time).

### What does NOT change
- `pauseTimer()` — unchanged
- `completeChallenge()`, `skipChallenge()` — only add `setTimerStarted(false)` alongside existing `setTimerActive(false)` calls
- `selectChallenge()` — add `setTimerStarted(false)`
- Timer interval logic, points, Supabase, music, sound effects — untouched

## Files to edit
- `src/pages/Challenge.tsx` only
