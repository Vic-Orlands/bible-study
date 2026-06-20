"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export async function requestPushToken() {
  if (!(await isSupported()) || !("Notification" in window)) return null;
  if ((await Notification.requestPermission()) !== "granted") return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return await getToken(getMessaging(app), {
    serviceWorkerRegistration: registration,
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });
}
