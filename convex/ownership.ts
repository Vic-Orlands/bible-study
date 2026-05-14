import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getViewer(
  ctx: Ctx,
  identityId?: Id<"identities">,
) {
  const identity = await ctx.auth.getUserIdentity();

  if (identityId) {
    const identityDoc = await ctx.db.get(identityId);
    if (identityDoc) {
      if (
        identity &&
        identityDoc.userId &&
        identityDoc.userId !== identity.tokenIdentifier
      ) {
        return null;
      }

      return {
        ownerKey: identityDoc._id,
        displayName:
          identity?.name ??
          identity?.email ??
          identityDoc.displayName ??
          "Anonymous",
        avatarUrl: identity?.pictureUrl ?? identityDoc.avatarUrl ?? undefined,
        isAuthenticated: Boolean(identity),
      };
    }
  }

  if (identity) {
    const linkedIdentity = await ctx.db
      .query("identities")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    if (linkedIdentity) {
      return {
        ownerKey: linkedIdentity._id,
        displayName:
          identity.name ?? identity.email ?? linkedIdentity.displayName,
        avatarUrl: identity.pictureUrl ?? linkedIdentity.avatarUrl ?? undefined,
        isAuthenticated: true,
      };
    }

    return {
      ownerKey: identity.tokenIdentifier,
      displayName: identity.name ?? identity.email ?? "Anonymous",
      avatarUrl: identity.pictureUrl ?? undefined,
      isAuthenticated: true,
    };
  }

  return null;
}

export async function requireViewer(
  ctx: Ctx,
  identityId?: Id<"identities">,
) {
  const viewer = await getViewer(ctx, identityId);
  if (!viewer) throw new ConvexError("Not authenticated");
  return viewer;
}
