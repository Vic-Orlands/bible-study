importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

fetch("/api/firebase-config")
  .then((response) => response.json())
  .then((config) => {
    firebase.initializeApp(config);
    firebase.messaging();
  })
  .catch((error) => console.error("Failed to initialize Firebase messaging:", error));
