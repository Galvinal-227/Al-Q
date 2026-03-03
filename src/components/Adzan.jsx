import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Bell, Clock, Settings, 
  Sunrise, Sun, Sunset, Moon, MoonStar,
  Pause, Play, SkipForward, AlarmClock,
  Save, X, MapPin, Calendar, Globe,
  Music, Timer, RefreshCw, Navigation,
  CheckCircle, AlertCircle, WifiOff,
  BellRing, HelpCircle, BarChart3, Database
} from 'lucide-react';
import { dbService } from '../service/databaseService';

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
  const [showDebug, setShowDebug] = useState(false);
  
  // ============= DATABASE STATES =============
  const [dailyStats, setDailyStats] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [lastAdzan, setLastAdzan] = useState(null);
  const [lastTarhim, setLastTarhim] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [dbStatus, setDbStatus] = useState('disconnected');
  
  const audioRef = useRef(null);
  const tarhimAudioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const notificationCheckRef = useRef(null);
  const dbSyncRef = useRef(null);

  // ============= DATABASE FUNCTIONS =============
  
  // Load semua data dari database
  const loadAllFromDatabase = async () => {
    setIsLoadingDb(true);
    setDbStatus('loading');
    
    try {
      // Load user settings
      const settings = await dbService.getUserSettings();
      console.log('📦 Loaded settings:', settings);
      
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
      
      // Load stats
      const stats = await dbService.getCompleteStats();
      setDailyStats(stats.daily);
      setWeeklyStats(stats.weekly);
      setLastAdzan(stats.lastAdzan);
      setLastTarhim(stats.lastTarhim);
      setRecentActivities(stats.recentActivities);
      
      setDbStatus('connected');
    } catch (error) {
      console.error('❌ Error loading from database:', error);
      setDbStatus('error');
      showToast('Gagal memuat data dari database', 'error');
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Simpan setting ke database
  const saveToDatabase = async (key, value) => {
    try {
      const update = {};
      update[key] = value;
      await dbService.updateUserSettings(update);
      setDbStatus('synced');
      
      // Reset status setelah 2 detik
      setTimeout(() => {
        if (dbStatus === 'synced') setDbStatus('connected');
      }, 2000);
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      setDbStatus('error');
    }
  };

  // Log adzan ke database
  const logAdzanToDatabase = async (prayerName, isAuto = true) => {
    try {
      await dbService.logAdzanPlayed(prayerName, isAuto, volume);
      
      // Refresh stats
      const stats = await dbService.getCompleteStats();
      setDailyStats(stats.daily);
      setLastAdzan(stats.lastAdzan);
      setRecentActivities(stats.recentActivities);
    } catch (error) {
      console.error('❌ Error logging adzan:', error);
    }
  };

  // Log tarhim ke database
  const logTarhimToDatabase = async (isAuto = true, stoppedEarly = false) => {
    try {
      await dbService.logTarhimPlayed(isAuto, volume, tarhimDuration, stoppedEarly);
      
      // Refresh stats
      const stats = await dbService.getCompleteStats();
      setDailyStats(stats.daily);
      setLastTarhim(stats.lastTarhim);
      setRecentActivities(stats.recentActivities);
    } catch (error) {
      console.error('❌ Error logging tarhim:', error);
    }
  };

  // Sync settings ke database setiap 5 detik (jika ada perubahan)
  useEffect(() => {
    dbSyncRef.current = setInterval(() => {
      if (dbStatus === 'connected') {
        // Auto sync every 30 seconds
        console.log('🔄 Auto-syncing with database...');
      }
    }, 30000);
    
    return () => clearInterval(dbSyncRef.current);
  }, [dbStatus]);

  // Load data saat komponen mount
  useEffect(() => {
    loadAllFromDatabase();
    
    // Check online status
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
    setNotificationPermission(Notification.permission);
  }, []);

  // Preload audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.addEventListener('canplaythrough', () => {
        setAudioLoaded(true);
        console.log('✅ Audio Adzan siap diputar');
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error('❌ Error loading adzan audio:', e);
      });
    }
    
    if (tarhimAudioRef.current) {
      tarhimAudioRef.current.load();
      tarhimAudioRef.current.addEventListener('canplaythrough', () => {
        setTarhimLoaded(true);
        console.log('✅ Audio Tarhim siap diputar');
      });
      tarhimAudioRef.current.addEventListener('error', (e) => {
        console.error('❌ Error loading tarhim audio:', e);
      });
    }
  }, []);

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

  // ============= TIME CHECKERS =============
  
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
      startTarhim();
      logTarhimToDatabase(true, false);
      showToast(`Tarhim dimulai, menuju waktu Subuh`, 'info');
      
      if (notificationPermission === 'granted') {
        sendNotification('Tarhim Dimulai', `Tarhim sebelum Subuh telah dimulai. Bersiaplah untuk shalat!`);
      }
    }
  };

  const checkAdhanTime = () => {
    if (!autoPlay) return;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    if (currentSeconds !== 0) return;
    
    prayerTimes.forEach(prayer => {
      const [prayerHours, prayerMinutes] = prayer.time.split(':').map(Number);
      
      if (currentHours === prayerHours && currentMinutes === prayerMinutes && !isPlaying) {
        const prayerKey = `${prayer.id}-${new Date().toDateString()}`;
        
        if (lastPlayedPrayer !== prayerKey) {
          console.log(`🕌 Waktu ${prayer.name} (${prayer.time}) tiba!`);
          
          if (prayer.id === 'fajr' && isTarhimPlaying) {
            stopTarhim();
          }
          
          setTimeout(() => {
            playAdhan(prayer);
            setLastPlayedPrayer(prayerKey);
          }, 100);
          
          showToast(`Waktu ${prayer.name} telah tiba`, 'success');
          
          if (notificationPermission === 'granted') {
            sendNotification(
              `Waktu ${prayer.name}`, 
              `Sudah masuk waktu ${prayer.name} (${prayer.time}). Ayo shalat berjamaah!`
            );
          }
        }
      }
    });
    
    const fajrTime = useManualTimes ? manualTimes.fajr : getDefaultTimes().fajr;
    const [fajrHours, fajrMinutes] = fajrTime.split(':').map(Number);
    
    if (currentHours === fajrHours && currentMinutes === fajrMinutes && isTarhimPlaying) {
      console.log(`🕌 Waktu Subuh tiba, menghentikan tarhim...`);
      stopTarhim();
    }
  };

  const checkPrayerNotifications = () => {
    if (notificationPermission !== 'granted') return;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    prayerTimes.forEach(prayer => {
      const [prayerHours, prayerMinutes] = prayer.time.split(':').map(Number);
      
      // 15 minutes before
      let reminderHour = prayerHours;
      let reminderMinute = prayerMinutes - 15;
      
      if (reminderMinute < 0) {
        reminderHour -= 1;
        reminderMinute += 60;
      }
      
      if (reminderHour >= 0 && currentHours === reminderHour && currentMinutes === reminderMinute) {
        sendNotification(
          `Persiapan ${prayer.name}`,
          `15 menit lagi waktu ${prayer.name} (${prayer.time}). Siapkan diri untuk shalat.`
        );
      }
      
      // 5 minutes before
      reminderHour = prayerHours;
      reminderMinute = prayerMinutes - 5;
      
      if (reminderMinute < 0) {
        reminderHour -= 1;
        reminderMinute += 60;
      }
      
      if (reminderHour >= 0 && currentHours === reminderHour && currentMinutes === reminderMinute) {
        sendNotification(
          `Menjelang ${prayer.name}`,
          `5 menit lagi waktu ${prayer.name}. Siapkan wudhu dan tempat shalat.`
        );
      }
    });
    
    if (autoTarhim && tarhimStartTime) {
      const tarhimHours = tarhimStartTime.getHours();
      const tarhimMinutes = tarhimStartTime.getMinutes();
      
      if (currentHours === tarhimHours && currentMinutes === tarhimMinutes) {
        sendNotification(
          'Tarhim Dimulai',
          `Tarhim sebelum Subuh telah dimulai. Dengarkan dan persiapkan diri untuk shalat Subuh.`
        );
      }
      
      let reminderHour = tarhimHours;
      let reminderMinute = tarhimMinutes - 5;
      
      if (reminderMinute < 0) {
        reminderHour -= 1;
        reminderMinute += 60;
      }
      
      if (reminderHour >= 0 && currentHours === reminderHour && currentMinutes === reminderMinute) {
        sendNotification(
          'Persiapan Tarhim',
          `5 menit lagi tarhim sebelum Subuh dimulai. Siapkan diri untuk ibadah.`
        );
      }
    }
  };

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

  // ============= NOTIFICATION FUNCTIONS =============
  
  const sendNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `adzan-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 30000);

      return notification;
    }
  };

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      showToast('Browser tidak mendukung notifikasi', 'error');
      return;
    }

    Notification.requestPermission().then(async permission => {
      setNotificationPermission(permission);
      await saveToDatabase('notifications_enabled', permission === 'granted');
      
      if (permission === 'granted') {
        showToast('Notifikasi diaktifkan. Anda akan diberitahu saat waktu shalat.', 'success');
        
        setTimeout(() => {
          sendNotification(
            'Notifikasi Aktif! 🎉',
            `Sistem notifikasi waktu shalat telah aktif. Anda akan menerima pemberitahuan untuk:\n• 15 menit sebelum waktu shalat\n• 5 menit sebelum waktu shalat\n• Saat waktu shalat tiba\n• Tarhim sebelum Subuh`
          );
        }, 1000);
      } else if (permission === 'denied') {
        showToast('Izin notifikasi ditolak. Anda tidak akan menerima pengingat waktu shalat.', 'error');
      }
    });
  };

  // ============= AUDIO CONTROL FUNCTIONS =============
  
  const startTarhim = async () => {
    if (!tarhimAudioRef.current) return;
    
    tarhimAudioRef.current.volume = isMuted ? 0 : volume / 100;
    tarhimAudioRef.current.loop = true;
    tarhimAudioRef.current.currentTime = 0;
    
    const playPromise = tarhimAudioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsTarhimPlaying(true);
          console.log('✅ Tarhim diputar');
          
          if (audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        })
        .catch(error => {
          console.error('❌ Error playing tarhim:', error);
          showToast('Gagal memutar tarhim', 'error');
        });
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
    
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    audioRef.current.currentTime = 0;
    
    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(async () => {
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
        })
        .catch(error => {
          console.error('❌ Gagal memutar adzan:', error);
          setIsPlaying(false);
          setIsLoading(false);
          showToast('Gagal memutar adzan', 'error');
        });
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
      const durationPlayed = Math.floor(audioRef.current.currentTime);
      
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      console.log('⏹️ Adzan dihentikan');
      
      const currentPrayer = nextPrayer?.id || 'unknown';
      await dbService.logAdzanPlayed(currentPrayer, false, volume, durationPlayed, false);
    }
  };

  const skipToNextPrayer = () => {
    if (nextPrayer) {
      showToast(`Menuju waktu ${nextPrayer.name}`, 'info');
      if (isPlaying) {
        stopAdhan();
      }
      if (isTarhimPlaying) {
        stopTarhim(true);
      }
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

  // ============= DEBUG FUNCTION =============
  
  const testSystem = async () => {
    console.log('🧪 TEST SISTEM ADZAN');
    console.log('=====================');
    console.log('Database Status:', dbStatus);
    console.log('User Settings:', await dbService.getUserSettings());
    console.log('Daily Stats:', dailyStats);
    console.log('Last Adzan:', lastAdzan);
    console.log('Last Tarhim:', lastTarhim);
    console.log('Recent Activities:', recentActivities);
    console.log('Waktu sekarang:', formatTime(new Date()));
    console.log('Auto play:', autoPlay ? 'AKTIF' : 'NONAKTIF');
    console.log('Auto tarhim:', autoTarhim ? 'AKTIF' : 'NONAKTIF');
    console.log('Volume:', isMuted ? 'MUTE' : volume + '%');
    console.log('Audio loaded:', audioLoaded ? 'YA' : 'TIDAK');
    console.log('Tarhim loaded:', tarhimLoaded ? 'YA' : 'TIDAK');
    console.log('Jadwal shalat:', prayerTimes);
    console.log('Shalat berikutnya:', nextPrayer);
    console.log('Waktu tarhim:', formatTarhimTime());
    console.log('Notifikasi:', notificationPermission);
    console.log('=====================');
    
    showToast('Debug info ditampilkan di console', 'info');
  };

  // ============= MAIN TIMER EFFECT =============
  
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
        checkPrayerNotifications();
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

  // Reset last played prayer setiap hari
  useEffect(() => {
    const resetTimer = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        setLastPlayedPrayer(null);
      }
    }, 60000);
    
    return () => clearInterval(resetTimer);
  }, []);

  // ============= STATS DISPLAY COMPONENT =============
  
  const StatsDisplay = () => {
    if (!dailyStats) return null;
    
    return (
      <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`font-medium flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <Database size={16} className={dbStatus === 'connected' ? 'text-green-500' : dbStatus === 'synced' ? 'text-blue-500' : 'text-yellow-500'} />
            Statistik Hari Ini
            {dbStatus === 'synced' && <span className="text-xs text-green-500">✓ Tersimpan</span>}
            {dbStatus === 'error' && <span className="text-xs text-red-500">⚠ Gagal sync</span>}
          </h4>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            {showStats ? 'Sembunyikan' : 'Detail'}
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
            <div className="text-2xl font-bold text-emerald-500">{dailyStats.adzan_count || 0}</div>
            <div className="text-xs">Adzan</div>
          </div>
          <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
            <div className="text-2xl font-bold text-blue-500">{dailyStats.tarhim_count || 0}</div>
            <div className="text-xs">Tarhim</div>
          </div>
          <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`}>
            <div className="text-2xl font-bold text-purple-500">
              {(dailyStats.subuh_count || 0) + (dailyStats.dzuhur_count || 0) + 
               (dailyStats.ashar_count || 0) + (dailyStats.maghrib_count || 0) + 
               (dailyStats.isya_count || 0)}
            </div>
            <div className="text-xs">Total</div>
          </div>
        </div>
        
        {showStats && (
          <>
            <div className="mt-3 grid grid-cols-5 gap-1 text-xs">
              <div className="text-center">
                <div className="font-medium">Subuh</div>
                <div className="text-emerald-500 font-bold">{dailyStats.subuh_count || 0}</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Dzuhur</div>
                <div className="text-emerald-500 font-bold">{dailyStats.dzuhur_count || 0}</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Ashar</div>
                <div className="text-emerald-500 font-bold">{dailyStats.ashar_count || 0}</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Maghrib</div>
                <div className="text-emerald-500 font-bold">{dailyStats.maghrib_count || 0}</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Isya</div>
                <div className="text-emerald-500 font-bold">{dailyStats.isya_count || 0}</div>
              </div>
            </div>
            
            {lastAdzan && (
              <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                <div>Terakhir: {new Date(lastAdzan.played_at).toLocaleTimeString('id-ID')}</div>
                {lastAdzan.prayer_name && <div>Shalat: {lastAdzan.prayer_name}</div>}
              </div>
            )}
          </>
        )}
      </div>
    );
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
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className={`rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
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
              {/* Database Status */}
              <div className={`p-3 rounded-lg ${
                dbStatus === 'connected' ? 'bg-green-900/20 text-green-400' : 
                dbStatus === 'synced' ? 'bg-blue-900/20 text-blue-400' : 
                'bg-yellow-900/20 text-yellow-400'
              }`}>
                <div className="flex items-center gap-2">
                  <Database size={16} />
                  <span className="text-sm font-medium">
                    {dbStatus === 'connected' ? 'Terhubung ke database' : 
                     dbStatus === 'synced' ? 'Data tersimpan' : 
                     dbStatus === 'loading' ? 'Memuat data...' : 
                     'Gagal terhubung'}
                  </span>
                </div>
              </div>

              {/* Notification Settings */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>Notifikasi Waktu Shalat</div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {notificationPermission === 'granted' 
                        ? 'Aktif - Anda akan diberitahu saat waktu shalat' 
                        : notificationPermission === 'denied'
                        ? 'Ditolak - Aktifkan di pengaturan browser'
                        : 'Menunggu izin'}
                    </div>
                  </div>
                  <button
                    onClick={requestNotificationPermission}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      notificationPermission === 'granted'
                        ? 'bg-green-500 text-white'
                        : isDarkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {notificationPermission === 'granted' ? '✓ Aktif' : 'Aktifkan'}
                  </button>
                </div>
                
                <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <BellRing size={12} />
                    <span>Anda akan menerima notifikasi untuk:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>15 menit sebelum setiap waktu shalat</li>
                    <li>5 menit sebelum setiap waktu shalat</li>
                    <li>Saat waktu shalat tiba</li>
                    <li>Tarhim sebelum Subuh (jika diaktifkan)</li>
                  </ul>
                </div>
              </div>

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
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Tarhim akan dimulai {tarhimDuration} menit sebelum waktu subuh
                </p>
              </div>
              
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>Auto Tarhim</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Putar tarhim sebelum subuh
                  </div>
                </div>
                <button
                  onClick={handleAutoTarhimToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${autoTarhim 
                    ? 'bg-emerald-500' 
                    : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute w-5 h-5 rounded-full top-0.5 transition-transform ${
                    autoTarhim ? 'left-7' : 'left-1'
                  } ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} />
                </button>
              </div>
              
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-gray-200' : ''}`}>Auto Adzan</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Putar adzan otomatis
                  </div>
                </div>
                <button
                  onClick={handleAutoPlayToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${autoPlay 
                    ? 'bg-emerald-500' 
                    : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute w-5 h-5 rounded-full top-0.5 transition-transform ${
                    autoPlay ? 'left-7' : 'left-1'
                  } ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} />
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
                Batal
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  showToast('Pengaturan telah disimpan', 'success');
                }}
                className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      
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
            <div className="flex items-center gap-3 mt-1">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Pengingat waktu shalat dan adzan otomatis
              </p>
              {!isOnline && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  <WifiOff size={10} className="inline mr-1" />
                  Offline Mode
                </span>
              )}
              {notificationPermission === 'granted' && (
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                  <BellRing size={10} className="inline mr-1" />
                  Notifikasi Aktif
                </span>
              )}
              <button
                onClick={testSystem}
                className="text-xs px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
                title="Debug info"
              >
                <HelpCircle size={12} className="inline mr-1" />
                Debug
              </button>
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

      {/* Status Bar */}
      <div className={`mb-4 px-4 py-2 rounded-lg text-sm flex items-center justify-between ${
        audioLoaded && tarhimLoaded
          ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
          : isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${audioLoaded && tarhimLoaded ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <span>
            {audioLoaded && tarhimLoaded 
              ? '✓ Audio siap - Adzan dan Tarhim akan berbunyi otomatis pada waktunya' 
              : '⏳ Memuat audio...'}
          </span>
        </div>
        {isLoadingDb && <span className="text-xs">Menyimpan...</span>}
      </div>

      {/* Stats Display */}
      {showStats && <StatsDisplay />}

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
                        {autoTarhim && ` (${tarhimDuration} menit sebelum Subuh)`}
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
                      disabled={!tarhimLoaded}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      Putar Tarhim Sekarang
                    </button>
                  ) : (
                    <button
                      onClick={() => stopTarhim(true)}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Hentikan Tarhim
                    </button>
                  )}
                  {!isTarhimPlaying && calculateTimeToTarhim() > 0 && (
                    <div className={`flex-1 py-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatCountdown(calculateTimeToTarhim())}
                    </div>
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
                disabled={isLoading || !audioLoaded}
                className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
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
              disabled={isPlaying || !audioLoaded}
              className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {isFajr && autoTarhim && !hasPassed && (
                        <div className="text-xs text-blue-500 font-medium flex items-center gap-1">
                          <Music size={10} />
                          Tarhim: {formatTarhimTime()}
                        </div>
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
                <span>Adzan otomatis akan berbunyi tepat pada waktu shalat</span>
              </div>
              {autoTarhim && (
                <div className="flex items-center gap-2 text-sm text-blue-500">
                  <Music size={14} />
                  <span>Tarhim akan dimulai {tarhimDuration} menit sebelum Subuh</span>
                </div>
              )}
              {notificationPermission === 'granted' && (
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <CheckCircle size={14} />
                  <span>Notifikasi aktif: 15 menit & 5 menit sebelum waktu shalat</span>
                </div>
              )}
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
            
            <div className={`mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2">
                <Globe size={14} />
                <span>{city} • GMT+7</span>
                {!isOnline && (
                  <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                    <WifiOff size={10} className="inline mr-1" />
                    Offline
                  </span>
                )}
              </div>
            </div>
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
            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {useManualTimes 
                ? 'Waktu shalat menggunakan setting manual' 
                : 'Waktu shalat dihitung otomatis berdasarkan lokasi'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Adzan;