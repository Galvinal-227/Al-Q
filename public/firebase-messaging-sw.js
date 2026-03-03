importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyACHqxhErCALH31e-pCRBBJ4MJdg2NO61w",
  authDomain: "al-q-app.firebaseapp.com",
  projectId: "al-q-app",
  storageBucket: "al-q-app.firebasestorage.app",
  messagingSenderId: "793280291671",
  appId: "1:793280291671:web:54d007baf0a801d3965412",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Waktu Shalat';
  const notificationOptions = {
    body: payload.notification?.body || 'Waktu shalat telah tiba',
    icon: '/icon.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});