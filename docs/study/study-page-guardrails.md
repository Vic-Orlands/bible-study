# Study Page Implementation Guardrails

Last audited: 2026-06-15

Scope: `/study` only.

This document exists to protect implemented work from being overwritten by future agent passes. Treat this as the current feature map and repair list before changing `app/study/page.tsx`, the `/study` support components, or the Convex tables/functions used by `/study`.

## Verification Snapshot

- `npm run build` passes.
- `npx convex codegen` passes and has pushed the current Convex functions/schema.
- `/study` is a client page via `"use client"` in `app/study/page.tsx`.
- The app now uses Better Auth with the Convex Better Auth component for Google login. Do not wire `@convex-dev/auth` back in.
- Convex AI guidance was read from `convex/_generated/ai/guidelines.md`.

## Implemented

### Page Shell

- Top product shell is implemented in `components/product-shell.tsx`.
- `/study`, `/reading-plan`, and `/community` nav links are present.
- Online/offline indicator exists.
- Profile dropdown exists with Bookmarks, Settings, Profile, and Sign In/Log Out actions.
- Notifications bottom sheet is wired through `components/notifications-sheet.tsx`.
- Notifications bottom sheet now uses the same centered bottom-sheet shell and card treatment as the bookmark sheet instead of a full-width custom drawer.
- Notification rows show passage plus timestamp metadata.
- Tapping a notification on `/study` now reopens the matching passage, opens the Study rail, and scrolls the linked comment or reply into view when `commentId` is present.

### Bible Reader

- `/study` renders a three-region reader: left index/search rail, central scripture reader, and right study rail.
- Bible text and version catalog now load through API.Bible plus enabled custom translations via `app/api/api-bible/route.ts`, `app/api/custom-translations/route.ts`, `lib/scripture.ts`, and the `lib/bible-queries.ts` compatibility export.
- HelloAO requests are proxied through `app/api/helloao/route.ts`.
- API.Bible requests are proxied through `app/api/api-bible/route.ts`.
- Custom translation source reads are proxied through `app/api/custom-translations/route.ts`.
- IndexedDB caching is implemented with Dexie in `lib/db.ts`.
- Upstash Redis caching is implemented in the HelloAO and API.Bible proxies when Redis envs are configured.
- Chapter navigation is implemented with first, previous, next, and last chapter controls.
- Passage picker is implemented with book, chapter, and verse columns.
- Selected passage persists through Zustand in `lib/study-store.ts`.
- The reader auto-scrolls to selected verses after chapter load.
- Verse highlighting and flashing state are implemented.

### Translation Comparison

- Translation list now comes from the merged API.Bible catalog plus enabled Convex custom translations and is normalized in `lib/scripture.ts`.
- Visible translations are persisted in Zustand.
- Reader supports up to three visible translations.
- Users can add, remove, or swap visible translations.
- Per-translation loading and error states exist.
- Preferred ordering favors mainstream English versions first when available from API.Bible.
- Visible version persistence resolves against stable normalized version ids, not only display abbreviations.

### Left Rail

- Search scripture panel is implemented.
- Direct reference parsing works for references like `John 1:1`.
- Direct reference parsing also supports ordinal book forms without spaces such as `1Timothy 2:1`, `1stTimothy 2:1`, and spaced forms like `1 Timothy 2:1`.
- Search matches are limited to the current chapter, with an optional all-translation current-chapter search when the search box is active.
- Full Bible index is implemented with Old Testament/New Testament grouping.
- Chapter expansion and verse picking are implemented.
- Filters for All, Old Testament, New Testament, Bookmarks, Notes, Study, and Audio are present.
- Bookmarks, notes, public study comments, and audio notes can be surfaced in filter results for the current chapter.

### Bookmarks

- Bookmark table and Convex functions exist in `convex/bookmarks.ts`.
- Bookmark button exists in the reader toolbar.
- Verse-level bookmark actions exist in verse hover controls.
- Shift-click verse range selection is implemented in the reader.
- Selected verse ranges can be bulk-bookmarked.
- Bookmarks bottom sheet lists saved bookmarks.
- Bookmark deletion confirmation exists in the sheet.
- Bookmark reads and writes are owner-scoped by Convex-authenticated identity or anonymous identity.

### Public Study Comments

- Right panel `Study` tab is implemented.
- Comment list is loaded from `convex/comments.ts`.
- Top-level comments and replies are grouped into threads.
- Composer can create top-level comments.
- Reply composer can create replies.
- Like toggling is implemented with optimistic UI.
- Comment edit/delete UI exists for owner comments.
- Reply and like notifications are inserted in Convex when a parent/comment has a `userId`.
- `RichScriptureText` turns scripture references inside comments into clickable references with hover previews.
- Comment create/update/delete and likes now use server-side owner checks.

### Personal Notes

- Right panel `Notes` tab is implemented.
- Notes table and Convex functions exist in `convex/notes.ts`.
- Composer can create notes.
- Note cards display type, verse, and content.
- Note editing, type changing, and deletion UI exist.
- Notes appear in left rail filters and activity counts.
- Notes are scoped to the current authenticated or anonymous owner.
- Note update/delete now verifies ownership server-side.

### Audio Notes

- Right panel `Audio Notes` tab is implemented.
- Audio note table and Convex functions exist in `convex/audioNotes.ts`.
- Microphone recording flow exists through `MediaRecorder`.
- Upload presigning route exists at `app/api/upload/route.ts`.
- Transcription route exists at `app/api/transcribe/route.ts`.
- Cloudflare R2 upload and Deepgram transcription flow are attempted after recording.
- Optimistic pending upload UI exists.
- Audio note listing and deletion UI exist.
- Audio note listing and deletion are owner-scoped.
- Audio playback uses `audioUrl`.
- Audio upload/transcription checks response statuses and logs async errors.

### Activity

- Right panel `Activity` tab is implemented.
- Passage stats are loaded from `convex/activity.ts`.
- Recent activity list uses recent comments.
- Visual activity path is implemented.

### Bottom Drawer

- Bottom drawer tabs exist for Commentary and Cross-Refs.
- Commentary fetches HelloAO Tyndale commentary data through the normalized adapter in `lib/study-data.ts`.
- Cross-Refs fetch HelloAO open cross-reference data through the normalized adapter in `lib/study-data.ts`.
- Parallel and Interlinear were removed because they were placeholders.

### Reading Plans

- `/reading-plan` is no longer mock-only.
- Reading plans are app-owned Convex data, not outsourced to a scripture provider.
- Plan templates are defined in `lib/reading-plan-templates.ts`.
- Convex plan state and progress logic live in `convex/readingPlans.ts`.
- Users can start a curated plan, see their current progress, continue reading into `/study`, and mark plan entries complete.
- Current templates include Whole Bible, New Testament, Gospels, and Psalms/Proverbs variants.

### Mobile Study Tools

- Mobile controls are available for Index, Study, Notes, Audio, and Activity while desktop rails are hidden.
- Mobile Study, Notes, Audio, and Activity reuse the same Convex-backed panels.
- Mobile Index provides book/chapter navigation and direct reference jumps.
- Anonymous guest identity is loaded through the app route `/api/identity/anonymous`, which proxies to the Convex HTTP action and avoids browser cross-origin failures.

### Translation Admin

- Custom translation registry is stored in Convex through `convex/customTranslations.ts`.
- Admin authorization is Better Auth-backed and checked server-side through `convex/admin.ts` and `api.auth.getAdminState`.
- Admin UI lives in `app/admin/page.tsx` and `components/custom-translations-manager.tsx`.
- Profile dropdown shows a `Translations` admin entry only for allowed admin users.
- Source validation runs through `customTranslations.validateSource` before save or enable decisions.

## Not Fully Implemented

### Google Login / Auth

- Better Auth is installed with `better-auth` and `@convex-dev/better-auth`.
- Convex component registration is in `convex/convex.config.ts`.
- Convex Better Auth setup lives in `convex/auth.ts`.
- Convex JWT provider setup lives in `convex/auth.config.ts` through `getAuthConfigProvider()`.
- Better Auth HTTP routes are registered in `convex/http.ts` and proxied through `app/api/auth/[...all]/route.ts`.
- Client auth provider is `ConvexBetterAuthProvider` in `app/providers.tsx`, using `lib/auth-client.ts` and `lib/convex.ts`.
- The `/login` page is a client page with one Google sign-in action only.
- Homepage Sign In now routes to `/login`.
- The product shell dropdown signs out through `authClient.signOut()` and routes unauthenticated users to `/login`.
- The study sign-in sheet uses `authClient.signIn.social({ provider: "google" })`.
- `@convex-dev/auth` and `@auth/core` were removed from dependencies.

Required env/config notes:

- Next/local env needs `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL`.
- Convex deployment env needs `SITE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ADMIN_EMAILS`.
- Google OAuth redirect URI should point at the app route: `{SITE_URL}/api/auth/callback/google`.
- The existing deployment `JWKS` env was from the old auth path and is not used by Better Auth. Do not pass it into `getAuthConfigProvider()` unless it is replaced with Better Auth's expected JWKS array.
- Bible provider env needs `API_BIBLE_URL` and `API_BIBLE_KEY`.

### Scripture Providers

- The provider split is now intentional and should be preserved:
  - Bible text + version catalog: API.Bible plus enabled custom translations
  - Commentary: HelloAO Tyndale
  - Cross-References: HelloAO open-cross-ref
- Do not collapse these back into one guessed provider layer.
- UI components should consume normalized app-facing types from `lib/scripture.ts` and `lib/study-data.ts`, not raw upstream response shapes.

External verification still needed:

- A real Google OAuth browser login must be tested against the deployed/local app after the Convex env vars and Google Console redirect URI are confirmed.
- If login succeeds but Convex functions still see `ctx.auth.getUserIdentity()` as null, inspect the `/api/auth/convex/token` response and the Better Auth session cookie before changing ownership code.

### Legacy Google Login / Auth Notes

- The old `@convex-dev/auth` implementation was removed.
- Do not bring back `ConvexAuthProvider`, `useAuthActions`, `convexAuth`, `authTables`, or `auth.addHttpRoutes`.
- Do not route login to `/auth/login`; the active login page is `/login`.

### Auth/Data Ownership

- `convex/ownership.ts` centralizes owner resolution.
- Anonymous ownership uses an IP-backed row in the `identities` table.
- Signed-in ownership prefers the same `identities` row, not a separate auth-only owner key.
- `/study` creates or restores the guest identity first, then claims that same identity on sign-in through `identity.syncViewerIdentity`.
- Identity claim updates the identity row with signed-in user details and migrates old owner-key records from the auth token id onto the identity id.
- `ctx.auth.getUserIdentity()` is still used server-side for authentication, but the stable data owner should be the `identities` document id whenever one exists.
- Do not reintroduce client-provided `userId` authorization.

### Bookmarks

- Toolbar bookmark state now checks the selected verse.
- `bookmarks.listForGuest`, `bookmarks.isBookmarked`, `bookmarks.toggle`, and `bookmarks.addMany` are owner-scoped.
- Guests can bookmark immediately through their IP-backed identity before sign-in.

### Notes

- Notes now store `ownerKey` on new writes.
- `notes.listForPassage`, update, and remove are owner-scoped.
- Composer always creates notes as `observation`; type selection only exists during edit.
- Guest notes stay attached after sign-in because the guest identity is claimed instead of replaced.

### Comments

- Guest display names are stored on new comments.
- Owner UI checks `ownerKey`, legacy `userId`, or legacy `identityId`.
- Comment update/delete verifies owner server-side.
- Guest comments and replies stay attached after sign-in because the guest identity is claimed instead of replaced.
- `/study` state now includes a transient focused comment id used for notification-driven scroll/focus.
- Mentions are represented in the notification schema but no mention parsing or notification creation exists.
- Public participant avatar stack is hardcoded.

### Audio Notes

- Audio playback now uses `audioUrl`.
- Audio note creation stores `ownerKey`.
- Audio note list/update/delete are owner-scoped.
- Guest audio notes stay attached after sign-in because the guest identity is claimed instead of replaced.
- Audio upload/transcription checks response status before using JSON.
- Audio async catches log errors.
- Recorded duration is saved from elapsed recording time and shown in the UI.
- Playback speed cycles through real audio playback rates.
- Waveform is static unless passed manually; recording does not compute waveform.

### Activity

- Activity stats count public comments plus owner-scoped notes/audio.
- `recentForPassage` only includes comments, not notes/audio.
- `recentForPassage` precedence bug is fixed.

### Bottom Drawer

- Parallel and Interlinear were removed.
- Commentary and Cross-Refs are read-only in v1.
- Commentary/Cross-Refs resolve HelloAO book ids from `BSB/books.json` instead of guessing path names.
- Commentary/Cross-Refs throw on non-OK responses and surface the error state.

### Settings/Profile

- Settings font size updates the reader font size CSS variable.
- Dark mode toggles `document.documentElement.classList`, but the page is not fully themed for dark mode.
- Profile sheet Log Out is wired for authenticated users.
- Profile dropdown positioning was corrected.

### Mobile/Responsive

- Left rail is still desktop-first below `lg`, but mobile Index access exists through the mobile controls.
- Right rail is still desktop-first below `xl`, but mobile Study, Notes, Audio, and Activity access exists through bottom sheets.

## Failing Or Risky Items To Fix First

1. Fix auth identity ownership model. Done in code.
   - The app uses Better Auth with the Convex Better Auth component.
   - Guests are identified by an IP-backed `identities` row.
   - Signed-in users claim that same identity row so their guest data survives sign-in.

2. Scope user-owned data. Done in code.
   - Bookmarks, personal notes, and audio notes must query by current authenticated identity or anonymous identity, not just passage.
   - Update mutations must verify ownership before patch/delete.
   - Toggle bookmark must include owner in the lookup.

3. Fix Google login before building more signed-in features. Better Auth code-side switch is done; external OAuth verification remains.
   - Confirm Convex deployment env vars: `SITE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
   - Confirm Next env vars: `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL`.
   - Confirm Google OAuth callback URL is `{SITE_URL}/api/auth/callback/google`.
   - Confirm `/api/auth/[...all]` proxies to the Convex site route and `authClient.convex.token()` returns a token after login.

4. Fix audio note runtime bugs. Mostly done.
   - Use `audioUrl` for playback or map it to `url`.
   - Add `console.error` to all audio async catch blocks.
   - Check API response statuses before reading JSON.
   - Store real duration and improve playback controls.
   - Waveform generation is still static and can be improved later.

5. Fix privacy leaks. Done for owner-scoped data.
   - `notes.listForPassage`, `bookmarks.listForGuest`, and `audioNotes.listForPassage` are owner-scoped.

## New Guardrails For This Migration

- Do not move Bible text/version fetching back to HelloAO.
- Do not expose `API_BIBLE_KEY` to the client.
- Do not hardcode a fake translation catalog when API.Bible data is available.
- If API.Bible or a custom source does not supply a translation, hide it from the picker instead of pretending it exists.
- Keep reading plans app-owned in Convex even if an external provider later offers plan content.
   - The UI labels notes as private, and backend scope now matches that promise.

6. Fix malformed UI and placeholders. Done for identified items.
   - Correct the profile dropdown class.
   - Wire ProfileSheet Log Out / Sign In.
   - Parallel/Interlinear were removed.

## Guardrails For Future Agents

- Do not rewrite `/study` from scratch.
- Do not remove the client component boundary from `app/study/page.tsx`.
- Do not introduce React Server Components for `/study`.
- Do not replace `ConvexBetterAuthProvider` with plain `ConvexProvider` while auth is required.
- Do not mix Better Auth and the old Convex Auth package in the same implementation.
- Do not create or mutate private user data without server-side identity checks.
- Do not list bookmarks, notes, or audio notes globally when the UI says “My”.
- Do not accept `userId` from the client for authorization.
- Do not add fallback auth identities that mask broken login.
- Do not add comments unless they explain complex logic.
- Do not leave async catch blocks without `console.error`.
- Do not add placeholder UI and mark it as implemented.
- Do not change existing schema ownership fields without a migration plan.
- Do not touch unrelated pages while working on `/study`.

## Suggested Fix Order

1. Auth provider decision and Google login repair.
2. Server-side ownership model for comments, notes, bookmarks, audio notes, and notifications.
3. Data query scoping for “My” features.
4. Audio note playback/upload/transcription hardening.
5. Profile/settings polish.
6. Bottom drawer feature completion or placeholder removal.
7. Mobile equivalents for hidden desktop rails.

## Files To Review Before Any `/study` Change

- `app/study/page.tsx`
- `components/product-shell.tsx`
- `components/notifications-sheet.tsx`
- `components/rich-scripture-text.tsx`
- `lib/study-store.ts`
- `lib/bible-queries.ts`
- `lib/helloao.ts`
- `convex/_generated/ai/guidelines.md`
- `convex/auth.ts`
- `convex/auth.config.ts`
- `convex/convex.config.ts`
- `convex/schema.ts`
- `convex/bookmarks.ts`
- `convex/comments.ts`
- `convex/notes.ts`
- `convex/audioNotes.ts`
- `convex/activity.ts`
- `convex/notifications.ts`
- `convex/http.ts`
- `app/providers.tsx`
- `app/login/page.tsx`
- `app/api/auth/[...all]/route.ts`
- `lib/auth-client.ts`
- `lib/convex.ts`
- `app/api/helloao/route.ts`
- `app/api/upload/route.ts`
- `app/api/transcribe/route.ts`
