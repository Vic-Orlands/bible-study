# Bible Study

Bible Study is a private and community study workspace for reading Scripture, comparing translations, capturing notes, discussing passages, and following reading plans without losing context.

The product combines a three-region Bible reader with reference-aware writing. A passage mentioned naturally inside a note or discussion becomes part of the reading experience instead of remaining inert text.

## Rich Scripture Text

`RichScriptureText` detects Bible references inside comments and notes, renders them as interactive links, loads a verse preview on hover, and navigates the reader to the referenced passage on click.

### Supported reference formats

| Format | Examples | Behavior |
| --- | --- | --- |
| Standard chapter and verse | `John 1:1`, `Genesis 1:1` | Links directly to the verse |
| Chapter only | `John 1` | Links to the chapter and defaults to verse 1 |
| Verse range | `1 Peter 1:1-5` | Preserves and displays the complete range |
| Flexible spacing | `John 1: 3 - 4` | Ignores optional spacing around separators |
| Dot separator | `John 1.1` | Treats the dot as a chapter/verse separator |
| Unicode dashes | `John 1:1–5`, `John 1:1—5` | Accepts en dashes and em dashes in ranges |
| Numeric ordinal | `1 John 1:1`, `2 Corinthians 3:4` | Supports numbered Bible books |
| Written ordinal | `1st John 1:1`, `2nd Timothy 2:1`, `3rd John 1:5` | Normalizes ordinal prefixes |
| Roman-numeral ordinal | `I John 1:1`, `II Corinthians 3:4`, `III John 1:5` | Normalizes Roman-numeral prefixes |
| Compact ordinal | `1Timothy 2:1`, `1stTimothy 2:1` | Accepts ordinal books without an intervening space |
| Multi-word book | `Song of Solomon 1:1`, `Song of Songs 1:1` | Recognizes supported long-form book names |
| Common abbreviation | `Gen 1:1`, `Ps 23:1`, `Matt 5:3`, `Rev 21:4` | Recognizes common canonical abbreviations |

Separate references remain separate links. For example, `John 1:1 - John 1:10` produces one link for each complete reference rather than treating the text as a same-chapter verse range.

## What is implemented

- Three-region study workspace with Bible index and search, a central reader, and contextual study tools
- Up to three visible translations with persisted selection and normalized provider data
- Direct reference search, chapter navigation, verse highlighting, and shift-click verse-range selection
- Private notes, public threaded comments, replies, optimistic likes, and owner-checked mutations
- Verse and range bookmarks with saved-bookmark management
- Audio-note recording, Cloudflare R2 upload, Deepgram transcription, playback, and deletion
- Commentary and cross-references through normalized HelloAO adapters
- Curated, app-owned reading plans with progress, in-place reading, reflections, and focus mode
- Responsive mobile tools for the index, study threads, notes, audio, and activity
- Better Auth with Google sign-in and server-side admin controls for custom translation sources

## Architecture

| Area | Implementation |
| --- | --- |
| Web application | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Application data | Convex queries, mutations, HTTP actions, and scheduled jobs |
| Authentication | Better Auth with the Convex integration and Google OAuth |
| Scripture text | API.Bible plus enabled custom translation sources |
| Study data | HelloAO adapters for Tyndale commentary and open cross-references |
| Client state and cache | Zustand, TanStack Query, Dexie/IndexedDB |
| Server cache | Upstash Redis when configured |
| Audio workflow | MediaRecorder, Cloudflare R2, and Deepgram |

Provider responses are normalized in the application layer before they reach UI components. Scripture credentials remain behind server routes, while owner-scoped Convex functions protect personal notes, bookmarks, audio, and comment mutations.

## Run locally

### Prerequisites

- Node.js 20 or later
- pnpm
- A Convex project
- API.Bible credentials
- Google OAuth credentials for authenticated flows

### Setup

```bash
pnpm install
cp .env.example .env.local
pnpm exec convex dev
pnpm dev
```

Populate `.env.local` from `.env.example`. Convex deployment variables are also required for Better Auth, Google OAuth, and admin access. Cloudflare R2, Deepgram, and Upstash Redis are needed only for the workflows that use them.

The Google redirect URI should resolve to:

```text
{SITE_URL}/api/auth/callback/google
```

## Verification

```bash
pnpm exec vitest run
pnpm build
```

Real-provider credentials are required to verify Google sign-in, external Scripture data, audio upload/transcription, commentary, and cross-reference behavior end to end.

## Project status

Bible Study is under active development. The core reader, study, note, discussion, bookmark, audio, translation, and reading-plan flows are implemented. Deployment-specific authentication and provider integrations should be verified with real environment credentials before production use.
