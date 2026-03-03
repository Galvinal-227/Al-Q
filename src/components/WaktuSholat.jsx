import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Calendar, Globe, Loader, ChevronDown, Sunrise, Sunset, Clock, Bell, X } from 'lucide-react';
import { messaging, requestNotificationPermission, onMessageListener } from '../firebase/firebase';

const WaktuSholat = ({ onTimesUpdate }) => {
  const [location, setLocation] = useState({
    provinsi: 'DKI Jakarta',
    kabkota: 'Jakarta',
    lat: -6.2088,
    lng: 106.8456,
    timezone: 7
  });

  const [prayerTimes, setPrayerTimes] = useState(null);
  const [imsakiyahData, setImsakiyahData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [useManualTime, setUseManualTime] = useState(false);
  const [notificationToken, setNotificationToken] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // State untuk dropdown
  const [provinsiList, setProvinsiList] = useState([]);
  const [kabkotaList, setKabkotaList] = useState([]);
  const [loadingProvinsi, setLoadingProvinsi] = useState(false);
  const [loadingKabkota, setLoadingKabkota] = useState(false);
  const [showProvinsiDropdown, setShowProvinsiDropdown] = useState(false);
  const [showKabkotaDropdown, setShowKabkotaDropdown] = useState(false);

  // Manual times fallback
  const [manualTimes, setManualTimes] = useState({
    imsak: '04:30',
    subuh: '04:40',
    terbit: '06:00',
    dhuha: '06:30',
    dzuhur: '12:00',
    ashar: '15:00',
    maghrib: '18:00',
    isya: '19:00'
  });

  // Cek token notifikasi yang tersimpan
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
        
        if (Notification.permission === 'granted') {
          const savedToken = localStorage.getItem('fcm_token');
          if (savedToken) {
            setNotificationToken(savedToken);
            setNotificationsEnabled(true);
          }
        }
      }
    };
    
    checkNotificationPermission();
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (!notificationsEnabled) return;
    
    const unsubscribe = onMessageListener().then((payload) => {
      console.log('Received foreground message:', payload);
      
      // Tampilkan notifikasi sendiri jika perlu
      if (payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/icon.png',
          badge: '/logo.png'
        });
      }
    });

    return () => unsubscribe;
  }, [notificationsEnabled]);

  // Setup notifikasi otomatis berdasarkan waktu shalat
  useEffect(() => {
    if (!prayerTimes || !notificationsEnabled || !notificationToken) return;
    
    // Fungsi untuk mengirim notifikasi
    const sendNotification = (prayer, time) => {
      const prayerNames = {
        imsak: { name: 'Imsak', message: 'Telah masuk waktu Imsak. Segera hentikan makan sahur.' },
        subuh: { name: 'Subuh', message: 'Sekarang telah masuk waktu shalat Subuh. Segera tunaikan shalat!' },
        dzuhur: { name: 'Dzuhur', message: 'Sekarang telah masuk waktu shalat Dzuhur. Segera tunaikan shalat!' },
        ashar: { name: 'Ashar', message: 'Sekarang telah masuk waktu shalat Ashar. Segera tunaikan shalat!' },
        maghrib: { name: 'Maghrib', message: 'Sekarang telah masuk waktu shalat Maghrib. Segera tunaikan shalat!' },
        isya: { name: 'Isya', message: 'Sekarang telah masuk waktu shalat Isya. Segera tunaikan shalat!' }
      };
      
      if (prayerNames[prayer]) {
        new Notification(`Waktu ${prayerNames[prayer].name}`, {
          body: prayerNames[prayer].message,
          icon: '/icon.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200]
        });

        // Play adzan (opsional)
        if (prayer !== 'imsak') {
          const audio = new Audio('/adzan.mp3');
          audio.play().catch(e => console.log('Audio play failed:', e));
        }
      }
    };

    // Cek waktu setiap menit
    const checkPrayerTimes = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      Object.entries(prayerTimes).forEach(([prayer, time]) => {
        if (time === currentTime) {
          sendNotification(prayer, time);
        }
      });
    };

    const interval = setInterval(checkPrayerTimes, 60000); // Cek setiap menit
    checkPrayerTimes(); // Cek langsung

    return () => clearInterval(interval);
  }, [prayerTimes, notificationsEnabled, notificationToken]);

  // Fetch daftar provinsi
  useEffect(() => {
    fetchProvinsi();
  }, []);

  // Fetch daftar kabkota ketika provinsi berubah
  useEffect(() => {
    if (location.provinsi) {
      fetchKabkota(location.provinsi);
    }
  }, [location.provinsi]);

  // Fetch jadwal ketika kabkota atau tanggal berubah
  useEffect(() => {
    if (location.kabkota && !useManualTime) {
      fetchImsakiyah(location.provinsi, location.kabkota, selectedDate);
    }
  }, [location.kabkota, selectedDate, useManualTime]);

  const fetchProvinsi = async () => {
    setLoadingProvinsi(true);
    try {
      const response = await fetch('https://equran.id/api/v2/imsakiyah/provinsi');
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setProvinsiList(data.data);
      } else {
        // Fallback data
        setProvinsiList([
          'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
          'Jambi', 'Bengkulu', 'Sumatera Selatan', 'Bangka Belitung', 'Lampung',
          'Banten', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
          'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
          'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
          'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat',
          'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan'
        ]);
      }
    } catch (error) {
      console.error('Error fetching provinsi:', error);
      setProvinsiList(['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten']);
    } finally {
      setLoadingProvinsi(false);
    }
  };

  const fetchKabkota = async (provinsi) => {
    if (!provinsi) return;
    
    setLoadingKabkota(true);
    setKabkotaList([]);
    
    try {
      const response = await fetch('https://equran.id/api/v2/imsakiyah/kabkota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provinsi })
      });
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setKabkotaList(data.data);
        
        if (!location.kabkota && data.data.length > 0) {
          handleKabkotaChange(data.data[0]);
        }
      } else {
        const fallbackData = getFallbackKabkota(provinsi);
        setKabkotaList(fallbackData);
        
        if (!location.kabkota && fallbackData.length > 0) {
          handleKabkotaChange(fallbackData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching kabkota:', error);
      const fallbackData = getFallbackKabkota(provinsi);
      setKabkotaList(fallbackData);
      
      if (!location.kabkota && fallbackData.length > 0) {
        handleKabkotaChange(fallbackData[0]);
      }
    } finally {
      setLoadingKabkota(false);
    }
  };

  const getFallbackKabkota = (provinsi) => {
    const fallbackMap = {
      'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur'],
      'Jawa Barat': ['Kota Bandung', 'Kab. Bandung', 'Kab. Bogor', 'Kota Bogor', 'Kota Bekasi', 'Kab. Bekasi', 'Kota Depok', 'Kab. Cianjur', 'Kab. Sukabumi', 'Kota Sukabumi'],
      'Jawa Tengah': ['Kota Semarang', 'Kab. Semarang', 'Kota Surakarta', 'Kab. Boyolali', 'Kab. Klaten', 'Kota Magelang', 'Kab. Magelang'],
      'Jawa Timur': ['Kota Surabaya', 'Kab. Sidoarjo', 'Kota Malang', 'Kab. Malang', 'Kab. Nganjuk', 'Kota Kediri', 'Kab. Kediri', 'Kab. Jombang'],
      'Banten': ['Kota Tangerang', 'Kab. Tangerang', 'Kota Cilegon', 'Kab. Serang', 'Kota Serang'],
      'Sumatera Utara': ['Kota Medan', 'Kab. Deli Serdang', 'Kota Binjai', 'Kab. Langkat'],
      'Sulawesi Selatan': ['Kota Makassar', 'Kab. Gowa', 'Kab. Maros', 'Kota Parepare'],
      'Papua': ['Kota Jayapura', 'Kab. Jayapura', 'Kab. Biak Numfor']
    };
    
    return fallbackMap[provinsi] || ['Kota', 'Kabupaten'];
  };

  const fetchImsakiyah = async (provinsi, kabkota, tanggal) => {
    setLoading(true);
    setPrayerTimes(null);
    
    try {
      const response = await fetch('https://equran.id/api/v2/imsakiyah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provinsi, kabkota })
      });
      
      const data = await response.json();
      console.log('Imsakiyah data:', data);
      
      if (data.data) {
        setImsakiyahData(data.data);
        
        if (data.data.jadwal && Array.isArray(data.data.jadwal)) {
          const selectedJadwal = data.data.jadwal.find(j => j.tanggal === tanggal);
          
          if (selectedJadwal) {
            const times = {
              imsak: selectedJadwal.imsak || '04:30',
              subuh: selectedJadwal.subuh,
              terbit: selectedJadwal.terbit,
              dhuha: selectedJadwal.dhuha,
              dzuhur: selectedJadwal.dzuhur,
              ashar: selectedJadwal.ashar,
              maghrib: selectedJadwal.maghrib,
              isya: selectedJadwal.isya
            };
            
            setPrayerTimes(times);
            
            if (onTimesUpdate) {
              onTimesUpdate(times);
            }
          } else if (data.data.jadwal.length > 0) {
            const firstJadwal = data.data.jadwal[0];
            const times = {
              imsak: firstJadwal.imsak || '04:30',
              subuh: firstJadwal.subuh,
              terbit: firstJadwal.terbit,
              dhuha: firstJadwal.dhuha,
              dzuhur: firstJadwal.dzuhur,
              ashar: firstJadwal.ashar,
              maghrib: firstJadwal.maghrib,
              isya: firstJadwal.isya
            };
            
            setPrayerTimes(times);
            
            if (onTimesUpdate) {
              onTimesUpdate(times);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching imsakiyah:', error);
      setPrayerTimes(manualTimes);
      
      if (onTimesUpdate) {
        onTimesUpdate(manualTimes);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProvinsiChange = (provinsi) => {
    setLocation({
      ...location,
      provinsi,
      kabkota: ''
    });
    setShowProvinsiDropdown(false);
  };

  const handleKabkotaChange = (kabkota) => {
    setLocation({
      ...location,
      kabkota
    });
    setShowKabkotaDropdown(false);
  };

  const handleTimeChange = (prayer, time) => {
    const newTimes = { ...manualTimes, [prayer]: time };
    setManualTimes(newTimes);
    setPrayerTimes(newTimes);
    
    if (onTimesUpdate) {
      onTimesUpdate(newTimes);
    }
  };

  const toggleMode = () => {
    setUseManualTime(!useManualTime);
    if (!useManualTime) {
      setPrayerTimes(manualTimes);
      if (onTimesUpdate) {
        onTimesUpdate(manualTimes);
      }
    } else {
      if (location.kabkota) {
        fetchImsakiyah(location.provinsi, location.kabkota, selectedDate);
      }
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.removeItem('fcm_token');
      setNotificationToken(null);
    } else {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          setNotificationToken(token);
          setNotificationsEnabled(true);
          localStorage.setItem('fcm_token', token);
          setNotificationPermission('granted');
          
          new Notification('Notifikasi Diaktifkan', {
            body: 'Anda akan menerima notifikasi waktu shalat',
            icon: '/icon.png'
          });
        }
      } catch (error) {
        console.error('Failed to enable notifications:', error);
        alert('Gagal mengaktifkan notifikasi. Pastikan Anda mengizinkan notifikasi di browser.');
      }
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          alert('Fitur deteksi lokasi akan segera hadir dengan reverse geocoding');
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const getPrayerName = (key) => {
    const names = {
      imsak: 'Imsak',
      subuh: 'Subuh',
      terbit: 'Terbit',
      dhuha: 'Dhuha',
      dzuhur: 'Dzuhur',
      ashar: 'Ashar',
      maghrib: 'Maghrib',
      isya: 'Isya'
    };
    return names[key] || key;
  };

  const getPrayerIcon = (key) => {
    if (key === 'imsak') return <Clock size={16} className="text-emerald-500" />;
    if (key === 'terbit' || key === 'dhuha') return <Sunrise size={16} className="text-orange-500" />;
    if (key === 'maghrib') return <Sunset size={16} className="text-orange-600" />;
    return <Clock size={16} className="text-blue-500" />;
  };

  return (
    <div className={`rounded-xl p-6 shadow-sm ${useManualTime ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Jadwal Shalat</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {useManualTime ? 'Mode Manual' : 'Berdasarkan lokasi'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Tombol Notifikasi dengan Firebase */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className={`p-2 rounded-lg transition-colors relative ${
                notificationsEnabled
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : notificationPermission === 'denied'
                  ? 'bg-red-500 text-white opacity-50 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title={notificationsEnabled ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
              disabled={notificationPermission === 'denied'}
            >
              <Bell size={18} />
              {notificationsEnabled && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full animate-pulse"></span>
              )}
            </button>
            
            {showNotificationSettings && notificationsEnabled && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-20">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Token FCM</p>
                  <button
                    onClick={() => setShowNotificationSettings(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 break-all">
                  {notificationToken}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(notificationToken);
                    alert('Token disalin!');
                  }}
                  className="w-full text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Salin Token
                </button>
              </div>
            )}
          </div>
          
          {/* Tombol Mode */}
          <button
            onClick={toggleMode}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              useManualTime 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {useManualTime ? 'Gunakan API' : 'Manual'}
          </button>
        </div>
      </div>

      {!useManualTime ? (
        /* Mode API */
        <div className="space-y-6">
          {/* Provinsi Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provinsi
            </label>
            <div className="relative">
              <button
                onClick={() => setShowProvinsiDropdown(!showProvinsiDropdown)}
                className="w-full px-4 py-2.5 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <span>{location.provinsi || 'Pilih Provinsi'}</span>
                <ChevronDown size={18} className="text-gray-500" />
              </button>
              
              {showProvinsiDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingProvinsi ? (
                    <div className="p-4 text-center text-gray-500">Memuat...</div>
                  ) : (
                    provinsiList.map((prov) => (
                      <button
                        key={prov}
                        onClick={() => handleProvinsiChange(prov)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {prov}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kabkota Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kabupaten/Kota
            </label>
            <div className="relative">
              <button
                onClick={() => setShowKabkotaDropdown(!showKabkotaDropdown)}
                disabled={!location.provinsi || loadingKabkota}
                className="w-full px-4 py-2.5 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{location.kabkota || (loadingKabkota ? 'Memuat...' : 'Pilih Kab/Kota')}</span>
                <ChevronDown size={18} className="text-gray-500" />
              </button>
              
              {showKabkotaDropdown && kabkotaList.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {kabkotaList.map((kab) => (
                    <button
                      key={kab}
                      onClick={() => handleKabkotaChange(kab)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {kab}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Location Info */}
          {location.kabkota && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <MapPin size={16} />
                <span>{location.kabkota}, {location.provinsi}</span>
              </div>
            </div>
          )}

          {/* Prayer Times Display */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="animate-spin text-blue-500" size={32} />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Memuat jadwal...</span>
            </div>
          ) : prayerTimes ? (
            <div>
              {/* Grid untuk semua waktu */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(prayerTimes).map(([prayer, time]) => (
                  <div 
                    key={prayer} 
                    className={`p-3 rounded-lg ${
                      prayer === 'imsak' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {getPrayerIcon(prayer)}
                      <span className={prayer === 'imsak' ? 'text-emerald-700 dark:text-emerald-300 font-medium' : ''}>
                        {getPrayerName(prayer)}
                      </span>
                    </div>
                    <div className={`text-lg font-semibold ${
                      prayer === 'imsak' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {time}
                    </div>
                    {prayer === 'imsak' && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        10 menit sebelum Subuh
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Info tambahan */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <p>• Imsak: waktu mulai berpuasa (10 menit sebelum Subuh)</p>
                <p>• Subuh: waktu shalat Subuh</p>
                <p>• Terbit: matahari terbit (akhir waktu Subuh)</p>
                <p>• Dhuha: waktu shalat Dhuha (20 menit setelah terbit)</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Pilih provinsi dan kabupaten/kota untuk melihat jadwal
            </div>
          )}
        </div>
      ) : (
        /* Mode Manual */
        <div>
          <div className="text-gray-700 dark:text-gray-300 mb-3">Atur Waktu Manual:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(manualTimes).map(([prayer, time]) => (
              <div key={prayer} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {getPrayerIcon(prayer)}
                  <span>{getPrayerName(prayer)}</span>
                </div>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(prayer, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-center font-medium dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer dengan status notifikasi */}
      <div className="mt-6 space-y-2">
        {notificationsEnabled && (
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-700 dark:text-green-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={14} />
              <span>✓ Notifikasi aktif dengan Firebase</span>
            </div>
            <button
              onClick={() => setShowNotificationSettings(!showNotificationSettings)}
              className="text-green-600 dark:text-green-400 hover:underline text-xs"
            >
              Detail
            </button>
          </div>
        )}

        {notificationPermission === 'denied' && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300">
            ⚠ Notifikasi diblokir. Izinkan notifikasi di pengaturan browser.
          </div>
        )}

        {/* Deteksi Lokasi Button */}
        {!useManualTime && (
          <button
            onClick={detectLocation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Navigation size={18} />
            <span>Deteksi Lokasi Saya</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WaktuSholat;