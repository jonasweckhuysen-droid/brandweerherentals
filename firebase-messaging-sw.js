importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "XXX",
  authDomain: "post-herentals.firebaseapp.com",
  databaseURL: "https://post-herentals-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "post-herentals",
  storageBucket: "post-herentals.appspot.com",
  messagingSenderId: "762725561089",
  appId: "1:762725561089:web:38c46cc8cf44d624252100"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png"
  });
});
