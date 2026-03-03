import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Menu, X, Heart, Bookmark, 
  Bell, Moon, Sun, Settings, User, LogOut 
} from 'lucide-react';
import SurahList from './components/SurahList';
import SurahDetail from './components/SurahDetail';
import Player from './components/Player';
import Adzan from './components/Adzan';
import Login from './components/Login';
import Chatbot from './components/Chatbot';
import { auth } from './firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { bookmarkService } from './service/BookmarkService';

function App() {
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quran');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showBookmarkedSurahs, setShowBookmarkedSurahs] = useState(false);
  const [currentAyat, setCurrentAyat] = useState(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  

  // Check authentication and system theme
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Load bookmarks from Supabase if user exists
      if (currentUser) {
        try {
          setBookmarkLoading(true);
          const userBookmarks = await bookmarkService.getUserBookmarks(currentUser.uid);
          console.log('Loaded bookmarks from Supabase:', userBookmarks);
          setBookmarks(userBookmarks);
        } catch (error) {
          console.error('Error loading bookmarks:', error);
        } finally {
          setBookmarkLoading(false);
        }
      }
      
      setAppLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Apply dark mode when changed
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const loadSurahs = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://equran.id/api/v2/surat');
      if (response.ok) {
        const data = await response.json();
        console.log('Surahs loaded:', data.data.length);
        setSurahs(data.data || []);
      } else {
        throw new Error('API failed');
      }
      
    } catch (error) {
      console.error('Error loading surahs:', error);
      // Fallback data
      const fallbackSurahs = Array.from({ length: 114 }, (_, i) => ({
        nomor: i + 1,
        nama: i === 0 ? 'الفاتحة' : `سورة ${i + 1}`,
        namaLatin: i === 0 ? 'Al-Fatihah' : `Surah ${i + 1}`,
        jumlahAyat: i === 0 ? 7 : 7,
        tempatTurun: i < 90 ? 'Mekah' : 'Madinah',
        arti: i === 0 ? 'Pembukaan' : 'Arti surah',
        deskripsi: 'Deskripsi surah'
      }));
      setSurahs(fallbackSurahs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSurahs();
    }
  }, [user]);

  const filteredSurahs = surahs.filter(surah =>
    (surah.namaLatin || surah.nama_latin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (surah.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (surah.arti || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fungsi untuk toggle bookmark dengan Supabase
  const toggleBookmark = async (surah, ayahNumber, ayahInfo = {}) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    console.log('=== TOGGLE BOOKMARK CALLED ===');
    console.log('Surah:', surah);
    console.log('Ayat:', ayahNumber);
    
    try {
      setBookmarkLoading(true);
      
      // Cek apakah sudah di bookmark
      const isBookmarked = bookmarks.some(b => 
        b.surah === surah.nomor && b.ayah === ayahNumber
      );
      
      if (isBookmarked) {
        // Hapus dari Supabase
        await bookmarkService.removeBookmark(user.uid, surah.nomor, ayahNumber);
        
        // Update state lokal
        const newBookmarks = bookmarks.filter(b => 
          !(b.surah === surah.nomor && b.ayah === ayahNumber)
        );
        setBookmarks(newBookmarks);
        
        alert(`❌ Ayat ${ayahNumber} dari ${surah.namaLatin || surah.nama_latin} dihapus dari bookmark`);
      } else {
        // Tambah ke Supabase
        const bookmarkData = {
          surah: surah.nomor,
          surahName: surah.namaLatin || surah.nama_latin || `Surah ${surah.nomor}`,
          arabic: surah.nama || '',
          ayah: ayahNumber,
          text: ayahInfo.text || '',
          translation: ayahInfo.translation || ''
        };
        
        const newBookmark = await bookmarkService.addBookmark(user.uid, bookmarkData);
        
        if (newBookmark) {
          // Update state lokal
          setBookmarks([...bookmarks, newBookmark]);
          alert(`✅ Ayat ${ayahNumber} dari ${surah.namaLatin || surah.nama_latin} ditambahkan ke bookmark`);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      alert('Gagal mengupdate bookmark. Silakan coba lagi.');
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Fungsi untuk toggle bookmark seluruh surah
  const toggleSurahBookmark = async (surah) => {
    if (!user) {
      alert('Silakan login terlebih dahulu');
      return;
    }

    console.log('=== TOGGLE SURAH BOOKMARK CALLED ===');
    console.log('Surah to toggle:', surah);
    
    try {
      setBookmarkLoading(true);
      
      // Cek apakah surah sudah di bookmark (minimal 1 ayat)
      const isBookmarked = bookmarks.some(b => b.surah === surah.nomor);
      
      if (isBookmarked) {
        // Hapus semua bookmark untuk surah ini
        const surahBookmarks = bookmarks.filter(b => b.surah === surah.nomor);
        for (const bookmark of surahBookmarks) {
          await bookmarkService.removeBookmark(user.uid, surah.nomor, bookmark.ayah);
        }
        
        // Update state
        const newBookmarks = bookmarks.filter(b => b.surah !== surah.nomor);
        setBookmarks(newBookmarks);
        
        alert(`❌ Semua bookmark dari ${surah.namaLatin || surah.nama_latin} dihapus`);
      } else {
        // Tambah ayat pertama sebagai bookmark representatif
        const bookmarkData = {
          surah: surah.nomor,
          surahName: surah.namaLatin || surah.nama_latin || `Surah ${surah.nomor}`,
          arabic: surah.nama || '',
          ayah: 1,
          text: '',
          translation: ''
        };
        
        const newBookmark = await bookmarkService.addBookmark(user.uid, bookmarkData);
        
        if (newBookmark) {
          setBookmarks([...bookmarks, newBookmark]);
          alert(`✅ ${surah.namaLatin || surah.nama_latin} ditambahkan ke bookmark`);
        }
      }
    } catch (error) {
      console.error('Error toggling surah bookmark:', error);
      alert('Gagal mengupdate bookmark. Silakan coba lagi.');
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Fungsi untuk cek apakah surah di-bookmark
  const isBookmarked = (surahId, ayahNumber = null) => {
    if (ayahNumber) {
      return bookmarks.some(b => b.surah === surahId && b.ayah === ayahNumber);
    }
    return bookmarks.some(b => b.surah === surahId);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setBookmarks([]);
      setSelectedSurah(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Show loading while checking auth
  if (appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <Login 
        onLoginSuccess={() => setUser(auth.currentUser)}
        initialDarkMode={isDarkMode}
      />
    );
  }

  // Main App Layout
  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-emerald-50'}`}>
      {/* Navbar - tambahkan bookmarkLoading indicator */}
      <Navbar 
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        user={user}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setShowChatbot={setShowChatbot}
        setShowBookmarkedSurahs={setShowBookmarkedSurahs}
        bookmarksCount={bookmarks.length}
        bookmarkLoading={bookmarkLoading}
      />

      {/* Main Content */}
<main className="flex-1 container mx-auto px-4 py-6">
  {activeTab === 'quran' ? (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar - di mobile: muncul jika sidebar terbuka DAN tidak ada surah dipilih */}
      <div className={`
        ${isSidebarOpen && !selectedSurah ? 'block' : 'hidden'} 
        lg:block 
        lg:w-80 xl:w-96 
        flex-shrink-0
        transition-all duration-300
      `}>
        <div className={`rounded-2xl shadow-lg p-4 sticky top-28 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Daftar Surah
            </h2>
            {/* Tombol close sidebar di mobile */}
            {window.innerWidth < 1024 && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Info jumlah surah */}
          <div className="flex gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm ${
              isDarkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-primary-100 text-primary-700'
            }`}>
              {surahs.length} Surah
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-emerald-100 text-emerald-700'
            }`}>
              30 Juz
            </span>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${
                isDarkMode ? 'border-emerald-400' : 'border-primary-600'
              }`}></div>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memuat daftar surah...</p>
            </div>
          ) : (
            <SurahList 
              surahs={filteredSurahs} 
              onSelectSurah={(surah) => {
                setSelectedSurah(surah);
                // Di mobile: setelah pilih surah, sidebar otomatis tertutup
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              bookmarks={bookmarks}
              isDarkMode={isDarkMode}
              onToggleBookmark={toggleSurahBookmark}
              isBookmarked={isBookmarked}
            />
          )}
        </div>
      </div>

      {/* Konten Utama - di mobile: muncul jika ada surah dipilih */}
      <div className={`
        flex-1
        ${selectedSurah ? 'block' : 'hidden lg:block'}
        transition-all duration-300
      `}>
        {selectedSurah ? (
          <SurahDetail 
            surah={selectedSurah} 
            onBack={() => {
              setSelectedSurah(null);
              // Di mobile: setelah back, sidebar otomatis terbuka
              if (window.innerWidth < 1024) {
                setIsSidebarOpen(true);
              }
            }}
            bookmarks={bookmarks}
            setBookmarks={setBookmarks}
            isDarkMode={isDarkMode}
            onToggleBookmark={toggleBookmark}
            isBookmarked={isBookmarked}
            userId={user.uid}
          />
        ) : (
          <WelcomeScreen 
            isDarkMode={isDarkMode}
            user={user}
            setActiveTab={setActiveTab}
            bookmarksCount={bookmarks.length}
            onViewBookmarks={() => setShowBookmarkedSurahs(true)}
          />
        )}
      </div>
    </div>
  ) : (
    <div className="max-w-6xl mx-auto">
      <Adzan isDarkMode={isDarkMode} />
    </div>
  )}
</main>

      {/* Quran Audio Player */}
      {activeTab === 'quran' && <Player isDarkMode={isDarkMode} />}

      {/* Bookmarked Surahs Modal */}
      {showBookmarkedSurahs && (
        <BookmarkedSurahsModal
          isOpen={showBookmarkedSurahs}
          onClose={() => setShowBookmarkedSurahs(false)}
          bookmarkedSurahs={bookmarks}
          onSelectSurah={(surah) => {
            console.log('Selected surah from bookmark:', surah);
            setSelectedSurah(surah);
            setActiveTab('quran');
            setShowBookmarkedSurahs(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRemoveBookmark={async (surahId, ayahId) => {
            try {
              setBookmarkLoading(true);
              console.log('Removing bookmark for surahId:', surahId, 'ayah:', ayahId);
              await bookmarkService.removeBookmark(user.uid, surahId, ayahId);
              
              const newBookmarks = bookmarks.filter(b => !(b.surah === surahId && b.ayah === ayahId));
              setBookmarks(newBookmarks);
            } catch (error) {
              console.error('Error removing bookmark:', error);
              alert('Gagal menghapus bookmark');
            } finally {
              setBookmarkLoading(false);
            }
          }}
          isDarkMode={isDarkMode}
          bookmarkLoading={bookmarkLoading}
        />
      )}

      {/* Chatbot Component */}
      <Chatbot 
        isOpen={showChatbot} 
        onClose={() => setShowChatbot(false)}
        isDarkMode={isDarkMode}
        user={user}
      />


      {/* Footer */}
      <Footer 
        isDarkMode={isDarkMode}
        user={user}
        handleLogout={handleLogout}
      />
    </div>
  );
}

// Navbar Component - update dengan loading indicator
const Navbar = ({ 
  isDarkMode, 
  toggleTheme, 
  activeTab, 
  setActiveTab, 
  searchTerm, 
  setSearchTerm, 
  user,
  handleLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  setShowChatbot,
  setShowBookmarkedSurahs,
  bookmarksCount,
  bookmarkLoading
}) => {
  return (
    <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg sticky top-0 z-50 border-b`}>
      <div className="container mx-auto px-4 py-4">
        {/* Baris 1: Logo, Navigasi, dan Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} lg:hidden`}
            >
              {isSidebarOpen ? <X size={24} className={isDarkMode ? 'text-gray-300' : ''} /> : <Menu size={24} className={isDarkMode ? 'text-gray-300' : ''} />}
            </button>
            <BookOpen className={isDarkMode ? 'text-emerald-400' : 'text-primary-600'} size={32} />
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Al-Quran Digital</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeTab === 'quran' ? 'Baca dan pelajari Al-Quran' : 'Jadwal shalat dan adzan'}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'quran', label: 'Al-Quran', icon: BookOpen },
              { id: 'adhan', label: 'Adzan & Shalat', icon: Bell }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? isDarkMode 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-primary-500 text-white'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-yellow-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {/* Bookmark Button */}
            <button
              onClick={() => setShowBookmarkedSurahs(true)}
              className={`p-2 rounded-lg relative ${isDarkMode ? 'hover:bg-gray-700 text-emerald-400' : 'hover:bg-gray-100 text-emerald-600'}`}
              title="Lihat Surah yang Dibookmark"
              disabled={bookmarkLoading}
            >
              <Bookmark size={20} />
              {bookmarksCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full bg-red-500 text-white flex items-center justify-center">
                  {bookmarksCount}
                </span>
              )}
              {bookmarkLoading && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full bg-blue-500 text-white flex items-center justify-center animate-pulse">
                  ...
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowChatbot(true)}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-emerald-400' : 'hover:bg-gray-100 text-emerald-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            
            <div className="hidden md:block">
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {user?.email?.split('@')[0]}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
            <input
              type="text"
              placeholder={activeTab === 'quran' ? "Cari surah..." : "Cari waktu shalat..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'border border-gray-300'
              }`}
            />
          </div>
        </div>
        
        <div className="md:hidden flex gap-2 mt-3">
          {[
            { id: 'quran', label: 'Quran' },
            { id: 'adhan', label: 'Adzan' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === tab.id
                  ? isDarkMode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-primary-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

// Bookmarked Surahs Modal Component
const BookmarkedSurahsModal = ({ 
  isOpen, 
  onClose, 
  bookmarkedSurahs, 
  onSelectSurah, 
  onRemoveBookmark,
  isDarkMode,
  bookmarkLoading 
}) => {
  console.log('Modal rendered with bookmarkedSurahs:', bookmarkedSurahs);
  
  if (!isOpen) return null;

  const getSurahName = (item) => {
    return item.surahName || `Surah ${item.surah}`;
  };

  const getArabicName = (item) => {
    return item.arabic || '';
  };

  const getSurahNumber = (item) => {
    return item.surah || '-';
  };

  const getAyahNumber = (item) => {
    return item.ayah || '-';
  };

  const getDate = (item) => {
    if (item.date) {
      const date = new Date(item.date);
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <Bookmark size={20} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Ayat yang Dibookmark
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            disabled={bookmarkLoading}
          >
            <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {bookmarkLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p className={`mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Memuat bookmark...
              </p>
            </div>
          ) : bookmarkedSurahs.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Belum ada ayat yang dibookmark
              </p>
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Klik ikon bookmark di setiap ayat untuk menambahkannya
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarkedSurahs.map((item, index) => (
                <div
                  key={`${item.surah}-${item.ayah}-${index}`}
                  className={`group p-4 rounded-lg border ${
                    isDarkMode 
                      ? 'border-gray-700 hover:bg-gray-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  } transition-colors cursor-pointer`}
                  onClick={() => onSelectSurah({ 
                    nomor: item.surah,
                    namaLatin: item.surahName,
                    nama: item.arabic
                  })}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      isDarkMode 
                        ? 'bg-emerald-900 text-emerald-300' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {getSurahNumber(item)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {getSurahName(item)}
                        </h3>
                        <span className={`text-xl font-arabic ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {getArabicName(item)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                        <span className={`px-2 py-0.5 rounded-full ${
                          isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Ayat {getAyahNumber(item)}
                        </span>
                        {item.date && (
                          <span className={`px-2 py-0.5 rounded-full ${
                            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getDate(item)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBookmark(item.surah, item.ayah);
                      }}
                      disabled={bookmarkLoading}
                      className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDarkMode 
                          ? 'hover:bg-gray-600 text-red-400' 
                          : 'hover:bg-gray-200 text-red-500'
                      } ${bookmarkLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Hapus dari bookmark"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        
        
        {/* Footer */}
        {bookmarkedSurahs.length > 0 && !bookmarkLoading && (
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total <span className="font-bold text-emerald-500">{bookmarkedSurahs.length}</span> ayat
            </p>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isDarkMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Footer Component (tetap sama)
const Footer = ({ isDarkMode, user, handleLogout }) => {
  return (
    <footer className={`py-6 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className={isDarkMode ? 'text-emerald-400' : 'text-primary-600'} size={24} />
            <div>
              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Al-Quran Digital</h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Aplikasi Quran lengkap dengan terjemahan dan audio
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              Tentang
            </button>
            <button className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              Fitur
            </button>
            <button className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              Bantuan
            </button>
            <button className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              Kontak
            </button>
          </div>
          
          <div className="text-center md:text-right">
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Login sebagai: <span className="font-medium">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className={`text-xs mt-1 ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-primary-600 hover:text-primary-700'}`}
            >
              Keluar dari akun
            </button>
          </div>
        </div>
        
        <div className={`mt-6 pt-4 border-t text-center ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-600'}`}>
          <p className="text-sm">© {new Date().getFullYear()} Al-Quran Digital. Semua hak dilindungi.</p>
          <p className="text-xs mt-1">Versi 1.0.0 • Data dari equran.id</p>
        </div>
      </div>
    </footer>
  );
};

// Welcome Screen Component (tetap sama)
const WelcomeScreen = ({ isDarkMode, user, setActiveTab, bookmarksCount, onViewBookmarks }) => {
  return (
    <div className={`rounded-2xl shadow-lg p-8 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <BookOpen className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} size={64} />
      <h2 className={`text-2xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
        Selamat Datang, {user?.email?.split('@')[0]}!
      </h2>
      <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Pilih surah dari daftar di samping untuk mulai membaca
      </p>
      
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <button
          onClick={() => setActiveTab('adhan')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isDarkMode 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
          }`}
        >
          <Bell size={18} className="inline mr-2" />
          Lihat Jadwal Shalat
        </button>
        
        {bookmarksCount > 0 && (
          <button
            onClick={onViewBookmarks}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-emerald-400' 
                : 'bg-gray-100 hover:bg-gray-200 text-emerald-600'
            }`}
          >
            <Bookmark size={18} className="inline mr-2" />
            Lihat {bookmarksCount} Bookmark
          </button>
        )}
        
      </div>
      
    </div>
  );
};

export default App;