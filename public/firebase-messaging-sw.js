importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REMOVED_FIREBASE_API_KEY",
  appId: "1:1039505711205:web:e089f30f2cad94c9c5668c",
  authDomain: "bible-study-5d5f1.firebaseapp.com",
  messagingSenderId: "1039505711205",
  projectId: "bible-study-5d5f1",
});

firebase.messaging();
