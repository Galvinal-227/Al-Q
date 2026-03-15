import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  Volume2, VolumeX, Bell, Clock, Settings, 
  Sunrise, Sun, Sunset, Moon, MoonStar,
  Pause, Play, SkipForward, AlarmClock,
  Save, X, MapPin, Calendar, Globe,
  Music, Timer, RefreshCw, Navigation,
  CheckCircle, AlertCircle, WifiOff,
  BellRing, HelpCircle, BarChart3, Database,
  ExternalLink, Smartphone, BellOff
} from 'lucide-react';
import { dbService } from '../service/databaseService';
import { messaging, getToken, onMessage } from '../firebase/firebase';

// ============= MODAL COMPONENT =============
const Modal = ({ isOpen, onClose, children, isDarkMode }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className={`rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        style={{ position: 'relative', zIndex: 1000000, maxWidth: '90%', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

const Adzan = ({ isDarkMode = false }) => {
  // ============= STATE MANAGEMENT =============
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTarhimPlaying, setIsTarhimPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState([]);
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoTarhim, setAutoTarhim] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tarhimDuration, setTarhimDuration] = useState(30);
  const [tarhimStartTime, setTarhimStartTime] = useState(null);
  const [city, setCity] = useState('Jakarta');
  const [manualTimes, setManualTimes] = useState({
    fajr: '04:30',
    dhuhr: '12:00',
    asr: '15:30',
    maghrib: '18:00',
    isha: '19:30'
  });
  const [useManualTimes, setUseManualTimes] = useState(false);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [tarhimLoaded, setTarhimLoaded] = useState(false);
  const [lastPlayedPrayer, setLastPlayedPrayer] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // Stats states
  const [dailyStats, setDailyStats] = useState(null);
  const [lastAdzan, setLastAdzan] = useState(null);
  const [lastTarhim, setLastTarhim] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const audioRef = useRef(null);
  const tarhimAudioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const deferredPrompt = useRef(null);

  // ============= DATABASE FUNCTIONS =============
  const loadAllFromDatabase = async () => {
    setIsLoadingDb(true);
    try {
      const settings = await dbService.getUserSettings();
      if (settings) {
        setVolume(settings.volume || 70);
        setIsMuted(settings.is_muted || false);
        setAutoPlay(settings.auto_play_adzan !== false);
        setAutoTarhim(settings.auto_tarhim !== false);
        setTarhimDuration(settings.tarhim_duration || 30);
        setCity(settings.city || 'Jakarta');
        setUseManualTimes(settings.use_manual_times || false);
        setManualTimes({
          fajr: settings.manual_fajr || '04:30',
          dhuhr: settings.manual_dhuhr || '12:00',
          asr: settings.manual_asr || '15:30',
          maghrib: settings.manual_maghrib || '18:00',
          isha: settings.manual_isha || '19:30'
        });
      }
      
      const stats = await dbService.getCompleteStats();
      setDailyStats(stats.daily);
      setLastAdzan(stats.lastAdzan);
      setLastTarhim(stats.lastTarhim);
      setRecentActivities(stats.recentActivities);
    } catch (error) {
      console.error('❌ Error loading from database:', error);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const saveToDatabase = async (key, value) => {
    try {
      const update = {};
      update[key] = value;
      await dbService.updateUserSettings(update);
    } catch (error) {
      console.error('❌ Error saving to database:', error);
    }
  };

  const logAdzanToDatabase = async (prayerName, isAuto = true) => {
    try {
      await dbService.logAdzanPlayed(prayerName, isAuto, volume);
      const stats = await dbService.getCompleteStats();
      setDailyStats(stats.daily);
      setLastAdzan(stats.lastAdzan);
      setRecentActivities(stats.recentActivities);
    } catch (error) {
      console.error('❌ Error logging adzan:', error);
    }
  };

  const logTarhimToDatabase = async (isAuto = true, stoppedEarly = false) => {
    try {
      await dbService.logTarhimPlayed(isAuto, volume, tarhimDuration, stoppedEarly);
      const stats = await dbService.getCompleteStats();
      setDailyStats(stats.daily);
      setLastTarhim(stats.lastTarhim);
      setRecentActivities(stats.recentActivities);
    } catch (error) {
      console.error('❌ Error logging tarhim:', error);
    }
  };

  // ============= FIREBASE NOTIFICATIONS =============
  const setupFirebaseNotifications = async () => {
    try {
      // Minta permission
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Dapatkan FCM token
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY' // Dapat dari Firebase Console
        });
        
        if (token) {
          setFcmToken(token);
          console.log('✅ FCM Token:', token);
          
          // Kirim token ke server (opsional)
          // await saveTokenToServer(token);
        }
        
        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('📨 Message received in foreground:', payload);
          
          // Tampilkan notifikasi sendiri
          if (payload.notification) {
            showToast(payload.notification.body || 'Waktu shalat telah tiba', 'success');
            
            // Jika aplikasi sedang terbuka, putar adzan
            if (document.visibilityState === 'visible') {
              const prayerName = payload.data?.prayer || 'subuh';
              const prayer = prayerTimes.find(p => 
                p.name.toLowerCase().includes(prayerName.toLowerCase())
              );
              if (prayer) {
                playAdhan(prayer);
              } else {
                playAdhan();
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ Firebase messaging error:', error);
    }
  };

  // ============= PWA INSTALL PROMPT =============
  useEffect(() => {
    // Cek apakah sudah diinstall sebagai PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPwaInstalled(isStandalone);
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstallPrompt(true);
    });
    
    window.addEventListener('appinstalled', () => {
      setIsPwaInstalled(true);
      setShowInstallPrompt(false);
      showToast('Aplikasi berhasil diinstall!', 'success');
    });
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt.current) return;
    
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted install');
    }
    
    deferredPrompt.current = null;
    setShowInstallPrompt(false);
  };

  // ============= NOTIFICATION FUNCTIONS =============
  const sendLocalNotification = (title, body, data = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/icon.png',
          badge: '/logo.png',
          tag: `adzan-${Date.now()}`,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: data,
          actions: [
            {
              action: 'open',
              title: 'Buka Aplikasi'
            },
            {
              action: 'dismiss',
              title: 'Tutup'
            }
          ]
        });

        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          
          // Cek action
          if (event.action === 'open') {
            // Jika ini notifikasi adzan, putar audio
            if (data.type === 'adzan') {
              const prayer = prayerTimes.find(p => p.id === data.prayerId);
              if (prayer) {
                playAdhan(prayer);
              }
            }
          }
          
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Browser tidak mendukung notifikasi', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        showToast('Notifikasi diaktifkan', 'success');
        
        // Setup Firebase
        await setupFirebaseNotifications();
        
        // Test notification
        setTimeout(() => {
          sendLocalNotification(
            'Notifikasi Aktif! 🎉',
            'Anda akan menerima notifikasi waktu shalat',
            { type: 'test' }
          );
        }, 1000);
      } else {
        showToast('Izin notifikasi ditolak', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Gagal mengaktifkan notifikasi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ============= UTILITY FUNCTIONS =============
  const formatTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const formatTarhimTime = () => {
    if (!tarhimStartTime) return "--:--";
    return formatTime(tarhimStartTime).slice(0, 5);
  };

  const calculateTimeToTarhim = () => {
    if (!tarhimStartTime) return 0;
    const now = new Date();
    return Math.floor((tarhimStartTime - now) / 1000);
  };

  const formatCountdown = (seconds) => {
    if (seconds <= 0) return "00:00:00";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPrayerDate = (timeStr) => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const prayerDate = new Date(now);
    prayerDate.setHours(hours, minutes, 0, 0);
    
    if (prayerDate < now) {
      prayerDate.setDate(prayerDate.getDate() + 1);
    }
    
    return prayerDate;
  };

  // ============= PRAYER TIME CALCULATIONS =============
  const calculatePrayerTimes = () => {
    const now = new Date();
    
    const timesToUse = useManualTimes ? manualTimes : getDefaultTimes();
    
    const times = Object.entries(timesToUse).map(([id, timeStr]) => {
      const prayerName = getPrayerName(id);
      const prayerDate = getPrayerDate(timeStr);
      const timeLeft = Math.floor((prayerDate - now) / 1000);
      
      return {
        id,
        name: prayerName,
        time: timeStr,
        fullTime: prayerDate,
        timeLeft: timeLeft,
        icon: getPrayerIcon(id)
      };
    }).sort((a, b) => a.fullTime - b.fullTime);
    
    setPrayerTimes(times);
    
    const next = times.find(p => p.timeLeft > 0) || times[0];
    setNextPrayer(next);
    
    calculateAndSetTarhimTime();
    
    return times;
  };

  const calculateAndSetTarhimTime = () => {
    const fajrTime = useManualTimes ? manualTimes.fajr : getDefaultTimes().fajr;
    const fajrDate = getPrayerDate(fajrTime);
    const tarhimTime = new Date(fajrDate);
    tarhimTime.setMinutes(tarhimTime.getMinutes() - tarhimDuration);
    
    const now = new Date();
    if (tarhimTime < now) {
      tarhimTime.setDate(tarhimTime.getDate() + 1);
    }
    
    setTarhimStartTime(tarhimTime);
  };

  const getDefaultTimes = () => {
    const cityTimes = {
      'Jakarta': { fajr: '04:30', dhuhr: '12:00', asr: '15:30', maghrib: '18:00', isha: '19:30' },
      'Bandung': { fajr: '04:32', dhuhr: '12:02', asr: '15:32', maghrib: '18:02', isha: '19:32' },
      'Surabaya': { fajr: '04:15', dhuhr: '11:45', asr: '15:15', maghrib: '17:45', isha: '19:15' },
      'Medan': { fajr: '05:00', dhuhr: '12:30', asr: '16:00', maghrib: '18:30', isha: '20:00' },
      'Makassar': { fajr: '04:45', dhuhr: '12:15', asr: '15:45', maghrib: '18:15', isha: '19:45' },
      'Yogyakarta': { fajr: '04:28', dhuhr: '11:58', asr: '15:28', maghrib: '17:58', isha: '19:28' },
      'Bali': { fajr: '04:45', dhuhr: '12:15', asr: '15:45', maghrib: '18:15', isha: '19:45' }
    };
    
    return cityTimes[city] || cityTimes['Jakarta'];
  };

  const getPrayerName = (id) => {
    const names = {
      fajr: 'Subuh',
      dhuhr: 'Dzuhur',
      asr: 'Ashar',
      maghrib: 'Maghrib',
      isha: 'Isya'
    };
    return names[id] || id;
  };

  const getPrayerIcon = (id) => {
    const icons = {
      fajr: <Sunrise className={`${isDarkMode ? 'text-blue-300' : 'text-blue-400'}`} />,
      dhuhr: <Sun className={`${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />,
      asr: <Sunset className={`${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />,
      maghrib: <Moon className={`${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />,
      isha: <MoonStar className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
    };
    return icons[id];
  };

  // ============= TIME CHECKERS (REALISTIC) =============
  const checkAdhanTime = () => {
    if (!autoPlay) return;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    // Cek setiap detik ke-0
    if (currentSeconds !== 0) return;
    
    prayerTimes.forEach(prayer => {
      const [prayerHours, prayerMinutes] = prayer.time.split(':').map(Number);
      
      if (currentHours === prayerHours && currentMinutes === prayerMinutes) {
        const prayerKey = `${prayer.id}-${new Date().toDateString()}`;
        
        if (lastPlayedPrayer !== prayerKey) {
          console.log(`🕌 Waktu ${prayer.name} (${prayer.time}) tiba!`);
          
          // KIRIM NOTIFIKASI (selalu bisa, bahkan browser ditutup)
          sendLocalNotification(
            `Waktu ${prayer.name}`,
            `Sudah masuk waktu ${prayer.name} (${prayer.time}). Klik untuk mendengarkan adzan.`,
            { type: 'adzan', prayerId: prayer.id, prayerName: prayer.name }
          );
          
          // PLAY AUDIO (HANYA JIKA APLIKASI TERBUKA)
          if (document.visibilityState === 'visible') {
            setTimeout(() => {
              playAdhan(prayer);
              setLastPlayedPrayer(prayerKey);
            }, 100);
          } else {
            console.log('📱 Aplikasi di background - hanya notifikasi');
            // Tidak bisa putar audio, hanya notifikasi
          }
          
          showToast(`Waktu ${prayer.name} telah tiba`, 'success');
          logAdzanToDatabase(prayer.name, true);
        }
      }
    });
  };

  const checkTarhimTime = () => {
    if (!autoTarhim) return;
    if (!tarhimStartTime) return;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    if (currentSeconds !== 0) return;
    
    const tarhimHours = tarhimStartTime.getHours();
    const tarhimMinutes = tarhimStartTime.getMinutes();
    
    if (currentHours === tarhimHours && currentMinutes === tarhimMinutes && !isTarhimPlaying) {
      console.log(`🎵 Waktu tarhim tiba! (${formatTarhimTime()})`);
      
      // KIRIM NOTIFIKASI
      sendLocalNotification(
        'Tarhim Dimulai',
        `Tarhim sebelum Subuh telah dimulai. Klik untuk mendengarkan.`,
        { type: 'tarhim' }
      );
      
      // PLAY AUDIO (HANYA JIKA APLIKASI TERBUKA)
      if (document.visibilityState === 'visible') {
        startTarhim();
        logTarhimToDatabase(true, false);
        showToast(`Tarhim dimulai, menuju waktu Subuh`, 'info');
      } else {
        console.log('📱 Aplikasi di background - hanya notifikasi tarhim');
        // Tidak bisa putar audio
      }
    }
  };

  // ============= AUDIO CONTROL FUNCTIONS =============
  const startTarhim = async () => {
    if (!tarhimAudioRef.current) return;
    
    try {
      tarhimAudioRef.current.volume = isMuted ? 0 : volume / 100;
      tarhimAudioRef.current.loop = true;
      tarhimAudioRef.current.currentTime = 0;
      
      await tarhimAudioRef.current.play();
      setIsTarhimPlaying(true);
      console.log('✅ Tarhim diputar');
      
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('❌ Error playing tarhim:', error);
      showToast('Gagal memutar tarhim. Pastikan Anda sudah berinteraksi dengan halaman.', 'error');
    }
  };

  const stopTarhim = async (stoppedEarly = false) => {
    if (tarhimAudioRef.current) {
      tarhimAudioRef.current.pause();
      tarhimAudioRef.current.currentTime = 0;
      setIsTarhimPlaying(false);
      console.log('⏹️ Tarhim dihentikan');
      await logTarhimToDatabase(true, stoppedEarly);
    }
  };

  const playAdhan = async (prayer = null) => {
    if (!audioRef.current) {
      console.error('❌ Audio element tidak ditemukan');
      showToast('Audio tidak tersedia', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
      audioRef.current.currentTime = 0;
      
      // Browser policy: audio.play() harus dari user interaction
      await audioRef.current.play();
      
      setIsPlaying(true);
      setIsLoading(false);
      console.log('✅ Adzan diputar');
      
      const prayerName = prayer?.id || 'manual';
      await logAdzanToDatabase(prayerName, !!prayer);
      
      if (prayer) {
        console.log(`🕌 Adzan ${prayer.name} (${prayer.time}) diputar`);
      } else {
        console.log('🕌 Adzan diputar secara manual');
      }
    } catch (error) {
      console.error('❌ Gagal memutar adzan:', error);
      setIsPlaying(false);
      setIsLoading(false);
      
      if (error.name === 'NotAllowedError') {
        showToast('Browser memblokir autoplay. Klik tombol play untuk memutar.', 'error');
      } else {
        showToast('Gagal memutar adzan', 'error');
      }
    }
  };

  const pauseAdhan = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('⏸️ Adzan dijeda');
    }
  };

  const stopAdhan = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      console.log('⏹️ Adzan dihentikan');
    }
  };

  // ============= SETTINGS HANDLERS =============
  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    await saveToDatabase('volume', newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
      await saveToDatabase('is_muted', true);
    } else if (isMuted) {
      setIsMuted(false);
      await saveToDatabase('is_muted', false);
    }
  };

  const handleMuteToggle = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await saveToDatabase('is_muted', newMuted);
  };

  const handleAutoPlayToggle = async () => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    await saveToDatabase('auto_play_adzan', newAutoPlay);
  };

  const handleAutoTarhimToggle = async () => {
    const newAutoTarhim = !autoTarhim;
    setAutoTarhim(newAutoTarhim);
    await saveToDatabase('auto_tarhim', newAutoTarhim);
    
    if (newAutoTarhim) {
      calculateAndSetTarhimTime();
    }
  };

  const handleTarhimDurationChange = async (duration) => {
    setTarhimDuration(duration);
    await saveToDatabase('tarhim_duration', duration);
    calculateAndSetTarhimTime();
  };

  const handleCityChange = async (newCity) => {
    setCity(newCity);
    setUseManualTimes(false);
    await saveToDatabase('city', newCity);
    await saveToDatabase('use_manual_times', false);
    calculatePrayerTimes();
    showToast(`Lokasi diubah ke ${newCity}`, 'info');
  };

  const handleManualTimeChange = async (prayer, time) => {
    const newTimes = { ...manualTimes, [prayer]: time };
    setManualTimes(newTimes);
    setUseManualTimes(true);
    
    await saveToDatabase(`manual_${prayer}`, time);
    await saveToDatabase('use_manual_times', true);
    
    calculatePrayerTimes();
    showToast(`Waktu ${getPrayerName(prayer)} diatur ke ${time}`, 'info');
  };

  const handleResetToAuto = async () => {
    setUseManualTimes(false);
    await saveToDatabase('use_manual_times', false);
    calculatePrayerTimes();
    showToast('Jadwal dikembalikan ke perhitungan otomatis', 'success');
  };

  // ============= EFFECTS =============
  
  // Main timer
  useEffect(() => {
    calculatePrayerTimes();
    
    timerRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    countdownRef.current = setInterval(() => {
      updateCountdowns();
    }, 1000);
    
    const secondChecker = setInterval(() => {
      const now = new Date();
      const currentSeconds = now.getSeconds();
      
      if (currentSeconds === 0) {
        checkAdhanTime();
        checkTarhimTime();
      }
    }, 1000);
    
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      clearInterval(secondChecker);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [autoPlay, autoTarhim, tarhimDuration, manualTimes, useManualTimes, city]);

  // Load data
  useEffect(() => {
    loadAllFromDatabase();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // Auto setup if already granted
      if (Notification.permission === 'granted') {
        setupFirebaseNotifications();
      }
    }
  }, []);

  // Preload audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.addEventListener('canplaythrough', () => {
        setAudioLoaded(true);
        console.log('✅ Audio Adzan siap diputar');
      });
    }
    
    if (tarhimAudioRef.current) {
      tarhimAudioRef.current.load();
      tarhimAudioRef.current.addEventListener('canplaythrough', () => {
        setTarhimLoaded(true);
        console.log('✅ Audio Tarhim siap diputar');
      });
    }
  }, []);

  // Update countdowns
  const updateCountdowns = () => {
    const now = new Date();
    
    const updatedTimes = prayerTimes.map(prayer => {
      const newTimeLeft = Math.floor((prayer.fullTime - now) / 1000);
      
      if (newTimeLeft < 0) {
        const newPrayerDate = new Date(prayer.fullTime);
        newPrayerDate.setDate(newPrayerDate.getDate() + 1);
        const updatedTimeLeft = Math.floor((newPrayerDate - now) / 1000);
        
        return {
          ...prayer,
          fullTime: newPrayerDate,
          timeLeft: updatedTimeLeft
        };
      }
      
      return {
        ...prayer,
        timeLeft: newTimeLeft
      };
    }).sort((a, b) => a.fullTime - b.fullTime);
    
    setPrayerTimes(updatedTimes);
    
    const next = updatedTimes.find(p => p.timeLeft > 0) || updatedTimes[0];
    setNextPrayer(next);
  };

  // ============= RENDER =============
  
  return (
    <div className={`rounded-2xl shadow-xl p-6 relative ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-indigo-50 to-purple-50'
    }`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
          toast.type === 'error' 
            ? isDarkMode 
              ? 'bg-red-900/30 text-red-300 border-l-4 border-red-500'
              : 'bg-red-100 text-red-800 border-l-4 border-red-500'
            : toast.type === 'success'
            ? isDarkMode
              ? 'bg-green-900/30 text-green-300 border-l-4 border-green-500'
              : 'bg-green-100 text-green-800 border-l-4 border-green-500'
            : isDarkMode
              ? 'bg-blue-900/30 text-blue-300 border-l-4 border-blue-500'
              : 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'success' && <CheckCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      
      {/* Audio Elements */}
      <audio
        ref={audioRef}
        src="/Adzan.mp3"
        preload="auto"
        style={{ display: 'none' }}
        onEnded={() => {
          setIsPlaying(false);
          console.log('✅ Adzan selesai diputar');
        }}
      />
      <audio
        ref={tarhimAudioRef}
        src="/Tarhim.mp3"
        preload="auto"
        style={{ display: 'none' }}
        onEnded={() => {
          if (autoTarhim && tarhimStartTime) {
            const now = new Date();
            const fajrTime = useManualTimes ? manualTimes.fajr : getDefaultTimes().fajr;
            const [fajrHours, fajrMinutes] = fajrTime.split(':').map(Number);
            
            if (now.getHours() < fajrHours || (now.getHours() === fajrHours && now.getMinutes() < fajrMinutes)) {
              startTarhim();
            } else {
              setIsTarhimPlaying(false);
            }
          } else {
            setIsTarhimPlaying(false);
          }
        }}
      />
      
      {/* Install PWA Prompt */}
      {showInstallPrompt && !isPwaInstalled && (
        <div className={`mb-4 p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-purple-900/30 border-purple-700 text-purple-300' 
            : 'bg-purple-50 border-purple-200 text-purple-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone size={24} className="text-purple-500" />
              <div>
                <p className="font-medium">Install Aplikasi Adzan</p>
                <p className="text-sm opacity-90">Dapatkan notifikasi lebih baik dengan menginstall aplikasi</p>
              </div>
            </div>
            <button
              onClick={handleInstallPWA}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Install
            </button>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Pengaturan Adzan
          </h3>
          <button
            onClick={() => setShowSettings(false)}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={isDarkMode ? 'text-gray-300' : ''} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Notification Settings */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>Notifikasi Waktu Shalat</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {notificationPermission === 'granted' 
                    ? '✓ Notifikasi aktif - Anda akan mendapat notifikasi meskipun browser ditutup' 
                    : notificationPermission === 'denied'
                    ? '✗ Ditolak - Aktifkan di pengaturan browser'
                    : 'Klik tombol untuk mengaktifkan notifikasi'}
                </div>
              </div>
              <button
                onClick={requestNotificationPermission}
                disabled={isLoading || notificationPermission === 'denied'}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                  notificationPermission === 'granted'
                    ? 'bg-green-500 text-white cursor-default'
                    : notificationPermission === 'denied'
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat...</span>
                  </>
                ) : notificationPermission === 'granted' ? (
                  '✓ Aktif'
                ) : notificationPermission === 'denied' ? (
                  'Diblokir'
                ) : (
                  'Aktifkan'
                )}
              </button>
            </div>
            
            {fcmToken && (
              <div className="mt-2 p-2 bg-blue-900/20 rounded text-xs">
                <div className="flex items-center gap-1 text-blue-400 mb-1">
                  <CheckCircle size={12} />
                  <span>Firebase Connected</span>
                </div>
                <p className="text-gray-500 break-all">Token: {fcmToken.substring(0, 30)}...</p>
              </div>
            )}
            
            <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="flex items-center gap-1 mb-1">
                <BellRing size={12} />
                <span className="font-medium">Mode Notifikasi:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li className="text-emerald-500">✅ Browser tertutup → Notifikasi muncul</li>
                <li className="text-yellow-500">⚠️ Browser tertutup → TIDAK bisa putar audio</li>
                <li className="text-blue-500">📱 Klik notifikasi → Buka app & putar audio</li>
              </ul>
            </div>
          </div>

          {/* Audio Playback Info */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={16} className="text-yellow-500" />
              <span className="font-medium">Info Audio Background</span>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Audio adzan dan tarhim <span className="font-bold text-red-500">HANYA</span> dapat diputar saat aplikasi terbuka. 
              Ini adalah kebijakan keamanan browser yang tidak bisa diubah.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
                <div className="font-medium">App Terbuka</div>
                <div className="text-emerald-500">✅ Audio bisa</div>
              </div>
              <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
                <div className="font-medium">App Tertutup</div>
                <div className="text-red-500">❌ Audio tidak bisa</div>
              </div>
            </div>
          </div>

          {/* Install PWA Info */}
          {!isPwaInstalled && (
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={16} className="text-purple-500" />
                <span className="font-medium">Install Aplikasi</span>
              </div>
              <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Install sebagai aplikasi untuk notifikasi yang lebih baik dan akses cepat.
              </p>
              <button
                onClick={handleInstallPWA}
                className="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                Install Aplikasi
              </button>
            </div>
          )}

          {/* Durasi Tarhim */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Durasi Tarhim Sebelum Subuh (menit)
            </label>
            <div className="flex items-center gap-2">
              <Timer size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={tarhimDuration}
                onChange={(e) => handleTarhimDurationChange(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className={`text-sm font-medium min-w-[3rem] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {tarhimDuration} mnt
              </span>
            </div>
          </div>
          
          {/* Auto Tarhim Toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div>
              <div className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>Auto Tarhim</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Putar tarhim sebelum subuh (saat app terbuka)
              </div>
            </div>
            <button
              onClick={handleAutoTarhimToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoTarhim 
                ? 'bg-emerald-500' 
                : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-transform ${
                autoTarhim ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          
          {/* Auto Adzan Toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div>
              <div className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>Auto Adzan</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Putar adzan otomatis (saat app terbuka)
              </div>
            </div>
            <button
              onClick={handleAutoPlayToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${autoPlay 
                ? 'bg-emerald-500' 
                : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-transform ${
                autoPlay ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowSettings(false)}
            className={`flex-1 py-2.5 border rounded-lg font-medium transition-colors ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tutup
          </button>
          <button
            onClick={() => {
              setShowSettings(false);
              showToast('Pengaturan telah disimpan', 'success');
            }}
            className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Selesai
          </button>
        </div>
      </Modal>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
            <Bell className="text-white" size={24} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Adzan & Jadwal Shalat
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Pengingat waktu shalat
              </p>
              {!isOnline && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  <WifiOff size={10} className="inline mr-1" />
                  Offline
                </span>
              )}
              {notificationPermission === 'granted' && (
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                  <BellRing size={10} className="inline mr-1" />
                  Notifikasi Aktif
                </span>
              )}
              {isPwaInstalled && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                  <Smartphone size={10} className="inline mr-1" />
                  Terinstall
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-lg ${
              showStats 
                ? isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
            } hover:opacity-80 transition-opacity`}
            title="Statistik"
          >
            <BarChart3 size={20} />
          </button>
          <button
            onClick={handleAutoTarhimToggle}
            className={`p-2 rounded-lg ${
              autoTarhim 
                ? isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
            } hover:opacity-80 transition-opacity`}
            title={autoTarhim ? 'Auto-tarhim aktif' : 'Auto-tarhim nonaktif'}
          >
            <Music size={20} />
          </button>
          <button
            onClick={handleAutoPlayToggle}
            className={`p-2 rounded-lg ${
              autoPlay 
                ? isDarkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
            } hover:opacity-80 transition-opacity`}
            title={autoPlay ? 'Auto-adzan aktif' : 'Auto-adzan nonaktif'}
          >
            <AlarmClock size={20} />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } transition-colors`}
            title="Pengaturan"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Background Mode Info */}
      <div className={`mb-4 p-3 rounded-lg ${
        document.visibilityState === 'visible'
          ? isDarkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-50 text-green-800'
          : isDarkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-800'
      }`}>
        <div className="flex items-center gap-2">
          {document.visibilityState === 'visible' ? (
            <>
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Aplikasi Terbuka - Audio siap diputar</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              <span className="text-sm font-medium">Aplikasi di Background - Hanya notifikasi (audio tidak bisa diputar)</span>
            </>
          )}
        </div>
      </div>

      {/* Current Time & Date */}
      <div className={`rounded-xl p-4 mb-6 shadow-sm ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className={`${isDarkMode ? 'text-emerald-400' : 'text-primary-600'}`} size={24} />
            <div>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {formatTime(currentTime)}
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Lokasi
            </div>
            <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {city}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Display */}
      {showStats && dailyStats && (
        <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-medium flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              <Database size={16} />
              Statistik Hari Ini
            </h4>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-emerald-500">{dailyStats.adzan_count || 0}</div>
              <div className="text-xs">Adzan</div>
            </div>
            <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-blue-500">{dailyStats.tarhim_count || 0}</div>
              <div className="text-xs">Tarhim</div>
            </div>
            <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-purple-500">
                {(dailyStats.subuh_count || 0) + (dailyStats.dzuhur_count || 0) + 
                 (dailyStats.ashar_count || 0) + (dailyStats.maghrib_count || 0) + 
                 (dailyStats.isya_count || 0)}
              </div>
              <div className="text-xs">Total</div>
            </div>
          </div>
          
          {lastAdzan && (
            <div className="mt-2 text-xs text-gray-500">
              Terakhir: {new Date(lastAdzan.played_at).toLocaleTimeString('id-ID')}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Player Controls */}
        <div className={`rounded-xl p-6 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Pemutar Adzan
            </h3>
            
            {/* Tarhim Status */}
            {tarhimStartTime && (
              <div className={`mb-4 p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800/50' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="text-blue-500" size={18} />
                    <div>
                      <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        Jadwal Tarhim
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Mulai pukul <span className="font-bold">{formatTarhimTime()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${
                      isTarhimPlaying ? 'text-emerald-400' : 
                      calculateTimeToTarhim() <= 300 ? 'text-orange-400' : 
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {isTarhimPlaying ? 'SEDANG BERBUNYI' : 
                       calculateTimeToTarhim() > 0 ? `MULAI ${formatCountdown(calculateTimeToTarhim())}` :
                       'SELESAI'}
                    </div>
                  </div>
                </div>
                
                {/* Tarhim Controls */}
                <div className="flex gap-2 mt-2">
                  {!isTarhimPlaying ? (
                    <button
                      onClick={startTarhim}
                      disabled={!tarhimLoaded || document.visibilityState !== 'visible'}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                      title={document.visibilityState !== 'visible' ? 'Buka aplikasi untuk memutar' : ''}
                    >
                      {document.visibilityState !== 'visible' ? 'Buka Aplikasi' : 'Putar Tarhim Sekarang'}
                    </button>
                  ) : (
                    <button
                      onClick={() => stopTarhim(true)}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Hentikan Tarhim
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Player Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={skipToNextPrayer}
                disabled={!nextPrayer}
                className={`p-3 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30'
                }`}
                title="Shalat berikutnya"
              >
                <SkipForward size={24} />
              </button>
              
              <button
                onClick={isPlaying ? pauseAdhan : playAdhan}
                disabled={isLoading || !audioLoaded || document.visibilityState !== 'visible'}
                className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
                title={document.visibilityState !== 'visible' ? 'Buka aplikasi untuk memutar' : ''}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <Pause size={28} />
                ) : (
                  <Play size={28} />
                )}
              </button>
              
              <button
                onClick={stopAdhan}
                disabled={!isPlaying}
                className={`p-3 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30'
                }`}
                title="Stop adzan"
              >
                <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
              </button>
            </div>
            
            {/* Volume Control */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMuteToggle}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    {isMuted ? (
                      <VolumeX className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} size={20} />
                    ) : (
                      <Volume2 className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} size={20} />
                    )}
                  </button>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    Volume: {isMuted ? 0 : volume}%
                  </span>
                </div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {isMuted ? 'MUTE' : 'ON'}
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500`}
              />
            </div>
            
            {/* Status */}
            <div className={`rounded-lg p-4 mb-4 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status Adzan
                  </div>
                  <div className={`font-semibold ${isPlaying ? 'text-emerald-400' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isPlaying ? 'SEDANG BERBUNYI' : 'DIAM'}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status Tarhim
                  </div>
                  <div className={`font-semibold ${isTarhimPlaying ? 'text-blue-400' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isTarhimPlaying ? 'SEDANG BERBUNYI' : 'DIAM'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => playAdhan()}
              disabled={isPlaying || !audioLoaded || document.visibilityState !== 'visible'}
              className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={document.visibilityState !== 'visible' ? 'Buka aplikasi untuk memutar' : ''}
            >
              Putar Adzan Sekarang
            </button>
            <button
              onClick={() => {
                if (isPlaying) stopAdhan();
                if (isTarhimPlaying) stopTarhim(true);
              }}
              disabled={!isPlaying && !isTarhimPlaying}
              className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop Semua
            </button>
          </div>
        </div>

        {/* Right: Prayer Times */}
        <div className={`rounded-xl p-6 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Jadwal Shalat Hari Ini
            </h3>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {nextPrayer && `Menuju: ${nextPrayer.name}`}
            </div>
          </div>
          
          {/* Next Prayer Countdown */}
          {nextPrayer && (
            <div className={`rounded-xl p-4 mb-6 border ${
              isDarkMode 
                ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800/50' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {nextPrayer.icon}
                  <div>
                    <div className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Waktu {nextPrayer.name}
                    </div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {nextPrayer.time}
                    </div>
                    {nextPrayer.id === 'fajr' && autoTarhim && (
                      <div className="text-xs text-blue-500 font-medium flex items-center gap-1">
                        <Music size={12} />
                        Tarhim: {formatTarhimTime()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tersisa
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {formatCountdown(nextPrayer.timeLeft)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Prayer Times List */}
          <div className="space-y-3">
            {prayerTimes.map((prayer) => {
              const isNext = nextPrayer && nextPrayer.id === prayer.id;
              const isFajr = prayer.id === 'fajr';
              const hasPassed = prayer.timeLeft < 0;
              
              return (
                <div
                  key={prayer.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isNext
                      ? isDarkMode 
                        ? 'bg-blue-900/30 border border-blue-800/50' 
                        : 'bg-blue-50 border border-blue-200'
                      : hasPassed
                      ? isDarkMode
                        ? 'bg-gray-700/50 opacity-70'
                        : 'bg-gray-50 opacity-70'
                      : isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isNext 
                        ? isDarkMode ? 'bg-blue-800/50' : 'bg-blue-100'
                        : hasPassed
                        ? isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200'
                        : isDarkMode ? 'bg-gray-600' : 'bg-gray-100'
                    }`}>
                      {prayer.icon}
                    </div>
                    <div>
                      <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} ${hasPassed ? 'line-through' : ''}`}>
                        {prayer.name}
                      </div>
                      {isNext && !hasPassed && (
                        <div className="text-xs text-blue-500 font-medium">● BERIKUTNYA</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} ${hasPassed ? 'line-through' : ''}`}>
                      {prayer.time}
                    </div>
                    <div className={`text-sm font-mono ${
                      hasPassed 
                        ? isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatCountdown(prayer.timeLeft)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Info */}
          <div className={`mt-6 pt-4 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Bell size={14} />
                <span>Notifikasi akan muncul meskipun browser ditutup</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Volume2 size={14} />
                <span>Audio hanya bisa diputar saat aplikasi terbuka</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Waktu Sholat Component */}
      <div className="mt-6">
        <div className={`rounded-xl p-6 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                <Calendar size={20} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Pengaturan Jadwal
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {useManualTimes ? 'Mode Manual' : 'Mode Otomatis berdasarkan lokasi'}
                </p>
              </div>
            </div>
            
            {useManualTimes && (
              <button
                onClick={handleResetToAuto}
                className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'} px-3 py-1 rounded-lg`}
              >
                <RefreshCw size={14} />
                <span>Reset ke Otomatis</span>
              </button>
            )}
          </div>

          {/* Location Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <MapPin size={16} />
                <span>Lokasi</span>
              </div>
              <button
                onClick={() => {
                  if (!isOnline) {
                    showToast('Tidak ada koneksi internet', 'error');
                    return;
                  }
                  
                  const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Yogyakarta', 'Bali'];
                  const randomCity = cities[Math.floor(Math.random() * cities.length)];
                  handleCityChange(randomCity);
                }}
                disabled={!isOnline}
                className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'} px-3 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Navigation size={14} />
                <span>Ganti Lokasi</span>
              </button>
            </div>
            
            <select
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Jakarta">Jakarta</option>
              <option value="Bandung">Bandung</option>
              <option value="Surabaya">Surabaya</option>
              <option value="Medan">Medan</option>
              <option value="Makassar">Makassar</option>
              <option value="Yogyakarta">Yogyakarta</option>
              <option value="Bali">Bali</option>
            </select>
          </div>

          {/* Manual Time Inputs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                Atur Waktu Manual:
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs px-2 py-1 rounded ${
                  useManualTimes 
                    ? isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                    : isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                }`}>
                  {useManualTimes ? 'MANUAL' : 'OTOMATIS'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(manualTimes).map(([prayer, time]) => (
                <div 
                  key={prayer} 
                  className={`p-3 rounded-lg transition-colors ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`text-sm mb-1 capitalize ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {getPrayerName(prayer)}
                  </div>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => handleManualTimeChange(prayer, e.target.value)}
                    className={`w-full px-2 py-1 border rounded text-center font-medium focus:outline-none focus:ring-2 ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-transparent'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Adzan;
