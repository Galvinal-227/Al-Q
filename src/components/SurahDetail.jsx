import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Bookmark, Share2, Volume2, ChevronLeft, ChevronRight, 
  Heart, Copy, BookOpen, Info, ExternalLink, Maximize2, Minimize2,
  Download, Clock, Layers, MessageSquare, RefreshCw, AlertCircle
} from 'lucide-react';

const SurahDetail = ({ surah, onBack, bookmarks, setBookmarks, isDarkMode = false }) => {
  const [ayat, setAyat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAyah, setCurrentAyah] = useState(1);
  const [tafsir, setTafsir] = useState([]);
  const [showTafsir, setShowTafsir] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLatin, setShowLatin] = useState(false);
  
  // State untuk audio dari API equran.id
  const [selectedQari, setSelectedQari] = useState('06'); // Default Yasser Al-Dosari (kode 06)
  const [audioUrls, setAudioUrls] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState(null);
  
  // Daftar qari dari API equran.id
  const qariList = [
    { id: '01', name: 'Abdullah Al-Juhany', code: 'Abdullah-Al-Juhany' },
    { id: '02', name: 'Abdul Muhsin Al-Qasim', code: 'Abdul-Muhsin-Al-Qasim' },
    { id: '03', name: 'Abdurrahman As-Sudais', code: 'Abdurrahman-as-Sudais' },
    { id: '04', name: 'Ibrahim Al-Dossari', code: 'Ibrahim-Al-Dossari' },
    { id: '05', name: 'Misyari Rasyid Al-Afasy', code: 'Misyari-Rasyid-Al-Afasi' },
    { id: '06', name: 'Yasser Al-Dosari', code: 'Yasser-Al-Dosari' }
  ];

  // Base URL untuk audio dari CDN equran.id
  const audioBaseUrl = 'https://cdn.equran.id/audio-full';

  // Angka Arab
  const arabicNumbers = {
    1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 
    6: '٦', 7: '٧', 8: '٨', 9: '٩', 10: '١٠',
    11: '١١', 12: '١٢', 13: '١٣', 14: '١٤', 15: '١٥',
    20: '٢٠', 30: '٣٠', 40: '٤٠', 50: '٥٠', 100: '١٠٠'
  };

  // Sample data untuk fallback
  const sampleAyatArabic = {
    1: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    2: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    3: "الرَّحْمَٰنِ الرَّحِيمِ",
    4: "مَالِكِ يَوْمِ الدِّينِ",
    5: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    6: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    7: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ"
  };

  const sampleAyatLatin = [
    "Bismillahirrahmanirrahim",
    "Alhamdulillahi rabbil 'alamin",
    "Arrahmanirrahim",
    "Maliki yaumiddin",
    "Iyyaka na'budu wa iyyaka nasta'in",
    "Ihdinash shirathal mustaqim",
    "Shirathalladzina an'amta 'alaihim ghairil maghdhubi 'alaihim waladhdhallin"
  ];

  const sampleTerjemahan = [
    "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang",
    "Segala puji bagi Allah, Tuhan seluruh alam",
    "Yang Maha Pengasih, Maha Penyayang",
    "Pemilik hari pembalasan",
    "Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami meminta pertolongan",
    "Tunjukilah kami jalan yang lurus",
    "(yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat"
  ];

  useEffect(() => {
    loadSurahDetail();
  }, [surah]);

  // Fungsi untuk fetch data dari API equran.id
  const fetchSurahDetail = async (surahId) => {
    try {
      const response = await fetch(`https://equran.id/api/v2/surat/${surahId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.code === 200 && result.data) {
        return result.data;
      } else {
        throw new Error('Data tidak ditemukan');
      }
    } catch (error) {
      console.error('Error fetching surah detail:', error);
      throw error;
    }
  };

  const loadSurahDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const surahDetail = await fetchSurahDetail(surah.nomor);
      
      if (surahDetail && surahDetail.ayat) {
        // Format data ayat dengan audio dari API
        const formattedAyat = surahDetail.ayat.map(ayah => {
          const ayahNumber = ayah.nomorAyat;
          
          // Audio URL dari API (akan di-generate saat diputar)
          return {
            nomorAyat: ayahNumber,
            teksArab: ayah.teksArab,
            teksLatin: ayah.teksLatin,
            teksIndonesia: ayah.teksIndonesia,
            audio: ayah.audio || {},
            juz: getJuzFromAyah(surah.nomor, ayahNumber)
          };
        });
        
        setAyat(formattedAyat);
        
        // Load tafsir
        try {
          const tafsirResponse = await fetch(`https://equran.id/api/v2/tafsir/${surah.nomor}`);
          if (tafsirResponse.ok) {
            const tafsirResult = await tafsirResponse.json();
            if (tafsirResult.code === 200 && tafsirResult.data && tafsirResult.data.tafsir) {
              setTafsir(tafsirResult.data.tafsir.map(item => ({
                nomorAyat: item.ayat,
                teks: item.teks
              })));
            }
          }
        } catch (tafsirError) {
          console.warn('Error loading tafsir:', tafsirError);
          const fallbackTafsir = formattedAyat.map(ayah => ({
            nomorAyat: ayah.nomorAyat,
            teks: `Tafsir untuk surah ${surah.nomor} ayat ${ayah.nomorAyat}.`
          }));
          setTafsir(fallbackTafsir);
        }
      } else {
        throw new Error('Data ayat tidak tersedia dari API');
      }
      
    } catch (error) {
      console.error('Error loading surah detail:', error);
      setError(error.message);
      const fallbackAyat = getFallbackAyat(surah.nomor, surah.jumlahAyat || surah.jumlah_ayat || 7);
      setAyat(fallbackAyat);
      
      const event = new CustomEvent('showToast', {
        detail: { 
          message: 'Menggunakan data fallback. API mungkin sedang bermasalah.',
          type: 'warning'
        }
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mendapatkan URL audio dari CDN equran.id
  const getAudioUrl = (surahNumber, ayahNumber, qariCode) => {
    const surahPadded = surahNumber.toString().padStart(3, '0');
    // Format: https://cdn.equran.id/audio-full/[QARI_CODE]/[SURAH].mp3
    // Untuk audio full surat, tapi untuk per ayat mungkin formatnya berbeda
    // Berdasarkan dokumentasi, ini adalah audio full surat
    return `${audioBaseUrl}/${qariCode}/${surahPadded}.mp3`;
  };

  const playAyahAudio = async (ayahNumber) => {
    try {
      // Hentikan audio yang sedang playing
      if (isPlaying && currentPlayingAyah === ayahNumber) {
        const stopEvent = new CustomEvent('stopAyah');
        window.dispatchEvent(stopEvent);
        setIsPlaying(false);
        setCurrentPlayingAyah(null);
        return;
      }

      // Dapatkan qari yang dipilih
      const selectedQariData = qariList.find(q => q.id === selectedQari) || qariList[5]; // Default Yasser
      
      // Buat URL audio (audio full surat, bukan per ayat)
      // Catatan: API equran.id menyediakan audio full surat, bukan per ayat
      const audioUrl = getAudioUrl(surah.nomor, ayahNumber, selectedQariData.code);
      
      console.log('Playing audio:', {
        qari: selectedQariData.name,
        surah: surah.nomor,
        url: audioUrl
      });
      
      // Dispatch event ke Player component dengan informasi yang sesuai
      const event = new CustomEvent('playAyah', {
        detail: {
          surahId: surah.nomor,
          surahName: surah.namaLatin || surah.nama_latin,
          ayahNumber: ayahNumber,
          audioUrl: audioUrl,
          ayahArabic: ayat.find(a => a.nomorAyat === ayahNumber)?.teksArab || '',
          qariName: selectedQariData.name,
          qariId: selectedQari,
          isFullSurah: true // Menandakan ini audio full surat
        }
      });
      window.dispatchEvent(event);
      
      setIsPlaying(true);
      setCurrentPlayingAyah(ayahNumber);
      
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const downloadAyahAudio = async (ayahNumber) => {
    try {
      const selectedQariData = qariList.find(q => q.id === selectedQari) || qariList[5];
      const audioUrl = getAudioUrl(surah.nomor, ayahNumber, selectedQariData.code);
      
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `${surah.namaLatin || surah.nama_latin}_${ayahNumber}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const event = new CustomEvent('showToast', {
        detail: { 
          message: 'Mendownload audio surat...',
          type: 'info'
        }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  };

  // Listener untuk event stop dari Player
  useEffect(() => {
    const handleStop = () => {
      setIsPlaying(false);
      setCurrentPlayingAyah(null);
    };

    window.addEventListener('stopAyah', handleStop);
    return () => window.removeEventListener('stopAyah', handleStop);
  }, []);

  const getJuzFromAyah = (surahId, ayahNumber) => {
    // Mapping sederhana surah ke juz
    const juzMap = {
      1: 1,
      2: ayahNumber <= 141 ? 1 : (ayahNumber <= 252 ? 2 : 3),
      3: ayahNumber <= 92 ? 3 : 4,
      4: 4,
      5: 6,
    };
    
    if (juzMap[surahId]) {
      if (typeof juzMap[surahId] === 'function') {
        return juzMap[surahId](ayahNumber);
      }
      return juzMap[surahId];
    }
    
    if (surahId <= 2) return 1;
    if (surahId <= 4) return 4;
    if (surahId <= 6) return 7;
    if (surahId <= 9) return 10;
    if (surahId <= 11) return 12;
    if (surahId <= 14) return 15;
    if (surahId <= 16) return 17;
    if (surahId <= 18) return 19;
    if (surahId <= 21) return 22;
    if (surahId <= 25) return 25;
    if (surahId <= 28) return 28;
    if (surahId <= 30) return 30;
    return Math.ceil(surahId / 4);
  };

  const getFallbackAyat = (surahNomor, jumlahAyat) => {
    const ayatCount = jumlahAyat || 7;
    const ayatData = [];
    
    for (let i = 1; i <= ayatCount; i++) {
      const arabicNumber = arabicNumbers[i] || i;
      
      ayatData.push({
        nomorAyat: i,
        teksArab: surahNomor === 1 ? sampleAyatArabic[Math.min(i, 7)] : 
                 (i === 1 && surahNomor !== 9 ? sampleAyatArabic[1] : 
                 `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْآيَةِ ${arabicNumber}`),
        teksLatin: sampleAyatLatin[Math.min(i-1, 6)] || `Bacaan latin ayat ${i}`,
        teksIndonesia: sampleTerjemahan[Math.min(i-1, 6)] || `Terjemahan ayat ${i}`,
        juz: getJuzFromAyah(surahNomor, i),
        audio: {}
      });
    }
    
    return ayatData;
  };

  const toggleBookmark = (ayahNumber) => {
    const exists = bookmarks.some(b => b.surah === surah.nomor && b.ayah === ayahNumber);
    const newBookmark = { 
      surah: surah.nomor, 
      ayah: ayahNumber,
      surahName: surah.namaLatin || surah.nama_latin,
      arabic: surah.nama,
      date: new Date().toISOString()
    };
    
    setBookmarks(prev => {
      return exists 
        ? prev.filter(b => !(b.surah === surah.nomor && b.ayah === ayahNumber))
        : [...prev, newBookmark];
    });
    
    const event = new CustomEvent('showToast', {
      detail: { 
        message: exists ? 'Bookmark dihapus' : 'Ayat dibookmark',
        type: 'success'
      }
    });
    window.dispatchEvent(event);
  };

  const isBookmarked = (ayahNumber) => {
    return bookmarks.some(b => b.surah === surah.nomor && b.ayah === ayahNumber);
  };

  const toggleTafsir = (ayahNumber) => {
    setShowTafsir(prev => ({
      ...prev,
      [ayahNumber]: !prev[ayahNumber]
    }));
  };

  const scrollToAyah = (ayahNumber) => {
    const element = document.getElementById(`ayah-${ayahNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentAyah(ayahNumber);
      window.history.pushState(null, '', `#ayah-${ayahNumber}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    const event = new CustomEvent('showToast', {
      detail: { 
        message: 'Teks disalin ke clipboard',
        type: 'info'
      }
    });
    window.dispatchEvent(event);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const ayahNumber = parseInt(hash.replace('#ayah-', ''));
      if (!isNaN(ayahNumber) && ayahNumber >= 1) {
        setTimeout(() => scrollToAyah(ayahNumber), 500);
      }
    }
  }, [ayat]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToAyah(Math.max(1, currentAyah - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToAyah(Math.min(ayat.length, currentAyah + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        playAyahAudio(currentAyah);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAyah, ayat.length]);

  const getNamaLatin = () => {
    return surah.namaLatin || surah.nama_latin || `Surah ${surah.nomor}`;
  };

  const getJumlahAyat = () => {
    return surah.jumlahAyat || surah.jumlah_ayat || ayat.length || 0;
  };

  if (error && ayat.length === 0) {
    return (
      <div className={`rounded-2xl shadow-lg p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Gagal memuat data surah
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={loadSurahDetail} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isDarkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary-600 hover:bg-primary-700'
            } text-white`}>
              <RefreshCw size={16} /> Coba Lagi
            </button>
            <button onClick={onBack} className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            } ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-2xl shadow-lg p-8 text-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-b-2 mx-auto ${
          isDarkMode ? 'border-emerald-400' : 'border-primary-600'
        }`}></div>
        <p className={`mt-4 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Memuat Surah {getNamaLatin()}...
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Surah Header */}
      <div className={`${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-emerald-900' : 'bg-gradient-to-r from-primary-500 to-primary-600'} p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-2 hover:bg-white/20 p-2 rounded-lg">
            <ArrowLeft size={20} /> <span>Kembali ke Daftar</span>
          </button>
          
          <div className="flex items-center gap-3">
            {error && (
              <div className="text-yellow-300 text-sm bg-yellow-900/30 px-2 py-1 rounded flex items-center gap-1">
                <AlertCircle size={14} /> <span>Mode Offline</span>
              </div>
            )}
            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-lg">
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={loadSurahDetail} className="p-2 hover:bg-white/20 rounded-lg">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Surah ke-{surah.nomor}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{getJumlahAyat()} Ayat</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{surah.tempatTurun || surah.tempat_turun || 'Mekah'}</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{getNamaLatin()}</h1>
          <div className="text-4xl font-arabic mb-4">{surah.nama || `سورة ${arabicNumbers[surah.nomor] || surah.nomor}`}</div>
          <p className="text-white/90 max-w-2xl mx-auto">{surah.arti || 'Arti surah'}</p>
          
          {(surah.deskripsi || surah.keterangan) && (
            <div className="text-sm text-white/80 mt-3 max-w-3xl mx-auto">
              <Info size={14} className="inline mr-1 mb-1" />
              <span dangerouslySetInnerHTML={{ __html: surah.deskripsi || surah.keterangan }} />
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className={`px-6 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'
      }`}>
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => scrollToAyah(Math.max(1, currentAyah - 1))} disabled={currentAyah === 1}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-200 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-700 disabled:opacity-30'
            }`}>
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Ayat Sebelumnya</span>
          </button>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Pilihan Qari */}
            <select
              value={selectedQari}
              onChange={(e) => setSelectedQari(e.target.value)}
              className={`text-sm px-3 py-1.5 rounded-lg border ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              {qariList.map(qari => (
                <option key={qari.id} value={qari.id}>
                  {qari.name}
                </option>
              ))}
            </select>
            
            <button onClick={() => setShowLatin(!showLatin)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                showLatin ? (isDarkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700') 
                : (isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700')
              }`}>
              {showLatin ? 'Sembunyikan Latin' : 'Tampilkan Latin'}
            </button>
          </div>
        </div>
        
        <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="hidden sm:inline">Ayat </span>
          <span>{currentAyah}</span>/<span>{getJumlahAyat()}</span>
        </div>
        
        <button onClick={() => scrollToAyah(Math.min(getJumlahAyat(), currentAyah + 1))} disabled={currentAyah === getJumlahAyat()}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            isDarkMode ? 'hover:bg-gray-700 text-gray-200 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-700 disabled:opacity-30'
          }`}>
          <span className="hidden sm:inline">Ayat Berikutnya</span> <ChevronRight size={16} />
        </button>
      </div>

      {/* Info Bar */}
      <div className={`px-6 py-2 ${isDarkMode ? 'bg-gray-800' : 'bg-blue-50'} flex items-center justify-between text-sm ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Volume2 size={14} className={isDarkMode ? 'text-emerald-400' : 'text-primary-600'} />
            <span>Qari: <span className="font-semibold">
              {qariList.find(q => q.id === selectedQari)?.name || 'Yasser Al-Dosari'}
            </span></span>
          </div>
          <div className="flex items-center gap-1">
            <Layers size={14} className={isDarkMode ? 'text-emerald-400' : 'text-primary-600'} />
            <span>{ayat.length} Ayat</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare size={14} className={isDarkMode ? 'text-emerald-400' : 'text-primary-600'} />
          <span>Tafsir: {tafsir.length > 0 ? 'Tersedia' : 'Tidak tersedia'}</span>
        </div>
      </div>

      {/* Ayat List */}
      <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
        {ayat.map((ayah) => {
          const ayahTafsir = tafsir.find(t => t.nomorAyat === ayah.nomorAyat);
          const isCurrent = currentAyah === ayah.nomorAyat;
          const isThisPlaying = isPlaying && currentPlayingAyah === ayah.nomorAyat;
          
          return (
            <div key={ayah.nomorAyat} id={`ayah-${ayah.nomorAyat}`}
              className={`p-6 rounded-xl border transition-all duration-300 mb-6 ${
                isCurrent ? 'ring-2 ring-primary-500' : ''
              } ${isDarkMode ? 'border-gray-700 bg-gray-800 hover:border-emerald-500' : 'border-gray-200 bg-white hover:border-primary-300'}`}>
              
              {/* Ayat Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-primary-100 text-primary-700'
                  }`}>
                    {ayah.nomorAyat}
                  </div>
                  <div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Ayat {ayah.nomorAyat} • Juz {ayah.juz || '?'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => downloadAyahAudio(ayah.nomorAyat)}
                    className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                    <Download size={18} />
                  </button>
                  <button onClick={() => playAyahAudio(ayah.nomorAyat)}
                    className={`p-2 rounded-lg ${isThisPlaying ? 'text-emerald-500' : ''} ${
                      isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                    }`}>
                    <Volume2 size={18} />
                  </button>
                  <button onClick={() => toggleBookmark(ayah.nomorAyat)}
                    className={`p-2 rounded-lg ${isBookmarked(ayah.nomorAyat) 
                      ? isDarkMode ? 'text-emerald-400' : 'text-emerald-600' 
                      : isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                    }`}>
                    <Bookmark size={18} className={isBookmarked(ayah.nomorAyat) ? 'fill-current' : ''} />
                  </button>
                </div>
              </div>
              
              {/* Arabic Text */}
              <div className="text-right mb-6 border-b pb-6">
                <div className={`text-3xl font-arabic leading-loose mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {ayah.teksArab}
                </div>
                <div className={`mt-2 text-2xl font-arabic ${isDarkMode ? 'text-emerald-400' : 'text-primary-600'}`}>
                  ﴾{arabicNumbers[ayah.nomorAyat] || ayah.nomorAyat}﴿
                </div>
              </div>
              
              {/* Latin Text (jika diaktifkan) */}
              {showLatin && ayah.teksLatin && (
                <div className={`mb-4 p-3 rounded-lg italic ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                  {ayah.teksLatin}
                </div>
              )}
              
              {/* Translation */}
              <div className="mb-4">
                <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Terjemahan:</div>
                <div className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                  {ayah.teksIndonesia}
                </div>
              </div>
              
              {/* Tafsir */}
              {ayahTafsir && (
                <div className="mt-4">
                  <button onClick={() => toggleTafsir(ayah.nomorAyat)}
                    className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-emerald-400' : 'text-primary-600'}`}>
                    <MessageSquare size={14} />
                    {showTafsir[ayah.nomorAyat] ? 'Sembunyikan Tafsir' : 'Tampilkan Tafsir'}
                  </button>
                  
                  {showTafsir[ayah.nomorAyat] && (
                    <div className={`mt-3 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-700'}`}>
                      <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tafsir:</div>
                      {ayahTafsir.teks}
                    </div>
                  )}
                </div>
              )}
              
              {/* Info Audio */}
              <div className="mt-4 pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1">
                  <Volume2 size={12} />
                  Audio full surat dari {qariList.find(q => q.id === selectedQari)?.name || 'Yasser Al-Dosari'}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* End of Surah */}
        <div className="mt-8 pt-6 border-t text-center">
          <div className={`text-4xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>﴿﴾</div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Selesai membaca Surah {getNamaLatin()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SurahDetail;