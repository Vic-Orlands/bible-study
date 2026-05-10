import { internalMutation } from "./_generated/server";

export const migrateGuestIdToUserId = internalMutation({
  handler: async (ctx) => {
    const tables = ["bookmarks", "notes", "comments", "audioNotes"] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        if ("guestId" in doc && doc.guestId !== undefined) {
          const guestId = doc.guestId as string;
          await ctx.db.patch(doc._id, {
            userId: guestId,
            guestId: undefined,
          } as Record<string, unknown>);
        }
      }
    }

    return "done";
  },
});