/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as admin from "../admin.js";
import type * as audioNotes from "../audioNotes.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as comments from "../comments.js";
import type * as customTranslations from "../customTranslations.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as migrate_guest_id from "../migrate_guest_id.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as ownership from "../ownership.js";
import type * as push from "../push.js";
import type * as readingPlans from "../readingPlans.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  admin: typeof admin;
  audioNotes: typeof audioNotes;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  comments: typeof comments;
  customTranslations: typeof customTranslations;
  http: typeof http;
  identity: typeof identity;
  migrate_guest_id: typeof migrate_guest_id;
  notes: typeof notes;
  notifications: typeof notifications;
  ownership: typeof ownership;
  push: typeof push;
  readingPlans: typeof readingPlans;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
