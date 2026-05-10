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
import type * as audioNotes from "../audioNotes.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as migrate_guest_id from "../migrate_guest_id.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  audioNotes: typeof audioNotes;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  comments: typeof comments;
  http: typeof http;
  migrate_guest_id: typeof migrate_guest_id;
  notes: typeof notes;
  notifications: typeof notifications;
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

export declare const components: {};
