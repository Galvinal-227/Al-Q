// firebase/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyACHqxhErCALH31e-pCRBBJ4MJdg2NO61w",
  authDomain: "al-q-app.firebaseapp.com",
  projectId: "al-q-app",
  storageBucket: "al-q-app.firebasestorage.app",
  messagingSenderId: "793280291671",
  appId: "1:793280291671:web:54d007baf0a801d3965412",
  measurementId: "G-2D21H4Y8J9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Messaging
const messaging = getMessaging(app);

const VAPID_KEY = "BIQ7K4igUigkX_h3WAidnf0k85AzQtyIZkpijenbb-9rkltXrKtaJE_N9ZAuZOYC9PRCwq0TIXK7QXbMd3CN0Hk";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Function untuk Google Sign-In
const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
const signInWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);

/**
 * 🔴 FUNGSI PALING PENTING: Register Service Worker
 * Ini harus dipanggil SAAT PERTAMA KALI aplikasi dimuat
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service Worker tidak didukung browser ini');
    return false;
  }

  try {
    console.log('📦 Mendaftarkan Service Worker...');
    
    // Hapus service worker lama kalau ada (untuk debugging)
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      console.log('🗑️ Menghapus Service Worker lama:', registration.scope);
      await registration.unregister();
    }

    // Daftarkan service worker baru
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker terdaftar:', registration.scope);

    // Tunggu sampai service worker aktif
    if (registration.installing) {
      console.log('📦 Service Worker sedang menginstall...');
    } else if (registration.waiting) {
      console.log('⏳ Service Worker menunggu aktivasi...');
    } else if (registration.active) {
      console.log('✅ Service Worker aktif!');
    }

    return true;
  } catch (error) {
    console.error('❌ Gagal mendaftarkan Service Worker:', error);
    return false;
  }
};

/**
 * 🔴 FUNGSI UNTUK MEMINTA IZIN NOTIFIKASI DAN MENDAPATKAN TOKEN FCM
 */
export const requestNotificationPermission = async () => {
  try {
    // Cek support
    if (!('Notification' in window)) {
      console.log('❌ Browser tidak mendukung notifikasi');
      return null;
    }

    console.log('📱 Meminta izin notifikasi...');
    
    // Minta izin notifikasi
    const permission = await Notification.requestPermission();
    console.log('📱 Status izin:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Izin notifikasi diberikan');
      
      // PASTIKAN SERVICE WORKER SUDAH TERDAFTAR
      const isSwRegistered = await registerServiceWorker();
      
      if (!isSwRegistered) {
        console.log('❌ Service Worker gagal didaftarkan, token mungkin tidak valid');
        return null;
      }
      
      // Dapatkan token FCM
      console.log('🔑 Mendapatkan FCM Token...');
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      
      if (token) {
        console.log('✅ FCM Token berhasil didapat:', token);
        
        // Simpan di beberapa tempat untuk redundansi
        localStorage.setItem('fcm_token', token);
        sessionStorage.setItem('fcm_token', token);
        
        // Kirim ke server kalau ada
        // await saveTokenToServer(token);
        
        return token;
      } else {
        console.log('❌ Gagal mendapatkan token - mungkin perlu cek VAPID KEY');
        return null;
      }
    } else {
      console.log('❌ Izin notifikasi ditolak user');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting notification permission:', error);
    
    // Error spesifik
    if (error.code === 'messaging/permission-blocked') {
      console.log('🔴 Izin diblokir permanen');
    } else if (error.code === 'messaging/unsupported-browser') {
      console.log('🔴 Browser tidak mendukung');
    } else if (error.code === 'messaging/invalid-vapid-key') {
      console.log('🔴 VAPID KEY tidak valid - ini penyebab paling umum!');
      console.log('🔴 Cek VAPID KEY di Firebase Console > Project Settings > Cloud Messaging');
    }
    
    return null;
  }
};

/**
 * FUNGSI UNTUK CEK STATUS NOTIFIKASI
 */
export const checkNotificationStatus = async () => {
  const status = {
    supported: 'Notification' in window && 'serviceWorker' in navigator,
    permission: Notification.permission,
    hasServiceWorker: false,
    hasToken: !!localStorage.getItem('fcm_token'),
    token: localStorage.getItem('fcm_token')
  };

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    status.hasServiceWorker = registrations.length > 0;
    status.serviceWorkerUrls = registrations.map(r => r.scope);
  }

  return status;
};

/**
 * FUNGSI UNTUK TEST NOTIFIKASI
 */
export const testNotification = async () => {
  const token = localStorage.getItem('fcm_token');
  
  if (!token) {
    console.log('❌ Tidak ada token. Minta izin dulu.');
    return false;
  }

  // Buat notifikasi lokal untuk test
  if (Notification.permission === 'granted') {
    new Notification('Test Notifikasi', {
      body: 'Ini adalah test notifikasi. Jika Anda melihat ini, notifikasi berfungsi!',
      icon: '/icon.png',
      badge: '/logo.png',
      tag: 'test-notification',
      requireInteraction: true
    });
    return true;
  }

  return false;
};

/**
 * FUNGSI UNTUK MENGIRIM PESAN KE SERVICE WORKER
 */
export const postToServiceWorker = (message) => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
};

// Fungsi untuk mendapatkan token yang sudah tersimpan
export const getExistingToken = () => {
  return localStorage.getItem('fcm_token');
};

// Fungsi untuk menghapus token (saat logout)
export const removeToken = () => {
  localStorage.removeItem('fcm_token');
  sessionStorage.removeItem('fcm_token');
};

// Handler untuk notifikasi saat aplikasi sedang aktif (foreground)
export const onMessageListener = () => 
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('📱 Notifikasi diterima (foreground):', payload);
      
      // Tampilkan notifikasi sendiri di foreground
      if (payload.notification) {
        new Notification(payload.notification.title || 'Notifikasi', {
          body: payload.notification.body || '',
          icon: payload.notification.icon || '/icon.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: payload.data
        });
      }
      
      resolve(payload);
    });
  });

// Fungsi untuk cek apakah browser mendukung notifikasi
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Fungsi untuk cek status izin notifikasi
export const getNotificationPermissionStatus = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export { 
  auth, 
  db, 
  messaging,
  googleProvider,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  getRedirectResult
};

export default app;
