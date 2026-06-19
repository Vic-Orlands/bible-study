# Reading Plan Completion Design

## Goal

Keep completed reading plans visible, celebrate a completed plan once, and let readers share or save that achievement.

## Experience

The reading plan workspace gains a Completed tab beside Hub, Journal, and Focus. It shows every completed plan for the current viewer as a card with its title, description, completion date, duration, and completed-reading count. Selecting Review plan loads that completed plan into the existing workspace without changing its status.

When a reader marks the final pending entry complete, a completion modal appears. Its center is a warm share card using the existing cream, brown, orange, and gold palette. The card contains the plan title, completion date, plan duration, a short congratulatory message, and the Bible Study mark. The modal offers Share, Save PNG, View completed plans, and Close actions.

Share uses the native Web Share API when available. Save PNG renders the share card itself to a PNG download. If native sharing is unavailable, Share copies a concise completion message to the clipboard and confirms it with a toast.

## Data Flow

The `toggleEntry` mutation returns the updated plan status and whether the mutation transitioned that plan from active to completed. The client opens the completion modal only when that transition flag is true.

A new owner-scoped `completed` query returns completed plan summaries ordered newest first. The selected plan is valid when it is either active or completed, so a completed plan remains reviewable even when another plan is active.

No schema migration is needed: `userPlans` already records the completed status and completion timestamp.

## Components

- `CompletedPlansTab` renders the completed-plan cards and empty state.
- `PlanCompletionDialog` renders the completion message and actions.
- `PlanCompletionShareCard` is the single visual source for the modal card and PNG export.

The PNG action uses a browser canvas built from the share card data rather than screenshotting arbitrary DOM. This keeps the download reliable and avoids a new rendering dependency.

## Errors and Accessibility

All asynchronous actions log failures and show a readable toast. The modal is dismissible, keyboard reachable, and labels each action. Sharing failures leave the completion modal open so the reader can try Save PNG or View completed plans.

## Verification

Tests cover returning a plan completion transition from the final entry, listing completed plans only for their owner, preserving a selected completed plan, and exposing the completion/share actions in the page. The production build must pass.
