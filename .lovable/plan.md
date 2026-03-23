
## Incorporating Tiddy the Mascot into TidyMate UI

### What was uploaded
An MP4 animated video of "Tiddy" the cat mascot. Since this is an MP4 video file, it can be embedded in the UI using an HTML `<video>` element with `autoPlay loop muted playsInline`.

### Where Tiddy will appear (3 strategic spots)

**1. Auth page** — Tiddy replaces the static TidyMate logo above the login card. Instead of the flat `logo.png`, the animated cat plays in a circular/rounded container, giving the first impression a personality and warmth. This is the most impactful placement.

**2. Capture page — loading/analyzing state** — While the room is being analyzed (the `analyzing` spinner state), Tiddy replaces the current spinner. Also during vision generation (`generatingVision`), Tiddy appears alongside the loading text. This makes the waiting moments feel alive and on-brand.

**3. Index (dashboard) — empty state / onboarding overlay** — Inside the first-session onboarding modal, Tiddy replaces the `<Camera>` icon in the teal square at the top of the card. Also optionally peek out from the hero header as a small companion.

### Implementation approach

1. **Copy the MP4** from `user-uploads://SVG_Cat_Animation_Generated.mp4` → `public/tiddy.mp4` (public folder, not src/assets, because `<video src>` referencing a static file is more straightforward than importing a video as an ES6 module)

2. **Create a reusable `<TiddyMascot>` component** at `src/components/TiddyMascot.tsx` that wraps a `<video>` element:
   - Props: `size` (sm/md/lg), `className`
   - Always `autoPlay loop muted playsInline`
   - Rounded styling options (circle, rounded square)

3. **Auth page changes** — Replace the `<img src={logoImg}>` in the center header section with `<TiddyMascot size="lg">` in a rounded-3xl container with a subtle primary-tinted ring

4. **Capture page changes** — In the analyzing loading state (lines 453-457), replace the spinner with Tiddy + spinner combo. In the vision generating state (lines 471-499), place Tiddy above the loading text replacing the `<Sparkles>` pulse icon.

5. **Index onboarding overlay** — Replace the Camera icon square (line ~lines 277-279 of Index) with `<TiddyMascot size="md">` in a rounded-2xl container.

### Files to change
- `public/tiddy.mp4` — new file (copy from upload)
- `src/components/TiddyMascot.tsx` — new component
- `src/pages/Auth.tsx` — swap logo section
- `src/pages/Capture.tsx` — swap loading states
- `src/pages/Index.tsx` — swap onboarding card icon

### Technical details
- The video will be referenced as `/tiddy.mp4` (from public folder) — no import needed
- `muted` + `playsInline` are required for autoplay on mobile browsers
- No layout changes needed — Tiddy slots into existing containers
- The component will have `object-contain` to preserve the cat's aspect ratio within circular/square containers
