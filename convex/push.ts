"use node";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { action } from "./_generated/server";
import { v } from "convex/values";

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
