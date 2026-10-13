# Bouldero 0.3.10 beta.1 — deployment package

Prepared October 12, 2026. This is the current test build, including the integrated session-wide visual report and explicit wall-area assignments.

## GitHub and Vercel

Upload the contents of this folder to a new repository. Put package.json at the repository root. If GitHub retains this enclosing folder, select it as Vercel’s Root Directory.

Use a new Vercel project to preserve prior deployments. Framework: Next.js. Node: 22.x. Keep the detected install/build/output settings. Leave Supabase variables unset for current device-local testing. No setup of Supabase is required.

Export a backup on the old phone version and import it on the new deployment using Backup & transfer. The new domain has separate browser storage; importing does not alter the old deployment’s records.

## Test this build

Open History → View session story. Check difficulty distribution, all-session timestamps, photo-backed attempt bars and line endpoint review. Verify warm-up sends separately, repeated send events, touched/controlled endpoints, start attempts and wall top-outs. The share-image action retains the previous card design.

Build passed. 27 cases passed in the full regression; the two report tests passed focused reruns after correcting old expectations. Physical-phone acceptance remains pending.

This folder excludes dependencies, generated builds, preview prototypes, downloaded backups, personal photos used in prototypes, screenshots, environment secrets and version snapshots.

---

## Preserved project documentation

# Bouldero

A quiet, mobile-first climbing notebook. **Version 0.3.8C:** organizes active Session lines into Tried this session, Recent from earlier sessions, and Available to try. Lines move between groups automatically as attempts are logged, while the complete Line Library remains the management surface. It retains the 0.3.8A/B workspace and does not change stored data or backups.

## Run locally

Requires Node.js 20.9+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. Without Supabase settings, the app clearly labels local mode and persists projects/photos in IndexedDB in this browser. There are no seeded projects or made-up attempts.

## Connect Supabase

1. Create a Supabase project.
2. Run all files in `supabase/migrations` in numeric order, or apply them with the Supabase CLI. Existing installations that already applied migration 007 also need migration 008 before editing mapped lines in cloud mode.
3. Enable **Authentication → Sign In / Providers → Anonymous Sign-Ins**.
4. Copy `.env.example` to `.env.local` and set the project URL and **publishable** key. Never use a secret/service-role key.
5. Restart the development server. The footer changes to “Private cloud workspace.”

New projects now use private Supabase Storage and Postgres. Local projects are not silently migrated. Anonymous identity persists in this browser; clearing its auth storage loses access to that identity. Account recovery and cross-device sign-in are out of this milestone's scope. For public deployment, configure Supabase's recommended anonymous-auth abuse protection.

## Use

From Home, choose **Start a session**, enter or pick a gym, and use the live session timer at the top of the page. Open one of that gym's ongoing lines, record each attempt, tap the final hold reached, and add an optional note. A Project send completes the line; Warm-up and Training sends keep the line reusable. Lines at other gyms remain editable, but their attempts cannot be mixed into the current gym’s session. End the session when the climbing day is over. Sessions and attempts remain available after reload.

For a mapped attempt, choose whether it began from the ground or from a specific hold. Choose **Couldn’t get into the start** when the starting position was never controlled. Otherwise, choose the last hold controlled with stability; merely touching a hold does not count. When several similar attempts accumulated before logging, set **Attempts to add** to save up to 20 in one action. Use the separate Send action when the line is complete; sends remain single entries.

During an active session, Home shows live counts for attempts, lines created during the session, and ongoing lines carried in from earlier sessions. A line detail page lists the other ongoing lines at the same gym so they can be opened directly. After a send, the completed state is explicit and the next ongoing line is one tap away.

Choose **New line** and upload/take a photo or reuse a saved wall photo. Then choose **Map holds** to place holds from start to finish, or **Reps only** when individual markers are unnecessary. Set its purpose to Project, Warm-up, or Training. Enter the color and grade; the line name is generated automatically. A mapped line can finish on its last hold or by topping out onto the wall. Reused lines reference the original photo rather than storing another copy. Saved hold maps can be reopened, dragged, reordered, deleted, and extended.

Add optional **Line notes** for beta, movement cues, or pain warnings; they remain visible on the line detail page. Before saving, choose a different photo at either setup step if the first selection was wrong. In local mode, use **Export backup** and **Import backup** at the bottom of Home to move or restore all lines, photos, sessions, attempts, and notes. Import uses existing record IDs, so importing the same backup again does not duplicate it.

Open **History** to review sessions newest-first. Each entry shows its gym, duration, lines, attempts, sends, and saved notes. Expand **Session report** to see duration, lines, attempts, controlled holds, session highlights, a chronological attempt story, and automatically detected breaks of 15 minutes or longer. **Create & share image card** generates a 1080×1350 PNG, opens the device share sheet when image-file sharing is available, and otherwise downloads the card. A single **Edit session** panel updates its gym and times, opens its detailed activity for corrections, or deletes it. Past sessions remain editable while a current session is running, but their times cannot overlap.

Use the line library tabs to switch between **Ongoing**, **Completed**, **Archived**, and **All**. Search by line name, grade, or gym; filter to one gym; and switch between thumbnail and list layouts. From a line detail page, mark it completed, archive it, or move it back to ongoing. During an active session, lines from the current gym sort to the top.

Open **Gym map** and choose **Quick map** to work through only the selected gym's unmapped current lines. Each step shows the route photo, short code, attempt context, and notes; tap its location once to save and advance automatically. Reused-photo siblings stay together in the queue. Skip uncertain lines, undo the most recent placement, or leave exact placement for later—map position remains optional. Map markers use the route color and show its grade instead of an arbitrary sequence number, with readable light or dark label text. Saved markers can be dragged to refine their position; the placed-line list also provides **Move** when nearby markers overlap. Archived lines stay hidden from the current map while retaining their saved position if restored later.

## Verify

```sh
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test
```

Tests exercise the browser upload/save/reload flow, mapping behavior, validation, session/attempt persistence, count-only lines, and true local photo reuse. See [architecture and acceptance risks](docs/architecture.md) and [verification notes](docs/verification.md).

## Deploy

This repository is configured for Vercel with Node.js 22 and an exact, frozen dependency lockfile. Vercel detects the pnpm lockfile and Next.js preset automatically.

The scripts use Next.js's supported Webpack mode. This keeps local development stable when `node_modules` lives outside the iCloud-synced Documents folder; Vercel runs the same production build command.

1. Push this directory to a GitHub repository.
2. In Vercel, select **Add New → Project**, import the repository, and keep the detected Next.js defaults.
3. For device-local testing, leave the Supabase variables unset and deploy. Each phone/browser stores its own projects in IndexedDB.
4. For shared cloud data, apply all migrations in numeric order, enable anonymous sign-ins, then add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in **Project Settings → Environment Variables** for Production, Preview, and Development.
5. Deploy, open the generated HTTPS URL in iPhone Safari, and optionally use **Share → Add to Home Screen**.

No Vercel build-command, output-directory, or install-command override is needed. HTTPS supports the intended phone experience. The manifest provides standalone launch metadata; offline loading/background sync are not implemented.

### 0.3.9 — October 10, 2026

This local build combines session feedback repairs, visiting-gym quick logging and core mobile interaction updates. Start a session, then use **Quick log** in the session header to record color, grade and Attempt/Send without a photo. The sheet stays open for the next line; duplicate color/grade labels require an explicit new/existing choice. Photos and hold maps can be added later with Edit line & holds.

Warm-up sends now remain Completed while the line stays reusable. Route attempt counts are shown near the heading; mobile logging actions are fixed at the bottom and route switching starts collapsed. Gym Map failures offer Retry. Gym grading preferences support V, Font and custom grades and travel with device backups. Cloud synchronization is not enabled by this release.

Previous source is retained in `version-snapshots/0.3.8d`. Deploy 0.3.9 as a separate Vercel project if you want to preserve an old deployment and its browser-local data. New photo-less backups require 0.3.9 or newer for import. Session Report redesign is next in 0.3.10; Supabase remains planned for 0.4.0.
