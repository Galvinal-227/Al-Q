import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, Maximize2, Heart, Download, Settings,
  ChevronLeft, ChevronRight, Clock, Music, User, X
} from 'lucide-react';

const Player = ({ isDarkMode = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentSurah, setCurrentSurah] = useState({
    id: 1,
    name: 'Al-Fatihah',
    ayah: 1,
    qariName: 'Yasser Al-Dosari',
    qariId: '06',
    isFullSurah: true // Menandakan ini audio full surat
  });
  const [playlist, setPlaylist] = useState([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  const audioRef = useRef(null);

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

  // Format waktu
  const formatTime = (time) => {
    if (isNaN(time) || time === 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Dapatkan audio URL dari equran.id
  const getAudioUrl = (surahId, qariCode) => {
    const surahPadded = surahId.toString().padStart(3, '0');
    return `${audioBaseUrl}/${qariCode}/${surahPadded}.mp3`;
  };

  // Load dan play audio
  const loadAndPlayAudio = async (surahId, ayahNumber, qariId = '06', isFullSurah = true) => {
    if (!surahId) return;
    
    setIsLoading(true);
    setIsPlaying(false);
    
    try {
      const selectedQari = qariList.find(q => q.id === qariId) || qariList[5];
      
      // Dapatkan audio URL (audio full surat)
      const audioUrl = getAudioUrl(surahId, selectedQari.code);
      setCurrentAudioUrl(audioUrl);
      
      console.log('Loading audio:', {
        qari: selectedQari.name,
        surah: surahId,
        url: audioUrl
      });
      
      if (audioRef.current) {
        // Stop current audio
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        // Set new audio
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        audioRef.current.playbackRate = playbackRate;
        
        // Play audio
        const playPromise = audioRef.current.play();
        
        await playPromise;
        
        console.log('Audio playing successfully');
        setIsPlaying(true);
        setIsLoading(false);
        setIsPlayerVisible(true);
        
        // Update current surah state
        const surahName = getSurahName(surahId);
        setCurrentSurah({
          id: surahId,
          name: surahName,
          ayah: ayahNumber,
          qariId: qariId,
          qariName: selectedQari.name,
          isFullSurah: true
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      
      // Show error toast
      const event = new CustomEvent('showToast', {
        detail: { 
          message: 'Gagal memutar audio. Coba lagi.',
          type: 'error'
        }
      });
      window.dispatchEvent(event);
    }
  };

  // Helper untuk mendapatkan nama surah
  const getSurahName = (surahId) => {
    const surahNames = {
      1: 'Al-Fatihah',
      2: 'Al-Baqarah',
      3: 'Ali Imran',
      4: 'An-Nisa',
      5: 'Al-Maidah',
      6: "Al-An'am",
      7: 'Al-Araf',
      8: 'Al-Anfal',
      9: 'At-Taubah',
      10: 'Yunus',
      36: 'Ya-Sin',
      55: 'Ar-Rahman',
      67: 'Al-Mulk',
      112: 'Al-Ikhlas'
    };
    return surahNames[surahId] || `Surah ${surahId}`;
  };

  // Toggle play/pause
  const togglePlay = async () => {
    if (isLoading) return;
    
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      if (audioRef.current && audioRef.current.src) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setIsPlayerVisible(true);
        } catch (error) {
          console.error('Error resuming audio:', error);
          await loadAndPlayAudio(currentSurah.id, currentSurah.ayah, currentSurah.qariId);
        }
      }
    }
  };

  // Close player
  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
    setIsPlayerVisible(false);
    setShowSettings(false);
    
    const event = new CustomEvent('showToast', {
      detail: { 
        message: 'Pemutar audio ditutup',
        type: 'info'
      }
    });
    window.dispatchEvent(event);
  };

  // Next surah
  const handleNext = async () => {
    const nextSurahId = currentSurah.id < 114 ? currentSurah.id + 1 : 1;
    await loadAndPlayAudio(nextSurahId, 1, currentSurah.qariId);
  };

  // Previous surah
  const handlePrev = async () => {
    const prevSurahId = currentSurah.id > 1 ? currentSurah.id - 1 : 114;
    await loadAndPlayAudio(prevSurahId, 1, currentSurah.qariId);
  };

  // Seek audio
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Volume control
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
      audioRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  };

  // Playback rate
  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Download current audio
  const downloadAudio = () => {
    if (!currentAudioUrl) return;
    
    const link = document.createElement('a');
    link.href = currentAudioUrl;
    link.download = `${currentSurah.name}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const event = new CustomEvent('showToast', {
      detail: { 
        message: 'Mendownload audio...',
        type: 'info'
      }
    });
    window.dispatchEvent(event);
  };

  // Listen for playAyah event from SurahDetail
  useEffect(() => {
    const handlePlayAyah = async (e) => {
      const { surahId, ayahNumber, qariId, qariName, isFullSurah } = e.detail;
      
      // Play audio
      await loadAndPlayAudio(surahId, ayahNumber, qariId || '06', isFullSurah);
    };

    window.addEventListener('playAyah', handlePlayAyah);
    return () => window.removeEventListener('playAyah', handlePlayAyah);
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      
      if (isRepeat) {
        // Repeat same audio
        setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(console.error);
        }, 500);
      } else {
        // Play next surah
        setTimeout(handleNext, 1000);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      
      const event = new CustomEvent('showToast', {
        detail: { 
          message: 'Error memutar audio',
          type: 'error'
        }
      });
      window.dispatchEvent(event);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [isRepeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // If player is not visible, return only the audio element
  if (!isPlayerVisible) {
    return (
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
    );
  }

  return (
    <>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
      
      {/* Player UI with Slide-up Animation */}
      <div className={`fixed bottom-0 left-0 right-0 transform transition-transform duration-300 ease-out ${
        isPlayerVisible ? 'translate-y-0' : 'translate-y-full'
      } ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-t shadow-2xl z-50`}>
        
        {/* Close Button */}
        <div className="absolute -top-10 right-4">
          <button
            onClick={closePlayer}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg shadow-lg ${
              isDarkMode 
                ? 'bg-gray-900 text-gray-300 hover:bg-gray-800' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-b-0'
            }`}
          >
            <X size={16} />
            <span className="text-sm">Tutup Pemutar</span>
          </button>
        </div>
        
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Track Info */}
            <div className="flex items-center gap-4 w-1/4">
              <div className="relative">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                  isDarkMode ? 'bg-gradient-to-br from-emerald-800 to-blue-900' : 'bg-gradient-to-br from-emerald-500 to-blue-500'
                }`}>
                  <span className="font-arabic text-2xl font-bold text-white">
                    {currentSurah.ayah}
                  </span>
                </div>
                {isPlaying && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              
              <div className="min-w-0">
                <div className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {currentSurah.name} : {currentSurah.ayah}
                </div>
                <div className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <User size={12} className="inline mr-1" />
                  {currentSurah.qariName}
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Clock size={10} className="inline mr-1" />
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={downloadAudio}
                  disabled={!currentAudioUrl}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800 text-gray-300 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-600 disabled:opacity-30'}`}
                  title="Download audio"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            {/* Center: Controls */}
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center justify-center gap-3 mb-3">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-2 rounded-full ${isShuffle ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')}`}
                  title="Acak"
                >
                  <Shuffle size={18} />
                </button>
                
                <button
                  onClick={handlePrev}
                  disabled={isLoading}
                  className={`p-3 rounded-full ${isDarkMode ? 'hover:bg-gray-800 text-gray-300 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-600 disabled:opacity-30'}`}
                  title="Surah sebelumnya"
                >
                  <SkipBack size={22} />
                </button>
                
                <button
                  onClick={togglePlay}
                  disabled={isLoading}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50' 
                      : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 disabled:opacity-50'
                  }`}
                  title={isPlaying ? 'Jeda' : 'Putar'}
                >
                  {isLoading ? (
                    <div className={`w-6 h-6 border-2 ${isDarkMode ? 'border-white' : 'border-white'} border-t-transparent rounded-full animate-spin`}></div>
                  ) : isPlaying ? (
                    <Pause size={26} />
                  ) : (
                    <Play size={26} />
                  )}
                </button>
                
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className={`p-3 rounded-full ${isDarkMode ? 'hover:bg-gray-800 text-gray-300 disabled:opacity-30' : 'hover:bg-gray-100 text-gray-600 disabled:opacity-30'}`}
                  title="Surah berikutnya"
                >
                  <SkipForward size={22} />
                </button>
                
                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-2 rounded-full ${isRepeat ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800')}`}
                  title="Ulangi"
                >
                  <Repeat size={18} />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <span className={`text-xs w-10 text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatTime(currentTime)}
                </span>
                
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={duration === 0}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed ${
                      isDarkMode 
                        ? 'bg-gray-700 [&::-webkit-slider-thumb]:bg-white disabled:opacity-50' 
                        : 'bg-gray-300 [&::-webkit-slider-thumb]:bg-primary-600 disabled:opacity-50'
                    } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full`}
                  />
                </div>
                
                <span className={`text-xs w-10 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatTime(duration)}
                </span>
              </div>
              
              {/* Playback Rate */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kecepatan:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`text-xs px-2 py-0.5 rounded ${playbackRate === rate 
                      ? isDarkMode ? 'bg-emerald-600 text-white' : 'bg-primary-500 text-white'
                      : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right: Volume & Settings */}
            <div className="flex items-center gap-4 w-1/4 justify-end">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} ${showSettings ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''}`}
                title="Pengaturan"
              >
                <Settings size={18} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
              </button>
              
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                title={isMuted ? 'Nyalakan suara' : 'Matikan suara'}
              >
                {isMuted ? (
                  <VolumeX size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                ) : (
                  <Volume2 size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                )}
              </button>
              
              <div className="w-24">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode 
                      ? 'bg-gray-700 [&::-webkit-slider-thumb]:bg-white' 
                      : 'bg-gray-300 [&::-webkit-slider-thumb]:bg-primary-600'
                  } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full`}
                />
              </div>
              
              <div className={`text-xs w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isMuted ? '0%' : `${volume}%`}
              </div>
            </div>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className={`border-t ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'} p-4`}>
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    <Music size={14} className="inline mr-2" />
                    Pilih Qari
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {qariList.map(qari => (
                      <button
                        key={qari.id}
                        onClick={() => loadAndPlayAudio(currentSurah.id, currentSurah.ayah, qari.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${currentSurah.qariId === qari.id 
                          ? isDarkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 border'
                        }`}
                      >
                        {qari.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    <Repeat size={14} className="inline mr-2" />
                    Mode Putar
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="shuffle"
                        checked={isShuffle}
                        onChange={(e) => setIsShuffle(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="shuffle" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Acak surah
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="repeat"
                        checked={isRepeat}
                        onChange={(e) => setIsRepeat(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="repeat" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Ulangi surah ini
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-1">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 animate-pulse"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default Player;