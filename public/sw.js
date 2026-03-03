// Service Worker untuk Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  const data = event.data?.json() || {
    title: 'Al-Quran Digital',
    body: 'Notifikasi baru',
    icon: '/1.png',
    badge: '/badge.png',
    tag: 'quran-notification'
  };
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    tag: data.tag || 'quran-notification',
    data: data.data || {},
    actions: data.actions || [
      {
        action: 'open-app',
        title: 'Buka Aplikasi'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open app in new window if not open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});