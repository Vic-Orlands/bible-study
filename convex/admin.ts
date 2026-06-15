import { ConvexError } from "convex/values";
import {
  ActionCtx,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";

type Ctx = QueryCtx | MutationCtx | ActionCtx;

function getAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getAdminIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return null;

  const adminEmails = getAdminEmails();
  if (!adminEmails.has(identity.email.toLowerCase())) return null;

  return {
    email: identity.email,
    name: identity.name ?? identity.email,
    tokenIdentifier: identity.tokenIdentifier,
  };
}

export async function requireAdmin(ctx: Ctx) {
  const admin = await getAdminIdentity(ctx);
  if (!admin) throw new ConvexError("Unauthorized");
  return admin;
}
