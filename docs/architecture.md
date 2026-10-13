# Bouldero: Version 0.3.8C

## 0.3.6 map and attempt model

- `Project.name` remains the automatic `Color + Grade` label. Selection surfaces pair it with the project photo, contextual metadata, and a display-only short code derived from the stable project ID.
- A draft Gym Map position is held separately from the route photo and hold coordinates. It can be selected during normal creation or supplied first by the Gym Map `Add a line here` flow.
- Saving a new line and its optional map marker is sequential: the project is persisted first, then the existing gym map receives the project marker. Skipping placement does not affect project creation.
- `Attempt.hold_result` distinguishes `controlled` and `touched`. Existing attempts with an ending hold default to `controlled`; touched holds contribute location progress but are excluded from controlled-hold totals.
- Route-photo previews own their temporary object URL until replacement, removal, save, or unmount. Gym map refreshes swap the new URL into state before releasing the prior URL.
- Quick Map is a client-side workflow over the existing Gym Map model: it derives an unmapped queue, groups shared-photo siblings by `source_project_id`, persists one marker through the existing map save operation, and advances only after that save succeeds. Skip state and the single-step undo record are temporary UI state; saved marker data and backup format remain unchanged.
- Marker dragging stores normalized coordinates through the same Gym Map save path. Archived markers are filtered at presentation time instead of deleted, so restoring a route restores its prior map context without a migration or backup-format change.

## Scope

Milestone 2D preserves sessions, count-only lines, photo reuse, and library organization, then adds a history timeline. The client joins the already owner-scoped session, attempt, and project rows: sessions form the timeline, attempts contribute results and notes, and project IDs supply line metadata and photos. No aggregate table or duplicated history data is introduced.

## Minimal architecture

- Next.js App Router, React, TypeScript. One client workspace with three views: projects, new project/hold editor, saved project. No separate backend server or state library.
- `components/bouldero.tsx`: view state and small forms/cards.
- `components/hold-map.tsx`: responsive image and pointer/keyboard interactions.
- `lib/coordinates.ts`: normalized geometry and ordering.
- `lib/photo.ts`: orientation normalization and compression.
- `lib/storage.ts`: anonymous Supabase identity, private photo storage, transactional project creation; explicit IndexedDB local mode when credentials are absent.
- Client identity/data loading prevents personal data from entering a shared static-render cache. Never include a service-role key in the client.
- Web manifest and standalone iOS metadata. Offline app-shell caching and background synchronization are deliberately not implemented; local persistence is not a guarantee that the app loads offline.

## Supabase schema proposal

| Table             | Fields                                                                                                        | Milestone           |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ------------------- |
| users             | id → auth.users, created_at                                                                                   | 1                   |
| projects          | id, user_id, name, grade, gym, photo_url, status, route_mode, source_project_id, purpose, created_at, sent_at | 1 + 2B + 0.2.2D     |
| holds             | id, project_id, order_index, x, y, is_top, created_at                                                         | 1                   |
| climbing_sessions | id, user_id, gym, started_at, ended_at                                                                        | 2A                  |
| attempts          | id, user_id, project_id, session_id, result, started_hold_id, ended_hold_id, topped_out, notes, created_at    | 2A + 0.2.1 + 0.2.2B |

`photo_url` stores a private bucket path rather than an expiring URL. Reads obtain a signed URL. All implemented tables and storage objects have owner-only RLS. The create RPC uses invoker rights and commits project + holds atomically. A failed database creation triggers best-effort photo cleanup. Storage and Postgres cannot share a transaction; a network interruption can leave an orphan photo, requiring a later cleanup job if production scale warrants it.

Attempts are accepted only while their owner’s session is active. A partial unique index allows one active session per user. Row-level policies verify ownership of the attempt, project, and session. `started_hold_id` is null for ground starts and identifies the selected hold for partial starts. For mapped attempts, a null `ended_hold_id` with `topped_out = false` means the climber could not establish the starting position.

Version 0.2.2 adds `purpose` (`project`, `warm_up`, or `training`) to each line. Legacy records default to `project`. A send completes a Project; reusable Warm-up and Training lines remain Ongoing. Warm-up sends remain in the attempt history but are excluded from performance send totals. Saved holds can be edited through an owner-checked transaction. Migration 008 updates retained holds in place, preserving historical attempt links; only removed holds are deleted and cleared from linked attempts.

## Photo and coordinate risks

1. **Letterboxing/cropping:** mapping images use block `width:100%; height:auto`, never a fixed-height `object-fit` box. The enclosing element has the image's actual bounds. Thumbnails can crop because they have no markers.
2. **Orientation:** browser decoding and a canvas bake EXIF rotation into the JPEG before mapping. Unsupported HEIC yields a clear conversion message. Verify actual iPhone camera output before declaring device support complete.
3. **Resolution/memory:** uploads are limited to 30 MB and resized to 2000 pixels on the longest side. Very large decoded images can still stress older phones; validate a real camera image on the target phone.
4. **Drag/scroll conflict:** only marker hit targets suppress touch scrolling. Pointer capture retains drags outside the marker; positions are clamped to [0,1]. A small dot marks the exact location and its number sits above it.
5. **Edges/density:** 44px marker targets can overlap when holds are close. Mapping is precise setup work. Test dense real routes before designing the later fast attempt interface.
6. **Persistence:** IndexedDB stores the same compressed Blob and coordinates together. Browser data clearing removes local projects; anonymous cloud identity is also tied to this browser until a future account-linking feature exists.
7. **Expired photos:** signed URLs last 24 hours and refresh when the project list is loaded again. A failed image gives a retry instruction.

## Implementation plan / acceptance gate

1. Scaffold a mobile-first shell and project creation form.
2. Decode/compress upload; immediately expose mapping beside details.
3. Add sequential markers, drag, keyboard movement, undo latest, delete/reorder, optional final TOP.
4. Persist photo and holds locally and through an authenticated Supabase RPC.
5. Reopen a project after reload; compare 15 marker positions against expected normalized values at phone and desktop widths.
6. Test delete/undo/TOP consistency, portrait/landscape, bounds, validation, keyboard movement, and save failure recovery.
7. Manually validate a real iPhone camera photo, then run the same round trip with configured Supabase and a second identity to confirm isolation.

Later milestones can build on these IDs without changing existing sessions or attempts.

## Planned Gym Map image-cleanup pipeline

### 0.3.7 — two-gym cleanup pilot

- Manually prepare one approved map for each of the user's two frequently visited gyms using the same documented standard.
- Preserve the source photograph and a separate cleaned derivative. Never replace or discard the source.
- Test whether cleaned maps improve marker placement, route recognition, zooming, and session navigation on the target phone before automating the workflow.
- Record any geometry drift, missing printed structure, ambiguous chalk, unreadable facility text, or marker contrast problem as pilot feedback.

### 0.3.8 — assisted map upload and processing

1. Accept a camera photo or image upload and store the untouched source privately.
2. Detect the printed map boundary, correct perspective, rotate, and crop without changing the map's aspect or internal geometry.
3. Separate permanent printed layers from temporary marks. Preserve the building perimeter, walls, openings, stairs, printed floor/wall fills, functional hatching, and confirmed facility labels. Remove handwritten dates, route-set notes, chalk grids, colored chalk zones, arrows, smudges, glare, shadows, bulletin-board surroundings, pins, and paper edges.
4. Reconstruct removed areas only from their surrounding printed layer: even dark background, continuous printed fills, crisp outlines, and uniform hatching. Do not invent rooms, walls, labels, or climbing zones.
5. Normalize contrast and sharpness for mobile use while keeping marker coordinates aligned with the cleaned image.
6. Show source and processed images side by side. The user can accept, retry, upload another photo, or keep the original; processing never publishes automatically.
7. Store both versions with processing status, map version, source provenance, and a review decision. Reprocessing creates a new version rather than silently moving existing markers.
8. If confidence is low or geometry changes, require manual review and marker-position confirmation.

Acceptance requires both pilot gyms to retain recognizable geometry, contain no temporary chalk or photographic surroundings, keep all permanent printed structure, support readable route markers at phone size, and survive export/import without losing the original or approved derivative.

For local storage, only the source project stores the photo Blob; reused lines store `source_project_id`. In Supabase, reused rows retain the owner-only Storage path selected from their source. The V2 creation RPC verifies source ownership and enforces at least one hold for mapped lines and zero holds for count-only lines.

Reference: [Next.js App Router](https://nextjs.org/docs), [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## 0.3.7B Gym Map interaction model

- The map opens in Browse mode. Route markers open route detail and cannot move until the user explicitly enters Edit map.
- Edit mode contains creation, Quick Map, replacement, individual placement, marker dragging, removal, and the complete placed-line management list.
- The viewport owns a 1×–4× camera with button, trackpad-pinch, touch-pinch, and drag-pan input. Map coordinates remain normalized to the original image; zoom changes presentation only.
- Browse mode groups dense markers at low zoom. Selecting a cluster increases zoom around its center, while a visible-area list provides an accessible route target outside the image.
- Gym, mode, search, selected line, unmapped filter, zoom, and pan live in the parent workspace so opening route detail and returning to Gym Map restores the same context.
- No stored schema, backup format, marker coordinates, or Supabase migration changes in this milestone.

## 0.3.7C cleaned-map pilot

- The two pilot gyms have separate immutable source photographs and cleaned derivatives under `public/gym-maps/`.
- A matching gym offers its cleaned pilot map inside Gym Map. Applying it is explicit; the app never silently replaces a user's current map.
- Applying a cleaned image preserves the existing `GymMap` record and its markers, so the user can inspect alignment and reposition lines in Edit mode.
- Bundled public asset URLs are stored in the existing `image_url` field and remain portable in backups without increasing backup size. No storage schema change is required.

## 0.3.8A active-session workspace

- An active session exposes four stable destinations: Current line, Map, Session lines, and Summary.
- Current line resolves from the latest attempt in the active or backfilled session and provides a direct continuation action.
- Empty Map and Session lines states keep navigation complete without requiring a map or a first attempt.
- The workspace navigation is horizontally scrollable and sticky on narrow screens. It links to existing session content rather than duplicating Line Library management.
- This milestone changes navigation and presentation only. IndexedDB, Supabase, and backup schemas remain unchanged.

## 0.3.8B same-wall-area discovery

- Same wall area is distinct from recommendation. It shows ongoing mapped routes inside a local rectangular map window around the current route; it does not claim to know walking distance or the best next climb.
- The local prototype uses a 22% normalized radius on each map axis as an interim wall-area proxy. This is explicitly labelled as map inference and can later be replaced by shared gym-area data without changing route or attempt records.
- Same-wall routes appear directly under Current line and open in one action. The Map workspace uses the same definition and language.
- Unmapped current routes explain that map placement enables discovery. A mapped route with no peers reports an empty local area rather than falling back to unrelated routes.
- Archived and completed project routes stay excluded from live-session discovery. Historical-entry mode keeps its existing broader behavior.

## 0.3.8C live session-line organization

- Session lines have three mutually exclusive groups: routes attempted in the current session, ongoing routes attempted in earlier sessions, and ongoing routes with no attempt history.
- Tried this session sorts by the most recent attempt in the current session. Recent from earlier sessions sorts by the most recent historical attempt. Available to try sorts by creation time.
- A route moves into Tried this session immediately after its first current-session attempt. Cards show current-session attempt counts or earlier-attempt recency and open the route directly.
- Completed and archived routes remain outside the unattempted live-session groups. Historical-entry mode may show non-archived routes so past records can be reconstructed.
- Line Library remains responsible for complete search, status filtering, editing, Completed, and Archived management.
