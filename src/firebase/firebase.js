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

// VAPID Key dari Firebase Console - GANTI DENGAN VAPID KEY ASLI ANDA
const VAPID_KEY = "BIQ7K4igUigkX_h3WAidnf0k85AzQtyIZkpijenbb-9rkltXrKtaJE_N9ZAuZOYC9PRCwq0TIXK7QXbMd3CN0Hk";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Function untuk Google Sign-In
const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
const signInWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);

// Fungsi untuk meminta izin notifikasi dan mendapatkan token FCM
export const requestNotificationPermission = async () => {
  try {
    console.log('📱 Meminta izin notifikasi...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Izin notifikasi diberikan');
      
      // Dapatkan token FCM dengan VAPID key
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      
      if (token) {
        console.log('✅ FCM Token berhasil didapat:', token);
        localStorage.setItem('fcm_token', token);
        return token;
      } else {
        console.log('❌ Gagal mendapatkan token');
        return null;
      }
    } else {
      console.log('❌ Izin notifikasi ditolak');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting notification permission:', error);
    return null;
  }
};

// Fungsi untuk mendapatkan token yang sudah tersimpan
export const getExistingToken = () => {
  return localStorage.getItem('fcm_token');
};

// Fungsi untuk menghapus token (saat logout)
export const removeToken = () => {
  localStorage.removeItem('fcm_token');
};

// Handler untuk notifikasi saat aplikasi sedang aktif (foreground)
export const onMessageListener = () => 
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('📱 Notifikasi diterima (foreground):', payload);
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