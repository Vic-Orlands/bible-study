"use node";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function messaging() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "");
  const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  return getMessaging(app);
}

export const send = action({
  args: { body: v.string(), title: v.string(), token: v.string(), url: v.string() },
  handler: async (_ctx, args) => {
    try {
      await messaging().send({ token: args.token, notification: { title: args.title, body: args.body }, webpush: { fcmOptions: { link: args.url } } });
      return null;
    } catch (error) {
      console.error("Failed to send FCM push notification:", error);
      throw error;
    }
  },
});

export const notify = action({
  args: { body: v.string(), ownerKey: v.string(), title: v.string(), type: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const subscriptions: { token: string }[] = await ctx.runQuery(internal.notifications.pushDelivery, { ownerKey: args.ownerKey, type: args.type });
    for (const subscription of subscriptions) {
      try {
        await messaging().send({ token: subscription.token, notification: { title: args.title, body: args.body }, webpush: { fcmOptions: { link: args.url } } });
      } catch (error) {
        console.error("Failed to deliver FCM push notification:", error);
      }
    }
    return null;
  },
});
