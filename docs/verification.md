# Milestone 1 verification

## Automated checks

- `pnpm typecheck`: passed.
- `pnpm build`: passed with Next.js 16.3.5 in Webpack mode, including static generation of `/` and `/manifest.webmanifest`.
- Playwright Chromium: **4 tests passed**.
  - 15 holds saved, page reloaded, project reopened, and marker alignment checked at phone, desktop, landscape, and 320px widths.
  - Dragging, keyboard movement, bounds clamping, delete/reorder, undo, and TOP behavior.
  - Required-field validation and recovery from a simulated storage failure.
  - Invalid-image error handling.

The Vercel build uses Node.js 22 through `package.json`. The development machine currently provides Node.js 24, so local pnpm prints an engine warning; compilation and tests still pass. Vercel will not show that mismatch.

## Remaining acceptance checks

- Upload a real photo taken by the target iPhone; confirm its orientation and manually check hold alignment after closing/reopening.
- Configure a Supabase project, apply the migration, and perform a cloud save/reopen round trip.
- Use a second anonymous identity to confirm database and Storage owner isolation against the deployed policies.
- Test route photos with closely spaced holds and touches with an actual finger.

These checks cannot be replaced by synthetic browser fixtures.

## Milestone 2A verification — 2026-09-23

- `pnpm typecheck`: passed.
- `pnpm build`: passed with Next.js 16.3.5 in Webpack mode.
- Playwright Chromium: **5 tests passed**, including all four V1 regression tests.
- The new end-to-end test creates a gym-tagged line, starts a session, records a Sent attempt with notes, reloads, and verifies the attempt remains visible.
- IndexedDB upgrades from version 1 to 2 without replacing the existing `projects` store.
- The cloud path adds owner-only session and attempt tables through `002_sessions_attempts.sql`.

## Milestone 2B verification — 2026-09-23

- TypeScript check passed.
- Six Playwright tests passed, including all V1 and 2A regressions.
- The 2B test creates a second line from an existing photo, saves it in count-only mode with zero holds, verifies IndexedDB stores no duplicate Blob, and records two attempts as its count.
- The cloud migration adds mode constraints and an owner-checked photo-reuse RPC.

## Milestone 2C verification — 2026-09-23

- TypeScript check passed.
- Seven Playwright tests passed, including all V1, 2A, and 2B regressions.
- The 2C test marks a line completed, finds it through the Completed filter, changes to list view, filters by gym, searches, archives the line, and restores it to Ongoing.
- Status changes update IndexedDB locally or the owner-protected `projects` row in Supabase.

## Milestone 2D verification — 2026-09-23

- TypeScript check passed.
- Eight Playwright tests passed, including all previous milestone regressions.
- The 2D test creates a line, starts a gym session, records a Sent attempt with notes, ends the session, verifies timeline counts and notes, then opens the line and verifies cross-session progress.
- History is derived from existing owner-scoped sessions, attempts, and lines, so no database migration is required for 2D.

## Version 0.2.2A verification — 2026-09-26

- TypeScript check passed.
- Production build passed with Next.js 16.3.5 in Webpack mode and static generation of `/` and `/manifest.webmanifest`.
- Ten Playwright Chromium tests passed, including all eight 0.2.1 regressions.
- The photo/notes test replaces a selected image, confirms old hold markers are cleared, saves line-level notes, reloads, and verifies the notes persist.
- The backup test exports IndexedDB records and their photo blobs, deletes the local database, imports the downloaded JSON file, and verifies the line, photo, and notes are restored.
- Supabase-backed line notes require `005_project_notes.sql`. Local export/import intentionally remains a device-storage feature for this milestone.

## Version 0.2.2B verification — 2026-09-26

- TypeScript check and the Vercel-equivalent production build passed.
- Eleven Playwright Chromium tests passed, including all 0.2.2A regressions.
- The new browser test records a failed start, switches to a partial start, rejects an ending hold before the selected start, then saves three attempts together and verifies their start and controlled-hold labels.
- Batch insertion is atomic in IndexedDB and uses one Supabase insert request. Sends remain single entries so one completion cannot be multiplied accidentally.
- Cloud-backed partial-start tracking requires `006_attempt_start_progress.sql`; existing local attempts load with a ground-start default.

## Version 0.2.2C verification — 2026-09-26

- TypeScript check and the Vercel-equivalent production build passed.
- Twelve Playwright Chromium tests passed, including all 0.2.2B regressions.
- The new session-flow test starts with two carried-in lines, verifies the live counters, switches between lines without returning Home, records an attempt, creates a new line during the session, and verifies each count updates.
- The same test records a send and verifies the completed confirmation and one-tap next-line action.
- Session counters and switching are derived from existing projects, sessions, and attempts, so this milestone requires no database migration.

## Version 0.2.2D / 0.2.2 final verification — 2026-09-28

- TypeScript check and the Vercel-equivalent production build passed with Next.js 16.3.5 in Webpack mode.
- Thirteen Playwright Chromium tests passed, including all twelve 0.2.2C regressions.
- The new browser test creates a reusable Warm-up line, reopens the saved hold editor, adds another hold, records a send, and verifies that the line remains Ongoing and the warm-up send stays out of performance send totals.
- Existing local records and version-1 backup files default to the `Project` purpose; no IndexedDB reset is required.
- Cloud mode requires `007_route_purpose_and_editing.sql`, which adds the purpose field plus owner-checked create and edit RPCs.

## Version 0.2.3F verification — 2026-09-30

- TypeScript check and the Vercel-equivalent production build passed with Next.js 16.3.5 in Webpack mode.
- Seventeen Playwright Chromium tests passed, including all earlier release regressions.
- Warm-up sends are consistently excluded from performance totals, and legacy completed Warm-ups are persisted back as reusable ongoing lines.
- Correcting an attempt result synchronizes the current line status; edited attempt times and hold order are validated.
- Past-session edits cannot move the session boundary past an attempt already stored inside it.
- An active session can still open and edit lines from another gym, but it cannot log their attempts into the wrong gym’s session.
- Cloud migration `008_preserve_attempt_hold_links.sql` updates retained holds in place so editing a line does not erase historical attempt-to-hold links.

## Version 0.2.4 verification — 2026-09-30

- TypeScript check and the Vercel-equivalent production build passed with Next.js 16.3.5 in Webpack mode.
- All 17 Playwright Chromium tests passed, including every earlier release regression.
- The photo-map test now verifies that a zoomed image pans inside its fixed frame and Reset restores both zoom and pan.
- Send uses one direct action; ordinary attempts use neutral language and a single start-state message.
- Historical session details, activity editing, and deletion share one responsive editor, which remains available during an active session and prevents overlapping time ranges.
- Grid and list controls now draw their icons explicitly with the current text color.
- This release changes no storage schema and requires no new Supabase migration.

## Version 0.3.0 verification — 2026-09-30

- TypeScript check and the Vercel-equivalent production build passed with Next.js 16.3.5 in Webpack mode.
- All 17 Playwright Chromium tests passed, including every 0.2.4 regression.
- Completed sessions now expose a visual report with duration, lines, attempts, controlled holds, and count-only repetitions.
- The report presents attempts chronologically and derives visible long breaks from gaps of 15 minutes or more without changing stored records.
- Session highlights are generated from sends, attempt volume, lines explored, and controlled-hold totals.
- Sharing generates a 1080×1350 PNG, uses native image-file sharing where available, and otherwise downloads the card.
- This release changes no storage schema and requires no new Supabase migration.

## Version 0.3.5 verification — 2026-10-01

- TypeScript check and the Vercel-equivalent production build passed with Next.js 16.3.5 in Webpack mode.
- All 18 Playwright Chromium tests passed, including every earlier regression.
- The Session Report now presents four visual pages: Cover, Rhythm, Routes, and Breaks. Completed-line totals deduplicate repeated sends of the same reusable line, and empty sessions report zero activity blocks.
- Each gym can store one local floor plan or wall map with normalized line markers. An active session can order mapped lines by relative map proximity to the most recently attempted mapped line.
- The new Gym Map regression test uploads a map, places a line, exports a backup, deletes local storage, imports the backup, and verifies that the image and marker return.
- IndexedDB advances to version 3 with a `gym_maps` store. Backup format version 2 includes map images and markers and remains compatible with version-1 imports.

## Version 0.3.6 verification — 2026-10-02

- Gym Map selection uses photo-first line cards with status, attempt context, notes, and a stable short code so duplicate Color + Grade names remain distinguishable.
- Both map creation directions are supported: optionally place a normal new line before saving, or select a Gym Map position and create a line there.
- Map placement remains optional and unmapped lines remain available in the map picker.
- The route detail uses one hold image for both review and attempt-end selection; attempts distinguish controlled and touched holds.
- Temporary route-preview URLs survive React development-mode effect checks, and Gym Map URLs are swapped before old URLs are released.
- Supabase cloud users must apply migration `009_attempt_hold_result.sql` before using touched-hold logging.
- Production build and the complete 18-test Playwright suite pass, including map backup round-trip, direct map creation, one-image attempt logging, and touched-hold persistence.
- Gym maps remain local-only in this release. Cloud mode explains the limitation before upload; shared public gym maps are planned after private account sync is established.

## Version 0.3.6 Quick Map supplement — 2026-10-05

- Quick Map builds its queue from only the selected gym's unmapped lines and keeps routes that reuse the same source photo adjacent.
- Each step presents the route photo, stable short code, attempt count, most recent attempt time, and line notes before placement.
- One map tap saves the normalized marker and advances to the next route. Skip and Undo remain available throughout the flow; Undo also reopens the final route after the completion state.
- Exact mapping remains optional, and the standard individual picker remains available outside Quick Map.
- TypeScript checking and the Vercel-equivalent production build pass with Next.js 16.3.5 in Webpack mode.
- All 18 Playwright Chromium tests pass. The Gym Map test now creates an unmapped reused-photo route, completes Quick Map, undoes and remaps it, then verifies all three markers survive backup export and import.

## Version 0.3.6 map refinement — 2026-10-05

- Saved Gym Map markers use compact circular targets and reveal their labels only when hovered, focused, or selected, reducing visual collisions between nearby lines.
- A saved marker can be dragged directly to a more precise position. The placed-line list also exposes a Move action so a specific route remains selectable when markers fully overlap.
- Archived routes are omitted from the current Gym Map, placed-line list, Quick Map queue, and active-session map preview. Their stored marker is retained and becomes available again if the route is restored.
- The focused Gym Map regression verifies marker drag persistence, archived-route hiding, and the same hidden state after backup export/import.
- TypeScript and all 18 Playwright Chromium tests pass.

## Version 0.3.6 map marker label refinement — 2026-10-05

- Full Gym Map markers and active-session map-preview markers display the route grade, such as `V2`, instead of a position-dependent sequence number.
- The placed-line management list keeps its numeric ordering separately.
- TypeScript and the focused Gym Map browser regression pass, including an explicit `V2` marker-label assertion.

## Version 0.3.6 route-color marker refinement — 2026-10-05

- Full Gym Map and active-session preview markers derive their fill from the route's automatic Color + Grade name.
- Common climbing colors use stable display values, and marker labels choose light or dark text for contrast. Unknown color names fall back to the existing sage marker color.
- TypeScript and the focused Gym Map browser regression pass, including an explicit teal rendered-color assertion.

## Version 0.3.7A field-session stability — 2026-10-05

- A cached or newly saved route photo now initializes the hold overlay even when the browser reports the image as already complete before the normal load callback.
- A failed route image shows an in-place retry action rather than requiring navigation away from the line.
- Add attempt remains the primary sticky session action; Log send is an explicit secondary action.
- Active sessions expose Edit session and permit correction of the start time without ending the session. Completed sessions continue to support start and end correction, and every edited range must contain its saved attempts.

## Version 0.3.7B Gym Map browse and edit — 2026-10-06

- Browse is the default safe mode: tapping a route opens its detail and marker dragging is disabled.
- Edit map explicitly unlocks placement, Quick Map, replacement, marker dragging, removal, and management controls.
- The map supports 1×–4× zoom, panning, low-zoom clusters, and a list of routes inside the current viewport.
- Opening a mapped route and returning restores gym, Browse/Edit mode, query, filter, selected route, zoom, and pan.
- The Gym Map browser regression covers placement and dragging in Edit, Browse-mode route opening, 150% zoom restoration after route detail, archived-route hiding, Quick Map, and backup round-trip.

## Version 0.3.7C two-gym cleaned-map pilot — 2026-10-06

- Bundled separate source and cleaned images for Movement Mountain View and Movement Santa Clara.
- Added an explicit cleaned-map choice for matching gyms, including source-photo comparison before use.
- Confirmed that applying a cleaned map retains existing marker data and uses the existing backup schema.
- Verified responsive pilot-map selection, production build, TypeScript, and the complete Playwright regression suite.

### Full 0.3.7 review corrections

- Replaced the newly regenerated pilot images with the final Mountain View and Santa Clara derivatives that the user had already reviewed and accepted.
- Fixed replacement of an uploaded gym-map Blob with a bundled cleaned map; the old Blob no longer reappears after refresh.
- Added a review step for gyms that already have a map, including cleaned preview and source comparison before replacement.
- Expanded the browser regression to cover uploaded map → placed marker → cleaned-map replacement → backup export → database reset → import. The cleaned map and marker both return.
- Final verification: TypeScript passed, production build passed, and 21 of 21 Playwright tests passed.

### 0.3.7C final review follow-up

- Fixed the fresh-device state so both cleaned-map pilot gyms are available before the user has created a line, session, or local map.
- Gym Map now opens in the most relevant gym context: active session first, then the current Line Library gym filter, then the most recently used project gym.
- Added a fresh-device regression covering both pilot gym options and expanded the cleaned-map regression to confirm that Santa Clara remains selected after creating a Santa Clara route.
- Final verification: formatting passed, TypeScript passed, the production build passed, and all 22 Playwright Chromium tests passed.
- Remaining gates are physical-device checks: map recognition and alignment in each gym, dense-marker touch precision, pinch/pan feel, and backup import on the target phone.

## Version 0.3.8A active-session workspace — 2026-10-06

- Added a sticky, horizontally scrollable session workspace with Current line, Map, Session lines, and Summary destinations.
- Current line follows the most recently attempted route in the active or historical-entry session and exposes a direct Continue action.
- Before the first attempt, Current line points the climber toward the gym-scoped library. Map and Session lines provide useful empty states, so neither a map nor an attempt is required for navigation to remain understandable.
- The new workspace links to existing content and keeps Line Library as the complete search and management surface; no data schema, backup format, or Supabase migration changed.
- Focused active-session navigation coverage passed. The production build passed, TypeScript passed, and the complete Playwright Chromium regression suite passed 22 of 22 tests.
- Phone field testing remains required for sticky-navigation reachability, horizontal scrolling, and one-handed switching during a live session.

## Version 0.3.8B same-wall-area discovery — 2026-10-06

- Replaced active-session “Nearby” language with Same wall area. This surface no longer implies physical walking distance or a recommendation.
- A mapped current line now reveals up to four ongoing routes inside its local map window directly beneath Current line. Each route opens in one action and shows its attempt count for the current session.
- The interim local-area rule includes markers within 22% of the current marker on both normalized map axes. The interface identifies this as map inference; missing placement and empty-area states remain explicit.
- Expanded the Gym Map round-trip regression with three mapped routes. It verifies that a route inside the local area appears, a farther route does not, the suggested route opens directly, and the new session and attempt survive backup export/import.
- TypeScript and the production build passed. The complete Playwright Chromium suite passed 22 of 22 tests.
- Field testing must determine whether the interim local window matches perceived wall areas in both pilot gyms before the threshold or future area model is finalized.

## Version 0.3.8C live session-line organization — 2026-10-07

- Session lines now separates current-session activity, resumable lines from earlier sessions, and untouched ongoing lines into three non-overlapping groups.
- Added a two-session regression: Green V2 receives an attempt in session one, appears under Recent from earlier sessions in session two, while untouched Blue V1 appears under Available to try. After Blue receives an attempt, it moves immediately into Tried this session and leaves Available.
- Updated established browser flows to address the full Line Library explicitly where both the new quick-switch card and the management card represent the same route.
- TypeScript and the production build passed. The complete Playwright Chromium suite passed 23 of 23 tests.
- Phone field testing remains required for horizontal route-card scrolling, group scan speed, and whether three groups remain useful with a large real gym library.

### 0.3.8C review and debug follow-up — 2026-10-07

- Fixed route-detail return behavior. Opening a line from Current line, Same wall area, Session lines, Line Library, History, or Gym Map now records the source scroll position and restores it on return instead of forcing the page to the top.
- The route-detail back label now names the active session destination: Current line, Map, Session lines, or Summary.
- Starting or entering a different session resets the workspace destination to Current line instead of carrying a stale selection from the previous session.
- Fixed the compact session-map preview so the image keeps its intrinsic aspect ratio and normalized markers remain aligned; the previous cover crop could shift marker positions.
- Session-map markers are now buttons that open their route directly.
- Focused coverage verifies return destination, restored Session lines viewport, session reset, 320-pixel horizontal overflow, preview/image height equality, and clickable preview markers.
- Production build passed. The complete Playwright Chromium suite passed 23 of 23 tests after the fixes.

## Version 0.3.8D mobile session controls — 2026-10-07

- Added a phone-only fixed bottom session dock with Current, Map, Lines, and Summary destinations. It stays reachable during long library and session-workspace scrolling and respects the device safe area.
- The active destination is explicit through `aria-current`, a highlighted state, a compact custom icon, and a visible label. The wider-screen session workspace remains unchanged.
- Added bottom content clearance and section scroll margins so the fixed controls do not cover session content after navigation.
- Preserved 0.3.8C route-detail continuity: returning from a line restores the selected destination and its previous scroll position.
- Disabled the Next.js development indicator because its bottom-left badge intercepted the Current control in the local phone preview. Compile and runtime errors still surface normally, and production output was unaffected.
- Expanded phone coverage to verify the fixed dock at 320 pixels, the active destination, no horizontal page overflow, and navigation to all four sections.
- Formatting and TypeScript passed. The production build passed. The complete Playwright Chromium suite passed 23 of 23 tests.
- Remaining acceptance gates are real-phone one-handed reachability, long-list scrolling, route-detail return continuity, and whether the four labels remain legible with the target device's safe area.

### 0.3.8D visual-hierarchy review — 2026-10-07

- Reduced the selected Browse/Edit segment from a solid dark-green block to a light gray-green state with a restrained inset border. The switch now reads as a mode selector instead of competing with primary actions.
- Added persistent mode feedback below the switch: Browse explains that markers are locked and open line details; Edit explains that placement and marker movement are unlocked.
- The focused Gym Map regression verifies both messages and the selected Edit background color.
- Review found no additional blocking regression in the 0.3.8D code path. TypeScript, the production build, and all 23 Playwright tests pass.
- Product decisions still requiring field evidence remain unchanged: phone dock reachability, the three Session lines groups at full library scale, and Same wall area accuracy in the two physical gyms.

## 0.3.9 — October 10, 2026

- Preserved a source snapshot under `version-snapshots/0.3.8d` before changing the product. Existing deployed versions are unaffected.
- Warm-up sends retain Completed status; completed warm-up/training lines remain eligible for recording at the same gym. Warm-up sends remain excluded from performance send totals.
- The route header shows total and current-session attempts. A mobile fixed action area exposes Add attempt and explicit Send; Switch lines is a collapsed disclosure.
- The active-session header keeps Quick log and End session reachable. Quick log uses a native modal dialog styled as a bottom sheet with independently scrolling content and persistent actions.
- Color swatches, V/Font grade choices and a custom entry are supported; grading preferences are stored per gym and included in device backups.
- Photo-less routes are explicitly identified with `photo_optional`. Loading and backup validation still reject missing photos on older photo-required routes. Later editing can attach a photo and map holds.
- Quick log commits the route, attempts and completion in one IndexedDB transaction. Same-color/grade routes are never silently merged; an existing mapped route opens in route detail for hold logging.
- Gym Map readiness checks an already-loaded image after URL changes. A failed load displays Retry rather than an indefinite loading label. The intermittent field issue still needs target-device verification.
- Added mobile Home/Library/Map/History navigation outside an active session. Existing active-session navigation and route-return state remain in place.
- Production build and TypeScript passed. Browser regression result recorded below after completion.
- Real-phone checks still required: keyboard resize, home-indicator spacing, sheet scroll, attempt-button reach, intermittent map reload, and warm-up reuse across sessions.
- Final production regression: 27 cases verified. 25 passed in the full production run; 2 persistence cases passed focused reruns after correcting assertions that reloaded before save completion. Map retry and later photo enrichment passed. Tests isolate external Google font requests.

### October 10, 2026 — 0.3.9 beta.2 mobile navigation follow-up

- Replaced the mobile-only scroll shortcut for Home/Library with distinct Session and Lines page bodies. Desktop retains its existing combined workspace.
- Main destinations now remain Session / Lines / Map / History during active sessions, with explicit selected states and separate tab scroll positions.
- Route detail retains its existing return origin and scroll restoration, while mobile gets a sticky back control and a single fixed recording action bar. The redundant inline quick-send remains available on desktop only.
- Mobile headings are compact; duplicate History/Map links and tutorial/footer decoration are hidden. Backup and transfer is a disclosure rather than an expanded panel.
- Gym grading system can be configured on the session creation screen and is reused by line creation/quick log.
- Pre-change source preserved in version-snapshots/0.3.9-before-navigation. Personal records were not changed by the migration.
- This is a mobile web shell improvement, not a native app release. Keyboard, touch and safe-area behavior still need device testing.

Validation: production build passed; five focused regression cases passed (mobile destinations, save/reload/resize, quick-log backup, later photo enrichment, fixed hold action). Tests use isolated browser storage.

### October 10, 2026 — mobile navigation review fixes

- Restored Tried this session / Recent from earlier sessions / Not tried yet groups on the Lines destination, below its title and filters. They had become inaccessible on mobile after the page split.
- Find a line now opens the Lines destination on mobile instead of scrolling to hidden content. Desktop section navigation keeps its existing behavior.
- Starting a session and editing past activity explicitly open the Session destination; start-session entry points reset to Start now.
- Restored the duration display and a distinct Past session heading for historical activity editing.
- Quick log always writes to the active session, even while historical activity is being edited. Opening a mapped line from that sheet also exits the historical logging context.
- Detail back labels reflect Lines / Session / Map / History origins.
- Migrated existing regression flows to the new destinations and collapsed backup tools. Added a regression proving a quick-log attempt belongs to the active session and leaves the historical attempt count unchanged.
- Browser review with existing personal records: 44 lines, 4 sessions, 94 attempts; map loaded, zoom stayed at 150% across detail open/back, and History remained accessible. Personal records were not edited.

Final review validation: production build succeeded; full regression run passed 29/29 in 41.2 seconds. Browser console reported no captured errors during local-data review. Previous failed runs included obsolete navigation targets and one test reloading before archive persistence completed; these tests now exercise the actual destinations and wait for the confirmed Archived state.

### October 10 — explicit wall-side membership

- User identified the geometric flaw: adjacent map markers may be on opposite sides of the same wall. Distance is no longer called wall membership.
- Added optional gym-scoped reusable wall-area names to line creation/editing. Opposite sides must use different names. Existing lines remain unassigned until explicitly edited; no inferred migration is performed.
- Same-wall suggestions use explicit matching area and gym, including unmapped lines; exclude archived lines and preserve reusable completed warm-up/training eligibility. Map distance remains a separate Map nearby fallback with an explicit warning.
- Device backups preserve the optional wall_area field. Cloud schema and automatic map-polygon assignment are not implemented in this device-storage phase.
- Validation: TypeScript and production build passed. Focused map/recommendation/backup regression passed (1/1, 8.3s), with explicit front/back wall labels. First run timed out before loading the page; second revealed an incorrectly targeted test assignment, corrected before the passing run. Full-suite rerun has not been performed for this follow-up.

## October 12, 2026 — 0.3.10 beta.1 Session Report integration

- User selected the session-wide summary preview for integration. Replaced Cover/Rhythm/Routes/Breaks with grade distribution, whole-session timestamp plot and photo-backed attempt-allocation bars.
- Sends remain included in attempt counts; warm-up records and send events are shown separately. Explicit record inspection is available by tap and accessible select. Empty sessions have an empty state.
- Line review is secondary and uses live route photos, normalized hold positions, grouped controlled/touched endpoints, per-attempt filtering, partial-start details and explicit send/top-out results. Count-only attempts do not become unestablished starts.
- Removed the old inferred-break narrative; timestamp gaps are not labeled as rest. Report definitions disclose current route metadata and batch timestamps. Existing image-share action remains available with its previous card design.
- Preserved previous report source under version-snapshots/0.3.9-before-report. No data schema migration or user-data mutation. Package/UI version advances to 0.3.10-beta.1 / 0.3.10.
- TypeScript excludes release packages, historical snapshots and isolated prototypes so copied older builds are not compiled as application source.
- Verification: production build passed. Full regression initially passed 27/29; two old assertions expected Sent instead of explicit Wall top-out and one distinct warm-up line instead of two send events. Corrected those expectations; both focused tests then passed (2/2, 3.7s), including image sharing. This is not claimed as a single 29/29 run.
