import { Id } from "@/convex/_generated/dataModel";

export function identityArgs(identityId: string | null) {
  if (!identityId) return {};
  return { identityId: identityId as Id<"identities"> };
}
