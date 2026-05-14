import { Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const getByIpHash = query({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("identities")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .first();
  },
});

export const createFromIp = mutation({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    const shortId = args.ipHash.slice(0, 4).toUpperCase();
    return await ctx.db.insert("identities", {
      ipHash: args.ipHash,
      displayName: `Anonymous-${shortId}`,
      email: undefined,
      avatarUrl: undefined,
      isAnonymous: true,
      userId: undefined,
      createdAt: Date.now(),
    });
  },
});

async function moveOwnerData(
  ctx: MutationCtx,
  fromOwnerKey: string,
  toOwnerKey: string,
  identityId: Id<"identities">,
  displayName: string,
) {
  if (fromOwnerKey === toOwnerKey) return;

  const bookmarks = await ctx.db
    .query("bookmarks")
    .withIndex("by_owner", (q) => q.eq("ownerKey", fromOwnerKey))
    .collect();
  for (const bookmark of bookmarks) {
    await ctx.db.patch(bookmark._id, {
      ownerKey: toOwnerKey,
      identityId,
      userId: toOwnerKey,
    });
  }

  const notes = await ctx.db
    .query("notes")
    .withIndex("by_owner", (q) => q.eq("ownerKey", fromOwnerKey))
    .collect();
  for (const note of notes) {
    await ctx.db.patch(note._id, {
      ownerKey: toOwnerKey,
      identityId,
      userId: toOwnerKey,
    });
  }

  const audioNotes = await ctx.db
    .query("audioNotes")
    .withIndex("by_owner", (q) => q.eq("ownerKey", fromOwnerKey))
    .collect();
  for (const note of audioNotes) {
    await ctx.db.patch(note._id, {
      ownerKey: toOwnerKey,
      identityId,
      userId: toOwnerKey,
    });
  }

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_owner", (q) => q.eq("ownerKey", fromOwnerKey))
    .collect();
  for (const comment of comments) {
    await ctx.db.patch(comment._id, {
      ownerKey: toOwnerKey,
      identityId,
      userId: toOwnerKey,
      guestName: displayName,
    });
  }

  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_user", (q) => q.eq("userId", fromOwnerKey))
    .collect();
  for (const notification of notifications) {
    await ctx.db.patch(notification._id, {
      userId: toOwnerKey,
    });
  }

  const allComments = await ctx.db.query("comments").collect();
  for (const comment of allComments) {
    if (!comment.likes.includes(fromOwnerKey)) continue;
    await ctx.db.patch(comment._id, {
      likes: [...new Set(comment.likes.map((like) => (
        like === fromOwnerKey ? toOwnerKey : like
      )))],
    });
  }
}

export const syncViewerIdentity = mutation({
  args: {
    identityId: v.optional(v.id("identities")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const displayName = identity.name ?? identity.email ?? "Anonymous";
    const email = identity.email ?? undefined;
    const avatarUrl = identity.pictureUrl ?? undefined;

    const existingForUser = await ctx.db
      .query("identities")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    let target =
      args.identityId ? await ctx.db.get(args.identityId) : existingForUser;

    if (
      target &&
      target.userId &&
      target.userId !== identity.tokenIdentifier
    ) {
      throw new ConvexError("Identity already claimed");
    }

    if (!target) {
      const createdId = await ctx.db.insert("identities", {
        ipHash: undefined,
        userId: identity.tokenIdentifier,
        displayName,
        email,
        avatarUrl,
        isAnonymous: false,
        createdAt: Date.now(),
      });
      target = await ctx.db.get(createdId);
    } else {
      await ctx.db.patch(target._id, {
        userId: identity.tokenIdentifier,
        displayName,
        email,
        avatarUrl,
        isAnonymous: false,
      });
      target = {
        ...target,
        userId: identity.tokenIdentifier,
        displayName,
        email,
        avatarUrl,
        isAnonymous: false,
      };
    }

    if (!target) {
      throw new ConvexError("Failed to resolve viewer identity");
    }

    await moveOwnerData(
      ctx,
      identity.tokenIdentifier,
      target._id,
      target._id,
      displayName,
    );

    if (args.identityId && args.identityId !== target._id) {
      await moveOwnerData(ctx, args.identityId, target._id, target._id, displayName);
      const sourceIdentity = await ctx.db.get(args.identityId);
      if (sourceIdentity && sourceIdentity.userId !== identity.tokenIdentifier) {
        await ctx.db.delete(args.identityId);
      }
    }

    return {
      identityId: target._id,
      displayName,
      email,
      avatarUrl,
      isAnonymous: false,
    };
  },
});
